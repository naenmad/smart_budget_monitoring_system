import os
import sys
import pytest
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.planning.planning_upload_service import PlanningUploadService

def test_single_sheet_planning_df(tmp_path):
    # Buat file excel template datar sederhana
    file_path = str(tmp_path / "planning_single.xlsx")
    data = {
        "month": ["Jan", "Feb"],
        "category": ["E-1", "E-9"],
        "item_description": ["Kikir Tekiro 8 inch", "Vernier Caliper"],
        "planning_amount_idr": [325000, 250000],
        "remarks_actual_item": ["", ""]
    }
    df_raw = pd.DataFrame(data)
    with pd.ExcelWriter(file_path) as writer:
        df_raw.to_excel(writer, sheet_name="Budget Planning Detail", index=False)

    df_res = PlanningUploadService._read_planning_df(file_path)
    assert len(df_res) == 2
    assert "item" in df_res.columns
    assert "form" in df_res.columns
    assert "planning_amount" in df_res.columns
    assert df_res.iloc[0]["form"] == "E-1"
    assert df_res.iloc[1]["form"] == "E-9"

def test_multi_sheet_committee_parser_detection(tmp_path):
    # Buat file excel tiruan multi-sheet komite PT SAI
    file_path = str(tmp_path / "komite_mock.xlsx")
    with pd.ExcelWriter(file_path) as writer:
        # Sheet Form E-1
        df_e1 = pd.DataFrame([
            ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", ""],
            ["Item", "x", "x", "x", "x", "x", "x", "Price", "Jan", "Feb"],
            ["", "", "", "", "", "", "", "@", "Amount", "Amount"],
            ["Spet Cat Semprot", "", "", "", "", "", "", 205000, 205000, 0],
            ["Cat Silver 1kg", "", "", "", "", "", "", 80000, 80000, 160000]
        ])
        df_e1.to_excel(writer, sheet_name="Form E-1", header=False, index=False)

        # Sheet Form I-1
        df_i1 = pd.DataFrame([
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
            ["Code", "Item", "", "", "", "", "", "", "", "Price", "Jan"],
            ["", "", "", "", "", "", "", "", "", "@", "Amount"],
            ["I1.01", "Automatic Precision Cutting Machine", "", "", "", "", "", "", "", 250000000, 250000000]
        ])
        df_i1.to_excel(writer, sheet_name="Form I-1", header=False, index=False)

    df_res = PlanningUploadService._read_planning_df(file_path)
    assert len(df_res) >= 3
    assert set(df_res["form"]) == {"E-1", "I-1"}
    assert "Automatic Precision Cutting Machine" in list(df_res["item"])
