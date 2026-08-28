"""
Interactive AI Benchmark and Validation Test Suite
Tests Regex Engine, Rule Base, and SVM layers across realistic PR/PO items.
"""

import os
import sys
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from ai.predict import predict_category
from services.classification_service import ClassificationService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

TEST_CASES = [
    # (Input Description, Expected Code / Layer)
    ("Penggantian seal kit cylinder hydraulic press line 1", "E-1"),
    ("Jasa repair dinamo motor servo gantry 15kw", "E-1"),
    ("Maintenance bulanan robot welding nozzle dan sensor", "E-1"),
    ("Pembelian oli hidrolik tellus 68 drum 200L", "E-1"),
    ("Jasa kalibrasi eksternal alat ukur presisi", "E-1"),
    ("Penggantian bearing conveyor line 2 workshop", "E-1"),
    ("Perbaikan solenoid valve pneumatic Festo", "E-1"),
    
    # Consumables / Safety / Tools (E-9)
    ("Sarung tangan safety kain katun 12 lusin", "E-9"),
    ("Masker debu 3M N95 dust protection untuk operator", "E-9"),
    ("Batu gerinda potong resibon 4 inch metal", "E-9"),
    ("Amplas kain flap disc grit 80 dan 120", "E-9"),
    ("Sepatu safety boot pekerja QC sz 42", "E-9"),
    ("Kain majun perca pembersih oli workshop", "E-9"),
    ("Refill blade pisau cutter heavy duty", "E-9"),
    ("Kabel ties hitam 200mm tie wrap nylon", "E-9"),
    ("Spidol permanent marker Snowman hitam", "E-9"),
    
    # Inventory / Instruments / Equipment (I-1)
    ("Vernier caliper digital Mitutoyo 0-150mm", "I-1"),
    ("Micrometer digital 0-25mm IP65 Mitutoyo", "I-1"),
    ("Pin gauge set 1.00 - 10.00 mm grade 1", "I-1"),
    ("Torque wrench Tohnichi 20-100 Nm", "I-1"),
    ("Toolbox besi 3 tingkat lengkap Stanley", "I-1"),
    ("Digital multimeter Fluke 179 true RMS", "I-1"),
    ("Kunci shock set 1/2 inch 24 pcs Tone Japan", "I-1"),
    ("Granite surface plate meja inspeksi QC", "I-1"),
    
    # Ambiguous / Edge Cases / Disambiguation
    ("Servis berkala caliper digital dan micrometer", "E-1"), # E-1 karena ini servis/jasa bukan beli alat baru
    ("Rekondisi die upper lower press machine", "E-1"),
    ("Pembelian mesin press hidrolik 500 ton baru", "CAPEX"), # Capex Rule
    ("Lubricant grease ep2 pelumas mesin", "E-1"),
]

def run_benchmark():
    print("=" * 75)
    print("RUNNING COMPREHENSIVE AI CLASSIFIER BENCHMARK SUITE")
    print("=" * 75)

    correct = 0
    total = len(TEST_CASES)

    for text, expected in TEST_CASES:
        res = ClassificationService.classify_single(text)
        predicted_code = res.get("kode")
        method = res.get("method")
        confidence = res.get("confidence")
        is_success = res.get("berhasil")

        is_match = (predicted_code == expected)
        if is_match:
            correct += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"

        conf_str = f"{confidence*100:.1f}%" if confidence is not None else "N/A"
        print(f"{status} | Input: '{text[:45]}...'")
        print(f"       Expected: {expected:<5} | Pred: {predicted_code:<5} (Method: {method:<9}, Conf: {conf_str})")

    acc = (correct / total) * 100
    print("=" * 75)
    print(f"BENCHMARK RESULT: {correct}/{total} Passed ({acc:.2f}%)")
    print("=" * 75)
    return acc

if __name__ == "__main__":
    run_benchmark()
