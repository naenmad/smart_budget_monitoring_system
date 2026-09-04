from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, extract
from sqlalchemy.orm import selectinload

from models.pr_po_data import PrPoData
from models.kategori import Kategori
from utils.db import db


class PrPoDataService:

    @staticmethod
    def _parse_decimal(val):
        if val is None or val == "":
            return None
        try:
            return Decimal(str(val).strip())
        except:
            return None

    @staticmethod
    def get_all(upload_id=None, status_ai=None, perlu_review=None, budget_status=None,
                search=None, kategori_kode=None, metode=None,
                page=1, per_page=50):
        """
        Ambil semua data PR/PO dengan filter opsional dan paginasi.
        Mendukung server-side search dan filter kategori/metode.
        """
        query = PrPoData.query.options(selectinload(PrPoData.klasifikasi_logs))

        if upload_id:
            query = query.filter_by(upload_id=upload_id)

        if status_ai:
            query = query.filter_by(status_ai=status_ai)

        if perlu_review is not None:
            query = query.filter_by(perlu_review=perlu_review)

        if budget_status:
            query = query.filter_by(budget_status=budget_status)

        # --- Server-side search: cari di nomor PR atau deskripsi ---
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                PrPoData.pr_doc_num.ilike(term) |
                PrPoData.description.ilike(term) |
                PrPoData.supplier_name.ilike(term) |
                PrPoData.comment_text.ilike(term)
            )

        # --- Filter berdasarkan kode kategori (via join ke Kategori) ---
        if kategori_kode:
            if kategori_kode.upper() == "UNKNOWN":
                # UNKNOWN = tidak punya kategori ATAU perlu review
                query = query.filter(
                    (PrPoData.kategori_id == None) | (PrPoData.perlu_review == True)
                )
            else:
                query = query.join(Kategori, PrPoData.kategori_id == Kategori.id).filter(
                    Kategori.kode == kategori_kode
                )

        # --- Filter berdasarkan metode klasifikasi ---
        if metode:
            if metode.upper() == "MANUAL":
                query = query.filter(PrPoData.metode_klasifikasi == "MANUAL")
            else:
                query = query.filter(PrPoData.metode_klasifikasi == metode)

        query = query.order_by(PrPoData.created_at.desc())

        # Paginasi
        total = query.count()
        items = query.offset(
            (page - 1) * per_page
        ).limit(per_page).all()

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page,
            "data": [item.to_dict() for item in items]
        }

    @staticmethod
    def get_by_id(data_id):
        return db.session.get(PrPoData, data_id)

    @staticmethod
    def get_by_upload_id(upload_id):
        return PrPoData.query.filter_by(
            upload_id=upload_id
        ).order_by(PrPoData.id).all()

    @staticmethod
    def create(data):
        """Buat satu record PrPoData."""

        record = PrPoData(
            upload_id=data.get("upload_id"),
            requisition_id=data.get("requisition_id"),
            pr_doc_num=data.get("pr_doc_num"),
            po_doc_num=data.get("po_doc_num"),
            request_date=data.get("request_date"),
            order_date=data.get("order_date"),
            description=data.get("description"),
            comment_text=data.get("comment_text"),
            supplier_name=data.get("supplier_name"),
            qty=PrPoDataService._parse_decimal(data.get("qty")),
            uom=data.get("uom"),
            unit_price=PrPoDataService._parse_decimal(data.get("unit_price")),
            total_price=PrPoDataService._parse_decimal(data.get("total_price")),
            gr_legal_number=data.get("gr_legal_number"),
            packing_slip=data.get("packing_slip"),
            receipt_date=data.get("receipt_date"),
            invoice=data.get("invoice"),
            invoice_date=data.get("invoice_date"),
            pr_status=data.get("pr_status"),
            po_status=data.get("po_status"),
            non_stock_item=data.get("non_stock_item"),
            status_ai="WAITING",
        )

        db.session.add(record)
        db.session.commit()

        return {
            "success": True,
            "message": "Data PR/PO berhasil disimpan",
            "data": record.to_dict()
        }, 201

    @staticmethod
    def create_bulk(data_list, upload_id=None):
        """
        Simpan banyak record PR/PO sekaligus.
        Returns: list of created IDs.
        """
        records = []

        for item in data_list:
            record = PrPoData(
                upload_id=upload_id or item.get("upload_id"),
                requisition_id=item.get("requisition_id"),
                pr_doc_num=item.get("pr_doc_num"),
                po_doc_num=item.get("po_doc_num"),
                request_date=item.get("request_date"),
                order_date=item.get("order_date"),
                description=item.get("description"),
                comment_text=item.get("comment_text"),
                supplier_name=item.get("supplier_name"),
                qty=PrPoDataService._parse_decimal(item.get("qty")),
                uom=item.get("uom"),
                unit_price=PrPoDataService._parse_decimal(item.get("unit_price")),
                total_price=PrPoDataService._parse_decimal(item.get("total_price")),
                gr_legal_number=item.get("gr_legal_number"),
                packing_slip=item.get("packing_slip"),
                receipt_date=item.get("receipt_date"),
                invoice=item.get("invoice"),
                invoice_date=item.get("invoice_date"),
                pr_status=item.get("pr_status"),
                po_status=item.get("po_status"),
                non_stock_item=item.get("non_stock_item"),
                status_ai="WAITING",
            )
            records.append(record)

        db.session.add_all(records)
        db.session.commit()

        return {
            "success": True,
            "message": f"{len(records)} data PR/PO berhasil disimpan",
            "total": len(records),
            "ids": [r.id for r in records]
        }, 201

    @staticmethod
    def update(data_id, data):
        """Update satu record PrPoData."""
        record = db.session.get(PrPoData, data_id)
        if not record:
            return {
                "success": False,
                "message": "Data PR/PO tidak ditemukan"
            }, 404

        updatable_fields = [
            "description", "comment_text", "supplier_name",
            "uom", "pr_status", "po_status", "non_stock_item",
            "requisition_id", "pr_doc_num", "po_doc_num",
            "gr_legal_number", "packing_slip", "invoice",
        ]

        for field in updatable_fields:
            if field in data:
                setattr(record, field, data[field])

        # field numerik
        for field in ("qty", "unit_price", "total_price"):
            if field in data:
                val = PrPoDataService._parse_decimal(data[field])
                setattr(record, field, val)

        # field date
        for field in (
            "request_date", "order_date",
            "receipt_date", "invoice_date"
        ):
            if field in data:
                setattr(record, field, data[field])

        db.session.commit()

        return {
            "success": True,
            "message": "Data PR/PO berhasil diupdate",
            "data": record.to_dict()
        }, 200

    @staticmethod
    def review(data_id, data):
        """
        Review & koreksi manual oleh admin.
        Update kategori_id_koreksi, direview_oleh, direview_at.
        """
        record = db.session.get(PrPoData, data_id)
        if not record:
            return {
                "success": False,
                "message": "Data PR/PO tidak ditemukan"
            }, 404

        kategori_id_koreksi = data.get("kategori_id_koreksi")
        direview_oleh = data.get("direview_oleh")

        if not kategori_id_koreksi:
            return {
                "success": False,
                "message": "kategori_id_koreksi wajib diisi"
            }, 400

        # Cek kategori valid
        kategori = db.session.get(Kategori, kategori_id_koreksi)
        if not kategori:
            return {
                "success": False,
                "message": "Kategori koreksi tidak ditemukan"
            }, 404

        record.kategori_id_koreksi = kategori_id_koreksi
        record.direview_oleh = direview_oleh
        record.direview_at = datetime.utcnow()
        record.perlu_review = False

        # Update juga kategori utama ke hasil koreksi
        record.kategori_id = kategori_id_koreksi
        record.metode_klasifikasi = "MANUAL"
        record.status_ai = "NEED_MAPPING"

        db.session.commit()

        from services.mapping.advanced_mapping_service import AdvancedMappingService
        AdvancedMappingService.run_mapping(record)

        db.session.refresh(record)

        return {
            "success": True,
            "message": "Review berhasil disimpan",
            "data": record.to_dict()
        }, 200

    @staticmethod
    def get_monthly_summary(periode=None, kode=None):
        """
        Summary per bulan untuk grafik.
        Mengembalikan total actual per bulan per kategori.
        """
        query = (
            db.session.query(
                extract("month", PrPoData.request_date).label("bulan"),
                Kategori.kode,
                Kategori.tipe_formulir,
                func.coalesce(
                    func.sum(PrPoData.total_price), 0
                ).label("total")
            )
            .join(Kategori, PrPoData.kategori_id == Kategori.id)
            .filter(PrPoData.status_ai == "DONE")
        )

        if periode:
            query = query.filter(
                extract("year", PrPoData.request_date) == int(periode)
            )

        if kode:
            query = query.filter(Kategori.kode == kode)

        query = query.group_by(
            extract("month", PrPoData.request_date),
            Kategori.kode,
            Kategori.tipe_formulir
        ).order_by("bulan")

        rows = query.all()

        bulan_names = [
            "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
            "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
        ]

        result = []
        for row in rows:
            bulan_idx = int(row.bulan) if row.bulan else 0
            result.append({
                "bulan": bulan_idx,
                "bulan_nama": (
                    bulan_names[bulan_idx]
                    if 0 < bulan_idx <= 12
                    else str(bulan_idx)
                ),
                "kode": row.kode,
                "tipe_formulir": row.tipe_formulir,
                "total": float(row.total),
            })

        return result

    @staticmethod
    def get_review_queue(page=1, per_page=50):
        """
        Ambil data yang perlu review manual.
        """
        return PrPoDataService.get_all(
            perlu_review=True,
            page=page,
            per_page=per_page
        )
