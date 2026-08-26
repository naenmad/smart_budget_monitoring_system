from flask import Blueprint, request, jsonify

from services.classification_service import ClassificationService

classification_bp = Blueprint(
    "classification",
    __name__
)


@classification_bp.route("/classify", methods=["POST"])
def classify():
    """Prediksi Klasifikasi Kategori untuk Satu Teks
    ---
    tags:
      - AI & Machine Learning
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - text
          properties:
            text:
              type: string
              example: "KALIBRASI TOHNICHI TORQUE WRENCH QL200N"
    responses:
      200:
        description: Hasil prediksi kategori, confidence score, dan metode yang digunakan
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            data:
              type: object
              properties:
                kategori_kode:
                  type: string
                  example: "E-9"
                metode:
                  type: string
                  example: "REGEX"
                confidence_score:
                  type: number
                  example: 1.0
                perlu_review:
                  type: boolean
                  example: false
    """
    data = request.get_json()

    if not data or not data.get("text"):
        return jsonify({
            "success": False,
            "message": "Field 'text' wajib diisi"
        }), 400

    result = ClassificationService.classify_single(data["text"])

    return jsonify({
        "success": True,
        "data": result
    }), 200


@classification_bp.route("/classify/bulk", methods=["POST"])
def classify_bulk():
    """Prediksi Klasifikasi untuk Banyak Teks Sekaligus (Batch)
    ---
    tags:
      - AI & Machine Learning
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - items
          properties:
            items:
              type: array
              items:
                type: string
              example: ["KALIBRASI STEEL RULE", "PEMBELIAN KUNCI L SET", "REPAIR PUNCH DIE"]
    responses:
      200:
        description: Array hasil klasifikasi
    """
    data = request.get_json()

    if not data or not data.get("items"):
        return jsonify({
            "success": False,
            "message": "Field 'items' (array of text) wajib diisi"
        }), 400

    items = data["items"]
    results = []

    for text in items:
        result = ClassificationService.classify_single(text)
        result["text"] = text
        results.append(result)

    return jsonify({
        "success": True,
        "total": len(results),
        "data": results
    }), 200


@classification_bp.route(
    "/classify/pr-po/<int:pr_po_data_id>",
    methods=["POST"]
)
def classify_pr_po(pr_po_data_id):
    """Jalankan Klasifikasi AI pada Satu Record PR/PO Tertentu
    ---
    tags:
      - AI & Machine Learning
    parameters:
      - name: pr_po_data_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Klasifikasi berhasil dan data diperbarui di database
    """
    result, status = ClassificationService.classify_and_save(
        pr_po_data_id
    )
    return jsonify(result), status


@classification_bp.route(
    "/classify/upload/<int:upload_id>",
    methods=["POST"]
)
def classify_upload(upload_id):
    """Jalankan Klasifikasi AI pada Seluruh Record PR/PO dalam Satu Batch Upload
    ---
    tags:
      - AI & Machine Learning
    parameters:
      - name: upload_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Klasifikasi batch upload selesai
    """
    result, status = ClassificationService.classify_by_upload_id(
        upload_id
    )
    return jsonify(result), status