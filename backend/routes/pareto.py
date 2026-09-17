from flask import Blueprint, jsonify, request
from services.pareto_service import ParetoService

pareto_bp = Blueprint("pareto", __name__, url_prefix="/api/dashboard/pareto")

@pareto_bp.route("", methods=["GET"])
def get_pareto():
    """
    Get Pareto Analysis by Section / User and by Item with optional Category filter.
    ---
    tags:
      - Dashboard
    parameters:
      - name: periode
        in: query
        type: string
        required: false
        default: "2026"
        description: Budget Year Period
      - name: category
        in: query
        type: string
        required: false
        default: "ALL"
        description: Category filter (ALL, CALIBRATION, PREVENTIVE, CONSUMABLE, CAPEX)
    responses:
      200:
        description: Pareto analysis successfully generated
    """
    periode = request.args.get("periode", "2026")
    category = request.args.get("category", "ALL")
    try:
        data = ParetoService.get_pareto_analysis(periode, category=category)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@pareto_bp.route("/user-commitment", methods=["GET"])
def get_user_commitment():
    """
    Get Procurement Commitment chart data aggregated by User / PIC.
    ---
    tags:
      - Dashboard
    parameters:
      - name: periode
        in: query
        type: string
        required: false
        default: "2026"
    responses:
      200:
        description: User commitment chart data
    """
    periode = request.args.get("periode", "2026")
    try:
        data = ParetoService.get_user_commitment_chart(periode)
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
