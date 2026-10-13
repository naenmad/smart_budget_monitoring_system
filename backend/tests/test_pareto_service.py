import pytest
from services.pareto_service import ParetoService

def test_extract_user_from_comment():
    assert ParetoService.extract_user_from_comment("ACTIVITY CHECKSHEET DIGITAL/ PIC BINTANG") == "BINTANG"
    assert ParetoService.extract_user_from_comment("PIC : WHASKY / TEST") == "WHASKY"
    assert ParetoService.extract_user_from_comment("PIC: SLAMET") == "SLAMET"
    assert ParetoService.extract_user_from_comment("MAKING BOARD FLOW PROCES QC INCOMING") == "QC INCOMING"
    assert ParetoService.extract_user_from_comment("DIGITALISASI PROJECT") == "QC DIGITALIZATION"
    assert ParetoService.extract_user_from_comment("ASSY LINE 2") == "ASSY"
    assert ParetoService.extract_user_from_comment("") == "QC GENERAL"
    assert ParetoService.extract_user_from_comment(None) == "QC GENERAL"
