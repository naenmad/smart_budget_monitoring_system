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

    NON_CODE_WORDS = {
        'WIFI', 'WI-FI', 'PCS', 'SET', 'UNIT', 'PACK', 'BOX', 'ROLL', 'RIM',
        'ORIGINAL', 'NEW', 'BARU', 'BEKAS', 'STANDAR', 'STANDARD', 'CUSTOM',
        'FIX', 'SWIVEL', 'QC', 'QA', 'E-1', 'E-9', 'I-1', 'CAPEX', 'OPEX',
        'WHITE', 'BLACK', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'PUTIH', 'HITAM',
        'MERAH', 'BIRU', 'HIJAU', 'KUNING', 'BESI', 'BAJA', 'ALUMINIUM',
        'KECIL', 'BESAR', 'LONG', 'SHORT', 'PANJANG', 'PENDEK'
    }

    PREVENTIVE_KEYWORDS = [
        'preventive', 'prevention', 'preventif', 'prev', 'perawatan', 'pemeliharaan',
        'c/f', 'cf', 'fixture', 'checking fixture', 'jig', 'clamp', 'toogle', 'toggle',
        'reamer', 'dowel', 'pin gauge', 'shim', 'castor', 'roda pu', 'baut', 'screw',
        'ring per', 'ring plate', 'thinner', 'cat', 'ftalit', 'nippon', 'spray paint',
        'kunci inggris', 'tang snap', 'hotmelt', 'glue stick', 'anodize', 'makitawireless',
        'hand reamer', 'pad lock', 'obeng set', 'stample qe', 'stample qc', 'rubbing compound',
        'rotary cutting', 'round bar', 'skun', 'sling spiral', 'nylon rod', 'rubber foot',
        'tips for clamps', 'toolbox', 'wire rope', 'spring', 'recoil', 'baut hex',
        'hex key', 'kunci l', 'mata bor', 'drill bit', 'alas meja', 'esd', 'aluminium', 'aluminum', 'plat', 'plate',
        'repair', 'perbaikan', 'servis', 'service', 'cutting machine', 'mesin cutting', 'mesin potong',
        'cleaning kit', 'cleaner kit', 'filter', 'pelumas', 'grease', 'solenoid', 'cylinder', 'bearing',
        'nozzle', 'spet cat', 'spray gun', 'inspeal diamond', 'kenmaster', 'ats', 'jotun', 'renishaw', 'top tech', 'misumi'
    ]

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
            if cleaned_code and cleaned_code.upper() not in AdvancedMappingService.NON_CODE_WORDS:
                if not (AdvancedMappingService.DIMENSION_OR_UNIT_PATTERN.match(cleaned_code) or
                        AdvancedMappingService.DIMENSION_MULTIPLY_PATTERN.match(cleaned_code) or
                        AdvancedMappingService.THREAD_PATTERN.match(cleaned_code)):
                    return cleaned_code.upper()

        # 2. Hapus tanda petik dari seluruh teks lalu cari pola kode standalone
        cleaned_text = text.replace("'", "").replace('"', '').replace('`', '')
        matches = re.findall(r'\b([A-Z0-9\-]*\d+[A-Z0-9\-]*)\b', cleaned_text.upper())
        for m in matches:
            cand = m.strip("-")
            # Minimal 4 karakter, bukan kata non-kode, dan bukan satuan/dimensi murni
            if len(cand) >= 4 and cand.upper() not in AdvancedMappingService.NON_CODE_WORDS:
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
        from services.budget_monitoring_service import BudgetMonitoringService

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
        # Jika PR sudah dikoreksi manual kategorinya oleh user, hormati preferensi tersebut.
        # Jika belum dikoreksi manual, aturan Master ItemMapping dari admin berlaku
        # (prioritaskan kategori yang sama lebih dulu, lalu semua rule aktif) agar salah tebak
        # kategori awal oleh AI tidak membatalkan rule master dari user.
        if pr.kategori_id_koreksi:
            valid_rules = [r for r in rules if r.kategori_id == pr.kategori_id_koreksi or r.kategori_id is None]
        else:
            same_cat = [r for r in rules if r.kategori_id == pr.kategori_id]
            other_cat = [r for r in rules if r.kategori_id != pr.kategori_id]
            valid_rules = same_cat + other_cat

        norm_search = re.sub(r'\s+', ' ', search_text.strip().lower())
        matched_planning_item = None
        for rule in valid_rules:
            kw = re.sub(r'\s+', ' ', (rule.keyword or '').strip().lower())
            if not kw:
                continue
            if kw in norm_search or re.search(r'\b' + re.escape(kw) + r'\b', norm_search):
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

            # Fallback jika tidak ada di bulan bersangkutan, cari di bulan manapun pada header aktif
            if not exact_detail:
                exact_detail = PlanningDetail.query.filter(
                    PlanningDetail.planning_header_id == header.id,
                    PlanningDetail.item == matched_planning_item,
                    PlanningDetail.status_realisasi != 'CANCELLED'
                ).first()

            print(f"DEBUG [PR#{pr.id}] exact_detail (rule) = {exact_detail}")

            if exact_detail:
                # Sinkronkan kategori PR mengikuti kategori resmi dari Planning HANYA jika bukan koreksi manual user
                is_manual_category = (pr.metode_klasifikasi == "MANUAL" or pr.kategori_id_koreksi is not None or pr.direview_oleh is not None)
                if not is_manual_category:
                    if pr.kategori_id != exact_detail.kategori_id:
                        pr.kategori_id_koreksi = pr.kategori_id
                    pr.kategori_id = exact_detail.kategori_id
                pr.planning_detail_id = exact_detail.id
                pr.status_ai = "DONE"
                pr.perlu_review = False

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
                
                # Recalculate status realisasi dan konsumsi budget
                BudgetMonitoringService.recalculate_planning_status(exact_detail.id)
                BudgetMonitoringService.calculate_budget_consumption(pr)
                db.session.commit()
                return {"success": True, "message": "Mapped via Rule", "status": "DONE"}

        # 5. Fuzzy matching & Preventive Auto-Suggestion
        all_header_items = PlanningDetail.query.filter(
            PlanningDetail.planning_header_id == header.id,
            PlanningDetail.status_realisasi != 'CANCELLED'
        ).all()

        all_month_details = [pd for pd in all_header_items if pd.month == month]

        def is_preventive_detail(pd):
            cand_str = ((pd.item or '') + ' ' + (pd.remarks or '')).lower()
            return any(k in cand_str for k in ('preventive', 'prevention', 'preventif', 'perawatan', 'pemeliharaan'))

        # Filter kategori sama ATAU item preventive (agar preventive selalu masuk kandidat)
        # Jika pr.kategori_id None atau belum diset, masukkan semua kandidat bulan ini
        if not pr.kategori_id:
            month_candidates = list(all_month_details)
        else:
            month_candidates = [
                pd for pd in all_month_details 
                if pd.kategori_id == pr.kategori_id or is_preventive_detail(pd)
            ]

        pr_reg_num = AdvancedMappingService.extract_code(description)
        print(f"DEBUG [PR#{pr.id}] Code diekstrak: {pr_reg_num}")

        clean_desc = description.replace("'", "").replace('"', '').replace('`', '').strip()

        # Temukan item preventive resmi untuk bulan ini dan pastikan masuk candidate pool
        prev_detail_in_month = next(
            (pd for pd in all_month_details if is_preventive_detail(pd)),
            None
        )

        # Kandidat pool yang akan diskor
        candidate_pool = {pd.id: pd for pd in month_candidates}
        if prev_detail_in_month and prev_detail_in_month.id not in candidate_pool:
            candidate_pool[prev_detail_in_month.id] = prev_detail_in_month

        # Masukkan item dari bulan lain atau kategori lain yang memiliki kesamaan kode atau kata kunci kuat
        desc_words = set(w for w in clean_desc.lower().split() if len(w) >= 4)
        for pd in all_header_items:
            if pr_reg_num and AdvancedMappingService.extract_code(pd.item) == pr_reg_num:
                candidate_pool[pd.id] = pd
            elif (not pr.kategori_id or pd.kategori_id == pr.kategori_id) and pd.id not in candidate_pool:
                candidate_pool[pd.id] = pd
            elif pd.id not in candidate_pool:
                # Masukkan jika ada irisan kata kunci signifikan (misal nama alat/merk unik)
                pd_words = set(w for w in (pd.item or '').lower().split() if len(w) >= 4)
                if desc_words and pd_words and len(desc_words.intersection(pd_words)) >= 2:
                    candidate_pool[pd.id] = pd

        from ai.synonym_normalizer import SynonymNormalizer

        norm_desc = SynonymNormalizer.normalize_text(clean_desc)

        # Scoring kandidat dengan fuzzy match + perlakuan khusus code, preventive, synonym, & price check
        scored_candidates = []
        for pd_id, pd in candidate_pool.items():
            cand_item = pd.item or ""
            cand_remarks = pd.remarks or ""
            cand_code = AdvancedMappingService.extract_code(cand_item)
            is_prev = is_preventive_detail(pd) and (pd.month == month)
            is_same_month = (pd.month == month)

            # 1. Lexical Hybrid Matching
            set_item = fuzz.token_set_ratio(clean_desc, cand_item, processor=default_process)
            sort_item = fuzz.token_sort_ratio(clean_desc, cand_item, processor=default_process)
            lexical_item_score = 0.4 * set_item + 0.6 * sort_item

            if cand_remarks:
                set_remarks = fuzz.token_set_ratio(clean_desc, cand_remarks, processor=default_process)
                sort_remarks = fuzz.token_sort_ratio(clean_desc, cand_remarks, processor=default_process)
                lexical_remarks_score = 0.4 * set_remarks + 0.6 * sort_remarks
            else:
                lexical_remarks_score = 0.0

            # 2. Domain & Synonym Hybrid Matching
            norm_item = SynonymNormalizer.normalize_text(cand_item)
            norm_remarks = SynonymNormalizer.normalize_text(cand_remarks)

            set_syn_item = fuzz.token_set_ratio(norm_desc, norm_item, processor=default_process)
            sort_syn_item = fuzz.token_sort_ratio(norm_desc, norm_item, processor=default_process)
            syn_item_score = 0.4 * set_syn_item + 0.6 * sort_syn_item

            if norm_remarks:
                set_syn_rem = fuzz.token_set_ratio(norm_desc, norm_remarks, processor=default_process)
                sort_syn_rem = fuzz.token_sort_ratio(norm_desc, norm_remarks, processor=default_process)
                syn_remarks_score = 0.4 * set_syn_rem + 0.6 * sort_syn_rem
            else:
                syn_remarks_score = 0.0

            score_item = max(lexical_item_score, syn_item_score)
            score_remarks = max(lexical_remarks_score, syn_remarks_score)

            base_score = max(score_item, score_remarks)
            final_score = base_score

            code_match_status = "N/A"
            if pr_reg_num and cand_code:
                # Keduanya memiliki kode alat/part
                if cand_code == pr_reg_num:
                    final_score = 100.0
                    code_match_status = "MATCH_100"
                else:
                    # Penalti karena beda kode alat
                    final_score = min(final_score, 40.0)
                    code_match_status = "MISMATCH"
            elif pr_reg_num and not cand_code:
                # PR memiliki part number / model number (misal MISUMI CB8-30, AL6061),
                # tetapi kandidat tidak punya kode khusus (seperti PREVENTIVE C/F).
                if is_prev:
                    desc_lower = clean_desc.lower()
                    if score_remarks >= 60.0 or syn_remarks_score >= 60.0:
                        final_score = max(final_score, 95.0)
                    elif any(k in desc_lower for k in AdvancedMappingService.PREVENTIVE_KEYWORDS):
                        final_score = max(final_score, 92.0)
                    else:
                        final_score = max(final_score, 88.0)
                else:
                    final_score = min(final_score, 45.0)
            else:
                # PR TIDAK memiliki kode (non-instrument / tools / preventive consumables)
                if is_prev:
                    desc_lower = clean_desc.lower()
                    if score_remarks >= 60.0 or syn_remarks_score >= 60.0:
                        final_score = max(final_score, 95.0)
                    elif any(k in desc_lower for k in AdvancedMappingService.PREVENTIVE_KEYWORDS):
                        final_score = max(final_score, 92.0)
                    else:
                        final_score = max(final_score, 88.0)
                elif cand_code:
                    # Jika kandidat adalah alat ukur kalibrasi berkode, beri penalti agar tidak mendominasi barang non-kode
                    final_score = min(final_score, 45.0)
                    code_match_status = "CANDIDATE_HAS_CODE"

            # Jika kandidat berasal dari bulan berbeda dan bukan part-code match sempurna, beri soft penalti (-5%)
            if not is_same_month and code_match_status != "MATCH_100":
                final_score *= 0.95

            # 3. Financial Sanity Check & Price Anomaly Detection
            pr_total_amt = float(pr.total_price or 0.0)
            cand_plan_amt = float(pd.planning_amount or 0.0)
            price_anomaly = False
            price_status = "SAFE"

            # Jika kecocokan nama/kode sangat tinggi (>= 90% atau kode cocok),
            # perbedaan harga adalah kelebihan anggaran (OVER_PLAN), BUKAN kegagalan identifikasi AI
            is_strong_identity = (final_score >= 90.0 or code_match_status == "MATCH_100")

            if pr_total_amt > 0 and cand_plan_amt > 0:
                price_ratio = pr_total_amt / cand_plan_amt
                if price_ratio > 3.0:
                    if is_strong_identity or is_prev:
                        price_anomaly = False
                        price_status = "WARNING_OVER_BUDGET"
                    else:
                        price_anomaly = True
                        price_status = "WARNING_EXCEEDS_BUDGET"
                elif price_ratio < 0.1:
                    if is_prev or is_strong_identity:
                        price_anomaly = False
                        price_status = "SAFE"
                    else:
                        price_anomaly = True
                        price_status = "WARNING_SCALE_MISMATCH"
                else:
                    price_status = "SAFE"

            # 4. Formulate Explainability Reason Breakdown
            explain_points = []
            if code_match_status == "MATCH_100":
                explain_points.append(f"No. Registrasi / Part Number Cocok Sempurna ({pr_reg_num})")
            elif code_match_status == "MISMATCH":
                explain_points.append(f"Part Number Berbeda ({pr_reg_num} vs {cand_code})")

            if syn_item_score > lexical_item_score + 10.0:
                explain_points.append(f"Cocok via Kamus Sinonim & Istilah Teknik ({syn_item_score:.1f}%)")
            else:
                explain_points.append(f"Kemiripan Teks Leksikal ({lexical_item_score:.1f}%)")

            if price_status == "SAFE" and pr_total_amt > 0 and cand_plan_amt > 0:
                explain_points.append("Kesesuaian Nominal Wajar")
            elif price_status == "WARNING_OVER_BUDGET":
                explain_points.append(f"Peringatan: Nominal PR ({pr_total_amt:,.0f}) > 300% Pagu ({cand_plan_amt:,.0f}) (Over-Budget)")
            elif price_status == "WARNING_EXCEEDS_BUDGET":
                explain_points.append(f"Peringatan: Nominal PR ({pr_total_amt:,.0f}) > 300% Pagu ({cand_plan_amt:,.0f})")
            elif price_status == "WARNING_SCALE_MISMATCH":
                explain_points.append(f"Peringatan: Perbedaan skala harga ekstrem")

            explain_summary = " · ".join(explain_points)

            candidate_metadata = {
                "item_name": cand_item,
                "score": final_score,
                "detail_id": pd.id,
                "is_prev": is_prev,
                "lexical_score": lexical_item_score,
                "synonym_score": syn_item_score,
                "price_status": price_status,
                "price_anomaly": price_anomaly,
                "code_match_status": code_match_status,
                "explanation_summary": explain_summary
            }

            scored_candidates.append(candidate_metadata)

        # Urutkan berdasarkan skor tertinggi
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)

        # Ambil Top-5 kandidat unik
        top_candidates = []
        seen_detail_ids = set()
        for cand in scored_candidates:
            if cand["detail_id"] not in seen_detail_ids:
                seen_detail_ids.add(cand["detail_id"])
                top_candidates.append(cand)
            if len(top_candidates) >= 5:
                break

        # Jaminan: Jika PR tidak memiliki kode dan ada item Preventive di bulan ini,
        # pastikan item Preventive tersebut selalu ada di dalam Top-5 rekomendasi!
        if not pr_reg_num and prev_detail_in_month:
            has_prev_in_top = any(t["detail_id"] == prev_detail_in_month.id for t in top_candidates)
            if not has_prev_in_top:
                prev_entry = next((s for s in scored_candidates if s["detail_id"] == prev_detail_in_month.id), None)
                if prev_entry:
                    if len(top_candidates) >= 5:
                        top_candidates[-1] = prev_entry
                    else:
                        top_candidates.append(prev_entry)
                    top_candidates.sort(key=lambda x: x["score"], reverse=True)

        if not top_candidates:
            pr.status_ai = "DONE"
            pr.budget_status = "OOP"
            pr.perlu_review = False
            db.session.commit()
            return {"success": False, "message": "Tidak ada kandidat di kategori ini (Out of Plan)", "status": "OOP"}

        proc_time = time.time() - start_time

        # Evaluasi ambang batas otomatisasi dari SystemSetting
        from models.system_setting import SystemSetting

        raw_thresh = SystemSetting.get_value("auto_mapping_threshold", "85")
        try:
            threshold = float(raw_thresh)
        except (ValueError, TypeError):
            threshold = 85.0

        top_candidate = top_candidates[0]
        top_name = top_candidate["item_name"]
        top_score = top_candidate["score"]
        top_detail_id = top_candidate["detail_id"]
        top_price_anomaly = top_candidate["price_anomaly"]

        # Verifikasi apakah ada perbedaan kode part
        cand_detail = db.session.get(PlanningDetail, top_detail_id) if top_detail_id else None
        top_cand_reg = AdvancedMappingService.extract_code(cand_detail.item) if cand_detail else None
        code_mismatch = (pr_reg_num is not None and top_cand_reg is not None and pr_reg_num != top_cand_reg)

        # Auto-Approval Safety Guard:
        # Score >= threshold AND NO code mismatch AND NO price anomaly
        is_auto_approved = (
            top_score >= threshold and 
            not code_mismatch and 
            not top_price_anomaly and 
            cand_detail is not None
        )

        rank = 1
        for cand in top_candidates:
            score = cand["score"]
            detail_id = cand["detail_id"]
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
            pr.perlu_review = False
            is_manual_category = (pr.metode_klasifikasi == "MANUAL" or pr.kategori_id_koreksi is not None or pr.direview_oleh is not None)
            if not is_manual_category and cand_detail and pr.kategori_id != cand_detail.kategori_id:
                pr.kategori_id = cand_detail.kategori_id

            # Recalculate status realisasi anggaran & konsumsi budget
            BudgetMonitoringService.recalculate_planning_status(top_detail_id)
            BudgetMonitoringService.calculate_budget_consumption(pr)
            db.session.commit()
            print(f"[Auto-Approval] PR#{pr.id} ({description[:40]}) auto-mapped to #{top_detail_id} ({top_score:.1f}% >= {threshold:.0f}%) | {top_candidate['explanation_summary']}")
            return {
                "success": True,
                "message": f"Auto-Approved via Fuzzy ({top_score:.1f}% >= {threshold:.0f}%)",
                "status": "DONE",
                "auto_approved": True,
                "confidence_score": top_score / 100.0,
                "explanation": top_candidate["explanation_summary"]
            }
        else:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            if top_price_anomaly:
                msg = f"Mapped via Fuzzy (Score {top_score:.1f}% >= {threshold:.0f}%, but Price Anomaly detected, Needs Review)"
            else:
                msg = f"Mapped via Fuzzy (Top score {top_score:.1f}% < {threshold:.0f}%, Needs Review)"

            return {
                "success": True,
                "message": msg,
                "status": "NEED_MAPPING",
                "auto_approved": False,
                "confidence_score": top_score / 100.0,
                "explanation": top_candidate["explanation_summary"]
            }



