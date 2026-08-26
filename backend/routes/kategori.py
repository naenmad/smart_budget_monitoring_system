from flask import Blueprint, jsonify, request

from services.kategori_service import KategoriService

kategori_bp = Blueprint(
    "kategori",
    __name__
)


# GET / — semua kategori
@kategori_bp.route("/", methods=["GET"])
def get_kategoris():
    """Mendapatkan Semua Master Kategori
    ---
    tags:
      - Kategori Reference
    responses:
      200:
        description: Daftar seluruh kategori budget
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            total:
              type: integer
              example: 3
            data:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                    example: 1
                  kode:
                    type: string
                    example: E-1
                  nama:
                    type: string
                    example: Direct Material
                  tipe_formulir:
                    type: string
                    example: OPEX
    """
    kategoris = KategoriService.get_all()

    return jsonify({
        "success": True,
        "total": len(kategoris),
        "data": [k.to_dict() for k in kategoris]
    }), 200


# GET /<id> — kategori by id
@kategori_bp.route("/<int:kategori_id>", methods=["GET"])
def get_kategori(kategori_id):
    """Mendapatkan Kategori berdasarkan ID
    ---
    tags:
      - Kategori Reference
    parameters:
      - name: kategori_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail kategori
      404:
        description: Kategori tidak ditemukan
    """
    kategori = KategoriService.get_by_id(kategori_id)

    if kategori is None:
        return jsonify({
            "success": False,
            "message": "Kategori tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": kategori.to_dict()
    }), 200


# GET /kode/<kode> — kategori by kode
@kategori_bp.route("/kode/<string:kode>", methods=["GET"])
def get_kategori_by_kode(kode):
    """Mendapatkan Kategori berdasarkan Kode
    ---
    tags:
      - Kategori Reference
    parameters:
      - name: kode
        in: path
        type: string
        required: true
        example: E-9
    responses:
      200:
        description: Detail kategori
      404:
        description: Kategori tidak ditemukan
    """
    kategori = KategoriService.get_by_kode(kode)

    if kategori is None:
        return jsonify({
            "success": False,
            "message": f"Kategori dengan kode '{kode}' tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": kategori.to_dict()
    }), 200


# POST / — buat kategori baru
@kategori_bp.route("/", methods=["POST"])
def create_kategori():
    """Membuat Kategori Budget Baru
    ---
    tags:
      - Kategori Reference
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - kode
            - nama
          properties:
            kode:
              type: string
              example: E-10
            nama:
              type: string
              example: Special Project Consumables
            tipe_formulir:
              type: string
              enum: [OPEX, CAPEX]
              example: OPEX
    responses:
      201:
        description: Kategori berhasil dibuat
      400:
        description: Request body tidak valid / kode sudah terdaftar
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = KategoriService.create(data)
    return jsonify(result), status


# PUT /<id> — update kategori
@kategori_bp.route("/<int:kategori_id>", methods=["PUT"])
def update_kategori(kategori_id):
    """Memperbarui Master Kategori
    ---
    tags:
      - Kategori Reference
    security:
      - Bearer: []
    parameters:
      - name: kategori_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            nama:
              type: string
            tipe_formulir:
              type: string
              enum: [OPEX, CAPEX]
    responses:
      200:
        description: Kategori berhasil diperbarui
      404:
        description: Kategori tidak ditemukan
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = KategoriService.update(kategori_id, data)
    return jsonify(result), status


# DELETE /<id> — hapus kategori
@kategori_bp.route("/<int:kategori_id>", methods=["DELETE"])
def delete_kategori(kategori_id):
    """Menghapus Master Kategori
    ---
    tags:
      - Kategori Reference
    security:
      - Bearer: []
    parameters:
      - name: kategori_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Kategori berhasil dihapus
      404:
        description: Kategori tidak ditemukan
    """
    result, status = KategoriService.delete(kategori_id)
    return jsonify(result), status
