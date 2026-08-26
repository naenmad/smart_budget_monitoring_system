from flask import Blueprint, jsonify, request

from services.user_service import UserService

user_bp = Blueprint(
    "user",
    __name__
)


# POST /login — autentikasi user
@user_bp.route("/login", methods=["POST"])
def login():
    """Autentikasi Login Pengguna
    ---
    tags:
      - Authentication & Users
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: admin
            password:
              type: string
              example: admin123
    responses:
      200:
        description: Login berhasil, mengembalikan token JWT dan profil user
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            token:
              type: string
              example: eyJhbGciOiJIUzI1NiIsIn...
            user:
              type: object
              properties:
                id:
                  type: integer
                  example: 1
                username:
                  type: string
                  example: admin
                role:
                  type: string
                  example: admin
      400:
        description: Request body kosong / tidak valid
      401:
        description: Username atau password salah / akun nonaktif
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    username = data.get("username")
    password = data.get("password")

    result, status = UserService.authenticate(username, password)
    return jsonify(result), status


# GET / — semua user
@user_bp.route("/", methods=["GET"])
def get_users():
    """Mendapatkan Semua Pengguna
    ---
    tags:
      - Authentication & Users
    security:
      - Bearer: []
    responses:
      200:
        description: Daftar seluruh akun pengguna
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            total:
              type: integer
              example: 5
            data:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: integer
                  username:
                    type: string
                  role:
                    type: string
                  is_active:
                    type: boolean
                  created_at:
                    type: string
    """
    users = UserService.get_all_users()

    return jsonify({
        "success": True,
        "total": len(users),
        "data": [user.to_dict() for user in users]
    }), 200


# GET /<id> — user by id
@user_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    """Mendapatkan Detail Pengguna berdasarkan ID
    ---
    tags:
      - Authentication & Users
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
        description: ID pengguna
    responses:
      200:
        description: Data pengguna ditemukan
      404:
        description: User tidak ditemukan
    """
    user = UserService.get_by_id(user_id)

    if user is None:
        return jsonify({
            "success": False,
            "message": "User tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": user.to_dict()
    }), 200


# POST / — buat user baru
@user_bp.route("/", methods=["POST"])
def create_user():
    """Membuat Akun Pengguna Baru
    ---
    tags:
      - Authentication & Users
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: operator_qc
              description: Huruf kecil tanpa spasi (3-30 karakter)
            password:
              type: string
              example: secret123
              description: Minimal 6 karakter
            role:
              type: string
              enum: [admin, user, viewer]
              example: user
            is_active:
              type: boolean
              example: true
    responses:
      201:
        description: User berhasil dibuat
      400:
        description: Validasi username / password gagal atau username sudah ada
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = UserService.create_user(data)
    return jsonify(result), status


# PUT /<id> — update user
@user_bp.route("/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    """Memperbarui Data Pengguna / Reset Password
    ---
    tags:
      - Authentication & Users
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            role:
              type: string
              enum: [admin, user, viewer]
            is_active:
              type: boolean
            password:
              type: string
              description: Password baru (jika ingin reset)
    responses:
      200:
        description: User berhasil diperbarui
      404:
        description: User tidak ditemukan
    """
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body wajib diisi"
        }), 400

    result, status = UserService.update_user(user_id, data)
    return jsonify(result), status


# DELETE /<id> — hapus user
@user_bp.route("/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    """Menghapus Akun Pengguna
    ---
    tags:
      - Authentication & Users
    security:
      - Bearer: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: User berhasil dihapus
      404:
        description: User tidak ditemukan
    """
    result, status = UserService.delete_user(user_id)
    return jsonify(result), status