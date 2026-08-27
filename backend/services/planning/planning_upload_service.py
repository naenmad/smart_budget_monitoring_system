
import os
import pandas as pd

from werkzeug.utils import secure_filename

from services.planning.planning_header_service import PlanningHeaderService
from services.planning.planning_detail_service import PlanningDetailService
from models.kategori import Kategori
from utils.db import db

class PlanningUploadService:

    UPLOAD_FOLDER = os.path.join(
        os.getcwd(),
        "uploads",
        "planning"
    )
    
    @staticmethod
    def ensure_upload_folder():
        if not os.path.exists(PlanningUploadService.UPLOAD_FOLDER):
            os.makedirs(PlanningUploadService.UPLOAD_FOLDER)
    @staticmethod
    def upload_planning(file,periode,user_id):
        if not file:
            return{
                "success":False,
                "message":"file wajib diisi"
            },400

        filename= secure_filename(file.filename)

        if filename =="":
            return{
                "success":False,
                "message":"nama file wajib diisi"
            },400
        allowed_extension ={
            "xls",
            "xlsx"
        }
        ext = filename.rsplit(".", 1)[1].lower()

        if ext not in allowed_extension:
            return{
                "success":False,
                "message":"extensi file tidak didukung"
            },400

        PlanningUploadService.ensure_upload_folder()

        file_path = os.path.join(
            PlanningUploadService.UPLOAD_FOLDER,
            filename
        )
        file.save(file_path)

        df = pd.read_excel(file_path)

        df.columns =[
            str(col).strip().lower().replace(" ", "_").replace("-", "_")
            for col in df.columns
        ]
        required_columns =[
            "month",
            "form",
            "item",
            "planning_amount",
            "remarks"
        ]
        missing_columns = [
            column for column in required_columns
            if column not in df.columns
        ]

        if missing_columns:
            return {
                "success": False,
                "message": "Missing required columns: " + ", ".join(missing_columns)
            }, 400

        header_resp, status_code = PlanningHeaderService.create_planning_header({
            "periode": periode,
            "user_id": user_id,
            "filename": filename
        })
        
        if not header_resp.get("success"):
            return header_resp, status_code

        planning_header_id = header_resp["data"]["id"]
        try:
            db.session.commit()  # Ensure header is committed
        except Exception as commit_err:
            db.session.rollback()
            return {"success": False, "message": f"Gagal menyimpan header planning: {str(commit_err)}"}, 500

        from flask import current_app
        import threading
        
        app = current_app._get_current_object()
        
        # Start background thread
        thread = threading.Thread(
            target=PlanningUploadService._process_excel_background,
            args=(app, file_path, planning_header_id)
        )
        thread.start()

        return {
            "success": True,
            "message": "File sedang diproses di background",
            "data": {
                "planning_header_id": planning_header_id,
                "status": "UPLOADING"
            }
        }, 202

    @staticmethod
    def _process_excel_background(app, file_path, planning_header_id):
        with app.app_context():
            try:
                df = pd.read_excel(file_path)
                df.columns = [
                    str(col).strip().lower().replace(" ", "_").replace("-", "_")
                    for col in df.columns
                ]

                for _, row in df.iterrows():
                    kategori = Kategori.query.filter_by(kode=row["form"]).first()
                    kategori_id = kategori.id if kategori else None

                    detail_resp, detail_status = PlanningDetailService.create_planning_detail({
                        "planning_header_id": planning_header_id,
                        "kategori_id": kategori_id,
                        "month": str(row["month"]).strip() if pd.notna(row["month"]) else None,
                        "item": row["item"],
                        "planning_amount": row["planning_amount"],
                        "remarks": row["remarks"] if pd.notna(row["remarks"]) else ""
                    })

                    if not detail_resp.get("success"):
                        raise Exception(detail_resp.get("message", "Error saving detail"))

                # Ubah status SUCCES dan commit
                PlanningHeaderService.update_status(planning_header_id, "SUCCES", commit=True)

            except Exception as e:
                db.session.rollback()
                PlanningHeaderService.update_status(planning_header_id, "FAILED", commit=True)
