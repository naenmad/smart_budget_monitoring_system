import logging
import time

from models.kategori import Kategori
from models.pr_po_data import PrPoData
from models.klasifikasi_log import KlasifikasiLog
from ai.regex_engine import regex_predict
from ai.rule_base import detect_budget_type
from ai.preprocess import clean_text
from utils.db import db

logger = logging.getLogger(__name__)

# Lazy-load model SVM agar tidak crash saat import
# jika file model belum tersedia
_svm_model = None
_tfidf = None
_model_loaded = False

CONFIDENCE_THRESHOLD = 0.7


def _load_svm_model():
    """Load SVM model sekali saat pertama kali dipanggil."""
    global _svm_model, _tfidf, _model_loaded

    if _model_loaded:
        return

    try:
        import pickle
        import os

        base = os.path.dirname(
            os.path.dirname(os.path.abspath(__file__))
        )
        # Dynamic path support via env var MODEL_PATH
        env_model_path = os.getenv("MODEL_PATH")
        if env_model_path and os.path.exists(env_model_path):
            model_path = env_model_path
        else:
            model_path = os.path.join(base, "ai", "models", "svm_model.pkl")

        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                data = pickle.load(f)
            _svm_model = data["model"]
            _tfidf = data["tfidf"]
            logger.info(f"SVM model loaded successfully from {model_path}")
        else:
            logger.warning(
                f"SVM model not found at {model_path}. "
                "SVM prediction will be disabled."
            )
    except Exception as e:
        logger.error(f"Error loading SVM model: {e}")
    finally:
        _model_loaded = True


class ClassificationService:
    """
    Service untuk klasifikasi data PR/PO.
    Pipeline: Regex → Rule Base → SVM Model
    """

    @staticmethod
    def classify_single(text):
        """
        Klasifikasi satu teks.
        Returns: dict dengan kode, method, confidence, layer
        """
        if not text or not text.strip():
            return {
                "kode": None,
                "method": None,
                "layer": None,
                "confidence": None,
                "berhasil": False,
                "message": "Teks kosong"
            }

        start_time = time.time()

        # --- Layer 1: Regex match langsung (I-1, E-1, E-9) ---
        regex_result = regex_predict(text)
        if regex_result:
            elapsed = time.time() - start_time
            logger.info(f"[L1-Regex] Match: {regex_result}")
            return {
                "kode": regex_result,
                "method": "REGEX",
                "layer": 1,
                "confidence": 1.0,
                "berhasil": True,
                "processing_time": elapsed,
            }

        # --- Layer 2: Rule Base (CAPEX/OPEX keywords) ---
        budget_type = detect_budget_type(text)
        if budget_type:
            elapsed = time.time() - start_time
            logger.info(f"[L2-RuleBase] Detected: {budget_type}")
            return {
                "kode": budget_type,
                "method": "RULE_BASE",
                "layer": 2,
                "confidence": 1.0,
                "berhasil": True,
                "processing_time": elapsed,
            }

        # --- Layer 3: SVM Model ---
        _load_svm_model()

        if _svm_model is None or _tfidf is None:
            elapsed = time.time() - start_time
            logger.warning(
                "[L3-SVM] Model not available, returning UNKNOWN"
            )
            return {
                "kode": None,
                "method": "SVM",
                "layer": 3,
                "confidence": 0.0,
                "berhasil": False,
                "processing_time": elapsed,
                "message": "SVM model tidak tersedia"
            }

        cleaned = clean_text(text)
        vector = _tfidf.transform([cleaned])
        prediction = _svm_model.predict(vector)[0]
        try:
            if hasattr(_svm_model, "predict_proba"):
                proba = _svm_model.predict_proba(vector)[0]
                confidence = float(max(proba))
            else:
                confidence = 0.95
        except Exception:
            confidence = 0.90

        elapsed = time.time() - start_time

        if confidence < CONFIDENCE_THRESHOLD:
            logger.warning(
                f"[L3-SVM] Low confidence ({confidence:.2f}) "
                f"for: {text[:50]}"
            )
            return {
                "kode": prediction,
                "method": "SVM",
                "layer": 3,
                "confidence": confidence,
                "berhasil": False,
                "processing_time": elapsed,
                "message": "Confidence rendah, perlu review manual"
            }

        logger.info(
            f"[L3-SVM] Prediction: {prediction} "
            f"({confidence:.2f})"
        )
        return {
            "kode": prediction,
            "method": "SVM",
            "layer": 3,
            "confidence": confidence,
            "berhasil": True,
            "processing_time": elapsed,
        }

    @staticmethod
    def classify_and_save(pr_po_data_id):
        """
        Klasifikasi satu record PrPoData dan simpan hasilnya.
        Update status_ai, kategori_id, dan buat KlasifikasiLog.
        """
        record = db.session.get(PrPoData, pr_po_data_id)
        if not record:
            return {
                "success": False,
                "message": "Data PR/PO tidak ditemukan"
            }, 404

        # Gabungkan description + comment_text
        text_parts = []
        if record.description:
            text_parts.append(record.description)
        if record.comment_text:
            text_parts.append(record.comment_text)

        combined_text = " ".join(text_parts)

        # Update status
        record.status_ai = "PROCESSING"
        db.session.flush()

        # Klasifikasi
        result = ClassificationService.classify_single(combined_text)

        # Cari kategori_id berdasarkan kode hasil
        kategori = None
        if result["kode"]:
            kategori = Kategori.query.filter_by(
                kode=result["kode"]
            ).first()

        # Update PrPoData
        if result["berhasil"] and kategori:
            record.kategori_id = kategori.id
            record.status_ai = "DONE"
            record.perlu_review = False
        else:
            record.status_ai = "NEED_MAPPING"
            record.perlu_review = True

        if result["method"]:
            record.metode_klasifikasi = result["method"]
        if result["layer"]:
            record.layer_klasifikasi = result["layer"]

        # Simpan log klasifikasi
        log = KlasifikasiLog(
            pr_po_data_id=pr_po_data_id,
            layer=result.get("layer"),
            method=result.get("method"),
            berhasil=result.get("berhasil", False),
            kategori_hasil_id=kategori.id if kategori else None,
            confidence_score=result.get("confidence"),
            processing_time=result.get("processing_time"),
        )

        db.session.add(log)
        db.session.commit()

        return {
            "success": True,
            "data": {
                "pr_po_data_id": pr_po_data_id,
                "kode": result["kode"],
                "method": result["method"],
                "layer": result["layer"],
                "confidence": result.get("confidence"),
                "berhasil": result["berhasil"],
                "perlu_review": record.perlu_review,
            }
        }, 200

    @staticmethod
    def classify_bulk(pr_po_data_ids):
        """
        Klasifikasi banyak record PrPoData sekaligus.
        """
        results = []
        success_count = 0
        failed_count = 0

        for data_id in pr_po_data_ids:
            try:
                result, status = (
                    ClassificationService.classify_and_save(data_id)
                )
                if result.get("success"):
                    success_count += 1
                else:
                    failed_count += 1
                results.append(result)
            except Exception as e:
                logger.error(
                    f"Error classifying PR/PO ID {data_id}: {e}"
                )
                failed_count += 1
                results.append({
                    "success": False,
                    "pr_po_data_id": data_id,
                    "message": str(e)
                })

        return {
            "success": True,
            "total": len(pr_po_data_ids),
            "success_count": success_count,
            "failed_count": failed_count,
            "results": results
        }, 200

    @staticmethod
    def classify_by_upload_id(upload_id):
        """
        Klasifikasi semua record PrPoData dari satu upload batch.
        """
        records = PrPoData.query.filter_by(
            upload_id=upload_id,
            status_ai="WAITING"
        ).all()

        if not records:
            return {
                "success": False,
                "message": (
                    "Tidak ada data WAITING "
                    "untuk upload ini"
                )
            }, 404

        data_ids = [r.id for r in records]
        return ClassificationService.classify_bulk(data_ids)
