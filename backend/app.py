# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv()
# pyrefly: ignore [missing-import]
from flask import Flask
from flask_cors import CORS
from sqlalchemy import text

from config import Config
from utils.db import db
from flask_migrate import Migrate
from utils.logger import setup_logger

# Import semua model agar SQLAlchemy mengenali relasi
import models  # noqa: F401

# Import semua blueprint
from routes.user import user_bp
from routes.classification import classification_bp
from routes.kategori import kategori_bp
from routes.upload_history import upload_history_bp
from routes.budget import budget_bp
from routes.pr_po_data import pr_po_data_bp
from routes.upload import upload_bp
from routes.planning_upload import planning_bp
from routes.item_mapping import item_mapping_bp
from routes.pr import pr_bp
from routes.mapping import mapping_bp

import os

# Setup logger
setup_logger()

# Ensure uploads directory exists for file parsing
os.makedirs(os.path.join(os.path.dirname(__file__), "uploads"), exist_ok=True)

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for Vercel, Railway, and localhost
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Init database
db.init_app(app)
migrate = Migrate(app, db)  

# --- Register Blueprints ---

app.register_blueprint(
    classification_bp,
    url_prefix="/api/v1/classification"
)

app.register_blueprint(
    user_bp,
    url_prefix="/api/v1/users"
)

app.register_blueprint(
    kategori_bp,
    url_prefix="/api/v1/kategoris"
)

app.register_blueprint(
    upload_history_bp,
    url_prefix="/api/v1/upload-histories"
)

app.register_blueprint(
    budget_bp,
    url_prefix="/api/v1/budgets"
)

app.register_blueprint(
    pr_po_data_bp,
    url_prefix="/api/v1/pr-po-data"
)

app.register_blueprint(
    upload_bp,
    url_prefix="/api/v1/upload"
)
app.register_blueprint(
    planning_bp,
    url_prefix="/api/v1/planning"
)
app.register_blueprint(
    item_mapping_bp,
    url_prefix="/api/v1/item-mappings"
)
app.register_blueprint(
    pr_bp,
    url_prefix="/api/v1/pr"
)
app.register_blueprint(
    mapping_bp,
    url_prefix="/api/v1/mapping"
)

# --- Root & Health ---

@app.route("/")
def home():
    return "SAI QC Backend Running"


@app.route("/health")
def health():
    return {
        "status": "OK",
        "message": "Backend Running"
    }



@app.route("/db-test")
def db_test():
    try:
        result = db.session.execute(text("SELECT 1"))

        return {
            "status": "success",
            "database": "Connected",
            "result": result.scalar()
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }, 500


if __name__ == "__main__":
    app.run(debug=True, port=5001)