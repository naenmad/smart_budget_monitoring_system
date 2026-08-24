from werkzeug.security import generate_password_hash

from models.user import User
from utils.db import db


def seed_user():

    if User.query.filter_by(username="admin").first():
        print("[SKIP] Admin sudah ada")
        return

    admin = User(
        username="admin",
        password=generate_password_hash("admin123"),
        role="admin",
        is_active=True
    )

    db.session.add(admin)

    print("[OK] Admin berhasil dibuat")