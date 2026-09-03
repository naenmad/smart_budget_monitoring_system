from utils.db import db
from datetime import datetime


class EntertaintReceipt(db.Model):
    __tablename__ = "entertaint_receipt"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    entertaint_cost_id = db.Column(
        db.BigInteger,
        db.ForeignKey("entertaint_cost.id", ondelete="CASCADE"),
        nullable=False
    )
    file_name = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False, default=0)
    mime_type = db.Column(db.String(50), default="image/webp")
    width = db.Column(db.Integer, nullable=True)
    height = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "entertaint_cost_id": self.entertaint_cost_id,
            "file_name": self.file_name,
            "original_name": self.original_name,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "file_size_formatted": f"{(self.file_size / 1024):.1f} KB" if self.file_size < 1048576 else f"{(self.file_size / 1048576):.2f} MB",
            "mime_type": self.mime_type,
            "width": self.width,
            "height": self.height,
            "url": f"/api/v1/entertaint/receipts/{self.file_name}",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
