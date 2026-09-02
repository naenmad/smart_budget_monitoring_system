
import os
import pandas as pd

from werkzeug.utils import secure_filename

from services.planning.planning_header_service import PlanningHeaderService
from services.planning.planning_detail_service import PlanningDetailService
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
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

    @staticmethod
    def _read_planning_df(file_path):
        excel_file = pd.ExcelFile(file_path)
        sheet_name = None
        for name in ["Budget Planning Detail", "Planning", "Sheet1"]:
            if name in excel_file.sheet_names:
                sheet_name = name
                break
        if not sheet_name:
            sheet_name = excel_file.sheet_names[0]

        df = pd.read_excel(file_path, sheet_name=sheet_name)
        df.columns = [
            str(col).strip().lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "")
            for col in df.columns
        ]

        # Column aliases mapping
        col_aliases = {
            "item_description": "item",
            "planning_amount_idr": "planning_amount",
            "remarks_actual_item": "remarks",
            "category": "form"
        }
        df.rename(columns=col_aliases, inplace=True)

        # Filter out total row if present
        if "item" in df.columns:
            df = df[df["item"].notna() & (~df["item"].astype(str).str.upper().str.contains("TOTAL BUDGET"))]
        elif "form" in df.columns:
            df = df[df["form"].notna() & (~df["form"].astype(str).str.upper().str.contains("TOTAL"))]

        return df

    @staticmethod
    def upload_planning(file, periode, user_id):
        if not file:
            return {
                "success": False,
                "message": "file wajib diisi"
            }, 400

        filename = secure_filename(file.filename)
        if filename == "":
            return {
                "success": False,
                "message": "nama file wajib diisi"
            }, 400

        allowed_extension = {"xls", "xlsx"}
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext not in allowed_extension:
            return {
                "success": False,
                "message": "extensi file tidak didukung"
            }, 400

        PlanningUploadService.ensure_upload_folder()
        file_path = os.path.join(PlanningUploadService.UPLOAD_FOLDER, filename)
        file.save(file_path)

        try:
            df = PlanningUploadService._read_planning_df(file_path)
        except Exception as read_err:
            return {
                "success": False,
                "message": f"Gagal membaca file Excel: {str(read_err)}"
            }, 400

        required_columns = ["month", "form", "item", "planning_amount"]
        missing_columns = [col for col in required_columns if col not in df.columns]

        if missing_columns:
            return {
                "success": False,
                "message": "Missing required columns: " + ", ".join(missing_columns)
            }, 400

        # Cek apakah header periode sudah ada (Re-use existing header or create new)
        existing_header = PlanningHeader.query.filter_by(periode=periode).first()
        if existing_header:
            existing_header.filename = filename
            existing_header.user_id = user_id
            existing_header.status = "UPLOADING"
            planning_header_id = existing_header.id
            db.session.commit()
        else:
            header_resp, status_code = PlanningHeaderService.create_planning_header({
                "periode": periode,
                "user_id": user_id,
                "filename": filename
            })
            if not header_resp.get("success"):
                return header_resp, status_code
            planning_header_id = header_resp["data"]["id"]
            db.session.commit()

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
                df = PlanningUploadService._read_planning_df(file_path)

                def get_clean_str(row, col):
                    if col not in row:
                        return ""
                    val = row[col]
                    if isinstance(val, pd.Series):
                        non_na = val.dropna()
                        val = non_na.iloc[0] if not non_na.empty else ""
                    if val is None or pd.isna(val):
                        return ""
                    return str(val).strip()

                def get_clean_float(row, col):
                    if col not in row:
                        return 0.0
                    val = row[col]
                    if isinstance(val, pd.Series):
                        non_na = val.dropna()
                        val = non_na.iloc[0] if not non_na.empty else 0.0
                    if val is None or pd.isna(val):
                        return 0.0
                    try:
                        clean_num = str(val).replace(",", "").strip()
                        return float(clean_num)
                    except Exception:
                        return 0.0

                # Pre-fetch existing planning details for UPSERT (anti-double)
                existing_details = PlanningDetail.query.filter_by(planning_header_id=planning_header_id).all()
                existing_map = {
                    (str(d.month or "").strip().lower(), str(d.item or "").strip().lower()): d
                    for d in existing_details
                }

                for _, row in df.iterrows():
                    form_val = get_clean_str(row, "form")
                    kategori = None
                    if form_val:
                        kategori = Kategori.query.filter(
                            (Kategori.kode == form_val) | (Kategori.nama == form_val)
                        ).first()
                    kategori_id = kategori.id if kategori else 1

                    month_val = get_clean_str(row, "month") or None
                    item_val = get_clean_str(row, "item")
                    plan_amount = get_clean_float(row, "planning_amount")
                    remarks_val = get_clean_str(row, "remarks")

                    if not item_val:
                        continue

                    # Check if already exists (UPSERT)
                    key = (str(month_val or "").strip().lower(), item_val.lower())
                    existing_detail = existing_map.get(key)

                    if existing_detail:
                        existing_detail.planning_amount = plan_amount
                        existing_detail.remarks = remarks_val
                        existing_detail.kategori_id = kategori_id
                    else:
                        new_detail = PlanningDetail(
                            planning_header_id=planning_header_id,
                            kategori_id=kategori_id,
                            month=month_val,
                            item=item_val,
                            planning_amount=plan_amount,
                            remarks=remarks_val
                        )
                        db.session.add(new_detail)
                        existing_map[key] = new_detail

                db.session.commit()
                # Ubah status SUCCES dan commit
                PlanningHeaderService.update_status(planning_header_id, "SUCCES", commit=True)

            except Exception as e:
                import traceback
                db.session.rollback()
                print(f"[PlanningUploadService] Error: {e}")
                traceback.print_exc()
                PlanningHeaderService.update_status(planning_header_id, "FAILED", commit=True)
