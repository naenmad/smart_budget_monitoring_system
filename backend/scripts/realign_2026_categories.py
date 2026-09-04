import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app
from utils.db import db
from models.kategori import Kategori
from models.planning_detail import PlanningDetail
from models.budget import Budget
from models.pr_po_data import PrPoData
from models.item_mapping import ItemMapping
from sqlalchemy import func

def realign_categories():
    with app.app_context():
        print("=== 1. Memastikan Master Kategori Valid ===")
        k1 = db.session.get(Kategori, 1)
        k2 = db.session.get(Kategori, 2)
        k3 = db.session.get(Kategori, 3)
        if k1:
            k1.kode = "E-1"
            k1.nama = "Consumable"
            k1.tipe_formulir = "OPEX"
        if k2:
            k2.kode = "E-9"
            k2.nama = "Calibration & Mtc CF"
            k2.tipe_formulir = "OPEX"
        if k3:
            k3.kode = "I-1"
            k3.nama = "Investment Asset"
            k3.tipe_formulir = "CAPEX"
        db.session.commit()
        print(f"Kategori 1: {k1.kode} - {k1.nama} ({k1.tipe_formulir})")
        print(f"Kategori 2: {k2.kode} - {k2.nama} ({k2.tipe_formulir})")
        print(f"Kategori 3: {k3.kode} - {k3.nama} ({k3.tipe_formulir})")

        print("\n=== 2. Re-align PlanningDetail ke Kategori yang Benar ===")
        capex_keywords = [
            "cutting machine",
            "laptop",
            "notebook",
            "lemari besi",
            "lemari perkakas",
            "paper shredder",
            "penghancur kertas",
            "paper cutter",
            "pemotong kertas",
            "mesin laminating",
            "dispenser galon",
            "polytron dispenser",
            "minitab",
            "cad standard",
            "ojiyas thread ring gauge",
            "ring gauge bolt",
            "filler gauge",
            "torque wrench",
            "torque clik",
            "torque driver tester",
            "torque klik",
            "stylus romer",
            "alat pop nut",
            "kunci shock sock set",
            "kunci l set",
            "tekiro kunci l",
            "besi hollow galvanis",
            "akrilik lembaran",
            "selang angin"
        ]

        def get_category_id_for_item(item_name):
            name_lower = str(item_name or "").strip().lower()
            if not name_lower:
                return 1

            # 1. Form E-9 (Calibration & Mtc CF)
            if name_lower.startswith("kalibrasi") or name_lower == "preventive c/f":
                return 2

            # 2. Form I-1 (Investment Asset CAPEX)
            if any(kw in name_lower for kw in capex_keywords):
                return 3

            # 3. Default: Form E-1 (Consumable OPEX)
            return 1

        details = PlanningDetail.query.all()
        count_e1 = 0
        count_e9 = 0
        count_i1 = 0

        for d in details:
            new_kat_id = get_category_id_for_item(d.item)
            d.kategori_id = new_kat_id
            if new_kat_id == 1: count_e1 += 1
            elif new_kat_id == 2: count_e9 += 1
            elif new_kat_id == 3: count_i1 += 1

        db.session.commit()
        print(f"PlanningDetail realigned: E-1={count_e1}, E-9={count_e9}, I-1={count_i1} (Total={len(details)})")

        print("\n=== 3. Sinkronisasi Tabel Budget 2026 ===")
        for kat_id in [1, 2, 3]:
            total_plan = db.session.query(func.sum(PlanningDetail.planning_amount)).filter_by(kategori_id=kat_id).scalar() or 0
            b = Budget.query.filter_by(periode="2026", kategori_id=kat_id).first()
            if not b:
                b = Budget(periode="2026", kategori_id=kat_id, nominal=total_plan)
                db.session.add(b)
                print(f"Created Budget 2026 Kat {kat_id}: Rp {total_plan:,.2f}")
            else:
                b.nominal = total_plan
                print(f"Updated Budget 2026 Kat {kat_id}: Rp {total_plan:,.2f}")
        db.session.commit()

        print("\n=== 4. Sinkronisasi PrPoData (Kategori & Budget Link) ===")
        budget_map = {
            b.kategori_id: b.id for b in Budget.query.filter_by(periode="2026").all()
        }

        prs = PrPoData.query.all()
        updated_pr = 0
        pr_kat_counts = {1: 0, 2: 0, 3: 0}

        for pr in prs:
            is_manual = (pr.metode_klasifikasi == "MANUAL" or pr.kategori_id_koreksi is not None or pr.direview_oleh is not None)
            
            target_kat_id = None
            if pr.planning_detail:
                target_kat_id = pr.planning_detail.kategori_id
            elif pr.description:
                target_kat_id = get_category_id_for_item(pr.description)

            if target_kat_id and not is_manual:
                pr.kategori_id = target_kat_id
                pr.budget_id = budget_map.get(target_kat_id)
                updated_pr += 1

            final_kat = pr.kategori_id or 1
            pr_kat_counts[final_kat] = pr_kat_counts.get(final_kat, 0) + 1

        db.session.commit()
        print(f"PrPoData synchronized ({updated_pr} updated):")
        print(f"  - E-1 (Consumable OPEX): {pr_kat_counts.get(1, 0)} PRs")
        print(f"  - E-9 (Calibration & Mtc CF OPEX): {pr_kat_counts.get(2, 0)} PRs")
        print(f"  - I-1 (Investment Asset CAPEX): {pr_kat_counts.get(3, 0)} PRs")

        print("\n=== 5. Sinkronisasi Aturan ItemMapping ===")
        mappings = ItemMapping.query.all()
        updated_mappings = 0
        for m in mappings:
            target_kat = get_category_id_for_item(m.planning_item)
            if m.kategori_id != target_kat:
                m.kategori_id = target_kat
                updated_mappings += 1
        db.session.commit()
        print(f"ItemMapping rules synchronized ({updated_mappings} updated).")

        print("\n=== SELESAI: Realignment Berhasil Sempurna! ===")

if __name__ == "__main__":
    realign_categories()
