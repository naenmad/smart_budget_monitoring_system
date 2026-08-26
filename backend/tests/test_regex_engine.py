import pytest
from ai.regex_engine import regex_predict
from ai.rule_base import detect_budget_type

class TestRegexEngine:
    def test_regex_predict_i1(self):
        # Should match I-1 directly
        assert regex_predict("PEMBELIAN KODE I-1") == "I-1"
        assert regex_predict("BARANG I 1 BARU") == "I-1"
        assert regex_predict("I1") == "I-1"

    def test_regex_predict_e1(self):
        assert regex_predict("Barang E-1 baru") == "E-1"
        assert regex_predict("E1 BIAYA") == "E-1"

    def test_regex_predict_e9(self):
        assert regex_predict("BIAYA E-9") == "E-9"
        assert regex_predict("E 9") == "E-9"

    def test_regex_predict_inventory_keywords(self):
        # Inventory keywords should return I-1
        assert regex_predict("KUNCI L SET") == "I-1"
        assert regex_predict("PEMOTONG KERTAS UNTUK KANTOR") == "I-1"
        assert regex_predict("PEMBELIAN TOOL BOX") == "I-1"

    def test_regex_predict_repair_bypass(self):
        # Even if inventory keyword exists, if it's repair/service, it should bypass (return None)
        assert regex_predict("REPAIR KUNCI SHOCK") is None
        assert regex_predict("SERVICE PEMOTONG KERTAS") is None
        assert regex_predict("PERBAIKAN TOOL SET") is None
        assert regex_predict("BENERIN TOOLBOX") is None

    def test_regex_predict_no_match(self):
        assert regex_predict("BELI BARANG RANDOM") is None
        assert regex_predict("") is None

    def test_detect_budget_type_capex(self):
        assert detect_budget_type("NEW MACHINE FOR FACTORY") == "CAPEX"
        assert detect_budget_type("NEW EQUIPMENT SETUP") == "CAPEX"
        assert detect_budget_type("INSTALLATION OF ASSET") == "CAPEX"

    def test_detect_budget_type_opex(self):
        assert detect_budget_type("MAINTENANCE SCHEDULE") == "OPEX"
        assert detect_budget_type("REPAIR MACHINE") == "OPEX"
        assert detect_budget_type("SPARE PARTS ORDER") == "OPEX"

    def test_detect_budget_type_mixed_tie(self):
        # 1 CAPEX vs 1 OPEX -> Tie -> Returns None (fallback to ML)
        assert detect_budget_type("REPAIR NEW MACHINE") is None
        # 0 vs 0
        assert detect_budget_type("BELI BARANG BIASA") is None

    def test_detect_budget_type_mixed_capex_wins(self):
        # 2 CAPEX vs 1 OPEX
        assert detect_budget_type("PROJECT INVESTMENT AND REPAIR") == "CAPEX"

    def test_detect_budget_type_mixed_opex_wins(self):
        # 2 OPEX vs 1 CAPEX
        assert detect_budget_type("MAINTENANCE REPAIR OF ASSET") == "OPEX"
