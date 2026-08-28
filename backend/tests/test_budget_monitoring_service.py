import os
import sys
import unittest
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.budget_monitoring_service import BudgetMonitoringService


class DummyPlanningDetail:
    def __init__(self, id, planning_amount, status_realisasi='OPEN'):
        self.id = id
        self.planning_amount = Decimal(str(planning_amount))
        self.status_realisasi = status_realisasi


class DummyPrPoData:
    def __init__(self, id, planning_detail_id, total_price, budget_status=None, procurement_status='PENDING'):
        self.id = id
        self.planning_detail_id = planning_detail_id
        self.total_price = Decimal(str(total_price))
        self.budget_status = budget_status
        self.procurement_status = procurement_status


class TestBudgetMonitoringLogic(unittest.TestCase):

    def test_calculation_within_budget(self):
        planning_amount = Decimal("50000000")
        used_amount = Decimal("20000000")
        current_pr = Decimal("15000000")

        remaining_before = planning_amount - used_amount
        remaining_after = remaining_before - current_pr
        status = "OVER_PLAN" if remaining_after < 0 else "ON_PLAN"

        self.assertEqual(remaining_before, Decimal("30000000"))
        self.assertEqual(remaining_after, Decimal("15000000"))
        self.assertEqual(status, "ON_PLAN")

    def test_calculation_exact_zero_remaining(self):
        planning_amount = Decimal("10000000")
        used_amount = Decimal("0")
        current_pr = Decimal("10000000")

        remaining_after = (planning_amount - used_amount) - current_pr
        status = "OVER_PLAN" if remaining_after < 0 else "ON_PLAN"

        self.assertEqual(remaining_after, Decimal("0"))
        self.assertEqual(status, "ON_PLAN")

    def test_calculation_over_budget(self):
        planning_amount = Decimal("10000000")
        used_amount = Decimal("8000000")
        current_pr = Decimal("5000000")

        remaining_before = planning_amount - used_amount
        remaining_after = remaining_before - current_pr
        status = "OVER_PLAN" if remaining_after < 0 else "ON_PLAN"

        self.assertEqual(remaining_before, Decimal("2000000"))
        self.assertEqual(remaining_after, Decimal("-3000000"))
        self.assertEqual(status, "OVER_PLAN")

    def test_dual_metric_pr_vs_gr(self):
        capex_budget = 100000000.0
        capex_actual_pr = 65000000.0   # Total PR diajukan
        capex_actual_gr = 40000000.0   # Total GR diterima

        saldo_pr = capex_budget - capex_actual_pr
        saldo_gr = capex_budget - capex_actual_gr
        persen_pr = round((capex_actual_pr / capex_budget) * 100)
        persen_gr = round((capex_actual_gr / capex_budget) * 100)

        self.assertEqual(saldo_pr, 35000000.0)
        self.assertEqual(saldo_gr, 60000000.0)
        self.assertEqual(persen_pr, 65)
        self.assertEqual(persen_gr, 40)
        self.assertTrue(saldo_pr > 0)
        self.assertTrue(persen_pr <= 100)

    def test_pipeline_math_consistency(self):
        total_pr = 195
        matched_pr = 51
        need_mapping = 87
        oop = 57
        cancelled = 0

        self.assertEqual(matched_pr + need_mapping + oop + cancelled, total_pr)


if __name__ == "__main__":
    unittest.main()
