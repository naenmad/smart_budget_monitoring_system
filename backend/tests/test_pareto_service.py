import pytest
from services.pareto_service import ParetoService

def test_extract_user_from_comment():
    assert ParetoService.extract_user_from_comment("ACTIVITY CHECKSHEET DIGITAL/ PIC BINTANG") == "BINTANG"
    assert ParetoService.extract_user_from_comment("PIC : WHASKY / TEST") == "WHASKY"
    assert ParetoService.extract_user_from_comment("PIC: SLAMET") == "SLAMET"
    assert ParetoService.extract_user_from_comment("MAKING BOARD FLOW PROCES QC INCOMING") == "QC INCOMING"
    assert ParetoService.extract_user_from_comment("DIGITALISASI PROJECT") == "QC DIGITALIZATION"
    assert ParetoService.extract_user_from_comment("ASSY LINE 2") == "ASSY"
    assert ParetoService.extract_user_from_comment("JASA KALIBRASI VERNIER CALIPER") == "PAK ARIS"
    assert ParetoService.extract_user_from_comment("", "Voucher Alfamart") == "PAK ANDI NURDIYANA"
    assert ParetoService.extract_user_from_comment("", "Petty Cash Issue") == "PAK ANDI NURDIYANA"
    assert ParetoService.extract_user_from_comment("", "Business trip to china on 3") == "PAK OXI KURNIAWAN"
    assert ParetoService.extract_user_from_comment("", "LOOP PINS 5000 PCS") == "PAK OXI KURNIAWAN"
    assert ParetoService.extract_user_from_comment("") == "QC GENERAL"
    assert ParetoService.extract_user_from_comment(None) == "QC GENERAL"

def test_classify_preventive_activity():
    assert ParetoService.classify_preventive_activity("MODIFIKASI JIG FIXTURE", "") == "Modifikasi"
    assert ParetoService.classify_preventive_activity("REPAIR CYLINDER", "") == "Perbaikan & Maintenance"
    assert ParetoService.classify_preventive_activity("PIN GAUGE 5.0MM", "") == "Tooling & Inspection"
    assert ParetoService.classify_preventive_activity("BOLT & NUT", "") == "Sparepart & Consumable CF"
