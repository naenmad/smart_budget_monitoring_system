from utils.db import db
from datetime import datetime


class EntertaintCost(db.Model):
    __tablename__ = "entertaint_cost"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    tanggal = db.Column(db.Date, nullable=False)
    deskripsi = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Numeric(18, 2), nullable=False, default=0.00)
    status_pembayaran = db.Column(
        db.Enum("BELUM_DIBAYAR", "SUDAH_DIBAYAR", name="status_pembayaran_enum"),
        nullable=False,
        default="BELUM_DIBAYAR"
    )
    status_claim = db.Column(
        db.Enum("OPEN", "CLOSE", name="status_claim_enum"),
        nullable=False,
        default="OPEN"
    )
    pic_entertaint = db.Column(db.String(150), nullable=True)
    customer = db.Column(db.String(150), nullable=True)
    place_of_occurrence = db.Column(db.String(150), nullable=True)
    customer_member = db.Column(db.Text, nullable=True)
    sai_member = db.Column(db.Text, nullable=True)
    tanggal_kasbon = db.Column(db.Date, nullable=True)
    total_kasbon = db.Column(db.Numeric(18, 2), nullable=True, default=0.00)
    status_kasbon = db.Column(db.String(50), nullable=True, default="Belum Lunas")
    tanggal_closing = db.Column(db.Date, nullable=True)
    keterangan = db.Column(db.Text, nullable=True)

    # Info Problem QA
    part_no = db.Column(db.String(100), nullable=True)
    part_name = db.Column(db.String(150), nullable=True)
    problem = db.Column(db.Text, nullable=True)
    problem_maker = db.Column(db.String(100), nullable=True)
    qty_problem = db.Column(db.Integer, nullable=True)

    # Rincian Struk #1 - #4
    struk_1 = db.Column(db.Numeric(18, 2), nullable=True, default=0.00)
    struk_2 = db.Column(db.Numeric(18, 2), nullable=True, default=0.00)
    struk_3 = db.Column(db.Numeric(18, 2), nullable=True, default=0.00)
    struk_4 = db.Column(db.Numeric(18, 2), nullable=True, default=0.00)

    created_by = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationships
    receipts = db.relationship(
        "EntertaintReceipt",
        backref="entertaint_cost",
        cascade="all, delete-orphan",
        lazy="joined"
    )
    creator = db.relationship("User", foreign_keys=[created_by], backref="entertaint_costs")

    def to_dict(self):
        return {
            "id": self.id,
            "tanggal": self.tanggal.isoformat() if self.tanggal else None,
            "deskripsi": self.deskripsi,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0.0,
            "status_pembayaran": self.status_pembayaran,
            "status_claim": self.status_claim,
            "pic_entertaint": self.pic_entertaint or "",
            "customer": self.customer or "",
            "place_of_occurrence": self.place_of_occurrence or "",
            "customer_member": self.customer_member or "",
            "sai_member": self.sai_member or "",
            "tanggal_kasbon": self.tanggal_kasbon.isoformat() if self.tanggal_kasbon else None,
            "total_kasbon": float(self.total_kasbon) if self.total_kasbon is not None else 0.0,
            "status_kasbon": self.status_kasbon or "Belum Lunas",
            "tanggal_closing": self.tanggal_closing.isoformat() if self.tanggal_closing else None,
            "keterangan": self.keterangan or "",
            "part_no": self.part_no or "",
            "part_name": self.part_name or "",
            "problem": self.problem or "",
            "problem_maker": self.problem_maker or "",
            "qty_problem": self.qty_problem,
            "struk_1": float(self.struk_1) if self.struk_1 is not None else 0.0,
            "struk_2": float(self.struk_2) if self.struk_2 is not None else 0.0,
            "struk_3": float(self.struk_3) if self.struk_3 is not None else 0.0,
            "struk_4": float(self.struk_4) if self.struk_4 is not None else 0.0,
            "created_by": self.created_by,
            "creator_name": self.creator.username if self.creator else None,
            "receipt_count": len(self.receipts) if self.receipts else 0,
            "receipts": [r.to_dict() for r in self.receipts] if self.receipts else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
