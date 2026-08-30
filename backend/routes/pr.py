from flask import Blueprint, request, jsonify
from services.pr.pr_upload_service import PrUploadService
from services.pr.pr_service import PrService
from services.pipeline_service import PipelineService

pr_bp = Blueprint("pr", __name__)


# ------------------------------------------------------------------
# Upload Excel PR
# POST /api/v1/pr/upload
# ------------------------------------------------------------------
@pr_bp.route("/upload", methods=["POST"])
def upload_pr():
    """Unggah File Excel PR / PO
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
        description: File Excel (.xlsx / .xls)
      - in: formData
        name: user_id
        type: integer
        required: false
        default: 1
      - in: formData
        name: periode
        type: string
        required: true
        example: "2026"
    responses:
      200:
        description: File PR berhasil diunggah dan disimpan ke antrean parsing
      400:
        description: File atau parameter periode tidak valid
    """
    file = request.files.get("file")
    user_id = request.form.get("user_id", 1)
    periode = request.form.get("periode")

    # Validasi input dasar
    if not file:
        return jsonify({"success": False, "message": "File wajib diisi"}), 400
    if not periode or not str(periode).strip():
        return jsonify({"success": False, "message": "Periode wajib diisi"}), 400
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "user_id harus berupa angka"}), 400

    result, status = PrUploadService.upload(
        file=file,
        user_id=user_id,
        periode=periode
    )
    return jsonify(result), status


# ------------------------------------------------------------------
# List PR (dengan filter & paginasi)
# GET /api/v1/pr/?upload_id=&status_ai=&page=&per_page=
# ------------------------------------------------------------------
@pr_bp.route("/", methods=["GET"])
def get_all():
    """Daftar Riwayat PR / PO dengan Paginasi dan Filter
    ---
    tags:
      - PR / PO Tracking & Stages
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 50
      - name: upload_id
        in: query
        type: integer
      - name: status_ai
        in: query
        type: string
        enum: [WAITING, PROCESSING, DONE, FAILED, CANCELLED]
      - name: tracking_stage
        in: query
        type: string
        enum: [PR, PO, GR]
      - name: filter_status
        in: query
        type: string
        enum: [DONE, PENDING, ON_PLAN, OVER_PLAN, OOP, CANCELLED]
      - name: search
        in: query
        type: string
    responses:
      200:
        description: Daftar baris data PR
    """
    upload_id = request.args.get("upload_id", type=int)
    status_ai = request.args.get("status_ai")
    tracking_stage = request.args.get("tracking_stage")
    kategori_id = request.args.get("kategori_id", type=int)
    search = request.args.get("search")
    filter_status = request.args.get("filter_status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    result, status = PrService.get_all(
        upload_id=upload_id,
        status_ai=status_ai,
        tracking_stage=tracking_stage,
        kategori_id=kategori_id,
        search=search,
        filter_status=filter_status,
        page=page,
        per_page=per_page
    )
    return jsonify(result), status


# ------------------------------------------------------------------
# Detail satu PR
# GET /api/v1/pr/<pr_id>
# ------------------------------------------------------------------
@pr_bp.route("/<int:pr_id>", methods=["GET"])
def get_by_id(pr_id):
    """Mendapatkan Detail Satu PR berdasarkan ID
    ---
    tags:
      - PR / PO Tracking & Stages
    parameters:
      - name: pr_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail data PR
      404:
        description: PR tidak ditemukan
    """
    result, status = PrService.get_by_id(pr_id)
    return jsonify(result), status


# ------------------------------------------------------------------
# Manual override kategori (review)
# PUT /api/v1/pr/<pr_id>/kategori
# Body: { "kategori_id": 5, "user_id": 1 }
# ------------------------------------------------------------------
@pr_bp.route("/<int:pr_id>/kategori", methods=["PUT"])
def update_kategori(pr_id):
    """Koreksi Manual Kategori PR
    ---
    tags:
      - PR / PO Tracking & Stages
    security:
      - Bearer: []
    parameters:
      - name: pr_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - kategori_id
            - user_id
          properties:
            kategori_id:
              type: integer
              example: 2
            user_id:
              type: integer
              example: 1
    responses:
      200:
        description: Kategori PR berhasil diperbarui
    """
    data = request.get_json()
    kategori_id = data.get("kategori_id")
    user_id = data.get("user_id")

    if not kategori_id:
        return jsonify({"success": False, "message": "kategori_id wajib diisi"}), 400
    if not user_id:
        return jsonify({"success": False, "message": "user_id wajib diisi"}), 400

    result, status = PrService.update_kategori(pr_id, kategori_id, user_id)
    return jsonify(result), status


# ------------------------------------------------------------------
# Batalkan PR langsung (tanpa melalui cancel planning_detail)
# POST /api/v1/pr/<pr_id>/cancel
# Body: { "user_id": 1, "alasan": "Kebutuhan tidak relevan" }
# ------------------------------------------------------------------
@pr_bp.route("/<int:pr_id>/cancel", methods=["POST"])
def cancel_pr(pr_id):
    """Membatalkan PR dan Melepaskan Kaitannya dengan Budget Plan
    ---
    tags:
      - PR / PO Tracking & Stages
    security:
      - Bearer: []
    parameters:
      - name: pr_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - user_id
            - alasan
          properties:
            user_id:
              type: integer
              example: 1
            alasan:
              type: string
              example: "Item dibatalkan oleh user pemohon"
    responses:
      200:
        description: PR berhasil dibatalkan
    """
    data = request.get_json() or {}
    user_id = data.get("user_id")
    alasan = data.get("alasan", "").strip() or None

    if not user_id:
        return jsonify({"success": False, "message": "user_id wajib diisi"}), 400

    result, status = PrService.cancel_pr(pr_id, user_id, alasan)
    return jsonify(result), status


# ------------------------------------------------------------------
# Edit / Koreksi Status PR
# POST/PUT /api/v1/pr/<pr_id>/status
# Body: { "user_id": 1, "status_type": "PLANNING|OOP|NEED_MAPPING|CANCELLED|RESTORE", "planning_detail_id": 123, "alasan": "..." }
# ------------------------------------------------------------------
@pr_bp.route("/<int:pr_id>/status", methods=["PUT", "POST"])
def edit_status(pr_id):
    """Koreksi / Perbarui Status PR (PLANNING, OOP, NEED_MAPPING, CANCELLED, RESTORE)
    ---
    tags:
      - PR / PO Tracking & Stages
    security:
      - Bearer: []
    parameters:
      - name: pr_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - status_type
          properties:
            status_type:
              type: string
              enum: [PLANNING, OOP, NEED_MAPPING, CANCELLED, RESTORE]
            planning_detail_id:
              type: integer
            alasan:
              type: string
            user_id:
              type: integer
    responses:
      200:
        description: Status PR berhasil diperbarui
    """
    data = request.get_json() or {}
    status_type = data.get("status_type")
    planning_detail_id = data.get("planning_detail_id")
    alasan = data.get("alasan")
    user_id = data.get("user_id", 1)

    if not status_type:
        return jsonify({"success": False, "message": "status_type wajib diisi"}), 400

    result, status = PrService.edit_status(
        pr_id=pr_id,
        user_id=user_id,
        status_type=status_type,
        planning_detail_id=planning_detail_id,
        alasan=alasan
    )
    return jsonify(result), status


# ------------------------------------------------------------------
# Ringkasan status AI per upload
# GET /api/v1/pr/summary/<upload_id>
# ------------------------------------------------------------------
@pr_bp.route("/summary/<int:upload_id>", methods=["GET"])
def get_summary(upload_id):
    """Mendapatkan Ringkasan Status AI per Upload Batch
    ---
    tags:
      - PR / PO Tracking & Stages
    parameters:
      - name: upload_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Ringkasan jumlah status WAITING, PROCESSING, DONE, FAILED
    """
    result, status = PrService.get_summary_by_upload(upload_id)
    return jsonify(result), status


# ------------------------------------------------------------------
# Trigger Batch Pipeline untuk Sprint 6
# POST /api/v1/pr/process_pipeline
# Body: { "periode": "2026" }
# ------------------------------------------------------------------
@pr_bp.route("/process_pipeline", methods=["POST"])
def process_pipeline():
    """Menjalankan Pipeline Otomatisasi (Klasifikasi & Budget Mapping) untuk Semua PR WAITING
    ---
    tags:
      - PR / PO Tracking & Stages
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - periode
          properties:
            periode:
              type: string
              example: "2026"
    responses:
      200:
        description: Pipeline pemrosesan berhasil dijalankan
    """
    data = request.get_json()
    periode = data.get("periode") if data else None
    
    if not periode:
        return jsonify({"success": False, "message": "periode wajib diisi"}), 400
        
    result = PipelineService.process_all_waiting(periode)
    return jsonify(result), 200

# ------------------------------------------------------------------
# Retry Mapping Only (Untuk status NEED_MAPPING)
# POST /api/v1/pr/retry_mapping
# Body: { "periode": "2026" }
# ------------------------------------------------------------------
@pr_bp.route("/retry_mapping", methods=["POST"])
def retry_mapping():
    """Menjalankan Ulang Mapping untuk PR yang Membutuhkan Budget Matching
    ---
    tags:
      - PR / PO Tracking & Stages
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - periode
          properties:
            periode:
              type: string
              example: "2026"
    responses:
      200:
        description: Retry mapping berhasil diproses
    """
    data = request.get_json()
    periode = data.get("periode") if data else None
    
    if not periode:
        return jsonify({"success": False, "message": "periode wajib diisi"}), 400
        
    result = PipelineService.retry_mapping_only(periode)
    return jsonify(result), 200

# ------------------------------------------------------------------
# Get Dashboard Summary Sprint 6
# GET /api/v1/pr/dashboard_summary?periode=2026
# ------------------------------------------------------------------
@pr_bp.route("/dashboard_summary", methods=["GET"])
def get_dashboard_summary():
    """Mendapatkan Ringkasan Metrik Dashboard PR Tracking Stages & Budget Realization
    ---
    tags:
      - PR / PO Tracking & Stages
    parameters:
      - name: periode
        in: query
        type: string
        required: true
        example: "2026"
    responses:
      200:
        description: Metrik stage_pr, stage_po, stage_gr, on_plan, over_plan, under_plan, out_of_plan, cancelled_pr
    """
    periode = request.args.get("periode")
    if not periode:
        return jsonify({"success": False, "message": "periode wajib diisi"}), 400
        
    result = PipelineService.get_dashboard_summary(periode)
    return jsonify(result), 200

@pr_bp.route("/dashboard_summary_monthly", methods=["GET"])
def get_dashboard_summary_monthly():
    """Mendapatkan Tren Bulanan Realisasi PR
    ---
    tags:
      - PR / PO Tracking & Stages
    parameters:
      - name: periode
        in: query
        type: string
        required: true
        example: "2026"
    responses:
      200:
        description: Breakdown realisasi per bulan
    """
    periode = request.args.get("periode")
    if not periode:
        return jsonify({"success": False, "message": "periode wajib diisi"}), 400

    result = PipelineService.get_dashboard_summary_monthly(periode)
    return jsonify(result), 200
