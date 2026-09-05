from datetime import datetime
from app import db

class EntertaintRecapMkt(db.Model):
    __tablename__ = "entertaint_recap_mkt"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    batch_no = db.Column(db.Integer, nullable=True)  # No urut batch closing (1..47)
    tanggal = db.Column(db.Date, nullable=True)
    account = db.Column(db.String(255), nullable=False)  # e.g., Closing, Renewal Kasbon, Uang QC yang terpakai
    uang_masuk = db.Column(db.Numeric(15, 2), default=0.00)  # Uang masuk ke QC
    uang_keluar = db.Column(db.Numeric(15, 2), default=0.00)  # Uang keluar ke MKT
    remarks = db.Column(db.Text, nullable=True)  # Catatan detail closing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "batch_no": self.batch_no,
            "tanggal": self.tanggal.strftime("%Y-%m-%d") if self.tanggal else None,
            "account": self.account,
            "uang_masuk": float(self.uang_masuk or 0),
            "uang_keluar": float(self.uang_keluar or 0),
            "remarks": self.remarks or "",
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None,
        }
