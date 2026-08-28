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

    def test_extract_code_none(self):
        self.assertIsNone(AdvancedMappingService.extract_code("BELI BARANG BIASA SAJA"))
        self.assertIsNone(AdvancedMappingService.extract_code(""))
        self.assertIsNone(AdvancedMappingService.extract_code(None))


if __name__ == "__main__":
    unittest.main()
