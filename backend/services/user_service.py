import re
from models.user import User
from utils.db import db
from utils.auth import generate_token
from werkzeug.security import generate_password_hash, check_password_hash

USERNAME_REGEX = re.compile(r'^[a-z0-9_.-]{3,30}$')


class UserService:

    @staticmethod
    def authenticate(username, password):
        """
        Verifikasi username + password.
        Returns (result_dict, status_code).
        """
        if not username or not password:
            return {
                "success": False,
                "message": "Username dan password wajib diisi"
            }, 400

        normalized_username = str(username).strip().lower()

        user = User.query.filter(
            (User.username == normalized_username) | (User.username == str(username).strip()),
            User.is_active == True
        ).first()

        if not user:
            return {
                "success": False,
                "message": "Username atau password salah"
            }, 401

        if not check_password_hash(user.password, password):
            return {
                "success": False,
                "message": "Username atau password salah"
            }, 401
        
        token = generate_token(user)

        return {
            "success": True,
            "message": "Login berhasil",
            "data": user.to_dict(),
            "token": token
        }, 200

    @staticmethod
    def get_all_users():
        return User.query.all()

    @staticmethod
    def get_by_id(user_id):
        return db.session.get(User, user_id)

    @staticmethod
    def create_user(data):
        raw_username = data.get("username", "")
        username = str(raw_username).strip().lower()
        password = str(data.get("password", "")).strip()
        role = data.get("role", "admin")

        if not username:
            return {
                "success": False,
                "message": "Username wajib diisi"
            }, 400

        if not USERNAME_REGEX.match(username):
            return {
                "success": False,
                "message": "Username hanya boleh huruf kecil, angka, underscore (_), titik (.), atau strip (-), panjang 3-30 karakter tanpa spasi"
            }, 400

        if not password or len(password) < 6:
            return {
                "success": False,
                "message": "Password minimal 6 karakter"
            }, 400

        # cek duplikat (case-insensitive)
        existing = User.query.filter(User.username.ilike(username)).first()
        if existing:
            return {
                "success": False,
                "message": f"Username '{username}' sudah digunakan"
            }, 409

        user = User(
            username=username,
            password=generate_password_hash(password),
            role=role,
            is_active=True
        )

        db.session.add(user)
        db.session.commit()

        return {
            "success": True,
            "message": "User berhasil dibuat",
            "data": user.to_dict()
        }, 201

    @staticmethod
    def update_user(user_id, data):
        user = db.session.get(User, user_id)
        if not user:
            return {
                "success": False,
                "message": "User tidak ditemukan"
            }, 404

        if "username" in data:
            new_username = str(data["username"]).strip().lower()
            if not USERNAME_REGEX.match(new_username):
                return {
                    "success": False,
                    "message": "Username hanya boleh huruf kecil, angka, underscore (_), titik (.), atau strip (-), panjang 3-30 karakter tanpa spasi"
                }, 400

            # cek duplikat username (exclude user sendiri)
            existing = User.query.filter(
                User.username.ilike(new_username),
                User.id != user_id
            ).first()
            if existing:
                return {
                    "success": False,
                    "message": f"Username '{new_username}' sudah digunakan"
                }, 409
            user.username = new_username

        if "password" in data:
            pwd = str(data["password"]).strip()
            if not pwd or len(pwd) < 6:
                return {
                    "success": False,
                    "message": "Password baru minimal 6 karakter"
                }, 400
            user.password = generate_password_hash(pwd)

        if "role" in data:
            user.role = data["role"]

        if "is_active" in data:
            user.is_active = data["is_active"]

        db.session.commit()

        return {
            "success": True,
            "message": "User berhasil diupdate",
            "data": user.to_dict()
        }, 200

    @staticmethod
    def delete_user(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return {
                "success": False,
                "message": "User tidak ditemukan"
            }, 404

        db.session.delete(user)
        db.session.commit()

        return {
            "success": True,
            "message": "User berhasil dihapus"
        }, 200