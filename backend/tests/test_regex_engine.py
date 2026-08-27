import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.regex_engine import regex_predict
from ai.rule_base import detect_budget_type


class TestRegexEngine(unittest.TestCase):
    def test_regex_predict_i1(self):
        # Should match I-1 directly
        self.assertEqual(regex_predict("PEMBELIAN KODE I-1"), "I-1")
        self.assertEqual(regex_predict("BARANG I 1 BARU"), "I-1")
        self.assertEqual(regex_predict("I1"), "I-1")

    def test_regex_predict_e1(self):
        self.assertEqual(regex_predict("Barang E-1 baru"), "E-1")
        self.assertEqual(regex_predict("E1 BIAYA"), "E-1")

    def test_regex_predict_e9(self):
        self.assertEqual(regex_predict("BIAYA E-9"), "E-9")
        self.assertEqual(regex_predict("E 9"), "E-9")

    def test_regex_predict_inventory_keywords(self):
        # Inventory keywords should return I-1
        self.assertEqual(regex_predict("KUNCI L SET"), "I-1")
        self.assertEqual(regex_predict("PEMOTONG KERTAS UNTUK KANTOR"), "I-1")
        self.assertEqual(regex_predict("PEMBELIAN TOOL BOX"), "I-1")

    def test_regex_predict_repair_bypass(self):
        # Even if inventory keyword exists, if it's repair/service, it should bypass (return None)
        self.assertIsNone(regex_predict("REPAIR KUNCI SHOCK"))
        self.assertIsNone(regex_predict("SERVICE PEMOTONG KERTAS"))
        self.assertIsNone(regex_predict("PERBAIKAN TOOL SET"))
        self.assertIsNone(regex_predict("BENERIN TOOLBOX"))

    def test_regex_predict_no_match(self):
        self.assertIsNone(regex_predict("BELI BARANG RANDOM"))
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
        # 1 CAPEX vs 1 OPEX -> Tie -> Returns None (fallback to ML)
        self.assertIsNone(detect_budget_type("REPAIR NEW MACHINE"))
        # 0 vs 0
        self.assertIsNone(detect_budget_type("BELI BARANG BIASA"))

    def test_detect_budget_type_mixed_capex_wins(self):
        # 2 CAPEX vs 1 OPEX
        self.assertEqual(detect_budget_type("PROJECT INVESTMENT AND REPAIR"), "CAPEX")

    def test_detect_budget_type_mixed_opex_wins(self):
        # 2 OPEX vs 1 CAPEX
        self.assertEqual(detect_budget_type("MAINTENANCE REPAIR OF ASSET"), "OPEX")


if __name__ == "__main__":
    unittest.main()
