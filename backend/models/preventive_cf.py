from utils.db import db

class PreventiveCf(db.Model):
    __tablename__ = "preventive_cf"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    header_id = db.Column(db.BigInteger, nullable=True)
    no_urut = db.Column(db.Integer, nullable=True)
    bulan_list = db.Column(db.String(20), nullable=True)
    bulan_no = db.Column(db.Integer, nullable=True)
    item = db.Column(db.Text, nullable=False)
    spesifikasi = db.Column(db.Text, nullable=True)
    qty = db.Column(db.Numeric(15, 2), nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    cost = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    total_list = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    remark_file = db.Column(db.String(255), nullable=True)
    actual_gl = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    bulan_actual = db.Column(db.String(50), nullable=True)
    jumlah_transaksi = db.Column(db.Integer, nullable=True, default=0)
    selisih = db.Column(db.Numeric(18, 2), nullable=True, default=0)
    status = db.Column(db.String(100), nullable=True)
    keterangan = db.Column(db.Text, nullable=True)
    sumber = db.Column(db.String(100), nullable=True)
    tanggal_actual = db.Column(db.String(255), nullable=True)
    item_gl = db.Column(db.Text, nullable=True)
    no_dokumen_gl = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def to_dict(self):
        return {
            "id": self.id,
            "header_id": self.header_id,
            "no_urut": self.no_urut,
            "bulan_list": self.bulan_list,
            "bulan_no": self.bulan_no,
            "item": self.item,
            "spesifikasi": self.spesifikasi,
            "qty": float(self.qty) if self.qty is not None else None,
            "unit": self.unit,
            "cost": float(self.cost) if self.cost is not None else 0.0,
            "total_list": float(self.total_list) if self.total_list is not None else 0.0,
            "remark_file": self.remark_file,
            "actual_gl": float(self.actual_gl) if self.actual_gl is not None else 0.0,
            "bulan_actual": self.bulan_actual,
            "jumlah_transaksi": self.jumlah_transaksi,
            "selisih": float(self.selisih) if self.selisih is not None else 0.0,
            "status": self.status,
            "keterangan": self.keterangan,
            "sumber": self.sumber,
            "tanggal_actual": self.tanggal_actual,
            "item_gl": self.item_gl,
            "no_dokumen_gl": self.no_dokumen_gl,
        }
