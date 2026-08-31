from utils.db import db


class PrPoData(db.Model):
    __tablename__ = "pr_po_data"

    id = db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )

    upload_id = db.Column(
        db.BigInteger,
        db.ForeignKey("upload_history.id")
    )

    requisition_id = db.Column(
        db.String(100)
    )

    pr_doc_num = db.Column(
        db.String(100)
    )

    po_doc_num = db.Column(
        db.String(100)
    )

    request_date = db.Column(
        db.Date
    )

    order_date = db.Column(
        db.Date
    )

    description = db.Column(
        db.Text
    )

    comment_text = db.Column(
        db.Text
    )

    supplier_name = db.Column(
        db.String(255)
    )

    qty = db.Column(
        db.Numeric(15, 2)
    )

    uom = db.Column(
        db.String(20)
    )

    unit_price = db.Column(
        db.Numeric(18, 2)
    )

    total_price = db.Column(
        db.Numeric(18, 2)
    )

    gr_legal_number = db.Column(
        db.String(100)
    )

    packing_slip = db.Column(
        db.String(100)
    )

    receipt_date = db.Column(
        db.Date
    )

    invoice = db.Column(
        db.String(100)
    )

    invoice_date = db.Column(
        db.Date
    )

    pr_status = db.Column(
        db.String(100)
    )

    po_status = db.Column(
        db.String(100)
    )

    non_stock_item = db.Column(
        db.Boolean
    )

    kategori_id = db.Column(
        db.BigInteger,
        db.ForeignKey("kategori.id"),
        nullable=True
    )

    budget_id = db.Column(
        db.BigInteger,
        db.ForeignKey("budget.id"),
        nullable=True
    )

    planning_detail_id = db.Column(
        db.BigInteger,
        db.ForeignKey("planning_detail.id"),
        nullable=True
    )

    status_ai = db.Column(
        db.Enum(
            "WAITING",
            "PROCESSING",
            "DONE",
            "FAILED",
            "NEED_MAPPING",
            "CANCELLED"       # PR dibatalkan admin — tidak akan diproses ulang
        ),
        default="WAITING"
    )
    procurement_status = db.Column(
    db.Enum(
        'PR_CREATED', 
        'PO_ISSUED', 
        'PARTIAL_RECEIVED', 
        'GOODS_RECEIVED', 
        'COMPLETED'
    ),
    default='PR_CREATED'
)

    budget_status = db.Column(
        db.Enum(
            "ON_PLAN",
            "OVER_PLAN",
            "UNDER_PLAN",
            "OOP"
        ),
        nullable=True
    )

    layer_klasifikasi = db.Column(
        db.SmallInteger,
        comment="1=Rule Base, 2=Regex, 3=SVM"
    )

    metode_klasifikasi = db.Column(
        db.Enum(
            "RULE_BASE",
            "REGEX",
            "SVM",
            "MANUAL"
        )
    )

    # review manual
    perlu_review = db.Column(
        db.Boolean,
        default=False
    )

    kategori_id_koreksi = db.Column(
        db.BigInteger,
        db.ForeignKey("kategori.id"),
        nullable=True
    )

    direview_oleh = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id"),
        nullable=True
    )

    direview_at = db.Column(
        db.DateTime,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )

    # Kolom audit pembatalan PR langsung (berbeda dari cancel_planning_detail)
    dibatalkan_oleh = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id"),
        nullable=True
    )

    dibatalkan_at = db.Column(
        db.DateTime,
        nullable=True
    )

    alasan_pembatalan = db.Column(
        db.Text,
        nullable=True
    )

    # --- Relationships ---

    upload_history = db.relationship(
        "UploadHistory",
        backref=db.backref("pr_po_data_list", cascade="all, delete-orphan")
    )

    kategori = db.relationship(
        "Kategori",
        foreign_keys=[kategori_id],
        backref="pr_po_data_list"
    )

    budget = db.relationship(
        "Budget",
        backref="pr_po_data_list"
    )

    planning_detail = db.relationship(
        "PlanningDetail",
        backref="pr_po_data_list"
    )

    kategori_koreksi = db.relationship(
        "Kategori",
        foreign_keys=[kategori_id_koreksi],
        backref="pr_po_koreksi_list"
    )

    reviewer = db.relationship(
    "User",
    foreign_keys=[direview_oleh],
    backref="reviewed_pr_po"
    )
    dibatalkan_oleh_user = db.relationship(
    "User",
    foreign_keys=[dibatalkan_oleh],
    backref="cancelled_pr_po"
)
  
    

    @property
    def tracking_stage(self):
        if self.gr_legal_number:
            return "GR"
        elif self.po_doc_num:
            return "PO"
        elif self.pr_doc_num:
            return "PR"
        return "UNKNOWN"

    def to_dict(self):
        conf_score = None
        if getattr(self, 'klasifikasi_logs', None):
            success_logs = [log for log in self.klasifikasi_logs if log.berhasil]
            if success_logs:
                success_logs.sort(key=lambda x: x.id, reverse=True)
                conf_score = float(success_logs[0].confidence_score) if success_logs[0].confidence_score else None

        return {
            "id": self.id,
            "confidence_score": conf_score,
            "upload_id": self.upload_id,
            "requisition_id": self.requisition_id,
            "pr_doc_num": self.pr_doc_num,
            "po_doc_num": self.po_doc_num,
            "request_date": (
                self.request_date.isoformat()
                if self.request_date else None
            ),
            "order_date": (
                self.order_date.isoformat()
                if self.order_date else None
            ),
            "description": self.description,
            "comment_text": self.comment_text,
            "supplier_name": self.supplier_name,
            "qty": float(self.qty) if self.qty else None,
            "uom": self.uom,
            "unit_price": (
                float(self.unit_price) if self.unit_price else None
            ),
            "total_price": (
                float(self.total_price) if self.total_price else None
            ),
            "gr_legal_number": self.gr_legal_number,
            "packing_slip": self.packing_slip,
            "receipt_date": (
                self.receipt_date.isoformat()
                if self.receipt_date else None
            ),
            "invoice": self.invoice,
            "invoice_date": (
                self.invoice_date.isoformat()
                if self.invoice_date else None
            ),
            "pr_status": self.pr_status,
            "po_status": self.po_status,
            "non_stock_item": self.non_stock_item,
            "kategori_id": self.kategori_id,
            "kategori_kode": (
                self.kategori.kode if self.kategori else None
            ),
            "budget_id": self.budget_id,
            "planning_detail_id": self.planning_detail_id,
            "planning_item": self.planning_detail.item if self.planning_detail else None,
            "planning_pagu": float(self.planning_detail.planning_amount) if self.planning_detail and self.planning_detail.planning_amount else None,
            "planning_month": self.planning_detail.month if self.planning_detail else None,
            "planning_remarks": self.planning_detail.remarks if self.planning_detail else None,
            "planning_total_consumed": sum(float(p.total_price or 0) for p in self.planning_detail.pr_po_data if p.status_ai != 'CANCELLED') if self.planning_detail and self.planning_detail.pr_po_data else (float(self.total_price or 0) if self.total_price else 0.0),
            "planning_remaining": (float(self.planning_detail.planning_amount or 0) - sum(float(p.total_price or 0) for p in self.planning_detail.pr_po_data if p.status_ai != 'CANCELLED')) if self.planning_detail and self.planning_detail.pr_po_data else None,
            "planning_detail": {
                "id": self.planning_detail.id,
                "item": self.planning_detail.item,
                "month": self.planning_detail.month,
                "planning_amount": float(self.planning_detail.planning_amount) if self.planning_detail.planning_amount else 0.0,
                "remarks": self.planning_detail.remarks or ""
            } if self.planning_detail else None,
            "status_ai": self.status_ai,
            "budget_status": self.budget_status,
            "layer_klasifikasi": self.layer_klasifikasi,
            "metode_klasifikasi": self.metode_klasifikasi,
            "perlu_review": self.perlu_review,
            "kategori_id_koreksi": self.kategori_id_koreksi,
            "direview_oleh": self.direview_oleh,
            "direview_at": (
                self.direview_at.isoformat()
                if self.direview_at else None
            ),
            "created_at": (
                self.created_at.isoformat()
                if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at else None
            ),
            "dibatalkan_oleh": self.dibatalkan_oleh,
            "dibatalkan_at": (
                self.dibatalkan_at.isoformat()
                if self.dibatalkan_at else None
            ),
            "alasan_pembatalan": self.alasan_pembatalan,
            "tracking_stage": self.tracking_stage,
        }

    def __repr__(self):
        return f"<PrPoData {self.id} — {self.pr_doc_num}>"
