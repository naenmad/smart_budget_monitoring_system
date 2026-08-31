import re
import time
from rapidfuzz import fuzz, process
from rapidfuzz.utils import default_process
from utils.db import db
from models.item_mapping import ItemMapping
from models.planning_detail import PlanningDetail
from models.planning_header import PlanningHeader
from models.mapping_log import MappingLog
from models.pr_po_data import PrPoData


class AdvancedMappingService:

    MONTH_MAP = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
        'JAN': 'Jan', 'FEB': 'Feb', 'MAR': 'Mar', 'APR': 'Apr',
        'MAY': 'May', 'MEI': 'May', 'JUN': 'Jun', 'JUL': 'Jul',
        'AUG': 'Aug', 'AGU': 'Aug', 'SEP': 'Sep', 'OCT': 'Oct',
        'OKT': 'Oct', 'NOV': 'Nov', 'DEC': 'Dec', 'DES': 'Dec'
    }

    DIMENSION_OR_UNIT_PATTERN = re.compile(
        r'^\d+(\.\d+)?\s*(MM|CM|M|INCH|INCHES|KG|GR|GRAM|L|LITER|LUSIN|PCS|SET|UNIT|V|W|KW|TON|RPM|BAR|PSI|FIX|SWIVEL|RIM|SHEET|PACK)$',
        re.IGNORECASE
    )
    DIMENSION_MULTIPLY_PATTERN = re.compile(
        r'^\d+(\.\d+)?(X\d+(\.\d+)?)+(\s*(MM|CM|M|INCH))?$',
        re.IGNORECASE
    )
    THREAD_PATTERN = re.compile(
        r'^M\d+(\.\d+)?(X\d+(\.\d+)?)*(\s*(MM|CM))?$',
        re.IGNORECASE
    )

    @staticmethod
    def extract_periode(pr_doc_num):
        """
        Ekstrak TAHUN dari pr_doc_num format SAI/PR/YYMM####
        Contoh: SAI/PR/26010001 -> '2026'
        Karena planning_header.periode disimpan sebagai tahun penuh.
        """
        if not pr_doc_num:
            return None

        match = re.search(r"SAI/PR/(\d{2})(\d{2})", pr_doc_num)
        if match:
            yy = match.group(1)
            return f"20{yy}"
        return None

    @staticmethod
    def extract_month(request_date, pr_doc_num=None):
        """
        Ekstrak BULAN (Jan..Dec) dari request_date atau fallback ke pr_doc_num.
        Format keluaran: 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'.
        """
        if request_date:
            if hasattr(request_date, 'strftime'):
                return request_date.strftime("%b")
            date_str = str(request_date).strip()
            # Coba cari pola tahun-bulan-hari YYYY-MM-DD
            m_iso = re.search(r'\d{4}-(\d{2})-\d{2}', date_str)
            if m_iso:
                mm = m_iso.group(1)
                if mm in AdvancedMappingService.MONTH_MAP:
                    return AdvancedMappingService.MONTH_MAP[mm]
            # Coba cari nama bulan dalam string
            for key, val in AdvancedMappingService.MONTH_MAP.items():
                if len(key) >= 3 and re.search(rf'\b{key}\b', date_str, re.IGNORECASE):
                    return val

        # Fallback ke pr_doc_num (SAI/PR/YYMM####)
        if pr_doc_num:
            m_doc = re.search(r"SAI/PR/\d{2}(\d{2})", pr_doc_num)
            if m_doc:
                mm = m_doc.group(1)
                return AdvancedMappingService.MONTH_MAP.get(mm, 'Jan')

        return None

    @staticmethod
    def extract_code(text):
        """
        Ambil kode/part number/no registrasi:
        - Angka/kode di dalam kurung: misal '(0117020)', '(\'0217035\')', '( 0217035 )'
        - Kode alfanumerik standalone dengan minimal 4 karakter (misal MSTP6-20, 0217035, '0217035)
        - Mengabaikan satuan, ukuran dimensi (11mm, 8inch, 4"FIX, M4x8x0.8, dsb.)
        """
        if not text:
            return None

        # 1. Cek di dalam tanda kurung (...)
        match = re.search(r'\(([^)]+)\)', text)
        if match:
            raw_inside = match.group(1)
            # Bersihkan tanda petik satu/dua, backtick, spasi, awalan "NO. REG:", dll
            cleaned_code = re.sub(r"['\"`\s]|NO\.?\s*REG\s*:?", "", raw_inside, flags=re.IGNORECASE)
            if cleaned_code:
                if not (AdvancedMappingService.DIMENSION_OR_UNIT_PATTERN.match(cleaned_code) or
                        AdvancedMappingService.DIMENSION_MULTIPLY_PATTERN.match(cleaned_code) or
                        AdvancedMappingService.THREAD_PATTERN.match(cleaned_code)):
                    return cleaned_code.upper()

        # 2. Hapus tanda petik dari seluruh teks lalu cari pola kode standalone
        cleaned_text = text.replace("'", "").replace('"', '').replace('`', '')
        matches = re.findall(r'\b([A-Z0-9\-]*\d+[A-Z0-9\-]*)\b', cleaned_text.upper())
        for m in matches:
            cand = m.strip("-")
            # Minimal 4 karakter dan bukan satuan/dimensi murni
            if len(cand) >= 4:
                if (AdvancedMappingService.DIMENSION_OR_UNIT_PATTERN.match(cand) or
                        AdvancedMappingService.DIMENSION_MULTIPLY_PATTERN.match(cand) or
                        AdvancedMappingService.THREAD_PATTERN.match(cand)):
                    continue
                # Jangan anggap angka 1-4 digit murni sebagai part number
                if cand.isdigit() and len(cand) < 5:
                    continue
                return cand

        return None

    @staticmethod
    def run_mapping(pr: PrPoData):
        start_time = time.time()

        # 0. Bersihkan SEMUA mapping log lama agar hasil koreksi/re-run tidak tumpang tindih
        MappingLog.query.filter_by(pr_po_data_id=pr.id).delete()
        pr.planning_detail_id = None
        db.session.flush()

        # 1. Ekstrak tahun dari pr_doc_num
        periode = AdvancedMappingService.extract_periode(pr.pr_doc_num)
        if not periode:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            return {"success": False, "message": "Gagal ekstrak periode dari pr_doc_num", "status": "NEED_MAPPING"}

        # Cari planning_header yang sesuai
        header = PlanningHeader.query.filter(
            PlanningHeader.periode == periode,
            PlanningHeader.status.in_(["SUCCESS", "SUCCES"])
        ).first()
        if not header:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            return {"success": False, "message": f"Tidak ada planning aktif untuk periode {periode}", "status": "NEED_MAPPING"}

        # 2. Ekstrak bulan dari request_date (atau fallback ke pr_doc_num)
        month = AdvancedMappingService.extract_month(pr.request_date, pr.pr_doc_num)
        print(f"DEBUG [PR#{pr.id}] request_date={pr.request_date}, pr_doc_num={pr.pr_doc_num} -> month='{month}'")
        print(f"DEBUG [PR#{pr.id}] periode='{periode}' header_id={header.id} kategori_id={pr.kategori_id}")

        if not month:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            return {"success": False, "message": "Tidak bisa ekstrak bulan dari request_date atau pr_doc_num", "status": "NEED_MAPPING"}

        # 3. Coba item_mapping (rule-based)
        description = pr.description or ""
        comment_text = pr.comment_text or ""
        search_text = f"{description} {comment_text}"

        rules = ItemMapping.query.filter_by(is_active=True).order_by(ItemMapping.priority.asc()).all()
        # Jika pr punya kategori_id_koreksi (artinya manual review), JANGAN Terapkan Rule yang Kategori-nya beda!
        if pr.kategori_id_koreksi:
            valid_rules = [r for r in rules if r.kategori_id == pr.kategori_id_koreksi]
        else:
            valid_rules = [r for r in rules if r.kategori_id == pr.kategori_id or r.kategori_id is None]

        matched_planning_item = None
        for rule in valid_rules:
            if re.search(rule.keyword, search_text, re.IGNORECASE):
                matched_planning_item = rule.planning_item
                break

        print(f"DEBUG [PR#{pr.id}] desc='{description[:60]}' -> matched_planning_item='{matched_planning_item}'")

        # 4. Kalau rule ketemu -> cari planning_detail persis (+ filter bulan)
        if matched_planning_item:
            exact_detail = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.item == matched_planning_item,
                PlanningDetail.month == month,
                PlanningDetail.status_realisasi != 'CANCELLED'
            ).first()
            print(f"DEBUG [PR#{pr.id}] exact_detail (rule) = {exact_detail}")

            if exact_detail:
                # Sinkronkan kategori PR mengikuti kategori resmi dari Planning
                if pr.kategori_id != exact_detail.kategori_id:
                    pr.kategori_id_koreksi = pr.kategori_id
                pr.kategori_id = exact_detail.kategori_id
                pr.planning_detail_id = exact_detail.id
                pr.status_ai = "DONE"

                proc_time = time.time() - start_time
                log = MappingLog(
                    pr_po_data_id=pr.id,
                    method="ITEM_MAPPING_RULE",
                    planning_detail_hasil_id=exact_detail.id,
                    confidence_score=1.0,
                    is_selected=True,
                    processing_time=proc_time
                )
                db.session.add(log)
                db.session.commit()
                return {"success": True, "message": "Mapped via Rule", "status": "DONE"}

        # 5. Fuzzy matching & Preventive Auto-Suggestion
        # Ambil kandidat di bulan yang sama (kategori sama + semua item preventive di bulan tersebut)
        month_candidates_query = PlanningDetail.query.filter(
            PlanningDetail.planning_header_id == header.id,
            PlanningDetail.month == month,
            PlanningDetail.status_realisasi != 'CANCELLED'
        )
        
        all_month_details = month_candidates_query.all()
        # Filter kategori sama ATAU item preventive (agar preventive selalu masuk kandidat)
        month_candidates = [
            pd for pd in all_month_details 
            if pd.kategori_id == pr.kategori_id or 'preventive' in pd.item.lower() or 'preventive' in (pd.remarks or '').lower()
        ]

        pr_reg_num = AdvancedMappingService.extract_code(description)
        print(f"DEBUG [PR#{pr.id}] Code diekstrak: {pr_reg_num}")

        clean_desc = description.replace("'", "").replace('"', '').replace('`', '').strip()

        # Temukan item preventive resmi untuk bulan ini
        prev_detail_in_month = next(
            (pd for pd in all_month_details if 'preventive' in pd.item.lower() or 'preventive' in (pd.remarks or '').lower()),
            None
        )

        # Kandidat pool yang akan diskor
        candidate_pool = {pd.id: pd for pd in month_candidates}

        # Jika PR memiliki part number / no registrasi unik (misal 0217035):
        # Tambahkan kandidat yang punya kode identik di seluruh bulan pada header yang sama
        if pr_reg_num:
            all_header_items = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.status_realisasi != 'CANCELLED'
            ).all()
            for pd in all_header_items:
                if AdvancedMappingService.extract_code(pd.item) == pr_reg_num:
                    candidate_pool[pd.id] = pd

        # Jika kandidat di bulan ini sangat sedikit, muat item unik dari seluruh bulan sebagai fallback
        if len(candidate_pool) < 5:
            all_header_items = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.status_realisasi != 'CANCELLED'
            ).all()
            seen_items = {pd.item.upper() for pd in candidate_pool.values()}
            for pd in all_header_items:
                norm = pd.item.upper()
                if norm not in seen_items:
                    seen_items.add(norm)
                    candidate_pool[pd.id] = pd

        # Scoring kandidat dengan fuzzy match + perlakuan khusus code & preventive
        scored_candidates = []
        for pd_id, pd in candidate_pool.items():
            cand_item = pd.item or ""
            cand_remarks = pd.remarks or ""
            cand_code = AdvancedMappingService.extract_code(cand_item)
            is_prev = ('preventive' in cand_item.lower() or 'preventive' in cand_remarks.lower()) and (pd.month == month)

            # Hitung skor kemiripan terhadap 'item' dan 'remarks' menggunakan Hybrid Scoring
            # (0.4 * token_set_ratio + 0.6 * token_sort_ratio) agar membedakan item spesifik (e.g. Pencabut Staples vs Staples) secara akurat
            set_item = fuzz.token_set_ratio(clean_desc, cand_item, processor=default_process)
            sort_item = fuzz.token_sort_ratio(clean_desc, cand_item, processor=default_process)
            score_item = 0.4 * set_item + 0.6 * sort_item

            if cand_remarks:
                set_remarks = fuzz.token_set_ratio(clean_desc, cand_remarks, processor=default_process)
                sort_remarks = fuzz.token_sort_ratio(clean_desc, cand_remarks, processor=default_process)
                score_remarks = 0.4 * set_remarks + 0.6 * sort_remarks
            else:
                score_remarks = 0.0

            base_score = max(score_item, score_remarks)
            final_score = base_score

            if pr_reg_num:
                # PR memiliki kode alat/part
                if cand_code == pr_reg_num:
                    final_score = 100.0
                elif cand_code and cand_code != pr_reg_num:
                    # Penalti karena beda kode alat
                    final_score = min(final_score, 40.0)
            else:
                # PR TIDAK memiliki kode (non-instrument / tools / preventive consumables)
                if is_prev:
                    if score_remarks >= 60.0:
                        # Jika deskripsi PR cocok dengan catatan remarks perencanaan preventive bulan ini
                        final_score = max(final_score, 95.0)
                    elif any(k in clean_desc.lower() for k in ['preventive', 'prev', 'perawatan', 'pemeliharaan']):
                        final_score = max(final_score, 90.0)
                    else:
                        # Tawaran dasar otomatis untuk preventive di bulan yang bersangkutan
                        final_score = max(final_score, 75.0)
                elif cand_code:
                    # Jika kandidat adalah alat ukur kalibrasi berkode, beri penalti agar tidak mendominasi barang non-kode
                    final_score = min(final_score, 45.0)

            scored_candidates.append((cand_item, final_score, pd.id, is_prev))

        # Urutkan berdasarkan skor tertinggi
        scored_candidates.sort(key=lambda x: x[1], reverse=True)

        # Ambil Top-5 kandidat unik
        top_candidates = []
        seen_detail_ids = set()
        for item_name, score, detail_id, is_p in scored_candidates:
            if detail_id not in seen_detail_ids:
                seen_detail_ids.add(detail_id)
                top_candidates.append((item_name, score, detail_id, is_p))
            if len(top_candidates) >= 5:
                break

        # Jaminan: Jika PR tidak memiliki kode dan ada item Preventive di bulan ini,
        # pastikan item Preventive tersebut selalu ada di dalam Top-5 rekomendasi!
        if not pr_reg_num and prev_detail_in_month:
            has_prev_in_top = any(t[2] == prev_detail_in_month.id for t in top_candidates)
            if not has_prev_in_top:
                prev_entry = next((s for s in scored_candidates if s[2] == prev_detail_in_month.id), None)
                if prev_entry:
                    if len(top_candidates) >= 5:
                        top_candidates[-1] = prev_entry
                    else:
                        top_candidates.append(prev_entry)
                    top_candidates.sort(key=lambda x: x[1], reverse=True)

        final_results = [(t[0], t[1], t[2]) for t in top_candidates]

        print(f"DEBUG [PR#{pr.id}] Top candidates count: {len(final_results)}, top score: {final_results[0][1] if final_results else 0}")

        if not final_results:
            pr.status_ai = "DONE"
            pr.budget_status = "OOP"
            pr.perlu_review = False
            db.session.commit()
            return {"success": False, "message": "Tidak ada kandidat di kategori ini (Out of Plan)", "status": "OOP"}

        proc_time = time.time() - start_time

        # Evaluasi ambang batas otomatisasi dari SystemSetting
        from models.system_setting import SystemSetting
        from services.budget_monitoring_service import BudgetMonitoringService

        raw_thresh = SystemSetting.get_value("auto_mapping_threshold", "85")
        try:
            threshold = float(raw_thresh)
        except (ValueError, TypeError):
            threshold = 85.0

        top_candidate = final_results[0]
        top_name, top_score, top_detail_id = top_candidate

        # Verifikasi apakah ada perbedaan kode part
        cand_detail = db.session.get(PlanningDetail, top_detail_id) if top_detail_id else None
        top_cand_reg = AdvancedMappingService.extract_code(cand_detail.item) if cand_detail else None
        code_mismatch = (pr_reg_num is not None and top_cand_reg is not None and pr_reg_num != top_cand_reg)

        is_auto_approved = (top_score >= threshold and not code_mismatch and cand_detail is not None)

        rank = 1
        for res in final_results:
            item_name, score, detail_id = res
            conf = score / 100.0
            is_this_selected = (is_auto_approved and rank == 1)
            log = MappingLog(
                pr_po_data_id=pr.id,
                method="FUZZY_MATCH",
                planning_detail_hasil_id=detail_id,
                confidence_score=conf,
                rank_no=rank,
                is_selected=is_this_selected,
                processing_time=proc_time
            )
            db.session.add(log)
            rank += 1

        if is_auto_approved:
            pr.planning_detail_id = top_detail_id
            pr.status_ai = "DONE"
            if cand_detail and pr.kategori_id != cand_detail.kategori_id:
                pr.kategori_id = cand_detail.kategori_id

            # Recalculate status realisasi anggaran
            BudgetMonitoringService.recalculate_planning_status(top_detail_id)
            db.session.commit()
            print(f"[Auto-Approval] PR#{pr.id} ({description[:40]}) auto-mapped to #{top_detail_id} ({top_score:.1f}% >= {threshold:.0f}%)")
            return {
                "success": True,
                "message": f"Auto-Approved via Fuzzy ({top_score:.1f}% >= {threshold:.0f}%)",
                "status": "DONE",
                "auto_approved": True,
                "confidence_score": top_score / 100.0
            }
        else:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            return {
                "success": True,
                "message": f"Mapped via Fuzzy (Top score {top_score:.1f}% < {threshold:.0f}%, Needs Review)",
                "status": "NEED_MAPPING",
                "auto_approved": False,
                "confidence_score": top_score / 100.0
            }



