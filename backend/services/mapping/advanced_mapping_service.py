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
    def extract_code(text):
        """
        Ambil kode/part number/no registrasi:
        - Angka/kode di dalam kurung: misal '(0117020)', '(\'0217035\')', '( 0217035 )'
        - Kode alfanumerik standalone dengan minimal 4 karakter (misal MSTP6-20, 0217035, '0217035)
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
                return cleaned_code.upper()

        # 2. Hapus tanda petik dari seluruh teks lalu cari pola kode standalone yang mengandung angka (misal '0217035, MSTP6-20, UCP205)
        cleaned_text = text.replace("'", "").replace('"', '').replace('`', '')
        matches = re.findall(r'\b([A-Z0-9\-]*\d+[A-Z0-9\-]*)\b', cleaned_text.upper())
        for m in matches:
            cand = m.strip("-")
            # Minimal 4 karakter dan bukan angka murni 1-3 digit
            if len(cand) >= 4:
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

        # 2. Ekstrak bulan dari request_date menggunakan format English abbreviated (%b)
        #    Contoh: datetime(2026, 8, 1) -> 'Aug'
        month = pr.request_date.strftime("%b") if pr.request_date else None
        print(f"DEBUG [PR#{pr.id}] request_date={pr.request_date} -> month='{month}'")
        print(f"DEBUG [PR#{pr.id}] periode='{periode}' header_id={header.id} kategori_id={pr.kategori_id}")

        if not month:
            pr.status_ai = "NEED_MAPPING"
            db.session.commit()
            return {"success": False, "message": "Tidak bisa ekstrak bulan dari request_date", "status": "NEED_MAPPING"}

        # Cek nilai month yang ada di DB untuk header ini
        existing_months = [pd.month for pd in PlanningDetail.query.filter_by(planning_header_id=header.id).all()]
        print(f"DEBUG [PR#{pr.id}] months di DB untuk header {header.id}: {list(set(existing_months))}")

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
                # Sinkronkan kategori PR mengikuti kategori resmi dari Planning,
                # karena rule keyword ini sudah jadi otoritas final
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

        # 5. Fuzzy matching — Coba bulan yang sama dulu
        candidates = PlanningDetail.query.filter(
            PlanningDetail.planning_header_id == header.id,
            PlanningDetail.kategori_id == pr.kategori_id,
            PlanningDetail.month == month,
            PlanningDetail.status_realisasi != 'CANCELLED'
        ).all()

        pr_reg_num = AdvancedMappingService.extract_code(description)
        print(f"DEBUG [PR#{pr.id}] Code diekstrak: {pr_reg_num}")

        # Helper untuk membersihkan tanda kutip sebelum pencocokan teks
        clean_desc = description.replace("'", "").replace('"', '').replace('`', '').strip()

        # Fungsi helper untuk fuzzy match + adjustment score
        def get_adjusted_fuzzy_results(choices_dict, limit=15):
            # Normalisasi pilihan untuk fuzzy ratio
            normalized_choices = {
                k: v.replace("'", "").replace('"', '').replace('`', '').strip()
                for k, v in choices_dict.items()
            }
            raw_results = process.extract(
                clean_desc,
                normalized_choices,
                scorer=fuzz.token_set_ratio,
                processor=default_process,
                limit=limit
            )
            adjusted = []
            for item_name_clean, score, detail_id in raw_results:
                original_item_name = choices_dict.get(detail_id, item_name_clean)
                new_score = score
                # Jika PR punya reg num, dan item kandidat juga punya reg num yang sama persis
                if pr_reg_num:
                    cand_reg = AdvancedMappingService.extract_code(original_item_name)
                    if cand_reg == pr_reg_num:
                        # Kasih bobot prioritas maksimal (100%)
                        new_score = 100.0
                adjusted.append((original_item_name, new_score, detail_id))
            # Sort ulang berdasarkan score baru
            adjusted.sort(key=lambda x: x[1], reverse=True)
            return adjusted[:5]

        final_results = []
        cross_month = False

        # Inisialisasi choices
        choices = {c.id: c.item for c in candidates}

        # Jika PR memiliki part number / no registrasi unik (misal 0217035):
        # Cari kandidat yang punya kode identik di seluruh bulan pada header & kategori yang sama
        if pr_reg_num:
            all_header_items = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.kategori_id == pr.kategori_id,
                PlanningDetail.status_realisasi != 'CANCELLED'
            ).all()
            for pd in all_header_items:
                if AdvancedMappingService.extract_code(pd.item) == pr_reg_num:
                    choices[pd.id] = pd.item

        if choices:
            results = get_adjusted_fuzzy_results(choices)
            # Jika skor tertinggi lumayan bagus (>= 65), gunakan hasil ini
            if results and results[0][1] >= 65.0:
                final_results = results

        # Fallback: jika tidak ada kandidat di bulan yang sama, ATAU skor terbaik sangat rendah (< 65)
        # Cari di seluruh bulan tapi HILANGKAN DUPLIKAT NAMA
        if not final_results:
            cross_month = True
            all_candidates = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.kategori_id == pr.kategori_id,
                PlanningDetail.status_realisasi != 'CANCELLED'
            ).all()

            unique_choices = {}
            seen_items = set()
            for c in all_candidates:
                normalized_name = c.item.replace("'", "").replace('"', '').strip().upper()
                if normalized_name not in seen_items:
                    seen_items.add(normalized_name)
                    unique_choices[c.id] = c.item

            if unique_choices:
                final_results = get_adjusted_fuzzy_results(unique_choices)

        print(f"DEBUG [PR#{pr.id}] fuzzy candidates (cross_month={cross_month}), top score: {final_results[0][1] if final_results else 0}")

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



