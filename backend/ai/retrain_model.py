"""
Retraining Pipeline for SVM AI Classifier
Smart Budget Monitoring & QC System - PT Summit Adyawinsa Indonesia

Kegunaan:
  Melatih ulang model klasifikasi teks SVM menggunakan data historis PR/PO,
  koreksi manual pengguna, dan data baseline training set.
  Hasil model disimpan dengan versioning timestamp.

Cara Menjalankan:
  python ai/retrain_model.py
  atau via Docker:
  docker compose exec backend python ai/retrain_model.py
"""

import os
import sys
import json
import pickle
import logging
from datetime import datetime
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Setup base path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from ai.preprocess import clean_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RetrainPipeline")

# Baseline training seed dataset (digunakan sebagai fallback & fondasi dataset)
BASELINE_DATASET = [
    # E-1: Biaya Pemeliharaan & Perbaikan
    ("SPARE PART MESIN STAMPING DAN PERBAIKAN", "E-1"),
    ("JASA REPAIR HYDRAULIC PUMP MACHINE", "E-1"),
    ("MAINTENANCE SCHEDULE LINE 1 SPOT WELDING", "E-1"),
    ("PENGGANTIAN OLI HIDROLIK DAN FILTER", "E-1"),
    ("PERBAIKAN KELISTRIKAN PANEL KONTROL WELDING", "E-1"),
    ("SERVICE MESIN CRANE WORKSHOP", "E-1"),
    ("REPAIR SENSOR PROXIMITY LINE 2", "E-1"),
    ("OVERHAUL MOTOR DINAMO PRESS MACHINE", "E-1"),
    ("PEMBELIAN GREASE LUBRICANT UNTUK MESIN", "E-1"),
    ("JASA KALIBRASI ALAT UKUR DAN MESIN QC", "E-1"),
    ("REPAIR AIR COMPRESSOR UNIT B", "E-1"),
    ("MAINTENANCE ROBOT WELDING NOZZLE", "E-1"),

    # E-9: Biaya Operasional / Non-Produksi / Tooling Habis Pakai
    ("PEMBELIAN MATA BOR DRILL BIT DAN CUTTING TOOL", "E-9"),
    ("SARUNG TANGAN SAFETY KAIN DAN LEATHER", "E-9"),
    ("MASKER DEBU SAFETY DAN EARPLUG QC", "E-9"),
    ("AMPLAS DAN BATU GERINDA POLISHING", "E-9"),
    ("SEPATU SAFETY BOOT PEKERJA QC", "E-9"),
    ("LABEL STIKER IDENTIFIKASI PRODUK QC PASSED", "E-9"),
    ("KERTAS THERMAL UNTUK MESIN TESTING", "E-9"),
    ("BATTERY TESTER DAN ALAT TULIS INSPECTOR", "E-9"),
    ("KACAMATA SAFETY INSPECTION CLEAR", "E-9"),
    ("SARUNG TANGAN KARET CHEMICAL TESTING", "E-9"),
    ("PACKING PLASTIK BUBBLE WRAP SAMPLE QC", "E-9"),
    ("PISAU CUTTER DAN REFILL BLADE WORKSHOP", "E-9"),

    # I-1: Inventory / Alat & Peralatan Tetap / CAPEX Kecil
    ("KUNCI RING PAS SET 8-24MM STANLEY", "I-1"),
    ("DIGITAL VERNIER CALIPER MITUTOYO 0-150MM", "I-1"),
    ("MICROMETER DIGITAL 0-25MM IP65", "I-1"),
    ("TOOL BOX BESI KRISBOW 3 TINGKAT", "I-1"),
    ("PIN GAUGE SET 1.00 - 10.00 MM", "I-1"),
    ("DIAL INDICATOR DIGITAL MITUTOYO", "I-1"),
    ("HEIGHT GAUGE 0-300MM VERNIER", "I-1"),
    ("TORQUE WRENCH 20-100 NM TOHNICHI", "I-1"),
    ("SURFACE ROUGHNESS TESTER PORTABLE", "I-1"),
    ("ALAT POTONG KERTAS HEAVY DUTY", "I-1"),
    ("THICKNESS GAUGE COATING TESTER", "I-1"),
    ("BLOCK GAUGE SET STEEL GRADE 0", "I-1"),
]


def load_training_data_from_db():
    """Mengambil data PR/PO yang sudah tervalidasi dari database."""
    samples = []
    try:
        from app import app
        from models.pr_po_data import PrPoData
        from models.kategori import Kategori

        with app.app_context():
            prs = PrPoData.query.filter(
                PrPoData.kategori_id.isnot(None),
                PrPoData.description.isnot(None)
            ).all()

            for pr in prs:
                kategori = Kategori.query.get(pr.kategori_id)
                if kategori and kategori.kode:
                    desc = f"{pr.description or ''} {pr.comment_text or ''}".strip()
                    if desc:
                        samples.append((desc, kategori.kode.upper()))

            logger.info(f"Loaded {len(samples)} validated samples from database.")
    except Exception as e:
        logger.warning(f"Could not load data from database (using baseline only): {e}")

    return samples


def retrain_model():
    logger.info("=== Starting AI Classifier Retraining Pipeline ===")

    # 1. Kumpulkan seluruh data training
    db_samples = load_training_data_from_db()
    all_data = BASELINE_DATASET + db_samples

    # Pastikan data terduplikasi diperbanyak agar bobot seimbang jika DB sedikit
    texts = [clean_text(item[0]) for item in all_data]
    labels = [item[1] for item in all_data]

    logger.info(f"Total training corpus: {len(texts)} samples across {len(set(labels))} classes: {set(labels)}")

    # 2. Split dataset jika ukuran mencukupi
    if len(texts) >= 20 and len(set(labels)) > 1:
        X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)
    else:
        X_train, X_test, y_train, y_test = texts, texts, labels, labels

    # 3. Build ML Pipeline: TF-IDF + Calibrated LinearSVC (memberikan output probabilitas kepercayaan)
    tfidf = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True
    )
    base_svc = LinearSVC(C=1.0, max_iter=2000, random_state=42)
    calibrated_model = CalibratedClassifierCV(estimator=base_svc, cv=3)

    X_train_vec = tfidf.fit_transform(X_train)
    calibrated_model.fit(X_train_vec, y_train)

    # 4. Evaluasi
    X_test_vec = tfidf.transform(X_test)
    y_pred = calibrated_model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    logger.info(f"Training Complete! Test Accuracy: {acc * 100:.2f}%")
    logger.info(f"\n{classification_report(y_test, y_pred, zero_division=0)}")

    # 5. Simpan Model Berversi (Timestamp) dan Model Aktif (svm_model.pkl)
    models_dir = os.path.join(BASE_DIR, "ai", "models")
    os.makedirs(models_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    versioned_filename = f"svm_model_{timestamp}.pkl"
    versioned_path = os.path.join(models_dir, versioned_filename)
    active_path = os.path.join(models_dir, "svm_model.pkl")
    metadata_path = os.path.join(models_dir, "model_metadata.json")

    model_payload = {
        "model": calibrated_model,
        "tfidf": tfidf,
        "trained_at": timestamp,
        "classes": list(calibrated_model.classes_),
        "sample_count": len(texts),
        "accuracy": round(acc, 4)
    }

    with open(versioned_path, "wb") as f:
        pickle.dump(model_payload, f)
    logger.info(f"Saved versioned model artifact: {versioned_path}")

    # Update model aktif utama
    with open(active_path, "wb") as f:
        pickle.dump(model_payload, f)
    logger.info(f"Updated active model: {active_path}")

    # Simpan metadata JSON untuk audit
    metadata = {
        "active_model": versioned_filename,
        "updated_at": datetime.now().isoformat(),
        "total_samples": len(texts),
        "classes": list(calibrated_model.classes_),
        "accuracy": round(acc, 4),
        "ngram_range": [1, 2],
        "algorithm": "LinearSVC (Calibrated with Sigmoid probabilities)"
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved model metadata: {metadata_path}")

    logger.info("=== Retraining Pipeline Finished Successfully ===")
    return model_payload


if __name__ == "__main__":
    retrain_model()
