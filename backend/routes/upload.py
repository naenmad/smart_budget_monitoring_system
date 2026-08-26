from flask import Blueprint, request, jsonify
from services.upload_service import UploadService

upload_bp = Blueprint(
    "upload",
    __name__
)

@upload_bp.route("/", methods=["POST"])
def upload_excel():
    """Unggah File Excel PR / PO ke Antrean Parsing
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
        description: File Excel PR/PO (.xlsx / .xls)
      - in: formData
        name: user_id
        type: integer
        default: 1
    responses:
      200:
        description: File berhasil diunggah dan batch upload dibuat
      400:
        description: File tidak valid
    """
    file = request.files.get("file")
    user_id = request.form.get("user_id", 1)
    
    if not user_id:
        user_id = 1

    result, status_code = UploadService.upload_excel(file, user_id=user_id)
    return jsonify(result), status_code
