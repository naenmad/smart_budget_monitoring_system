from flask import Blueprint, request, jsonify, send_file
from services.planning.planning_upload_service import PlanningUploadService
from services.planning.planning_header_service import PlanningHeaderService
from services.planning.planning_detail_service import PlanningDetailService
from services.excel.excel_export_service import ExcelExportService
from services.excel.database_budget_excel_service import DatabaseBudgetExcelService
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from models.pr_po_data import PrPoData
from models.preventive_cf import PreventiveCf
from utils.auth import role_required
from utils.db import db

planning_bp = Blueprint("planning", __name__)


# ------------------------------------------------------------------
# Download Database Web Budget Excel (5 Sheets: Summary, Kode, Item, OOB, Preventive)
# GET /api/v1/planning/export-database-budget?periode=2026
# ------------------------------------------------------------------
@planning_bp.route("/export-database-budget", methods=["GET"])
def export_database_budget_excel():
    """Download File Excel Master Database Budget 5-Sheet Lengkap
    Kompatibel dengan Microsoft Excel dan Apple Numbers.
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        default: "2026"
    responses:
      200:
        description: File Excel DATABASE WEB BUDGET (5 Sheets)
    """
    periode = request.args.get("periode", "2026").strip()
    excel_stream = DatabaseBudgetExcelService.export_excel(periode)
    filename = f"DATABASE_WEB_BUDGET_{periode}.xlsx"

    return send_file(
        excel_stream,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )


# ------------------------------------------------------------------
# Import / Sinkronisasi Database Web Budget Excel (5 Sheets)
# POST /api/v1/planning/import-database-budget
# ------------------------------------------------------------------
@planning_bp.route("/import-database-budget", methods=["POST"])
def import_database_budget_excel():
    """Sinkronisasi Database Budget dari File Excel 5-Sheet (Microsoft Excel / Apple Numbers)
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: File Excel DATABASE WEB BUDGET (5 Sheets)
      - in: formData
        name: user_id
        type: integer
        default: 1
      - in: formData
        name: periode
        type: string
        default: "2026"
    responses:
      200:
        description: Data budget 5-sheet berhasil disinkronisasi
    """
    file = request.files.get("file")
    user_id = request.form.get("user_id", 1, type=int)
    periode = request.form.get("periode", "2026").strip()

    if not file:
        return jsonify({"success": False, "message": "File Excel wajib diunggah"}), 400

    try:
        result = DatabaseBudgetExcelService.import_excel(
            file_or_path=file,
            user_id=user_id,
            periode=periode
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Gagal memproses file DATABASE WEB BUDGET: {str(e)}"
        }), 500


# ------------------------------------------------------------------
# Download Planning Budget Excel Report
# GET /api/v1/planning/export?periode=2026
# ------------------------------------------------------------------
@planning_bp.route("/export", methods=["GET"])
def export_planning_excel():
    """Download File Excel Planning Budget (Format Database 5-Sheet atau Detail)"""
    periode = request.args.get("periode", "2026").strip()
    fmt = request.args.get("format", "database").strip().lower()

    if fmt == "database":
        excel_stream = DatabaseBudgetExcelService.export_excel(periode)
        filename = f"DATABASE_WEB_BUDGET_{periode}.xlsx"
    else:
        excel_stream = ExcelExportService.generate_planning_excel(periode)
        filename = f"Planning_Budget_{periode}.xlsx"

    return send_file(
        excel_stream,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )


# ------------------------------------------------------------------
# Upload Planning Excel
# POST /api/v1/planning/upload
# ------------------------------------------------------------------
@planning_bp.route("/upload", methods=["POST"])
def upload_planning():
    """Unggah File Excel Master Planning Budget
    ---
    tags:
      - Upload & Batch History
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: File Excel master plan anggaran tahunan
      - in: formData
        name: user_id
        type: integer
        default: 1
      - in: formData
        name: periode
        type: string
        required: true
        example: "2026"
    responses:
      200:
        description: Planning berhasil diunggah dan detail diuraikan ke database
    """
    file = request.files.get("file")
    user_id = request.form.get("user_id", 1)
    periode = request.form.get("periode")

    result, status = PlanningUploadService.upload_planning(
        file=file,
        user_id=user_id,
        periode=periode
    )
    return jsonify(result), status


# ------------------------------------------------------------------
# List semua PlanningHeader
# GET /api/v1/planning/?periode=&status=&page=&per_page=
# ------------------------------------------------------------------
@planning_bp.route("/", methods=["GET"])
def get_all_planning():
    """Mendapatkan Daftar Semua Master Planning
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        example: "2026"
      - name: status
        in: query
        type: string
        example: "SUCCESS"
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Daftar planning header
    """
    periode = request.args.get("periode")
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = PlanningHeader.query

    if periode:
        query = query.filter(PlanningHeader.periode == periode)
    if status:
        query = query.filter(PlanningHeader.status == status)

    pagination = query.order_by(PlanningHeader.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "success": True,
        "data": [h.to_dict() for h in pagination.items],
        "total": pagination.total,
        "page": page,
        "per_page": per_page,
        "pages": pagination.pages
    }), 200


# ------------------------------------------------------------------
# Detail satu PlanningHeader
# GET /api/v1/planning/<id>
# ------------------------------------------------------------------
@planning_bp.route("/<int:header_id>", methods=["GET"])
def get_planning_by_id(header_id):
    """Mendapatkan Detail Satu Planning Header
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: header_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail header planning
      404:
        description: Planning tidak ditemukan
    """
    header = db.session.get(PlanningHeader, header_id)
    if not header:
        return jsonify({"success": False, "message": "Planning tidak ditemukan"}), 404

    return jsonify({
        "success": True,
        "data": header.to_dict()
    }), 200


# ------------------------------------------------------------------
# Delete satu PlanningHeader
# DELETE /api/v1/planning/<id>
# ------------------------------------------------------------------
@planning_bp.route("/<int:header_id>", methods=["DELETE"])
def delete_planning(header_id):
    """Menghapus Master Planning Header dan Seluruh Detailnya
    ---
    tags:
      - Budget & Planning
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - name: header_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Planning berhasil dihapus
    """
    result, status = PlanningHeaderService.delete_planning_header(header_id)
    return jsonify(result), status


# ------------------------------------------------------------------
# Detail list planning (per bulan & item)
# GET /api/v1/planning/<id>/details?month=&kategori_id=
# ------------------------------------------------------------------
@planning_bp.route("/<int:header_id>/details", methods=["GET"])
def get_planning_details(header_id):
    """Mendapatkan Rincian Item Planning per Bulan & Kategori
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: header_id
        in: path
        type: integer
        required: true
      - name: month
        in: query
        type: string
        example: "Mei"
      - name: kategori_id
        in: query
        type: integer
    responses:
      200:
        description: Rincian item alokasi anggaran
    """
    header = db.session.get(PlanningHeader, header_id)
    if not header:
        return jsonify({"success": False, "message": "Planning tidak ditemukan"}), 404

    month = request.args.get("month")
    kategori_id = request.args.get("kategori_id", type=int)

    query = PlanningDetail.query.filter_by(planning_header_id=header_id)

    if month:
        query = query.filter(PlanningDetail.month == month)
    if kategori_id:
        query = query.filter(PlanningDetail.kategori_id == kategori_id)

    details = query.order_by(PlanningDetail.month.asc(), PlanningDetail.item.asc()).all()

    return jsonify({
        "success": True,
        "planning_header": header.to_dict(),
        "total": len(details),
        "data": [d.to_dict() for d in details]
    }), 200


@planning_bp.route("/cancelled", methods=["GET"])
def get_cancelled_planning():
    """Daftar Item Planning yang Dibatalkan
    ---
    tags:
      - Budget & Planning
    parameters:
      - name: periode
        in: query
        type: string
        example: "2026"
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Daftar baris item planning dengan status CANCELLED
    """
    periode = request.args.get("periode")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
 
    query = PlanningDetail.query.join(
        PlanningHeader, PlanningDetail.planning_header_id == PlanningHeader.id
    ).filter(PlanningDetail.status_realisasi == "CANCELLED")
 
    if periode:
        query = query.filter(PlanningHeader.periode == periode)
 
    pagination = query.order_by(PlanningDetail.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
 
    return jsonify({
        "success": True,
        "data": [d.to_dict() for d in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages
    }), 200


@planning_bp.route("/detail/<int:planning_detail_id>/cancel", methods=["POST"])
@role_required('admin')
def cancel_planning_detail(planning_detail_id):
    """Membatalkan Satu Item Planning Detail
    ---
    tags:
      - Budget & Planning
    security:
      - Bearer: []
    parameters:
      - name: planning_detail_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Item planning detail berhasil dibatalkan
    """
    result, status = PlanningDetailService.cancel_planning_detail(planning_detail_id)
    return jsonify(result), status


# ------------------------------------------------------------------
# Dedicated Out of Budget Transactions
# GET /api/v1/planning/out-of-budget?periode=2026&bulan=&search=
# ------------------------------------------------------------------
@planning_bp.route("/out-of-budget", methods=["GET"])
def get_out_of_budget():
    """Mendapatkan Daftar Transaksi Out of Budget (Unbudgeted/OOP)"""
    bulan = request.args.get("bulan", "").strip()
    search = request.args.get("search", "").strip()
    gl_code = request.args.get("gl_account", "").strip()

    query = PrPoData.query.filter(PrPoData.budget_status == "OOP")
    if bulan and bulan != "ALL":
        query = query.filter(PrPoData.bulan == bulan)
    if gl_code:
        query = query.filter(PrPoData.gl_account.like(f"%{gl_code}%"))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            PrPoData.description.ilike(search_filter) |
            PrPoData.item_name.ilike(search_filter) |
            PrPoData.po_doc_num.ilike(search_filter) |
            PrPoData.pr_docnum.ilike(search_filter) |
            PrPoData.comment_text.ilike(search_filter)
        )

    items = query.order_by(PrPoData.id.asc()).all()
    total_amount = sum(float(i.total_price or 0.0) for i in items)

    # Monthly breakdown for summary stats
    monthly_stats = {}
    for i in items:
        m = i.bulan or "Unknown"
        monthly_stats[m] = monthly_stats.get(m, 0.0) + float(i.total_price or 0.0)

    # Account breakdown
    account_stats = {}
    for i in items:
        acc = i.gl_account or "Other"
        account_stats[acc] = account_stats.get(acc, 0.0) + float(i.total_price or 0.0)

    return jsonify({
        "success": True,
        "total_nominal": total_amount,
        "total_count": len(items),
        "monthly_stats": monthly_stats,
        "account_stats": account_stats,
        "data": [i.to_dict() for i in items]
    }), 200


# ------------------------------------------------------------------
# Dedicated Data Preventive C/F
# GET /api/v1/planning/preventive-cf?periode=2026&bulan=&search=
# ------------------------------------------------------------------
@planning_bp.route("/preventive-cf", methods=["GET"])
def get_preventive_cf():
    """Mendapatkan Daftar Item Master Preventive C/F vs Actual GL"""
    bulan = request.args.get("bulan", "").strip()
    search = request.args.get("search", "").strip()

    query = PreventiveCf.query
    if bulan and bulan != "ALL":
        query = query.filter(PreventiveCf.bulan_list == bulan)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            PreventiveCf.item.ilike(search_filter) |
            PreventiveCf.spesifikasi.ilike(search_filter) |
            PreventiveCf.keterangan.ilike(search_filter) |
            PreventiveCf.item_gl.ilike(search_filter)
        )

    items = query.order_by(PreventiveCf.bulan_no.asc(), PreventiveCf.no_urut.asc()).all()
    total_plan = sum(float(i.total_list or 0.0) for i in items)
    total_actual = sum(float(i.actual_gl or 0.0) for i in items)

    # Monthly breakdown
    monthly_stats = {}
    for i in items:
        m = i.bulan_list or "Unknown"
        if m not in monthly_stats:
            monthly_stats[m] = {"plan": 0.0, "actual": 0.0, "count": 0}
        monthly_stats[m]["plan"] += float(i.total_list or 0.0)
        monthly_stats[m]["actual"] += float(i.actual_gl or 0.0)
        monthly_stats[m]["count"] += 1

    return jsonify({
        "success": True,
        "total_plan": total_plan,
        "total_actual": total_actual,
        "sisa": total_plan - total_actual,
        "total_count": len(items),
        "monthly_stats": monthly_stats,
        "data": [i.to_dict() for i in items]
    }), 200
