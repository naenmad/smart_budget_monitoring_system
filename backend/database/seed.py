import sys
import os

# Pastikan folder backend ada di sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from utils.db import db

from database.seeders import seed_user, seed_kategori


if __name__ == "__main__":
    with app.app_context():
        print("=" * 40)
        print("Running Seeder")
        print("=" * 40)

        seed_user()
        seed_kategori()

        db.session.commit()

        print("=" * 40)
        print("Seeder selesai")
        print("=" * 40)