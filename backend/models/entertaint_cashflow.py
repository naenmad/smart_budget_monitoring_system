from utils.db import db
from datetime import datetime


class EntertaintCashflow(db.Model):
    __tablename__ = "entertaint_cashflow"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    doc_no = db.Column(db.String(100), nullable=True)
    tanggal = db.Column(db.Date, nullable=False)
    flow_type = db.Column(db.Enum("IN", "OUT", name="cashflow_type_enum"), nullable=False)
    account_deskripsi = db.Column(db.Text, nullable=False)
    uang_masuk = db.Column(db.Numeric(18, 2), default=0.00)
    uang_keluar = db.Column(db.Numeric(18, 2), default=0.00)
    balance = db.Column(db.Numeric(18, 2), default=0.00)
    status_entertaint = db.Column(db.String(50), default="Open")
    keterangan = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "doc_no": self.doc_no or "",
            "tanggal": self.tanggal.isoformat() if self.tanggal else None,
            "flow_type": self.flow_type,
            "account_deskripsi": self.account_deskripsi,
            "uang_masuk": float(self.uang_masuk) if self.uang_masuk is not None else 0.0,
            "uang_keluar": float(self.uang_keluar) if self.uang_keluar is not None else 0.0,
            "balance": float(self.balance) if self.balance is not None else 0.0,
            "status_entertaint": self.status_entertaint or "Open",
            "keterangan": self.keterangan or "",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
