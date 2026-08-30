import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.mapping.advanced_mapping_service import AdvancedMappingService


class TestAdvancedMappingService(unittest.TestCase):

    def test_extract_periode_valid(self):
        self.assertEqual(AdvancedMappingService.extract_periode("SAI/PR/26010001"), "2026")
        self.assertEqual(AdvancedMappingService.extract_periode("SAI/PR/25081234"), "2025")
        self.assertEqual(AdvancedMappingService.extract_periode("SAI/PR/24129999"), "2024")

    def test_extract_periode_invalid(self):
        self.assertIsNone(AdvancedMappingService.extract_periode("PR/12345"))
        self.assertIsNone(AdvancedMappingService.extract_periode(""))
        self.assertIsNone(AdvancedMappingService.extract_periode(None))

    def test_extract_code_in_parentheses(self):
        self.assertEqual(AdvancedMappingService.extract_code("KUNCI L SET (0117020)"), "0117020")
        self.assertEqual(AdvancedMappingService.extract_code("SPARE PART HYDRAULIC (MST-99)"), "MST-99")
        self.assertEqual(AdvancedMappingService.extract_code("TEST ITEM (ABC)"), "ABC")

    def test_extract_code_alphanumeric_suffix(self):
        self.assertEqual(AdvancedMappingService.extract_code("PENGADAAN SPARE PART MSTP6-20"), "MSTP6-20")
        self.assertEqual(AdvancedMappingService.extract_code("BEARING UNIT UCP205"), "UCP205")

    def test_extract_code_with_quotes(self):
        self.assertEqual(AdvancedMappingService.extract_code("Kalibrasi Vernier Caliper 0 - 150 mm ('0217035)"), "0217035")
        self.assertEqual(AdvancedMappingService.extract_code("Kalibrasi Digital Caliper 0 - 150 mm ('0124044)"), "0124044")
        self.assertEqual(AdvancedMappingService.extract_code("ITEM REG ('0420116')"), "0420116")
        self.assertEqual(AdvancedMappingService.extract_code("ALAT UKUR '0217035"), "0217035")
        self.assertEqual(AdvancedMappingService.extract_code("KALIBRASI VMM (NO. REG : '1822002)"), "1822002")

    def test_extract_month_from_datetime(self):
        from datetime import datetime
        self.assertEqual(AdvancedMappingService.extract_month(datetime(2026, 8, 15)), "Aug")
        self.assertEqual(AdvancedMappingService.extract_month(datetime(2026, 1, 1)), "Jan")
        self.assertEqual(AdvancedMappingService.extract_month(datetime(2026, 12, 31)), "Dec")

    def test_extract_month_from_iso_string(self):
        self.assertEqual(AdvancedMappingService.extract_month("2026-05-14"), "May")
        self.assertEqual(AdvancedMappingService.extract_month("2026-08-01 10:00:00"), "Aug")

    def test_extract_month_fallback_to_pr_doc_num(self):
        self.assertEqual(AdvancedMappingService.extract_month(None, "SAI/PR/26080119"), "Aug")
        self.assertEqual(AdvancedMappingService.extract_month(None, "SAI/PR/26050146"), "May")
        self.assertEqual(AdvancedMappingService.extract_month(None, "SAI/PR/26120001"), "Dec")

    def test_extract_code_dimension_filtering(self):
        # Dimensions, units, screws, quantities should NOT be extracted as registration codes
        self.assertIsNone(AdvancedMappingService.extract_code("CASTOR WHEEL Merk HITO 4\"FIX"))
        self.assertIsNone(AdvancedMappingService.extract_code("Dextone Hotlmelt Glue Stick 11mm"))
        self.assertIsNone(AdvancedMappingService.extract_code("KUNCI INGGRIS MERK DELI 8 inch"))
        self.assertIsNone(AdvancedMappingService.extract_code("Alas meja ESD hijau 2x600x1220"))
        self.assertIsNone(AdvancedMappingService.extract_code("BOX PIN CHECK -Jar Kaleng Pot Tin Aluminium Square 100 gr"))
        self.assertIsNone(AdvancedMappingService.extract_code("Tekiro Tang Snap Ring ES 7 Inch"))
        self.assertIsNone(AdvancedMappingService.extract_code("RING PLATE SIZE M4x8x0.8"))
        self.assertIsNone(AdvancedMappingService.extract_code("Roda PU Merah No Brand SIZE 5 INCH FIX"))

    def test_extract_code_none(self):
        self.assertIsNone(AdvancedMappingService.extract_code("BELI BARANG BIASA SAJA"))
        self.assertIsNone(AdvancedMappingService.extract_code(""))
        self.assertIsNone(AdvancedMappingService.extract_code(None))


if __name__ == "__main__":
    unittest.main()
