import logging
from models.pr_po_data import PrPoData
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from services.classification_service import ClassificationService
from services.mapping.advanced_mapping_service import AdvancedMappingService
from services.budget_monitoring_service import BudgetMonitoringService
from utils.db import db
from sqlalchemy import extract, func, case

logger = logging.getLogger(__name__)

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
            
        if pr.status_ai not in ["WAITING", "DONE", "NEED_MAPPING"]:
            return {"success": False, "message": f"Status saat ini ({pr.status_ai}) tidak dapat diproses pipeline"}

        # 1. CLASSIFICATION
        if pr.status_ai == "WAITING":
            pr.status_ai = "PROCESSING"
            db.session.flush()
            class_res, _ = ClassificationService.classify_and_save(pr.id)
            if not class_res.get("success"):
                return {"success": False, "message": "Gagal klasifikasi", "step": "CLASSIFICATION"}
                
            # Reload pr state since it was modified
            db.session.refresh(pr)

        # 2 & 3. ADVANCED ITEM MAPPING (Rule + Fuzzy Fallback)
        if not pr.kategori_id:
            return {"success": False, "message": "Menunggu review manual kategori", "status": pr.status_ai}

        mapping_res = AdvancedMappingService.run_mapping(pr)
        if not mapping_res.get("success") or mapping_res.get("status") == "NEED_MAPPING":
            return mapping_res

        # 4. BUDGET MONITORING
        # Kalau mapping success dan status DONE, lanjutkan ke budget monitoring
        budget_res = BudgetMonitoringService.calculate_budget_consumption(pr)
        return budget_res

    @staticmethod
    def process_all_waiting(periode: str):
        """
        Jalankan pipeline untuk semua data dengan status WAITING di periode tersebut.
        """
        prs = PrPoData.query.filter_by(status_ai="WAITING").all()
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
                logger.error(f"Error pipeline PR ID {pr.id}: {e}")
                results["failed"] += 1
                
        return {"success": True, "message": "Batch pipeline selesai", "results": results}

    @staticmethod
    def retry_mapping_only(periode: str):
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
        Mengambil summary untuk Dashboard — semua metrik di-scope per periode (tahun).
        Filter utama: extract(year, PrPoData.request_date) == periode
        untuk PR yang belum matched (OOP/NEED_MAPPING), dan
        join PlanningHeader.periode untuk metrik berbasis planning.
        """
        year = int(periode)

        # Filter base: PR berdasarkan tahun request_date
        year_filter = extract('year', PrPoData.request_date) == year

        # 1. Planning Active (SUCCES) — sudah filter periode
        planning_active = db.session.query(func.count(PlanningHeader.id)).filter(
            PlanningHeader.periode == periode,
            PlanningHeader.status == "SUCCES"
        ).scalar() or 0

        # 2. Total PR di periode ini (berdasarkan request_date)
        total_pr = db.session.query(func.count(PrPoData.id)).filter(
            year_filter
        ).scalar() or 0

        # 3. Total Matched — PR yang sudah punya planning_detail DAN planning-nya di periode ini
        total_matched = db.session.query(func.count(PrPoData.id)).join(
            PlanningDetail, PrPoData.planning_detail_id == PlanningDetail.id
        ).join(
            PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
        ).filter(
            PlanningHeader.periode == periode
        ).scalar() or 0

        # 4. Need Mapping — PR di periode ini yang belum bisa di-mapping
        need_mapping = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.status_ai == "NEED_MAPPING"
        ).scalar() or 0

        # 5. Budget Status — di-scope ke periode via request_date
        on_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "ON_PLAN"
        ).scalar() or 0

        over_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "OVER_PLAN"
        ).scalar() or 0

        under_plan = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "UNDER_PLAN"
        ).scalar() or 0

        oop = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.budget_status == "OOP"
        ).scalar() or 0

        # 6. Remaining Budget — Total Planning Amount (periode) dikurangi total used
        total_planning_amount = db.session.query(func.sum(PlanningDetail.planning_amount)).join(
            PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
        ).filter(
            PlanningHeader.periode == periode,
            PlanningHeader.status == "SUCCES",
            PlanningDetail.status_realisasi != "CANCELLED"
        ).scalar() or 0

        total_used_amount = db.session.query(func.sum(PrPoData.total_price)).filter(
            year_filter,
            PrPoData.budget_status.in_(["ON_PLAN", "OVER_PLAN"])
        ).scalar() or 0

        remaining_budget = total_planning_amount - total_used_amount

        # 7. Tracking Stage — di-scope ke periode via request_date
        # PR Stage: ada PR, belum ada PO
        pr_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.pr_doc_num.isnot(None),
            PrPoData.po_doc_num.is_(None)
        ).scalar() or 0

        # PO Stage: sudah ada PO, belum ada GR
        po_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.po_doc_num.isnot(None),
            PrPoData.gr_legal_number.is_(None)
        ).scalar() or 0

        # GR Stage: sudah ada GR
        gr_stage = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.gr_legal_number.isnot(None)
        ).scalar() or 0

        # 8. Cancelled Planning — sudah filter periode via PlanningHeader
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

        # 9. PR Cancelled langsung — status_ai == CANCELLED, di-scope ke periode via request_date
        cancelled_pr_count = db.session.query(func.count(PrPoData.id)).filter(
            year_filter,
            PrPoData.status_ai == "CANCELLED"
        ).scalar() or 0

        return {
            "success": True,
            "data": {
                "planning_active": planning_active,
                "total_pr": total_pr,
                "total_matched": total_matched,
                "need_mapping": need_mapping,
                "on_plan": on_plan,
                "over_plan": over_plan,
                "under_plan": under_plan,
                "oop": oop,
                "out_of_plan": oop,
                "remaining_budget": float(remaining_budget),
                "stage_pr": pr_stage,
                "stage_po": po_stage,
                "stage_gr": gr_stage,
                "pr_stage": pr_stage,
                "po_stage": po_stage,
                "gr_stage": gr_stage,
                "cancelled_count": cancelled_count,
                "cancelled_amount": cancelled_amount,
                "cancelled_pr": cancelled_pr_count,
                "cancelled_pr_count": cancelled_pr_count
            }
        }

    @staticmethod
    def get_dashboard_summary_monthly(periode: str):
        """
        Breakdown summary per bulan untuk satu tahun (periode).
        """
        year = int(periode)
        base_filter = extract('year', PrPoData.request_date) == year

        rows = db.session.query(
        extract('month', PrPoData.request_date).label('month_num'),
        func.count(PrPoData.id).label('total_pr'),
        func.sum(case((PrPoData.status_ai == 'NEED_MAPPING', 1), else_=0)).label('need_mapping'),
        func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'OOP'), 1), else_=0)).label('out_of_plan'),
        func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'ON_PLAN'), 1), else_=0)).label('on_plan'),
        func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'OVER_PLAN'), 1), else_=0)).label('over_plan'),
        func.sum(case((db.and_(PrPoData.status_ai == 'DONE', PrPoData.budget_status == 'UNDER_PLAN'), 1), else_=0)).label('under_plan'),
        ).filter(base_filter).group_by('month_num').order_by('month_num').all()

        MONTH_NAMES = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',
                   7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}

        return {
        "success": True,
        "data": [
            {
                "month": MONTH_NAMES[int(r.month_num)],
                "total_pr": r.total_pr,
                "need_mapping": r.need_mapping,
                "out_of_plan": r.out_of_plan,
                "on_plan": r.on_plan,
                "over_plan": r.over_plan,
                "under_plan": r.under_plan,
            }
            for r in rows
        ]
    }