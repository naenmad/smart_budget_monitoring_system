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