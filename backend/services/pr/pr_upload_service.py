import os
import pandas as pd
from decimal import Decimal
from datetime import datetime
from werkzeug.utils import secure_filename

from models.pr_po_data import PrPoData
from models.upload_history import UploadHistory
from services.planning.planning_matching_service import PlanningMatchingService
from utils.db import db


class PrUploadService:
    """
    Alur:
        Upload Excel PR
            │
            ▼
        Validasi file
            │
            ▼
        Simpan file & buat UploadHistory
            │
            ▼
        Read Excel → loop setiap row
            │
            ▼
        Simpan PrPoData (flush)
            │
            ▼
        PlanningMatchingService.process_pr()
            │
            ▼
        Update hasil matching ke PrPoData
            │
            ▼
        Commit semua
    """

    UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads", "pr")

    REQUIRED_COLUMNS = [
        "pr_doc_num",
        "description",
        "total_price",
        "request_date",
    ]

    COLUMN_MAP = {
        "pr_doc_num"     : "pr_doc_num",
        "po_doc_num"     : "po_doc_num",
        "requisition_id" : "requisition_id",
        "request_date"   : "request_date",
        "order_date"     : "order_date",
        "description"    : "description",
        "comment_text"   : "comment_text",
        "supplier_name"  : "supplier_name",
        "qty"            : "qty",
        "uom"            : "uom",
        "unit_price"     : "unit_price",
        "total_price"    : "total_price",
        "gr_legal_number": "gr_legal_number",
        "packing_slip"   : "packing_slip",
        "receipt_date"   : "receipt_date",
        "invoice"        : "invoice",
        "invoice_date"   : "invoice_date",
        "pr_status"      : "pr_status",
        "po_status"      : "po_status",
    }

    @staticmethod
    def ensure_upload_folder():
        if not os.path.exists(PrUploadService.UPLOAD_FOLDER):
            os.makedirs(PrUploadService.UPLOAD_FOLDER)

    @staticmethod
    def upload(file, user_id: int, periode: str) -> tuple[dict, int]:
        # --- Validasi file ---
        if not file:
            return {"success": False, "message": "File wajib diisi"}, 400

        if not periode:
            return {"success": False, "message": "Periode wajib diisi"}, 400

        filename = secure_filename(file.filename)
        if not filename:
            return {"success": False, "message": "Nama file tidak valid"}, 400

        ext = filename.rsplit(".", 1)[-1].lower()
        if ext not in {"xls", "xlsx"}:
            return {"success": False, "message": "Ekstensi file tidak didukung"}, 400

        # --- Simpan file ---
        PrUploadService.ensure_upload_folder()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stored_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(PrUploadService.UPLOAD_FOLDER, stored_filename)
        file.save(file_path)

        # --- Buat UploadHistory ---
        history = UploadHistory(
            user_id=user_id,
            original_filename=filename,
            stored_filename=stored_filename,
            status="UPLOADING",
            total_data=0
        )
        db.session.add(history)
        db.session.flush()
        upload_id = history.id
        db.session.commit()

        from flask import current_app
        import threading
        
        app = current_app._get_current_object()
        
        # Start background thread
        thread = threading.Thread(
            target=PrUploadService._process_excel_background,
            args=(app, file_path, upload_id, periode)
        )
        thread.start()

        return {
            "success": True,
            "message": "File sedang diproses di background",
            "data": {
                "upload_id": upload_id,
                "status": "UPLOADING"
            }
        }, 202

    @staticmethod
    def _read_pr_df(file_path):
        excel_file = pd.ExcelFile(file_path)
        sheet_name = None
        for name in ["PR to Invoice Tracking", "Results", "Sheet1"]:
            if name in excel_file.sheet_names:
                sheet_name = name
                break
        if not sheet_name:
            sheet_name = excel_file.sheet_names[0]

        df = pd.read_excel(file_path, sheet_name=sheet_name)
        df.columns = [
            str(col).strip().lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace("/", "_")
            for col in df.columns
        ]

        excel_to_internal_map = {
            "pr_docnum": "pr_doc_num",
            "po_docnum": "po_doc_num",
            "item_description": "description",
            "pr_qty": "qty",
            "u_m": "uom",
            "uom": "uom",
            "name": "supplier_name",
            "commenttext": "comment_text",
            "comment___remarks": "comment_text",
            "comment_remarks": "comment_text",
            "pr_approval_status": "pr_status",
            "po_approval_status": "po_status",
            "est._unit_price_idr": "unit_price",
            "est_unit_price_idr": "unit_price",
            "po_unit_price_idr": "unit_price",
            "total_est._pr_amount_idr": "total_price",
            "total_est_pr_amount_idr": "total_price",
            "total_po_amount_idr": "total_price"
        }
        df.rename(columns=excel_to_internal_map, inplace=True)

        if "description" in df.columns:
            df = df[df["description"].notna() & (~df["description"].astype(str).str.upper().str.contains("TOTAL PROCUREMENT"))]

        return df

    @staticmethod
    def _process_excel_background(app, file_path, upload_id, periode):
        with app.app_context():
            history = UploadHistory.query.get(upload_id)
            if not history:
                return

            try:
                # --- Read Excel ---
                df = PrUploadService._read_pr_df(file_path)

                # Hitung total_price jika tidak ada
                if "total_price" not in df.columns:
                    if "qty" in df.columns and "unit_price" in df.columns:
                        df["total_price"] = pd.to_numeric(df["qty"], errors="coerce") * pd.to_numeric(df["unit_price"], errors="coerce")
                    else:
                        df["total_price"] = 0

                # --- Validasi kolom ---
                missing = [
                    c for c in PrUploadService.REQUIRED_COLUMNS
                    if c not in df.columns
                ]
                if missing:
                    raise ValueError(f"Kolom tidak ditemukan: {', '.join(missing)}")

                saved_count = 0
                updated_count = 0

                # --- Fungsi pembantu untuk konversi nilai yang aman dari Series/duplikasi kolom ---
                def get_val(row, col):
                    if col not in row:
                        return None
                    val = row[col]
                    if isinstance(val, pd.Series):
                        non_na = val.dropna()
                        val = non_na.iloc[0] if not non_na.empty else None
                    if val is None or pd.isna(val):
                        return None
                    return val

                def get_date_val(row, col):
                    val = get_val(row, col)
                    if val is None:
                        return None
                    if isinstance(val, datetime):
                        return val.date()
                    try:
                        return pd.to_datetime(val).date()
                    except Exception:
                        return None

                def get_decimal_val(row, col):
                    val = get_val(row, col)
                    if val is None:
                        return None
                    try:
                        clean_num = str(val).replace(",", "").strip()
                        return Decimal(clean_num)
                    except Exception:
                        return None

                # --- Optimasi: Pre-fetch semua data yang sudah ada dalam 1 query ---
                # Daripada query ke DB di setiap baris (N+1), kita ambil semua sekaligus
                all_pr_nums = []
                for _, r in df.iterrows():
                    v = get_val(r, "pr_doc_num")
                    if v is not None:
                        all_pr_nums.append(str(v))

                all_pr_nums_unique = list(set(all_pr_nums))

                existing_records = PrPoData.query.filter(
                    PrPoData.pr_doc_num.in_(all_pr_nums_unique)
                ).all()

                # Buat dictionary (pr_doc_num, description) → record untuk lookup cepat
                existing_map = {
                    (str(r.pr_doc_num), str(r.description or "")): r
                    for r in existing_records
                }

                # --- Loop setiap row (UPSERT berbasis pr_doc_num + description) ---
                for _, row in df.iterrows():
                    get = lambda col: get_val(row, col)
                    get_date = lambda col: get_date_val(row, col)
                    get_decimal = lambda col: get_decimal_val(row, col)

                    pr_doc_num_val = get("pr_doc_num")
                    description_val = get("description")

                    if pr_doc_num_val is None:
                        continue  # Lewati baris kosong

                    key = (str(pr_doc_num_val), str(description_val or ""))
                    existing = existing_map.get(key)

                    if existing:
                        existing.po_doc_num        = get("po_doc_num")
                        existing.order_date        = get_date("order_date")
                        existing.supplier_name     = get("supplier_name")
                        existing.gr_legal_number   = get("gr_legal_number")
                        existing.packing_slip      = get("packing_slip")
                        existing.receipt_date      = get_date("receipt_date")
                        existing.invoice           = get("invoice")
                        existing.invoice_date      = get_date("invoice_date")
                        existing.pr_status         = get("pr_status")
                        existing.po_status         = get("po_status")
                        existing.qty               = get_decimal("qty")
                        existing.unit_price        = get_decimal("unit_price")
                        existing.total_price       = get_decimal("total_price")
                        existing.upload_id         = upload_id
                        updated_count += 1

                    else:
                        pr = PrPoData(
                            upload_id=upload_id,
                            pr_doc_num=str(pr_doc_num_val),
                            po_doc_num=get("po_doc_num"),
                            requisition_id=get("requisition_id"),
                            request_date=get_date("request_date"),
                            order_date=get_date("order_date"),
                            description=description_val,
                            comment_text=get("comment_text"),
                            supplier_name=get("supplier_name"),
                            qty=get_decimal("qty"),
                            uom=get("uom"),
                            unit_price=get_decimal("unit_price"),
                            total_price=get_decimal("total_price"),
                            gr_legal_number=get("gr_legal_number"),
                            packing_slip=get("packing_slip"),
                            receipt_date=get_date("receipt_date"),
                            invoice=get("invoice"),
                            invoice_date=get_date("invoice_date"),
                            pr_status=get("pr_status"),
                            po_status=get("po_status"),
                            status_ai="WAITING"
                        )
                        db.session.add(pr)
                        # Tambahkan ke map agar baris duplikat dalam file yang sama terdeteksi
                        existing_map[key] = pr
                        saved_count += 1

                # --- Flush satu kali setelah semua baris diproses ---
                db.session.flush()

                # --- Update UploadHistory ---
                history.total_data = saved_count + updated_count
                history.status = "SUCCESS"
                history.uploaded_at = datetime.utcnow()

                # --- Satu commit di akhir ---
                db.session.commit()

            except Exception as e:
                import traceback
                print(f"[PrUploadService] Background processing error: {e}")
                traceback.print_exc()
                db.session.rollback()
                history.status = "FAILED"
                try:
                    db.session.add(history)
                    db.session.commit()
                except Exception:
                    db.session.rollback()
