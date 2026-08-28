"""
Retraining Pipeline for SVM AI Classifier
Smart Budget Monitoring & QC System - PT Summit Adyawinsa Indonesia

Kegunaan:
  Melatih ulang model klasifikasi teks SVM menggunakan data historis PR/PO,
  koreksi manual pengguna, dan data baseline training set yang diperluas.
  Hasil model disimpan dengan versioning timestamp dan metadata performa lengkap.

Cara Menjalankan:
  ./backend/venv/bin/python backend/ai/retrain_model.py
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
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import classification_report, accuracy_score, f1_score

# Setup base path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from ai.preprocess import clean_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RetrainPipeline")

# Baseline training seed dataset komprehensif untuk industri stamping & welding (PT SAI)
BASELINE_DATASET = [
    # =========================================================================
    # E-1: Biaya Pemeliharaan, Perbaikan, Jasa Mesin, Sparepart Pengganti (OPEX)
    # =========================================================================
    ("SPARE PART MESIN STAMPING DAN PERBAIKAN", "E-1"),
    ("JASA REPAIR HYDRAULIC PUMP MACHINE PRESS 300 TON", "E-1"),
    ("MAINTENANCE SCHEDULE LINE 1 SPOT WELDING", "E-1"),
    ("PENGGANTIAN OLI HIDROLIK TELLUS 68 DAN FILTER", "E-1"),
    ("PERBAIKAN KELISTRIKAN PANEL KONTROL WELDING", "E-1"),
    ("SERVICE MESIN CRANE WORKSHOP OVERHEAD 5 TON", "E-1"),
    ("REPAIR SENSOR PROXIMITY LINE 2 AUTOWELD", "E-1"),
    ("OVERHAUL MOTOR DINAMO PRESS MACHINE KOMATSU", "E-1"),
    ("PEMBELIAN GREASE LUBRICANT EP2 UNTUK MESIN", "E-1"),
    ("JASA KALIBRASI ALAT UKUR DAN MESIN QC EXTERNAL", "E-1"),
    ("REPAIR AIR COMPRESSOR UNIT B HITACHI", "E-1"),
    ("MAINTENANCE ROBOT WELDING NOZZLE DAN FEEDER", "E-1"),
    ("PENGGANTIAN SEAL KIT CYLINDER PNEUMATIC", "E-1"),
    ("JASA BUBUT DAN MILLING SHAFT PIN DIE STAMPING", "E-1"),
    ("SERVICE REGULATOR GAS CO2 DAN ARGON WELDING", "E-1"),
    ("PENGGANTIAN BEARING SKF 6205 MESIN CONVEYOR", "E-1"),
    ("REPAIR CHILLER COOLING SYSTEM MESIN LAS", "E-1"),
    ("PENGGANTIAN TIMING BELT DAN PULLEY LINE ASSEMBLY", "E-1"),
    ("JASA REKONDISI DIE TOOLING UPPER LOWER STAMPING", "E-1"),
    ("REPAIR SOLENOID VALVE FESTO PNEUMATIC LINE 3", "E-1"),
    ("PENGGANTIAN LIMIT SWITCH DAN KABEL TAHAN PANAS", "E-1"),
    ("SERVICE TAHUNAN TRAFO LAS SPOT DAN PROJECTION", "E-1"),
    ("PERBAIKAN CLUTCH DAN BRAKE MESIN PRESS MEKANIK", "E-1"),
    ("JASA SERVIS PLC MITSUBISHI DAN HMI SCREEN", "E-1"),
    ("PENGGANTIAN SELANG HIGH PRESSURE HIDROLIK 1/2 INCH", "E-1"),
    ("MAINTENANCE EXHAUST BLOWER DAN DUCTING WORKSHOP", "E-1"),
    ("REPAIR ENCODER SERVO MOTOR GANTRY FEEDER", "E-1"),
    ("JASA REWINDING GULUNG DINAMO 3 PHASE 15 KW", "E-1"),
    ("PENGGANTIAN FILTER UDARA DAN SEPARATOR KOMPRESOR", "E-1"),
    ("OVERHAUL POMPA AIR COOLING TOWER PABRIK", "E-1"),
    ("REPAIR KEBOCORAN MANIFOLD PNEUMATIK JIG WELDING", "E-1"),
    ("JASA ASAH PISAU SHEARING MACHINE STAMPING", "E-1"),
    ("PENGGANTIAN CONTACTOR SCHNEIDER DAN THERMAL RELAY", "E-1"),
    ("SERVICE INVERTER YASKAWA 7.5 KW LINE CONVEYOR", "E-1"),
    ("REPAIR PISTON ROD HYDRAULIC CYLINDER PRESS", "E-1"),
    ("PENGGANTIAN SPUIT COPPER TIP DAN SHANK WELDING", "E-1"),
    ("JASA LAS REPARASI CRACK FRAME MESIN PRESS", "E-1"),
    ("PEMBELIAN OLI GEARBOX MOBILGEAR 600 XP 220", "E-1"),
    ("SERVICE FORKLIFT TOYOTA 3 TON MAINTENANCE RUTIN", "E-1"),
    ("REPAIR HOIST CRANE KITO 2 TON BEAM LINE", "E-1"),

    # =========================================================================
    # E-9: Consumable, Indirect Material, Safety/PPE, Tooling Habis Pakai (OPEX)
    # =========================================================================
    ("PEMBELIAN MATA BOR DRILL BIT HSS NACHI DAN CUTTING TOOL", "E-9"),
    ("SARUNG TANGAN SAFETY KAIN DAN LEATHER WELDING", "E-9"),
    ("MASKER DEBU SAFETY DUST N95 DAN EARPLUG 3M QC", "E-9"),
    ("AMPLAS FLAP DISC DAN BATU GERINDA POLISHING NIPPON RESIBON", "E-9"),
    ("SEPATU SAFETY BOOT PEKERJA QC DAN OPERATOR", "E-9"),
    ("LABEL STIKER IDENTIFIKASI PRODUK QC PASSED BARCODE", "E-9"),
    ("KERTAS THERMAL UNTUK MESIN TESTING TENSILE QC", "E-9"),
    ("BATTERY TESTER ALKALINE AA AAA DAN ALAT TULIS INSPECTOR", "E-9"),
    ("KACAMATA SAFETY GLASSES INSPECTION CLEAR KRISBOW", "E-9"),
    ("SARUNG TANGAN KARET CHEMICAL NITRILE TESTING", "E-9"),
    ("PACKING PLASTIK BUBBLE WRAP SAMPLE QC PACKAGING", "E-9"),
    ("PISAU CUTTER HEAVY DUTY DAN REFILL BLADE WORKSHOP", "E-9"),
    ("KAIN MAJUN PEMBERSIH KOTORAN OLI PERCA KATUN", "E-9"),
    ("SPIDOL MARKER PERMANEN SNOWMAN DAN WHITEBOARD", "E-9"),
    ("LAKBAN BENING ISOLASI TAPE DAN DOUBLE TAPE 3M", "E-9"),
    ("KABEL TIES NYLON TIE WRAP HITAM DAN PUTIH", "E-9"),
    ("APRON DADA KULIT PELINDUNG LAS SPOT WELDING", "E-9"),
    ("HELM SAFETY KUNING DAN BIRU STANDAR SNI", "E-9"),
    ("WD40 PENETRANT SPRAY PEMBERSIH KARAT RUST REMOVER", "E-9"),
    ("CONTACT CLEANER SPRAY UNTUK KOMPONEN ELEKTRONIK", "E-9"),
    ("KERTAS HVS A4 80GR UNTUK DOKUMEN CHECK SHEET QC", "E-9"),
    ("PLASTIK STRETCH FILM WRAPPING PALLET HASIL STAMPING", "E-9"),
    ("TIP CLEANER KIKIR PEMBERSIH NOZZLE WELDING", "E-9"),
    ("SILICONE SEALANT LEM RED RTV GASKET MAKER", "E-9"),
    ("BATU POTONG RESIBON 4 INCH UNTUK METAL BESI", "E-9"),
    ("FACE SHIELD PELINDUNG WAJAH GERINDA TRANSPARAN", "E-9"),
    ("DOP EARPLUG PEREDAM BISING KEBISINGAN PRESS SHOP", "E-9"),
    ("COTTON BUD DAN TISU LENSA PEMBERSIH KAMERA QC", "E-9"),
    ("KAPUR BESI MARKING PEN LOGAM METAL MARKER", "E-9"),
    ("DESICCANT SILICA GEL PENGERING PACKING PART EXPORT", "E-9"),
    ("POLYBAG PLASTIK KANTONG SPARE PART SAMPLE", "E-9"),
    ("GAS BUTANE PORTABLE DAN REFILL KOREK FLAME GUN", "E-9"),
    ("SAPU IJUK KAIN PEL DAN PEMBERSIH LANTAI WORKSHOP", "E-9"),
    ("TEMPAT SAMPAH PLASTIK DAN KANTONG TRASH BAG HITAM", "E-9"),
    ("SOLASI LISTRIK ISOLASI UNIKAL PVC INSULATION TAPE", "E-9"),
    ("ANTI SPATTER SPRAY CAIRAN ANTI PERCIKAN LAS", "E-9"),
    ("LEM EPOXY DEXTONE RAPID 5 MENIT BESI DAN PLASTIK", "E-9"),
    ("KERTAS MILIMETER BLOK UNTUK GRAFIK QC STATISTIK", "E-9"),
    ("BAUT MUR M6 M8 M10 KANCINGAN TESTING SAMPLE", "E-9"),
    ("BATTERAI 9V KOTAK UNTUK SOUND LEVEL METER", "E-9"),

    # =========================================================================
    # I-1: Inventory, Alat Ukur, QC Instruments, Tools & Equipment (CAPEX)
    # =========================================================================
    ("KUNCI RING PAS SET 8-24MM STANLEY PROFESSIONAL", "I-1"),
    ("DIGITAL VERNIER CALIPER MITUTOYO 0-150MM 500-196-30", "I-1"),
    ("MICROMETER DIGITAL 0-25MM IP65 WATERPROOF MITUTOYO", "I-1"),
    ("TOOL BOX BESI KRISBOW 3 TINGKAT DENGAN KUNCI", "I-1"),
    ("PIN GAUGE SET 1.00 - 10.00 MM ACCURACY 0.001MM", "I-1"),
    ("DIAL INDICATOR DIGITAL MITUTOYO 0.01MM RANGE 10MM", "I-1"),
    ("HEIGHT GAUGE 0-300MM VERNIER DOUBLE COLUMN", "I-1"),
    ("TORQUE WRENCH 20-100 NM TOHNICHI ADJUSTABLE", "I-1"),
    ("SURFACE ROUGHNESS TESTER PORTABLE TEST GAUGE", "I-1"),
    ("ALAT POTONG KERTAS HEAVY DUTY GUILLOTINE A3", "I-1"),
    ("THICKNESS GAUGE COATING TESTER DIGITAL LOGAM", "I-1"),
    ("BLOCK GAUGE SET STEEL GRADE 0 87 PCS MITUTOYO", "I-1"),
    ("DIGITAL MULTIMETER FLUKE 179 TRUE RMS METROLOGI", "I-1"),
    ("TENSILE TESTER GAUGE DIGITAL FORCE GAUGE 500N", "I-1"),
    ("HARDNESS TESTER PORTABLE LEEB HARDNESS TEST GAUGE", "I-1"),
    ("SOUND LEVEL METER DIGITAL CLASS 2 CALIBRATED", "I-1"),
    ("VIBRATION METER PEN TYPE UNTUK MOTOR CHECKING", "I-1"),
    ("TACHOMETER DIGITAL NON CONTACT LASER SPEED TESTER", "I-1"),
    ("TEMPERATURE GUN INFRARED THERMOMETER FLUKE 62 MAX", "I-1"),
    ("DIGITAL BORE GAUGE SET 50-150MM MITUTOYO", "I-1"),
    ("FEELER GAUGE SET BLADE 28 LEAF 0.03-1.00MM", "I-1"),
    ("RADIUS GAUGE SET R1-7MM DAN R7.5-15MM STAINLESS", "I-1"),
    ("PITCH GAUGE ULIR METRIK DAN INCH GAUGE", "I-1"),
    ("TOOL CABINET LEMARI PENYIMPANAN TOOLS WORKSHOP 5 LACI", "I-1"),
    ("KUNCI SHOCK SOCKET WRENCH SET 1/2 INCH TONE JAPAN", "I-1"),
    ("KUNCI L HEX KEY SET 1.5-10MM BALL POINT PB SWISS", "I-1"),
    ("TANG KRIMPING CRIMPING TOOL RATCHET HEAVY DUTY", "I-1"),
    ("MESIN BOR DUDUK BENCH DRILL 13MM BOSCH BENCHTOP", "I-1"),
    ("BENCH GRINDER GERINDA DUDUK 6 INCH MAKITA WORKBENCH", "I-1"),
    ("RAGUM CATOK BESI BENCH VISE 6 INCH HEAVY DUTY", "I-1"),
    ("MEJA INSPEKSI GRANITE SURFACE PLATE GRADE 0 600X400", "I-1"),
    ("LUX METER DIGITAL LIGHT METER INTENSITAS CAHAYA", "I-1"),
    ("DIGITAL SCALE TIMBANGAN PRESISI QC 0.01G 3000G", "I-1"),
    ("MICROSCOPE DIGITAL INSPECTION QC ZOOM 1000X", "I-1"),
    ("ANEMOMETER DIGITAL AIR FLOW SPEED TESTER", "I-1"),
    ("INSULATION TESTER MEGGER MEGOHMMETER 1000V", "I-1"),
    ("PRESSURE GAUGE CALIBRATOR HYDRAULIC DIGITAL GAUGE", "I-1"),
    ("ULTRASONIC THICKNESS GAUGE METER LOGAM PIPA", "I-1"),
    ("TANG AMPERE CLAMP METER DIGITAL AC DC HIOKI", "I-1"),
    ("DRILL CHUCK ADAPTER KEYLESS 1-13MM B16", "I-1"),
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

    texts = [clean_text(item[0]) for item in all_data]
    labels = [item[1] for item in all_data]

    classes = sorted(list(set(labels)))
    logger.info(f"Total training corpus: {len(texts)} samples across {len(classes)} classes: {classes}")

    # 2. Setup TF-IDF Vectorizer (Unigram, Bigram, Trigram)
    tfidf = TfidfVectorizer(
        ngram_range=(1, 3),
        max_features=10000,
        sublinear_tf=True,
        min_df=1
    )

    # 3. Stratified K-Fold Cross Validation untuk evaluasi obyektif
    cv_splits = min(5, min([labels.count(c) for c in classes]))
    if cv_splits >= 2:
        skf = StratifiedKFold(n_splits=cv_splits, shuffle=True, random_state=42)
        X_all_vec = tfidf.fit_transform(texts)
        base_svc = LinearSVC(C=1.0, max_iter=3000, random_state=42)
        cv_scores = cross_val_score(base_svc, X_all_vec, labels, cv=skf, scoring='accuracy')
        logger.info(f"{cv_splits}-Fold Cross-Validation Accuracy: {cv_scores.mean() * 100:.2f}% (std: {cv_scores.std() * 100:.2f}%)")
    else:
        logger.warning("Not enough samples per class for Cross-Validation.")

    # 4. Train-Test Split untuk Detail Classification Report
    if len(texts) >= 15 and len(classes) > 1:
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
    else:
        X_train, X_test, y_train, y_test = texts, texts, labels, labels

    X_train_vec = tfidf.fit_transform(X_train)
    
    # Model: LinearSVC terkalibrasi Sigmoid untuk skor probabilitas keyakinan
    svc = LinearSVC(C=1.0, max_iter=3000, random_state=42)
    calibrated_model = CalibratedClassifierCV(estimator=svc, cv=min(3, min([y_train.count(c) for c in set(y_train)])))
    calibrated_model.fit(X_train_vec, y_train)

    # 5. Evaluasi pada Test Set
    X_test_vec = tfidf.transform(X_test)
    y_pred = calibrated_model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average='macro', zero_division=0)
    
    logger.info(f"Retrained Test Accuracy: {acc * 100:.2f}% | Macro F1-Score: {f1_macro * 100:.2f}%")
    logger.info(f"\n{classification_report(y_test, y_pred, zero_division=0)}")

    # 6. Fit Final Model pada SELURUH dataset untuk produksi
    X_full_vec = tfidf.fit_transform(texts)
    final_svc = LinearSVC(C=1.0, max_iter=3000, random_state=42)
    final_calibrated = CalibratedClassifierCV(
        estimator=final_svc, 
        cv=min(3, min([labels.count(c) for c in classes]))
    )
    final_calibrated.fit(X_full_vec, labels)

    # 7. Simpan Model Berversi (Timestamp) dan Model Aktif (svm_model.pkl)
    models_dir = os.path.join(BASE_DIR, "ai", "models")
    os.makedirs(models_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    versioned_filename = f"svm_model_{timestamp}.pkl"
    versioned_path = os.path.join(models_dir, versioned_filename)
    active_path = os.path.join(models_dir, "svm_model.pkl")
    metadata_path = os.path.join(models_dir, "model_metadata.json")

    model_payload = {
        "model": final_calibrated,
        "tfidf": tfidf,
        "trained_at": timestamp,
        "classes": list(final_calibrated.classes_),
        "sample_count": len(texts),
        "accuracy": round(acc, 4),
        "f1_macro": round(f1_macro, 4)
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
        "classes": list(final_calibrated.classes_),
        "accuracy": round(acc, 4),
        "f1_macro": round(f1_macro, 4),
        "ngram_range": [1, 3],
        "algorithm": "LinearSVC (Calibrated with Sigmoid probabilities) + TF-IDF (1-3 Ngrams)"
    }
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved model metadata: {metadata_path}")

    logger.info("=== Retraining Pipeline Finished Successfully ===")
    return model_payload


if __name__ == "__main__":
    retrain_model()
