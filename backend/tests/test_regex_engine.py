import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.regex_engine import regex_predict
from ai.rule_base import detect_budget_type


class TestRegexEngine(unittest.TestCase):
    def test_regex_predict_gl_exact(self):
        self.assertEqual(regex_predict("PENGELUARAN 50032902 QC"), "50032902-123200")
        self.assertEqual(regex_predict("BIAYA 50032902 GNRL 123000"), "50032902-123000")
        self.assertEqual(regex_predict("BIAYA 60290500 PERJALANAN"), "60290500-123200")

    def test_regex_predict_transport(self):
        self.assertEqual(regex_predict("BBM OPERASIONAL QC"), "60290500-123200")
        self.assertEqual(regex_predict("BENSIN DAN TOL GNRL"), "60290500-123000")

    def test_regex_predict_stationary(self):
        self.assertEqual(regex_predict("BELI KERTAS A4 DAN ATK"), "60290800-123200")
        self.assertEqual(regex_predict("TONER PRINTER GNRL"), "60290800-123000")

    def test_regex_predict_repair_plant(self):
        self.assertEqual(regex_predict("OVERHAUL REPAIR MESIN UJI"), "50032802-123200")
        self.assertEqual(regex_predict("SPAREPART MESIN"), "50032802-123200")

    def test_regex_predict_supplies(self):
        self.assertEqual(regex_predict("SARUNG TANGAN SAFETY"), "50032902-123200")
        self.assertEqual(regex_predict("JASA KALIBRASI ALAT UKUR"), "50032902-123200")

    def test_regex_predict_no_match(self):
        self.assertIsNone(regex_predict("BELI BARANG RANDOM TANPA KATA KUNCI"))
        self.assertIsNone(regex_predict(""))

    def test_detect_budget_type_capex(self):
        self.assertEqual(detect_budget_type("NEW MACHINE FOR FACTORY"), "CAPEX")
        self.assertEqual(detect_budget_type("NEW EQUIPMENT SETUP"), "CAPEX")
        self.assertEqual(detect_budget_type("INSTALLATION OF ASSET"), "CAPEX")

    def test_detect_budget_type_opex(self):
        self.assertEqual(detect_budget_type("MAINTENANCE SCHEDULE"), "OPEX")
        self.assertEqual(detect_budget_type("REPAIR MACHINE"), "OPEX")
        self.assertEqual(detect_budget_type("SPARE PARTS ORDER"), "OPEX")

    def test_detect_budget_type_mixed_tie(self):
        self.assertIsNone(detect_budget_type("REPAIR NEW MACHINE"))
        self.assertIsNone(detect_budget_type("BELI BARANG BIASA"))

    def test_detect_budget_type_mixed_capex_wins(self):
        self.assertEqual(detect_budget_type("PROJECT INVESTMENT AND REPAIR"), "CAPEX")

    def test_detect_budget_type_mixed_opex_wins(self):
        self.assertEqual(detect_budget_type("MAINTENANCE REPAIR OF ASSET"), "OPEX")


if __name__ == "__main__":
    unittest.main()
