from flask import Blueprint, jsonify, request

from services.budget_service import BudgetService

budget_bp = Blueprint(
    "budget",
    __name__
)


# GET /summary — ringkasan dashboard
@budget_bp.route("/summary", methods=["GET"])
def get_summary():
    """Ringkasan Metrik Budget Dashboard
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        required: false
        example: "2026"
        description: Filter tahun periode anggaran
    responses:
      200:
        description: Ringkasan total budget plan, realisasi actual, dan sisa budget
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            data:
              type: object
              properties:
                total_plan:
                  type: number
                  example: 500000000
                total_actual:
                  type: number
                  example: 320000000
                total_variance:
                  type: number
                  example: 180000000
    """
    periode = request.args.get("periode")

    summary = BudgetService.get_summary(periode=periode)

    return jsonify({
        "success": True,
        "data": summary
    }), 200


# GET / — semua budget
@budget_bp.route("/", methods=["GET"])
def get_all_budgets():
    """Mendapatkan Semua Data Budget per Kategori & Bulan
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        required: false
        example: "2026"
    responses:
      200:
        description: Daftar baris data budget planning & actual
    """
    periode = request.args.get("periode")

    budgets = BudgetService.get_all_budgets(periode=periode)

    return jsonify({
        "success": True,
        "total": len(budgets),
        "data": [b.to_dict() for b in budgets]
    }), 200


# GET /<id> — budget by id
@budget_bp.route("/<int:budget_id>", methods=["GET"])
def get_budget_by_id(budget_id):
    """Mendapatkan Detail Budget berdasarkan ID
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: budget_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail data budget
      404:
        description: Budget tidak ditemukan
    """
    budget = BudgetService.get_budget_by_id(budget_id)

    if budget is None:
        return jsonify({
            "success": False,
            "message": "Budget tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": budget.to_dict()
    }), 200


# POST / — buat budget baru
@budget_bp.route("/", methods=["POST"])
def create_budget():
    """Membuat Data Budget Baru
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - kategori_id
            - periode
            - bulan
            - amount_plan
          properties:
            kategori_id:
              type: integer
              example: 1
            periode:
              type: string
              example: "2026"
            bulan:
              type: integer
              example: 5
            amount_plan:
              type: number
              example: 25000000
    responses:
      201:
        description: Budget berhasil dibuat
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = BudgetService.create_budget(data)
    return jsonify(result), status


# PUT /<id> — update budget
@budget_bp.route("/<int:budget_id>", methods=["PUT"])
def update_budget(budget_id):
    """Memperbarui Data Budget
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - name: budget_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            amount_plan:
              type: number
            amount_actual:
              type: number
    responses:
      200:
        description: Budget berhasil diperbarui
      404:
        description: Budget tidak ditemukan
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = BudgetService.update_budget(budget_id, data)
    return jsonify(result), status


# DELETE /<id> — hapus budget
@budget_bp.route("/<int:budget_id>", methods=["DELETE"])
def delete_budget(budget_id):
    """Menghapus Data Budget
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - name: budget_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Budget berhasil dihapus
      404:
        description: Budget tidak ditemukan
    """
    result, status = BudgetService.delete_budget(budget_id)
    return jsonify(result), status

# DELETE /periode/<periode> — hapus semua budget untuk satu periode
@budget_bp.route("/periode/<periode>", methods=["DELETE"])
def delete_budget_by_periode(periode):
    """Menghapus Seluruh Data Budget untuk Satu Periode Tertentu
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - name: periode
        in: path
        type: string
        required: true
        example: "2026"
    responses:
      200:
        description: Seluruh budget periode berhasil dihapus
    """
    result, status = BudgetService.delete_by_periode(periode)
    return jsonify(result), status


# -------------------------------------------------------------
# GET /monthly_items — Rincian Barang Planning & PR per Bulan
# -------------------------------------------------------------
@budget_bp.route("/monthly_items", methods=["GET"])
def get_monthly_items():
    """Mendapatkan Rincian Item Planning dan Transaksi PR pada Bulan & Periode Tertentu
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        default: "2026"
      - name: month
        in: query
        type: string
        default: "Jan"
    responses:
      200:
        description: Rincian barang planning dan transaksi PR bulanan
    """
    periode = request.args.get("periode", "2026").strip()
    month_raw = request.args.get("month", "Jan").strip()

    MONTH_NORM = {
        '1': 'Jan', '01': 'Jan', 'jan': 'Jan',
        '2': 'Feb', '02': 'Feb', 'feb': 'Feb',
        '3': 'Mar', '03': 'Mar', 'mar': 'Mar',
        '4': 'Apr', '04': 'Apr', 'apr': 'Apr',
        '5': 'May', '05': 'May', 'may': 'May', 'mei': 'May',
        '6': 'Jun', '06': 'Jun', 'jun': 'Jun',
        '7': 'Jul', '07': 'Jul', 'jul': 'Jul',
        '8': 'Aug', '08': 'Aug', 'aug': 'Aug', 'agu': 'Aug', 'ags': 'Aug',
        '9': 'Sep', '09': 'Sep', 'sep': 'Sep',
        '10': 'Oct', 'oct': 'Oct', 'okt': 'Oct',
        '11': 'Nov', 'nov': 'Nov',
        '12': 'Dec', 'dec': 'Dec', 'des': 'Dec'
    }
    month_str = MONTH_NORM.get(month_raw.lower(), month_raw)
    
    month_to_num = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
    }
    m_num = month_to_num.get(month_str, 1)

    from models.planning_detail import PlanningDetail
    from models.planning_header import PlanningHeader
    from models.pr_po_data import PrPoData
    from sqlalchemy import extract, or_

    # 1. Rincian Item Perencanaan (Planning Detail)
    details = PlanningDetail.query.join(
        PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
    ).filter(
        PlanningHeader.periode == periode,
        PlanningDetail.month == month_str,
        PlanningDetail.status_realisasi != 'CANCELLED'
    ).order_by(PlanningDetail.planning_amount.desc()).all()

    planned_items = []
    total_planned = 0.0
    for d in details:
        amt = float(d.planning_amount or 0.0)
        total_planned += amt
        linked_prs = PrPoData.query.filter(
            PrPoData.planning_detail_id == d.id,
            PrPoData.status_ai != 'CANCELLED'
        ).all()
        consumed = sum(float(p.total_price or 0.0) for p in linked_prs)

        planned_items.append({
            "id": d.id,
            "item": d.item,
            "remarks": d.remarks or "",
            "kategori_kode": d.kategori.kode if d.kategori else "-",
            "kategori_nama": d.kategori.nama if d.kategori else "-",
            "planning_amount": amt,
            "consumed_amount": consumed,
            "remaining_amount": amt - consumed,
            "status_realisasi": d.status_realisasi or "OPEN",
            "pr_count": len(linked_prs)
        })

    # 2. Rincian Transaksi PR
    yy = periode[2:] if len(periode) == 4 else "26"
    mm = f"{m_num:02d}"
    pr_code_prefix = f"%/{yy}{mm}%"

    prs = PrPoData.query.filter(
        or_(
            (extract('year', PrPoData.request_date) == int(periode)) & (extract('month', PrPoData.request_date) == m_num),
            PrPoData.pr_doc_num.like(pr_code_prefix)
        ),
        PrPoData.status_ai != 'CANCELLED'
    ).order_by(PrPoData.id.desc()).all()

    pr_items = []
    total_pr = 0.0
    total_gr = 0.0
    for p in prs:
        t_price = float(p.total_price or 0.0)
        total_pr += t_price
        if p.gr_legal_number:
            total_gr += t_price

        pr_items.append({
            "id": p.id,
            "pr_doc_num": p.pr_doc_num or "-",
            "po_doc_num": p.po_doc_num or "-",
            "gr_legal_number": p.gr_legal_number or "-",
            "description": p.description or "-",
            "qty": float(p.qty) if p.qty else None,
            "uom": p.uom or "",
            "unit_price": float(p.unit_price) if p.unit_price else None,
            "total_price": t_price,
            "budget_status": p.budget_status or "-",
            "status_ai": p.status_ai or "-",
            "planning_item": p.planning_detail.item if p.planning_detail else ("Out of Plan (OOP)" if p.budget_status == "OOP" else "-"),
            "kategori_kode": p.kategori.kode if p.kategori else "-"
        })

    return jsonify({
        "success": True,
        "periode": periode,
        "month": month_str,
        "month_num": m_num,
        "summary": {
            "total_planned": total_planned,
            "total_pr": total_pr,
            "total_gr": total_gr,
            "saldo_pr": total_planned - total_pr,
            "planned_count": len(planned_items),
            "pr_count": len(pr_items)
        },
        "planned_items": planned_items,
        "pr_items": pr_items
    }), 200