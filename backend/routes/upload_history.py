from flask import Blueprint, jsonify, request

from services.upload_history_service import UploadHistoryService

upload_history_bp = Blueprint(
    "upload_history",
    __name__
)


# GET / — semua upload history
@upload_history_bp.route("/", methods=["GET"])
def get_upload_histories():
    """Mendapatkan Semua Riwayat Upload File
    ---
    tags:
      - Upload & Batch History
    responses:
      200:
        description: Daftar seluruh batch upload
    """
    upload_histories = UploadHistoryService.get_all_upload_histories()

    return jsonify({
        "success": True,
        "total": len(upload_histories),
        "data": [
            upload.to_dict()
            for upload in upload_histories
        ]
    }), 200


# GET /<id> — upload history by id
@upload_history_bp.route(
    "/<int:upload_history_id>", methods=["GET"]
)
def get_upload_history(upload_history_id):
    """Mendapatkan Detail Riwayat Upload berdasarkan ID
    ---
    tags:
      - Upload & Batch History
    parameters:
      - name: upload_history_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail batch upload
      404:
        description: Riwayat upload tidak ditemukan
    """
    upload = UploadHistoryService.get_upload_history_by_id(
        upload_history_id
    )

    if upload is None:
        return jsonify({
            "success": False,
            "message": "Upload history tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": upload.to_dict()
    }), 200


# POST / — buat upload history baru
@upload_history_bp.route("/", methods=["POST"])
def create_upload_history():
    """Membuat Catatan Batch Upload Baru
    ---
    tags:
      - Upload & Batch History
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - filename
          properties:
            filename:
              type: string
            user_id:
              type: integer
    responses:
      201:
        description: Batch upload berhasil dicatat
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status_code = UploadHistoryService.create_upload_history(
        data
    )

    return jsonify(result), status_code


# PUT /<id> — update upload history
@upload_history_bp.route(
    "/<int:upload_history_id>", methods=["PUT"]
)
def update_upload_history(upload_history_id):
    """Memperbarui Status / Catatan Batch Upload
    ---
    tags:
      - Upload & Batch History
    security:
      - Bearer: []
    parameters:
      - name: upload_history_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Batch upload berhasil diperbarui
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = UploadHistoryService.update_upload_history(
        upload_history_id,
        data
    )

    return jsonify(result), status


# DELETE /<id> — hapus upload history
@upload_history_bp.route(
    "/<int:upload_history_id>", methods=["DELETE"]
)
def delete_upload_history(upload_history_id):
    """Menghapus Batch Upload dan Seluruh Data PR didalamnya
    ---
    tags:
      - Upload & Batch History
    security:
      - Bearer: []
    parameters:
      - name: upload_history_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Upload batch dan seluruh rekaman PR berhasil dihapus
    """
    result, status = UploadHistoryService.delete_upload_history(
        upload_history_id
    )

    return jsonify(result), status