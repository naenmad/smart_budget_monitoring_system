from utils.db import db


class PlanningDetail(db.Model):
    __tablename__ = "planning_detail"

    id = db.Column(
        db.BigInteger,
        primary_key=True
    )
    planning_header_id = db.Column(
        db.BigInteger,
        db.ForeignKey("planning_header.id"),
        nullable=False
    )
    kategori_id = db.Column(
        db.BigInteger,
        db.ForeignKey("kategori.id"),
        nullable=True
    )
    month = db.Column(
        db.String(20),
        nullable=True,
        comment="Bulan planning, contoh: Jan, Feb, Mar"
    )
    item = db.Column(
        db.String(255),
        nullable=False
    )
    planning_amount = db.Column(
        db.Numeric(18, 2),
        nullable=False
    )
    remarks = db.Column(
        db.String(255)
    )
    sub_kategori = db.Column(
        db.String(50),
        nullable=True
    )
    tipe = db.Column(
        db.String(50),
        nullable=True
    )
    status_realisasi = db.Column(
        db.Enum('OPEN', 'PROSES', 'CLOSED', 'CANCELLED'),
        nullable=False,
        default='OPEN',
        comment="Agregat status realisasi dari semua PR yang di-mapping ke item ini"
    )
    pic = db.Column(db.String(100), nullable=True)
    item_actual = db.Column(db.String(255), nullable=True)
    qty = db.Column(db.Numeric(15, 2), nullable=True)
    actual_qty = db.Column(db.Numeric(15, 2), nullable=True)
    actual_amount = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    bulan_actual = db.Column(db.String(50), nullable=True)
    selisih = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    status_detail = db.Column(db.String(100), nullable=True)
    baris_ref = db.Column(db.String(100), nullable=True)

    created_at = db.Column(
        db.TIMESTAMP,
        default=db.func.current_timestamp()
    )
    updated_at = db.Column(
        db.TIMESTAMP,
        default=db.func.current_timestamp(),
        onupdate=db.func.current_timestamp()
    )

    kategori = db.relationship(
        "Kategori",
        backref="planning_details"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "planning_header_id": self.planning_header_id,
            "kategori_id": self.kategori_id,
            "sub_kategori": self.sub_kategori,
            "tipe": self.tipe,
            "kategori_kode": self.kategori.kode if self.kategori else None,
            "kategori_nama": self.kategori.nama if self.kategori else None,
            "kategori_tipe_formulir": self.kategori.tipe_formulir if self.kategori else None,
            "pic": self.pic,
            "month": self.month,
            "item": self.item,
            "item_actual": self.item_actual,
            "qty": float(self.qty) if self.qty is not None else None,
            "actual_qty": float(self.actual_qty) if self.actual_qty is not None else None,
            "planning_amount": float(self.planning_amount) if self.planning_amount else 0,
            "actual_amount": float(self.actual_amount) if self.actual_amount else 0,
            "bulan_actual": self.bulan_actual,
            "selisih": float(self.selisih) if self.selisih else 0,
            "status_detail": self.status_detail,
            "baris_ref": self.baris_ref,
            "remarks": self.remarks,
            "status_realisasi": self.status_realisasi or 'OPEN',
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }