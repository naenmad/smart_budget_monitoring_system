import logging
import os
import pickle
from ai.regex_engine import regex_predict
from ai.rule_base import detect_budget_type
from ai.preprocess import clean_text

logger = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.7
_svm_model = None
_tfidf = None
_model_loaded = False


def _get_model():
    global _svm_model, _tfidf, _model_loaded
    if not _model_loaded:
        base = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(base, "models", "svm_model.pkl")
        if not os.path.exists(model_path):
            alt_path = os.path.join(os.path.dirname(base), "model", "svm_model.pkl")
            if os.path.exists(alt_path):
                model_path = alt_path

        if os.path.exists(model_path):
            try:
                with open(model_path, "rb") as f:
                    data = pickle.load(f)
                _svm_model = data.get("model")
                _tfidf = data.get("tfidf")
                logger.info("SVM model loaded in predict.py")
            except Exception as e:
                logger.error(f"Failed to load SVM model in predict.py: {e}")
        _model_loaded = True
    return _svm_model, _tfidf


def predict_category(text: str) -> tuple[str, str]:
    if not text or not text.strip():
        return 'UNKNOWN', 'Invalid Input'

    # Layer 1 & 2: Regex & Rule-Based Match
    rule_result = regex_predict(text)
    if rule_result:
        logger.info(f'Regex match: {rule_result}')
        return rule_result, 'Regex Match'

    budget_type = detect_budget_type(text)
    if budget_type in ['CAPEX', 'OPEX']:
        logger.info(f'Budget type detected: {budget_type}')
        return budget_type, 'Rule Base'

    # Layer 3: SVM Fallback
    model, tfidf = _get_model()
    if not model or not tfidf:
        return 'UNKNOWN', 'Model Unavailable'

    cleaned = clean_text(text)
    vector = tfidf.transform([cleaned])
    prediction = model.predict(vector)[0]
    proba = model.predict_proba(vector)[0]
    confidence = max(proba)

    if confidence < CONFIDENCE_THRESHOLD:
        logger.warning(f'Low confidence ({confidence:.2f}) for: {text[:50]}')
        return 'UNKNOWN', 'Low Confidence'

    logger.info(f'SVM prediction: {prediction} ({confidence:.2f})')
    return prediction, 'SVM Model'