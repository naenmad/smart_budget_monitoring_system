import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai.synonym_normalizer import SynonymNormalizer


class TestSynonymNormalizer(unittest.TestCase):

    def test_normalize_cleaner_synonyms(self):
        t1 = SynonymNormalizer.normalize_text("Pembersih Lantai Karbol")
        t2 = SynonymNormalizer.normalize_text("Floor Cleaner chemical")
        self.assertIn("pembersih", t1)
        self.assertIn("floor", t1)
        self.assertIn("pembersih", t2)
        self.assertIn("floor", t2)

    def test_normalize_cable_tie_synonyms(self):
        t1 = SynonymNormalizer.normalize_text("Kabel Tis Hitam 20cm")
        t2 = SynonymNormalizer.normalize_text("Cable Tie White")
        self.assertIn("kabel tis", t1)
        self.assertIn("cable tie", t1)
        self.assertIn("kabel tis", t2)
        self.assertIn("cable tie", t2)

    def test_normalize_measuring_tools(self):
        t1 = SynonymNormalizer.normalize_text("Jangka Sorong Digital 150mm")
        t2 = SynonymNormalizer.normalize_text("Vernier Caliper Mitutoyo")
        self.assertIn("caliper", t1)
        self.assertIn("jangka sorong", t1)
        self.assertIn("caliper", t2)
        self.assertIn("jangka sorong", t2)

    def test_abbreviations_expansion(self):
        t_cal = SynonymNormalizer.normalize_text("Jasa Cal Micrometer")
        self.assertIn("kalibrasi", t_cal)

        t_prev = SynonymNormalizer.normalize_text("Biaya Prev Maint Mesin Press")
        self.assertIn("preventive", t_prev)
        self.assertIn("maintenance", t_prev)

        t_prevention = SynonymNormalizer.normalize_text("Auto prevention checking fixture")
        self.assertIn("preventive", t_prevention)

        t_preventif = SynonymNormalizer.normalize_text("Perawatan preventif jig")
        self.assertIn("preventive", t_preventif)


if __name__ == "__main__":
    unittest.main()
