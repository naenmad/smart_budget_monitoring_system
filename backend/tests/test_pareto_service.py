import pytest
from services.pareto_service import ParetoService

def test_extract_user_from_comment():
    assert ParetoService.extract_user_from_comment("ACTIVITY CHECKSHEET DIGITAL/ PIC BINTANG") == "Bintang"
    assert ParetoService.extract_user_from_comment("PIC : WHASKY / TEST") == "Whasky"
    assert ParetoService.extract_user_from_comment("PIC: SLAMET") == "Slamet"
    assert ParetoService.extract_user_from_comment("MAKING BOARD FLOW PROCES QC INCOMING") == "QC Incoming"
    assert ParetoService.extract_user_from_comment("DIGITALISASI PROJECT") == "QC Digitalization"
    assert ParetoService.extract_user_from_comment("ASSY LINE 2") == "QC Production"
    assert ParetoService.extract_user_from_comment("") == "QC General"
    assert ParetoService.extract_user_from_comment(None) == "QC General"
