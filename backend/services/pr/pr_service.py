from models.pr_po_data import PrPoData
from utils.db import db


class PrService:
    """
    CRUD dan query umum untuk PrPoData.
    """

    @staticmethod
    def get_all(upload_id=None, status_ai=None, tracking_stage=None, kategori_id=None, search=None, filter_status=None, page=1, per_page=50):
        query = PrPoData.query

        if upload_id:
            query = query.filter(PrPoData.upload_id == upload_id)
        if status_ai:
            query = query.filter(PrPoData.status_ai == status_ai)
        if kategori_id:
            query = query.filter(PrPoData.kategori_id == kategori_id)
        if search:
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    PrPoData.description.ilike(f"%{search}%"),
                    PrPoData.pr_doc_num.ilike(f"%{search}%"),
                    PrPoData.comment_text.ilike(f"%{search}%")
                )
            )
            
        if filter_status == "PENDING":
            query = query.filter(PrPoData.perlu_review == True)
        elif filter_status == "DONE":
            query = query.filter(PrPoData.status_ai == "DONE", PrPoData.perlu_review == False)
        elif filter_status == "CANCELLED":
            query = query.filter(PrPoData.status_ai == "CANCELLED")
        elif filter_status in ["ON_PLAN", "OVER_PLAN", "OOP"]:
            query = query.filter(PrPoData.budget_status == filter_status, PrPoData.perlu_review == False)
            
        if tracking_stage == "GR":
            query = query.filter(PrPoData.gr_legal_number.isnot(None))
        elif tracking_stage == "PO":
            query = query.filter(PrPoData.po_doc_num.isnot(None), PrPoData.gr_legal_number.is_(None))
        elif tracking_stage == "PR":
            query = query.filter(PrPoData.pr_doc_num.isnot(None), PrPoData.po_doc_num.is_(None), PrPoData.gr_legal_number.is_(None))

        pagination = query.order_by(PrPoData.id.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return {
            "success": True,
            "data": [pr.to_dict() for pr in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        }, 200

    @staticmethod
    def get_by_id(pr_id: int):
        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            return {"success": False, "message": "PR tidak ditemukan"}, 404
        return {"success": True, "data": pr.to_dict()}, 200

    @staticmethod
    def cancel_pr(pr_id: int, user_id: int, alasan: str = None):
        """
        Membatalkan sebuah PR secara langsung.
        Aturan: hanya boleh dibatalkan jika procurement_status == PR_CREATED
        (belum ada PO / GR / Invoice — belum ada komitmen finansial).
        """
        from datetime import datetime

        if not user_id:
            return {"success": False, "message": "user_id tidak valid — pastikan Anda sudah login"}, 400

        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            return {"success": False, "message": "PR tidak ditemukan"}, 404

        # Sudah dibatalkan sebelumnya
        if pr.status_ai == "CANCELLED":
            return {"success": False, "message": "PR ini sudah dibatalkan sebelumnya"}, 400

        # Tolak jika sudah ada komitmen finansial (PO / GR / selesai)
        BLOCKED_STATUS = {"PARTIAL_RECEIVED", "GOODS_RECEIVED", "COMPLETED"}
        if pr.procurement_status in BLOCKED_STATUS:
            return {
                "success": False,
                "message": (
                    f"PR tidak bisa dibatalkan — status pengadaan sudah '{pr.procurement_status}'. "
                    "Pembatalan hanya diperbolehkan sebelum PO diterbitkan."
                )
            }, 409

        # Simpan audit dan set status
        pr.status_ai = "CANCELLED"
        pr.dibatalkan_oleh = user_id
        pr.dibatalkan_at = datetime.utcnow()
        pr.alasan_pembatalan = alasan or "Dibatalkan oleh admin"
        # Putuskan relasi ke planning_detail agar tidak mengotori perhitungan budget
        pr.planning_detail_id = None
        pr.budget_status = None

        db.session.commit()

        return {
            "success": True,
            "message": "PR berhasil dibatalkan",
            "data": {
                "id": pr.id,
                "pr_doc_num": pr.pr_doc_num,
                "status_ai": pr.status_ai,
                "dibatalkan_at": pr.dibatalkan_at.isoformat(),
                "alasan_pembatalan": pr.alasan_pembatalan,
            }
        }, 200

    @staticmethod
    def update_kategori(pr_id: int, kategori_id: int, user_id: int):
        """Manual override kategori oleh reviewer."""
        from datetime import datetime
        from services.mapping.advanced_mapping_service import AdvancedMappingService

        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            return {"success": False, "message": "PR tidak ditemukan"}, 404

        pr.kategori_id = kategori_id
        pr.kategori_id_koreksi = kategori_id
        pr.direview_oleh = user_id
        pr.direview_at = datetime.utcnow()
        pr.perlu_review = False  # Set False karena user sudah melakukan review klasifikasi secara manual

        db.session.commit()

        # Jalankan ulang mapping dengan kategori yang sudah dikoreksi
        AdvancedMappingService.run_mapping(pr)

        return {
            "success": True,
            "message": "Kategori PR berhasil diupdate",
            "data": pr.to_dict()
        }, 200

    @staticmethod
    def edit_status(pr_id: int, user_id: int, status_type: str, planning_detail_id: int = None, alasan: str = None):
        """
        Koreksi status PR secara komprehensif:
        - status_type: 'PLANNING', 'OOP', 'NEED_MAPPING', 'CANCELLED', 'RESTORE'
        """
        from datetime import datetime
        from models.planning_detail import PlanningDetail
        from models.mapping_log import MappingLog
        from services.budget_monitoring_service import BudgetMonitoringService
        from services.mapping.advanced_mapping_service import AdvancedMappingService

        pr = db.session.get(PrPoData, pr_id)
        if not pr:
            return {"success": False, "message": "PR tidak ditemukan"}, 404

        old_planning_detail_id = pr.planning_detail_id
        status_type = (status_type or "").upper()

        if status_type == "CANCELLED":
            return PrService.cancel_pr(pr_id, user_id, alasan)

        if status_type == "RESTORE":
            # Pulihkan PR dari status pembatalan
            pr.dibatalkan_oleh = None
            pr.dibatalkan_at = None
            pr.alasan_pembatalan = None
            pr.status_ai = "NEED_MAPPING"
            pr.budget_status = None
            pr.perlu_review = True
            pr.direview_oleh = user_id
            pr.direview_at = datetime.utcnow()
            db.session.commit()

            # Jalankan ulang mapping
            AdvancedMappingService.run_mapping(pr)
            return {
                "success": True,
                "message": "PR berhasil dipulihkan ke antrean aktif dan di-mapping ulang",
                "data": pr.to_dict()
            }, 200

        if status_type == "OOP":
            pr.planning_detail_id = None
            pr.status_ai = "DONE"
            pr.budget_status = "OOP"
            pr.perlu_review = False
            pr.dibatalkan_oleh = None
            pr.dibatalkan_at = None
            pr.alasan_pembatalan = None
            pr.direview_oleh = user_id
            pr.direview_at = datetime.utcnow()

            new_log = MappingLog(
                pr_po_data_id=pr.id,
                method="MANUAL",
                planning_detail_hasil_id=None,
                confidence_score=None,
                rank_no=None,
                is_selected=True,
                processing_time=0.0
            )
            db.session.add(new_log)

            if old_planning_detail_id:
                BudgetMonitoringService.recalculate_planning_status(old_planning_detail_id)

            db.session.commit()
            return {
                "success": True,
                "message": "Status PR berhasil diubah menjadi OOP (Out of Plan)",
                "data": pr.to_dict()
            }, 200

        if status_type == "PLANNING":
            if not planning_detail_id:
                return {"success": False, "message": "planning_detail_id wajib dipilih untuk status Planning"}, 400

            detail = db.session.get(PlanningDetail, planning_detail_id)
            if not detail:
                return {"success": False, "message": "Item Planning Detail tidak ditemukan"}, 404

            if pr.kategori_id != detail.kategori_id:
                pr.kategori_id_koreksi = detail.kategori_id
            pr.kategori_id = detail.kategori_id
            pr.planning_detail_id = detail.id
            pr.status_ai = "DONE"
            pr.perlu_review = False
            pr.dibatalkan_oleh = None
            pr.dibatalkan_at = None
            pr.alasan_pembatalan = None
            pr.direview_oleh = user_id
            pr.direview_at = datetime.utcnow()

            new_log = MappingLog(
                pr_po_data_id=pr.id,
                method="MANUAL",
                planning_detail_hasil_id=detail.id,
                confidence_score=None,
                rank_no=None,
                is_selected=True,
                processing_time=0.0
            )
            db.session.add(new_log)

            BudgetMonitoringService.recalculate_planning_status(detail.id)
            if old_planning_detail_id and old_planning_detail_id != detail.id:
                BudgetMonitoringService.recalculate_planning_status(old_planning_detail_id)

            BudgetMonitoringService.calculate_budget_consumption(pr)
            db.session.commit()

            return {
                "success": True,
                "message": f"Status PR berhasil diubah dan ditautkan ke '{detail.item}'",
                "data": pr.to_dict()
            }, 200

        if status_type in ["NEED_MAPPING", "PENDING"]:
            pr.planning_detail_id = None
            pr.status_ai = "NEED_MAPPING"
            pr.budget_status = None
            pr.perlu_review = True
            pr.dibatalkan_oleh = None
            pr.dibatalkan_at = None
            pr.alasan_pembatalan = None
            pr.direview_oleh = user_id
            pr.direview_at = datetime.utcnow()

            new_log = MappingLog(
                pr_po_data_id=pr.id,
                method="MANUAL",
                planning_detail_hasil_id=None,
                confidence_score=None,
                rank_no=None,
                is_selected=False,
                processing_time=0.0
            )
            db.session.add(new_log)

            if old_planning_detail_id:
                BudgetMonitoringService.recalculate_planning_status(old_planning_detail_id)

            db.session.commit()
            return {
                "success": True,
                "message": "PR berhasil dikembalikan ke antrean Review Mapping",
                "data": pr.to_dict()
            }, 200

        return {"success": False, "message": f"Tipe status '{status_type}' tidak valid"}, 400

    @staticmethod
    def get_summary_by_upload(upload_id: int):
        """Ringkasan status AI per upload."""
        from sqlalchemy import func

        rows = (
            db.session.query(PrPoData.status_ai, func.count(PrPoData.id))
            .filter(PrPoData.upload_id == upload_id)
            .group_by(PrPoData.status_ai)
            .all()
        )

        summary = {status: count for status, count in rows}

        return {
            "success": True,
            "upload_id": upload_id,
            "summary": summary
        }, 200
