from models.kategori import Kategori
from utils.db import db


class KategoriService:

    @staticmethod
    def get_all(include_hidden=False):
        query = Kategori.query
        if not include_hidden:
            query = query.filter(Kategori.is_active.is_(True))
        return query.order_by(Kategori.kode).all()

    @staticmethod
    def get_by_id(kategori_id):
        return db.session.get(Kategori, kategori_id)

    @staticmethod
    def get_by_kode(kode):
        return Kategori.query.filter_by(kode=kode).first()

    @staticmethod
    def create(data):
        kode = data.get("kode")
        nama = data.get("nama")
        tipe_formulir = data.get("tipe_formulir")

        if not kode:
            return {
                "success": False,
                "message": "kode wajib diisi"
            }, 400

        if not nama:
            return {
                "success": False,
                "message": "nama wajib diisi"
            }, 400

        if tipe_formulir not in ("CAPEX", "OPEX"):
            return {
                "success": False,
                "message": "tipe_formulir harus CAPEX atau OPEX"
            }, 400

        # cek duplikat kode
        existing = Kategori.query.filter_by(kode=kode).first()
        if existing:
            return {
                "success": False,
                "message": f"Kode '{kode}' sudah ada"
            }, 409

        kategori = Kategori(
            kode=kode,
            nama=nama,
            tipe_formulir=tipe_formulir
        )

        db.session.add(kategori)
        db.session.commit()

        return {
            "success": True,
            "message": "Kategori berhasil dibuat",
            "data": kategori.to_dict()
        }, 201

    @staticmethod
    def update(kategori_id, data):
        kategori = db.session.get(Kategori, kategori_id)
        if not kategori:
            return {
                "success": False,
                "message": "Kategori tidak ditemukan"
            }, 404

        if "kode" in data:
            # cek duplikat kode (exclude diri sendiri)
            existing = Kategori.query.filter(
                Kategori.kode == data["kode"],
                Kategori.id != kategori_id
            ).first()
            if existing:
                return {
                    "success": False,
                    "message": f"Kode '{data['kode']}' sudah digunakan"
                }, 409
            kategori.kode = data["kode"]

        if "nama" in data:
            kategori.nama = data["nama"]

        if "tipe_formulir" in data:
            if data["tipe_formulir"] not in ("CAPEX", "OPEX"):
                return {
                    "success": False,
                    "message": "tipe_formulir harus CAPEX atau OPEX"
                }, 400
            kategori.tipe_formulir = data["tipe_formulir"]

        db.session.commit()

        return {
            "success": True,
            "message": "Kategori berhasil diupdate",
            "data": kategori.to_dict()
        }, 200

    @staticmethod
    def delete(kategori_id):
        kategori = db.session.get(Kategori, kategori_id)
        if not kategori:
            return {
                "success": False,
                "message": "Kategori tidak ditemukan"
            }, 404

        db.session.delete(kategori)
        db.session.commit()

        return {
            "success": True,
            "message": "Kategori berhasil dihapus"
        }, 200