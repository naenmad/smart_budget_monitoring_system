from models.kategori import Kategori
from utils.db import db


def seed_kategori():
    categories = [
        {"kode": "E-1",     "nama": "Direct Material",    "tipe_formulir": "OPEX"},
        {"kode": "E-9",     "nama": "Indirect Material",  "tipe_formulir": "OPEX"},
        {"kode": "I-1",     "nama": "Inventory",          "tipe_formulir": "CAPEX"},
       

    ]

    for cat_data in categories:
        exist = Kategori.query.filter_by(kode=cat_data["kode"]).first()
        if not exist:
            k = Kategori(**cat_data)
            db.session.add(k)
            print(f"[OK] Kategori '{cat_data['kode']}' berhasil dibuat")
        else:
            print(f"[SKIP] Kategori '{cat_data['kode']}' sudah ada, dilewati")