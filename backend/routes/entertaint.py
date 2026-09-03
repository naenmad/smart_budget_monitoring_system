import os
from flask import Blueprint, request, jsonify, send_file, send_from_directory, current_app, g
from services.entertaint_service import EntertaintService
from utils.auth import role_required
from datetime import datetime

entertaint_bp = Blueprint("entertaint", __name__)


# ------------------------------------------------------------------
# GET /api/v1/entertaint/ — Paginated List & Filters
# ------------------------------------------------------------------
@entertaint_bp.route("/", methods=["GET"])
@role_required("admin", "manager")
def get_all_costs():
    """Daftar Entertainment Cost Terpaginasi & Filter"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "").strip()
    customer = request.args.get("customer", "").strip()
    pic = request.args.get("pic", "").strip()
    status_pembayaran = request.args.get("status_pembayaran", "").strip()
    status_claim = request.args.get("status_claim", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()
    sort_by = request.args.get("sort_by", "tanggal").strip()
    sort_order = request.args.get("sort_order", "desc").strip()

    result = EntertaintService.get_all(
        page=page,
        per_page=per_page,
        search=search,
        customer=customer,
        pic=pic,
        status_pembayaran=status_pembayaran,
        status_claim=status_claim,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify(result), 200


# ------------------------------------------------------------------
# GET /api/v1/entertaint/summary — KPI Statistics
# ------------------------------------------------------------------
@entertaint_bp.route("/summary", methods=["GET"])
@role_required("admin", "manager")
def get_summary():
    """Ringkasan KPI Biaya Entertainment"""
    periode = request.args.get("periode", "").strip() or None
    result = EntertaintService.get_summary_stats(periode=periode)
    return jsonify(result), 200


# ------------------------------------------------------------------
# GET /api/v1/entertaint/<int:cost_id> — Detail
# ------------------------------------------------------------------
@entertaint_bp.route("/<int:cost_id>", methods=["GET"])
@role_required("admin", "manager")
def get_cost_detail(cost_id):
    """Detail Satu Catatan Entertainment Cost"""
    result, status_code = EntertaintService.get_by_id(cost_id)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# POST /api/v1/entertaint/ — Create with Optional Multi-Receipt Upload
# ------------------------------------------------------------------
@entertaint_bp.route("/", methods=["POST"])
@role_required("admin")
def create_cost():
    """Catat Pengeluaran Entertainment Cost Baru"""
    user_payload = getattr(g, "current_user", {})
    current_user_id = user_payload.get("user_id") if user_payload else None

    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    result, status_code = EntertaintService.create_cost(data, user_id=current_user_id)
    if status_code != 201:
        return jsonify(result), status_code

    new_cost_id = result["data"]["id"]

    uploaded_files = request.files.getlist("receipts") or request.files.getlist("files") or request.files.getlist("receipt")
    saved_receipts = []
    errors = []

    if uploaded_files:
        for f in uploaded_files:
            if f and f.filename:
                receipt_obj, err = EntertaintService.save_and_compress_receipt(f, new_cost_id)
                if receipt_obj:
                    saved_receipts.append(receipt_obj.to_dict())
                else:
                    errors.append(err)

    fresh, _ = EntertaintService.get_by_id(new_cost_id)
    res_payload = {
        "success": True,
        "message": "Data Entertainment Cost dan lampiran struk berhasil disimpan",
        "data": fresh.get("data", result["data"]),
        "uploaded_receipts": len(saved_receipts),
        "upload_warnings": errors if errors else None
    }
    return jsonify(res_payload), 201


# ------------------------------------------------------------------
# PUT /api/v1/entertaint/<int:cost_id> — Update Record
# ------------------------------------------------------------------
@entertaint_bp.route("/<int:cost_id>", methods=["PUT"])
@role_required("admin")
def update_cost(cost_id):
    """Perbarui Catatan Entertainment Cost"""
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    result, status_code = EntertaintService.update_cost(cost_id, data)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# DELETE /api/v1/entertaint/<int:cost_id> — Delete Record
# ------------------------------------------------------------------
@entertaint_bp.route("/<int:cost_id>", methods=["DELETE"])
@role_required("admin")
def delete_cost(cost_id):
    """Hapus Data Entertainment Cost Beserta Seluruh Lampiran Struk"""
    result, status_code = EntertaintService.delete_cost(cost_id)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# POST /api/v1/entertaint/<int:cost_id>/receipts — Upload Additional Receipts
# ------------------------------------------------------------------
@entertaint_bp.route("/<int:cost_id>/receipts", methods=["POST"])
@role_required("admin")
def upload_more_receipts(cost_id):
    """Unggah Tambahan Foto Struk untuk Record yang Sudah Ada"""
    cost_check, status_code = EntertaintService.get_by_id(cost_id)
    if status_code != 200:
        return jsonify(cost_check), status_code

    uploaded_files = request.files.getlist("receipts") or request.files.getlist("files") or request.files.getlist("receipt")
    if not uploaded_files:
        return jsonify({"success": False, "message": "Tidak ada file gambar struk yang dipilih"}), 400

    saved_receipts = []
    errors = []

    for f in uploaded_files:
        if f and f.filename:
            receipt_obj, err = EntertaintService.save_and_compress_receipt(f, cost_id)
            if receipt_obj:
                saved_receipts.append(receipt_obj.to_dict())
            else:
                errors.append(err)

    if not saved_receipts and errors:
        return jsonify({"success": False, "message": "; ".join(errors)}), 400

    return jsonify({
        "success": True,
        "message": f"Berhasil mengunggah dan mengompres {len(saved_receipts)} struk ke format .webp",
        "receipts": saved_receipts,
        "warnings": errors if errors else None
    }), 200


# ------------------------------------------------------------------
# DELETE /api/v1/entertaint/receipts/<int:receipt_id> — Delete Single Receipt
# ------------------------------------------------------------------
@entertaint_bp.route("/receipts/<int:receipt_id>", methods=["DELETE"])
@role_required("admin")
def delete_single_receipt(receipt_id):
    """Hapus Satu File Struk"""
    result, status_code = EntertaintService.delete_receipt(receipt_id)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# GET /api/v1/entertaint/receipts/<filename> — Serve Static WebP Image
# ------------------------------------------------------------------
@entertaint_bp.route("/receipts/<filename>", methods=["GET"])
def serve_receipt_image(filename):
    """Melayani Akses Gambar Struk (.webp) Terkompresi"""
    upload_dir = EntertaintService.UPLOAD_FOLDER
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        return jsonify({"success": False, "message": "File tidak ditemukan"}), 404

    return send_from_directory(upload_dir, filename, mimetype="image/webp")


# ------------------------------------------------------------------
# Cash Flow Endpoints (Budget Entertaint)
# ------------------------------------------------------------------
@entertaint_bp.route("/cashflow", methods=["GET"])
@role_required("admin", "manager")
def get_cashflow_list():
    """Daftar Mutasi Kasbon / Arus Kas Entertaint"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    flow_type = request.args.get("flow_type", "").strip()
    search = request.args.get("search", "").strip()

    result = EntertaintService.get_cashflows(page=page, per_page=per_page, flow_type=flow_type, search=search)
    return jsonify(result), 200


@entertaint_bp.route("/cashflow", methods=["POST"])
@role_required("admin")
def create_cashflow_record():
    """Catat Transaksi Arus Kas Kasbon Baru"""
    data = request.get_json(silent=True) or {}
    result, status_code = EntertaintService.create_cashflow(data)
    return jsonify(result), status_code


@entertaint_bp.route("/cashflow/<int:cashflow_id>", methods=["DELETE"])
@role_required("admin")
def delete_cashflow_record(cashflow_id):
    """Hapus Transaksi Kasbon"""
    result, status_code = EntertaintService.delete_cashflow(cashflow_id)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# Master Data Endpoints (Customer, PIC, Place)
# ------------------------------------------------------------------
@entertaint_bp.route("/masters", methods=["GET"])
@role_required("admin", "manager")
def get_master_data():
    """Daftar Master Referensi (Customer, PIC, Place)"""
    result = EntertaintService.get_master_items()
    return jsonify(result), 200


@entertaint_bp.route("/masters", methods=["POST"])
@role_required("admin")
def add_master_data():
    """Tambah Master Referensi Baru"""
    data = request.get_json(silent=True) or {}
    result, status_code = EntertaintService.create_master_item(data)
    return jsonify(result), status_code


@entertaint_bp.route("/masters/<int:item_id>", methods=["DELETE"])
@role_required("admin")
def delete_master_data(item_id):
    """Hapus Master Referensi"""
    result, status_code = EntertaintService.delete_master_item(item_id)
    return jsonify(result), status_code


# ------------------------------------------------------------------
# GET /api/v1/entertaint/export — Export to 3-Sheet Excel
# ------------------------------------------------------------------
@entertaint_bp.route("/export", methods=["GET"])
@role_required("admin", "manager")
def export_excel():
    """Download Laporan Excel Multi-Sheet Lengkap"""
    search = request.args.get("search", "").strip()
    customer = request.args.get("customer", "").strip()
    pic = request.args.get("pic", "").strip()
    status_pembayaran = request.args.get("status_pembayaran", "").strip()
    status_claim = request.args.get("status_claim", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()

    excel_stream = EntertaintService.export_excel(
        search=search,
        customer=customer,
        pic=pic,
        status_pembayaran=status_pembayaran,
        status_claim=status_claim,
        start_date=start_date,
        end_date=end_date
    )

    filename = f"Monitoring_Entertaint_Cost_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return send_file(
        excel_stream,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )


# ------------------------------------------------------------------
# POST /api/v1/entertaint/import-excel — Bidirectional Excel Upload
# ------------------------------------------------------------------
@entertaint_bp.route("/import-excel", methods=["POST"])
@role_required("admin", "manager")
def import_excel():
    """Upload dan Sinkronisasi Data Excel Klaim & Kasbon"""
    if "file" not in request.files:
        return jsonify({"success": False, "message": "File Excel (.xlsx) wajib diunggah"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Nama file tidak valid"}), 400

    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        return jsonify({"success": False, "message": "Format file harus .xlsx"}), 400

    current_user = getattr(request, "current_user", {})
    user_id = current_user.get("id") or current_user.get("user_id")

    result, status_code = EntertaintService.import_excel(file, user_id=user_id)
    return jsonify(result), status_code
