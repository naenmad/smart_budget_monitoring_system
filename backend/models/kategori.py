from utils.db import db


class Kategori(db.Model):
    __tablename__ = 'kategori'

    id= db.Column(
        db.BigInteger,
        primary_key=True,
        autoincrement=True
    )
    kode = db.Column(
        db.String(20),
        unique=True,
        nullable=False
    )
    nama = db.Column(
        db.String(100),
        nullable=False
    )
    tipe_formulir= db.Column(
        db.Enum("CAPEX", "OPEX")
    )
    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )
    def to_dict(self):
        return {
            "id": self.id,
            "kode": self.kode,
            "nama": self.nama,
            "tipe_formulir": self.tipe_formulir,
            "is_active": bool(self.is_active) if self.is_active is not None else True,
        }
    def __repr__(self):
        return f"<Kategori {self.kode}>"