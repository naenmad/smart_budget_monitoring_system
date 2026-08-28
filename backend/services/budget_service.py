from decimal import Decimal

from sqlalchemy import func, extract

from models.budget import Budget
from models.kategori import Kategori
from models.pr_po_data import PrPoData
from utils.db import db
from utils.sanitize import to_int_or_none


class BudgetService:

    @staticmethod
    def get_budget_by_id(budget_id):
        return db.session.get(Budget, budget_id)

    @staticmethod
    def get_all_budgets(periode=None):
        query = Budget.query

        if periode:
            query = query.filter_by(periode=periode)

        return query.order_by(Budget.id).all()

    @staticmethod
    def create_budget(data):
        kategori_id = to_int_or_none(data.get("kategori_id"))
        periode = data.get("periode")
        nominal = data.get("nominal")
        created_by = to_int_or_none(data.get("created_by"))
        upload_id = to_int_or_none(data.get("upload_id"))

        if not kategori_id:
            return {
                "success": False,
                "message": "kategori_id wajib diisi"
            }, 400

        if not periode:
            return {
                "success": False,
                "message": "periode wajib diisi"
            }, 400

        if nominal is None:
            return {
                "success": False,
                "message": "nominal wajib diisi"
            }, 400

        # cek kategori ada
        kategori = db.session.get(Kategori, kategori_id)
        if not kategori:
            return {
                "success": False,
                "message": "Kategori tidak ditemukan"
            }, 404

        # cek duplikat (kategori + periode unik)
        existing = Budget.query.filter_by(
            kategori_id=kategori_id,
            periode=periode
        ).first()
        if existing:
            existing.nominal = Decimal(str(nominal))
            existing.upload_id = upload_id
            db.session.commit()
            return {
                "success": True,
                "message": "Budget berhasil diupdate",
                "data": existing.to_dict()
            }, 200

        budget = Budget(
            kategori_id=kategori_id,
            periode=periode,
            nominal=Decimal(str(nominal)),
            created_by=created_by,
            upload_id=upload_id
        )

        db.session.add(budget)
        db.session.commit()

        return {
            "success": True,
            "message": "Budget berhasil dibuat",
            "data": budget.to_dict()
        }, 201

    @staticmethod
    def update_budget(budget_id, data):
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return {
                "success": False,
                "message": "Budget tidak ditemukan"
            }, 404

        if "nominal" in data:
            budget.nominal = Decimal(str(data["nominal"]))

        if "periode" in data:
            budget.periode = data["periode"]

        if "kategori_id" in data:
            kat_id = to_int_or_none(data["kategori_id"])
            if not kat_id:
                return {
                    "success": False,
                    "message": "kategori_id tidak valid"
                }, 400
            kategori = db.session.get(Kategori, kat_id)
            if not kategori:
                return {
                    "success": False,
                    "message": "Kategori tidak ditemukan"
                }, 404
            budget.kategori_id = kat_id

        db.session.commit()

        return {
            "success": True,
            "message": "Budget berhasil diupdate",
            "data": budget.to_dict()
        }, 200

    @staticmethod
    def delete_budget(budget_id):
        budget = db.session.get(Budget, budget_id)
        if not budget:
            return {
                "success": False,
                "message": "Budget tidak ditemukan"
            }, 404

        db.session.delete(budget)
        db.session.commit()

        return {
            "success": True,
            "message": "Budget berhasil dihapus"
        }, 200

    @staticmethod
    def delete_by_periode(periode):
        if not periode:
            return {
                "success": False,
                "message": "Periode tidak valid"
            }, 400

        budgets = Budget.query.filter_by(periode=periode).all()
        if not budgets:
            return {
                "success": False,
                "message": "Tidak ada budget pada periode tersebut"
            }, 404

        for b in budgets:
            db.session.delete(b)
        db.session.commit()

        return {
            "success": True,
            "message": f"Berhasil menghapus {len(budgets)} budget untuk periode {periode}"
        }, 200

    @staticmethod
    def get_summary(periode=None):
        """
        Ringkasan budget untuk dashboard.
        Mengembalikan total budget vs actual per tipe (CAPEX/OPEX)
        dengan dual metrics: PR (Ekspektasi Komitmen) dan GR (Realisasi Fisik).
        """
        kategoris = Kategori.query.all()
        
        # 1. Ambil semua budget di periode ini
        budget_query = (
            db.session.query(
                Kategori.kode,
                Budget.nominal
            )
            .join(Kategori, Budget.kategori_id == Kategori.id)
        )
        if periode:
            budget_query = budget_query.filter(
                Budget.periode == periode
            )

        budget_rows = budget_query.all()
        budget_map = {row.kode: float(row.nominal) for row in budget_rows}

        # 2. Hitung actual PR (Komitmen): semua PR yang berstatus DONE
        actual_pr_query = (
            db.session.query(
                Kategori.kode,
                func.coalesce(
                    func.sum(PrPoData.total_price), 0
                ).label("actual_pr")
            )
            .join(Kategori, PrPoData.kategori_id == Kategori.id)
            .filter(PrPoData.status_ai == "DONE")
        )
        if periode:
            actual_pr_query = actual_pr_query.filter(
                extract('year', PrPoData.request_date) == int(periode)
            )

        actual_pr_rows = actual_pr_query.group_by(Kategori.kode).all()
        actual_pr_map = {row.kode: float(row.actual_pr) for row in actual_pr_rows}

        # 3. Hitung actual GR (Realisasi Fisik): PR yang DONE dan memiliki nomor GR
        actual_gr_query = (
            db.session.query(
                Kategori.kode,
                func.coalesce(
                    func.sum(PrPoData.total_price), 0
                ).label("actual_gr")
            )
            .join(Kategori, PrPoData.kategori_id == Kategori.id)
            .filter(
                PrPoData.status_ai == "DONE",
                PrPoData.gr_legal_number.isnot(None)
            )
        )
        if periode:
            actual_gr_query = actual_gr_query.filter(
                extract('year', PrPoData.request_date) == int(periode)
            )

        actual_gr_rows = actual_gr_query.group_by(Kategori.kode).all()
        actual_gr_map = {row.kode: float(row.actual_gr) for row in actual_gr_rows}

        # 4. Bangun summary per kategori
        items = []

        for kat in kategoris:
            if kat.kode in budget_map or kat.kode in actual_pr_map or kat.kode in actual_gr_map:
                budget_val = budget_map.get(kat.kode, 0)
                actual_pr_val = actual_pr_map.get(kat.kode, 0)
                actual_gr_val = actual_gr_map.get(kat.kode, 0)
                
                saldo_pr = budget_val - actual_pr_val
                saldo_gr = budget_val - actual_gr_val
                persen_pr = round((actual_pr_val / budget_val) * 100) if budget_val > 0 else 0
                persen_gr = round((actual_gr_val / budget_val) * 100) if budget_val > 0 else 0

                items.append({
                    "kode": kat.kode,
                    "nama": kat.nama,
                    "tipe_formulir": kat.tipe_formulir,
                    "budget": budget_val,
                    "actual": actual_pr_val,       # backward compatibility
                    "actual_pr": actual_pr_val,
                    "actual_gr": actual_gr_val,
                    "saldo": saldo_pr,             # backward compatibility
                    "saldo_pr": saldo_pr,
                    "saldo_gr": saldo_gr,
                    "persen_pr": persen_pr,
                    "persen_gr": persen_gr,
                    "is_over": saldo_pr < 0,
                })

        # 5. Summary per tipe CAPEX
        capex_item = next((i for i in items if i["kode"] == "CAPEX"), None)
        capex_budget = capex_item["budget"] if capex_item else sum(
            i["budget"] for i in items
            if i["tipe_formulir"] == "CAPEX" and i["kode"] != "CAPEX"
        )
        capex_actual_pr = sum(
            i["actual_pr"] for i in items
            if i["tipe_formulir"] == "CAPEX"
        )
        capex_actual_gr = sum(
            i["actual_gr"] for i in items
            if i["tipe_formulir"] == "CAPEX"
        )
        capex_saldo_pr = capex_budget - capex_actual_pr
        capex_saldo_gr = capex_budget - capex_actual_gr
        capex_persen_pr = round((capex_actual_pr / capex_budget) * 100) if capex_budget > 0 else 0
        capex_persen_gr = round((capex_actual_gr / capex_budget) * 100) if capex_budget > 0 else 0

        # 6. Summary per tipe OPEX
        opex_item = next((i for i in items if i["kode"] == "OPEX"), None)
        opex_budget = opex_item["budget"] if opex_item else sum(
            i["budget"] for i in items
            if i["tipe_formulir"] == "OPEX" and i["kode"] != "OPEX"
        )
        opex_actual_pr = sum(
            i["actual_pr"] for i in items
            if i["tipe_formulir"] == "OPEX"
        )
        opex_actual_gr = sum(
            i["actual_gr"] for i in items
            if i["tipe_formulir"] == "OPEX"
        )
        opex_saldo_pr = opex_budget - opex_actual_pr
        opex_saldo_gr = opex_budget - opex_actual_gr
        opex_persen_pr = round((opex_actual_pr / opex_budget) * 100) if opex_budget > 0 else 0
        opex_persen_gr = round((opex_actual_gr / opex_budget) * 100) if opex_budget > 0 else 0

        total_budget = capex_budget + opex_budget
        total_actual_pr = capex_actual_pr + opex_actual_pr
        total_actual_gr = capex_actual_gr + opex_actual_gr

        over_count = sum(1 for i in items if i["is_over"])

        return {
            "periode": periode,
            "total_budget": total_budget,
            "total_actual": total_actual_pr,
            "total_actual_pr": total_actual_pr,
            "total_actual_gr": total_actual_gr,
            "total_saldo": total_budget - total_actual_pr,
            "total_saldo_pr": total_budget - total_actual_pr,
            "total_saldo_gr": total_budget - total_actual_gr,
            "over_count": over_count,
            "capex": {
                "budget": capex_budget,
                "actual": capex_actual_pr,
                "actual_pr": capex_actual_pr,
                "actual_gr": capex_actual_gr,
                "saldo": capex_saldo_pr,
                "saldo_pr": capex_saldo_pr,
                "saldo_gr": capex_saldo_gr,
                "persen_pr": capex_persen_pr,
                "persen_gr": capex_persen_gr,
            },
            "opex": {
                "budget": opex_budget,
                "actual": opex_actual_pr,
                "actual_pr": opex_actual_pr,
                "actual_gr": opex_actual_gr,
                "saldo": opex_saldo_pr,
                "saldo_pr": opex_saldo_pr,
                "saldo_gr": opex_saldo_gr,
                "persen_pr": opex_persen_pr,
                "persen_gr": opex_persen_gr,
            },
            "items": items,
        }