import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        # Supabase / Render / Railway standard URL conversion for SQLAlchemy 2.0
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif database_url.startswith("postgresql://") and not database_url.startswith("postgresql+psycopg2://"):
            database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        # Fallback to local MySQL
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://"
            f"{os.getenv('DB_USER', 'root')}:"
            f"{os.getenv('DB_PASSWORD', '')}@"
            f"{os.getenv('DB_HOST', 'localhost')}:"
            f"{os.getenv('DB_PORT', '3306')}/"
            f"{os.getenv('DB_NAME', 'smart_budget_db')}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("SECRET_KEY", "default-sai-qc-secret-key-2026")