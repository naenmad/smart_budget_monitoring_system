from flask import Blueprint, request, jsonify
from services.mapping.item_mapping_service import ItemMappingService
from utils.auth import role_required

item_mapping_bp = Blueprint("item_mapping", __name__)


@item_mapping_bp.route("/", methods=["GET"])
def get_all():
    """Mendapatkan Semua Aturan Item Mapping
    ---
    tags:
      - Item Mapping & Threshold
    responses:
      200:
        description: Daftar aturan keyword ke item planning
    """
    result, status = ItemMappingService.get_all()
    return jsonify(result), status


@item_mapping_bp.route("/<int:mapping_id>", methods=["GET"])
def get_by_id(mapping_id):
    """Mendapatkan Detail Satu Aturan Item Mapping
    ---
    tags:
      - Item Mapping & Threshold
    parameters:
      - name: mapping_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detail aturan mapping
      404:
        description: Aturan tidak ditemukan
    """
    result, status = ItemMappingService.get_by_id(mapping_id)
    return jsonify(result), status


@item_mapping_bp.route("/", methods=["POST"])
def create():
    """Membuat Aturan Item Mapping Baru
    ---
    tags:
      - Item Mapping & Threshold
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - keyword
            - planning_item
          properties:
            keyword:
              type: string
              example: "KALIBRASI DIAL INDICATOR"
            planning_item:
              type: string
              example: "KALIBRASI JUNI"
            kategori_id:
              type: integer
              example: 2
            priority:
              type: integer
              default: 1
    responses:
      201:
        description: Aturan mapping berhasil disimpan
    """
    data = request.get_json()
    result, status = ItemMappingService.create(data)
    return jsonify(result), status


@item_mapping_bp.route("/<int:mapping_id>", methods=["PUT"])
def update(mapping_id):
    """Memperbarui Aturan Item Mapping
    ---
    tags:
      - Item Mapping & Threshold
    security:
      - Bearer: []
    parameters:
      - name: mapping_id
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
        description: Aturan mapping berhasil diperbarui
    """
    data = request.get_json()
    result, status = ItemMappingService.update(mapping_id, data)
    return jsonify(result), status


@item_mapping_bp.route("/<int:mapping_id>", methods=["DELETE"])
def delete(mapping_id):
    """Menghapus Aturan Item Mapping
    ---
    tags:
      - Item Mapping & Threshold
    security:
      - Bearer: []
    parameters:
      - name: mapping_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Aturan mapping berhasil dihapus
    """
    result, status = ItemMappingService.delete(mapping_id)
    return jsonify(result), status


@item_mapping_bp.route("/suggestions", methods=["GET"])
def get_suggestions():
    """Mendapatkan Saran Rule Baru dari Pola Konfirmasi Manual
    ---
    tags:
      - Item Mapping & Threshold
    responses:
      200:
        description: Daftar saran keyword mapping baru
    """
    suggestions = ItemMappingService.suggest_new_rules()
    return jsonify({"success": True, "data": suggestions}), 200