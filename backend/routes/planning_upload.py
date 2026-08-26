from flask import Blueprint, request, jsonify
from services.planning.planning_upload_service import PlanningUploadService
from services.planning.planning_header_service import PlanningHeaderService
from services.planning.planning_detail_service import PlanningDetailService
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from utils.auth import role_required
from utils.db import db

planning_bp = Blueprint("planning", __name__)


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
    """Mendapatkan Daftar Header Master Planning Budget
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
        enum: [UPLOADING, SUCCESS, FAILED]
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
        description: Daftar file master planning yang tersimpan
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