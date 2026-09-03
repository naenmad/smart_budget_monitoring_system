from utils.db import db
from datetime import datetime


class EntertaintMasterItem(db.Model):
    __tablename__ = "entertaint_master_item"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    category = db.Column(
        db.Enum("CUSTOMER", "PIC", "PLACE", "CUSTOMER_MEMBER", name="master_item_category_enum"),
        nullable=False
    )
    name = db.Column(db.String(150), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "name": self.name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
