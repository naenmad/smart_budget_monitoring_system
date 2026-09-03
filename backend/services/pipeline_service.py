import logging
from models.pr_po_data import PrPoData
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from services.classification_service import ClassificationService
from services.mapping.advanced_mapping_service import AdvancedMappingService
from services.budget_monitoring_service import BudgetMonitoringService
from utils.db import db
from sqlalchemy import extract, func, case

from models.kategori import Kategori

logger = logging.getLogger(__name__)

MONTH_ABBR_TO_NUM = {
    'jan': 1, 'january': 1, 'januari': 1, '1': 1, '01': 1,
    'feb': 2, 'february': 2, 'februari': 2, '2': 2, '02': 2,
    'mar': 3, 'march': 3, 'maret': 3, '3': 3, '03': 3,
    'apr': 4, 'april': 4, '4': 4, '04': 4,
    'may': 5, 'mei': 5, '5': 5, '05': 5,
    'jun': 6, 'june': 6, 'juni': 6, '6': 6, '06': 6,
    'jul': 7, 'july': 7, 'juli': 7, '7': 7, '07': 7,
    'aug': 8, 'august': 8, 'agustus': 8, 'agt': 8, '8': 8, '08': 8,
    'sep': 9, 'september': 9, '9': 9, '09': 9,
    'oct': 10, 'october': 10, 'oktober': 10, 'okt': 10, '10': 10,
    'nov': 11, 'november': 11, '11': 11,
    'dec': 12, 'december': 12, 'desember': 12, 'des': 12, '12': 12
}
MONTH_NAMES = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
}


class PipelineService:
    @staticmethod
    def process_waiting_pr(pr_id: int, periode: str) -> dict:
        """
        Menjalankan full pipeline untuk satu PR (mulai dari WAITING -> ON_PLAN / OVER_PLAN).
        Pipeline:
        1. Classification -> PROCESSING -> DONE
        2. Item Mapping -> NEED_MAPPING (jika gagal)
        3. Planning Matching -> (assign planning_detail_id)
        4. Budget Monitoring -> budget_status = ON_PLAN / OVER_PLAN / UNDER_PLAN
        """
        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            return {"success": False, "message": "PR tidak ditemukan"}
            
        if pr.status_ai not in ["WAITING", "PROCESSING", "DONE", "NEED_MAPPING"]:
            return {"success": False, "message": f"Status saat ini ({pr.status_ai}) tidak dapat diproses pipeline"}

        try:
            # 1. Step Classification (jika belum ada kategori atau masih WAITING / PROCESSING)
            if not pr.kategori_id or pr.status_ai in ["WAITING", "PROCESSING"]:
                class_res, _ = ClassificationService.classify_and_save(pr.id)
                if not class_res.get("success"):
                    return {"success": False, "message": "Gagal klasifikasi", "step": "CLASSIFICATION"}
                db.session.refresh(pr)

            # 2. Step Mapping & Matching ke Planning Detail
            map_res = AdvancedMappingService.run_mapping(pr)
            
            if not map_res.get("success") or map_res.get("status") == "NEED_MAPPING":
                return map_res

            # 3. Step Budget Consumption Monitoring (jika berhasil mapping ke planning_detail)
            if pr.planning_detail_id and pr.budget_status != "OOP":
                BudgetMonitoringService.calculate_budget_consumption(pr)

            return {
                "success": True,
                "status": pr.status_ai,
                "budget_status": pr.budget_status,
                "planning_detail_id": pr.planning_detail_id,
                "message": "PR berhasil diproses oleh pipeline"
            }

        except Exception as e:
            logger.error(f"Error processing pipeline for PR {pr_id}: {e}")
            db.session.rollback()
            return {"success": False, "status": "FAILED", "message": str(e)}

    @staticmethod
    def process_upload_batch(upload_id: int, periode: str = "2026") -> dict:
        """
        Menjalankan pipeline otomatis untuk seluruh PR dalam satu batch upload_id tertentu.
        """
        prs = PrPoData.query.filter_by(upload_id=upload_id).all()
        results = {"success": 0, "failed": 0, "need_mapping": 0}
        
        for pr in prs:
            try:
                res = PipelineService.process_waiting_pr(pr.id, periode)
                if res.get("status") == "NEED_MAPPING":
                    results["need_mapping"] += 1
                elif res.get("success"):
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Error processing PR ID {pr.id} in upload batch {upload_id}: {e}")
                results["failed"] += 1
                
        return {"success": True, "message": f"Upload batch {upload_id} pipeline selesai", "results": results}

    @staticmethod
    def process_all_waiting(periode: str) -> dict:
        """
        Menjalankan pipeline untuk semua PR berstatus WAITING atau PROCESSING untuk periode tertentu.
        """
        prs = PrPoData.query.filter(PrPoData.status_ai.in_(["WAITING", "PROCESSING"])).all()
        results = {"success": 0, "failed": 0, "need_mapping": 0}
        
        for pr in prs:
            try:
                res = PipelineService.process_waiting_pr(pr.id, periode)
                if res.get("status") == "NEED_MAPPING":
                    results["need_mapping"] += 1
                elif res.get("success"):
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Error bulk processing PR ID {pr.id}: {e}")
                results["failed"] += 1
                
        return {"success": True, "message": "Batch processing pipeline selesai", "results": results}

    @staticmethod
    def retry_mapping_only(periode: str) -> dict:
        """
        Jalankan ulang HANYA proses mapping untuk data yang berstatus NEED_MAPPING.
        """
        prs = PrPoData.query.filter_by(status_ai="NEED_MAPPING").all()
        results = {"success": 0, "failed": 0, "need_mapping": 0}
        
        for pr in prs:
            try:
                res = PipelineService.process_waiting_pr(pr.id, periode)
                if res.get("status") == "NEED_MAPPING":
                    results["need_mapping"] += 1
                elif res.get("success"):
                    results["success"] += 1
                else:
                    results["failed"] += 1
            except Exception as e:
                logger.error(f"Error retry mapping PR ID {pr.id}: {e}")
                results["failed"] += 1
                
        return {"success": True, "message": "Retry mapping selesai", "results": results}

    @staticmethod
    def get_dashboard_summary(periode: str):
        """
        Mengambil ringkasan metrik PR Pipeline dan Budget Realization untuk Dashboard.
        Semua metrik konsisten dan saling melengkapi (Total = Matched + Need Mapping + In Pipeline + OOP + Cancelled).
        """
        year = int(periode)
        year_filter = extract('year', PrPoData.request_date) == year

        # 1. Total PR Terunggah di periode ini
        total_pr = db.session.query(func.count(PrPoData.id)).filter(
            year_filter
        ).scalar() or 0

        # 2. Total PR Ter-mapping ke Item Planning (On Plan, Over Plan, Under Plan)
        total_matched = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.planning_detail_id.isnot(None),
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        # 3. Need Mapping (belum ter-mapping / perlu review)
        need_mapping = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.status_ai == "NEED_MAPPING"
        ).scalar() or 0

        # 4. Dalam Antrean / Sedang Diproses Pipeline AI (WAITING / PROCESSING)
        in_pipeline = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.status_ai.in_(["WAITING", "PROCESSING"])
        ).scalar() or 0

        # 5. Out of Plan (OOP / Non-Budget)
        oop = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "OOP",
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        # 6. Dibatalkan Langsung
        cancelled_pr = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.status_ai == "CANCELLED"
        ).scalar() or 0

        # Sub-status detail dari PR Matched
        on_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "ON_PLAN",
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        over_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "OVER_PLAN",
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        under_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "UNDER_PLAN",
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        # 7. Tracking Stage
        pr_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.pr_doc_num.isnot(None),
            PrPoData.po_doc_num.is_(None),
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        po_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.po_doc_num.isnot(None),
            PrPoData.gr_legal_number.is_(None),
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        gr_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.gr_legal_number.isnot(None),
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        # 8. Cancelled Planning Items
        cancelled_items = db.session.query(
            func.count(PlanningDetail.id),
            func.sum(PlanningDetail.planning_amount)
        ).join(
            PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
        ).filter(
            PlanningHeader.periode == periode,
            PlanningDetail.status_realisasi == "CANCELLED"
        ).first()

        cancelled_count = cancelled_items[0] or 0
        cancelled_amount = float(cancelled_items[1] or 0)

        # 9. Remaining Budget Planning
        total_planning_amount = db.session.query(func.sum(PlanningDetail.planning_amount)).join(
            PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
        ).filter(
            PlanningHeader.periode == periode,
            PlanningHeader.status.in_(["SUCCES", "SUCCESS"]),
            PlanningDetail.status_realisasi != "CANCELLED"
        ).scalar() or 0

        total_used_amount = db.session.query(func.sum(PrPoData.total_price)).filter(
            year_filter,
            PrPoData.budget_status.in_(["ON_PLAN", "OVER_PLAN"]),
            PrPoData.status_ai != "CANCELLED"
        ).scalar() or 0

        remaining_budget = total_planning_amount - total_used_amount

        return {
            "success": True,
            "data": {
                "total_pr": total_pr,
                "total_matched": total_matched,
                "matched_pr": total_matched,
                "need_mapping": need_mapping,
                "in_pipeline": in_pipeline,
                "oop": oop,
                "out_of_plan": oop,
                "cancelled_pr": cancelled_pr,
                "cancelled_pr_count": cancelled_pr,
                "on_plan": on_plan,
                "over_plan": over_plan,
                "under_plan": under_plan,
                "stage_pr": pr_stage,
                "stage_po": po_stage,
                "stage_gr": gr_stage,
                "pr_stage": pr_stage,
                "po_stage": po_stage,
                "gr_stage": gr_stage,
                "cancelled_count": cancelled_count,
                "cancelled_amount": cancelled_amount,
                "remaining_budget": float(remaining_budget)
            }
        }

    @staticmethod
    def get_dashboard_summary_monthly(periode: str):
        """
        Breakdown nominal & kuantitas per bulan untuk satu tahun (periode):
        - Planned Budget (CAPEX, OPEX, Total)
        - Actual Terpakai PR Komitmen (CAPEX, OPEX, Total)
        - Actual Terpakai GR Realisasi Fisik (CAPEX, OPEX, Total)
        - Persentase Realisasi per bulan
        """
        year = int(periode)
        year_filter = extract('year', PrPoData.request_date) == year

        # 1. Ambil data Planned Budget dari PlanningDetail per bulan & per tipe form
        planning_rows = (
            db.session.query(
                PlanningDetail.month,
                Kategori.tipe_formulir,
                func.sum(PlanningDetail.planning_amount).label('total_plan')
            )
            .join(PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id)
            .outerjoin(Kategori, PlanningDetail.kategori_id == Kategori.id)
            .filter(
                PlanningHeader.periode == periode,
                PlanningHeader.status.in_(["SUCCES", "SUCCESS"]),
                PlanningDetail.status_realisasi != "CANCELLED"
            )
            .group_by(PlanningDetail.month, Kategori.tipe_formulir)
            .all()
        )

        # Map planned budget: monthly_plan[month_num]['CAPEX'|'OPEX']
        monthly_plan = {m: {'CAPEX': 0.0, 'OPEX': 0.0} for m in range(1, 13)}
        for row in planning_rows:
            raw_month = str(row.month).strip().lower() if row.month else ''
            m_num = MONTH_ABBR_TO_NUM.get(raw_month)
            if m_num and 1 <= m_num <= 12:
                tipe = 'CAPEX' if row.tipe_formulir == 'CAPEX' else 'OPEX'
                monthly_plan[m_num][tipe] += float(row.total_plan or 0)

        # 2. Ambil data Actual PR (semua PR berstatus DONE) per bulan & per tipe form
        actual_pr_rows = (
            db.session.query(
                extract('month', PrPoData.request_date).label('month_num'),
                Kategori.tipe_formulir,
                func.sum(PrPoData.total_price).label('total_actual_pr'),
                func.count(PrPoData.id).label('pr_count')
            )
            .outerjoin(Kategori, PrPoData.kategori_id == Kategori.id)
            .filter(
                year_filter,
                PrPoData.status_ai == "DONE"
            )
            .group_by('month_num', Kategori.tipe_formulir)
            .all()
        )

        monthly_pr = {m: {'CAPEX': 0.0, 'OPEX': 0.0, 'count': 0} for m in range(1, 13)}
        for row in actual_pr_rows:
            m_num = int(row.month_num) if row.month_num else None
            if m_num and 1 <= m_num <= 12:
                tipe = 'CAPEX' if row.tipe_formulir == 'CAPEX' else 'OPEX'
                monthly_pr[m_num][tipe] += float(row.total_actual_pr or 0)
                monthly_pr[m_num]['count'] += int(row.pr_count or 0)

        # 3. Ambil data Actual GR (PR berstatus DONE dengan nomor GR) per bulan & per tipe form
        actual_gr_rows = (
            db.session.query(
                extract('month', PrPoData.request_date).label('month_num'),
                Kategori.tipe_formulir,
                func.sum(PrPoData.total_price).label('total_actual_gr')
            )
            .outerjoin(Kategori, PrPoData.kategori_id == Kategori.id)
            .filter(
                year_filter,
                PrPoData.status_ai == "DONE",
                PrPoData.gr_legal_number.isnot(None)
            )
            .group_by('month_num', Kategori.tipe_formulir)
            .all()
        )

        monthly_gr = {m: {'CAPEX': 0.0, 'OPEX': 0.0} for m in range(1, 13)}
        for row in actual_gr_rows:
            m_num = int(row.month_num) if row.month_num else None
            if m_num and 1 <= m_num <= 12:
                tipe = 'CAPEX' if row.tipe_formulir == 'CAPEX' else 'OPEX'
                monthly_gr[m_num][tipe] += float(row.total_actual_gr or 0)

        # 4. Ambil status counts PR per bulan (Need Mapping, OOP, On Plan, Over Plan)
        status_rows = (
            db.session.query(
                extract('month', PrPoData.request_date).label('month_num'),
                func.count(PrPoData.id).label('total_pr'),
                func.sum(case((PrPoData.status_ai == 'NEED_MAPPING', 1), else_=0)).label('need_mapping'),
                func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'OOP'), 1), else_=0)).label('out_of_plan'),
                func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'ON_PLAN'), 1), else_=0)).label('on_plan'),
                func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'OVER_PLAN'), 1), else_=0)).label('over_plan'),
                func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'UNDER_PLAN'), 1), else_=0)).label('under_plan'),
            )
            .filter(year_filter)
            .group_by('month_num')
            .all()
        )
        status_map = {int(r.month_num): r for r in status_rows if r.month_num}

        # 5. Gabungkan data per 12 bulan
        monthly_data = []
        for m in range(1, 13):
            month_label = MONTH_NAMES[m]
            c_plan = monthly_plan[m]['CAPEX']
            c_pr = monthly_pr[m]['CAPEX']
            c_gr = monthly_gr[m]['CAPEX']
            c_persen_pr = round((c_pr / c_plan) * 100) if c_plan > 0 else 0
            c_persen_gr = round((c_gr / c_plan) * 100) if c_plan > 0 else 0

            o_plan = monthly_plan[m]['OPEX']
            o_pr = monthly_pr[m]['OPEX']
            o_gr = monthly_gr[m]['OPEX']
            o_persen_pr = round((o_pr / o_plan) * 100) if o_plan > 0 else 0
            o_persen_gr = round((o_gr / o_plan) * 100) if o_plan > 0 else 0

            tot_plan = c_plan + o_plan
            tot_pr = c_pr + o_pr
            tot_gr = c_gr + o_gr
            tot_persen_pr = round((tot_pr / tot_plan) * 100) if tot_plan > 0 else 0
            tot_persen_gr = round((tot_gr / tot_plan) * 100) if tot_plan > 0 else 0

            st = status_map.get(m)

            monthly_data.append({
                "month": month_label,
                "month_num": m,
                "capex": {
                    "plan": c_plan,
                    "actual_pr": c_pr,
                    "actual_gr": c_gr,
                    "persen_pr": c_persen_pr,
                    "persen_gr": c_persen_gr,
                },
                "opex": {
                    "plan": o_plan,
                    "actual_pr": o_pr,
                    "actual_gr": o_gr,
                    "persen_pr": o_persen_pr,
                    "persen_gr": o_persen_gr,
                },
                "total": {
                    "plan": tot_plan,
                    "actual_pr": tot_pr,
                    "actual_gr": tot_gr,
                    "persen_pr": tot_persen_pr,
                    "persen_gr": tot_persen_gr,
                },
                # Backward compatibility for status counts
                "total_pr": st.total_pr if st else 0,
                "need_mapping": st.need_mapping if st else 0,
                "out_of_plan": st.out_of_plan if st else 0,
                "on_plan": st.on_plan if st else 0,
                "over_plan": st.over_plan if st else 0,
                "under_plan": st.under_plan if st else 0,
            })

        return {
            "success": True,
            "periode": periode,
            "data": monthly_data
        }