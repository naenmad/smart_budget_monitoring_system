from utils.db import db

class SystemSetting(db.Model):
    __tablename__ = "system_setting"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    @classmethod
    def get_value(cls, key: str, default=None):
        try:
            record = cls.query.filter_by(key=key).first()
            if record:
                return record.value
        except Exception as e:
            print(f"[SystemSetting] Error reading key '{key}': {e}")
        return default

    @classmethod
    def set_value(cls, key: str, value: str, description: str = None):
        try:
            record = cls.query.filter_by(key=key).first()
            if record:
                record.value = str(value)
                if description:
                    record.description = description
            else:
                record = cls(key=key, value=str(value), description=description)
                db.session.add(record)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"[SystemSetting] Error saving key '{key}': {e}")
            return False

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
