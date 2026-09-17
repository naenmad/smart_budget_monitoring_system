import re
from sqlalchemy import func
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from models.pr_po_data import PrPoData
from models.kategori import Kategori
from utils.db import db


class ParetoService:
    @staticmethod
    def extract_user_from_comment(comment: str) -> str:
        if not comment:
            return "QC General"
        c = comment.upper()
        # Look for pattern: PIC : NAME or PIC NAME
        m = re.search(r"PIC\s*[:]?\s*([A-Z0-9_ ]+?)(?:/|$|\n)", c)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"^(MR\.?|MS\.?|MRS\.?)\s*", "", val)
            if len(val) >= 2:
                return val.title()
        if "QC INCOMING" in c or "INCOMING" in c:
            return "QC Incoming"
        if "DIGITALISASI" in c:
            return "QC Digitalization"
        if "ASSY" in c or "LINE" in c:
            return "QC Production"
        return "QC Admin"

    @classmethod
    def classify_preventive_activity(cls, desc: str, comment: str) -> str:
        txt = ((desc or "") + " " + (comment or "")).upper()
        if any(k in txt for k in ["MODIF", "BRACKET", "SWING GAUGE", "MAKING BOARD", "JIG", "MODIFIKASI"]):
            return "Modifikasi"
        if any(k in txt for k in ["REPAIR", "PERBAIKAN", "PAINT", "CAT", "CORRECTION", "SERVICE"]):
            return "Perbaikan & Maintenance"
        if any(k in txt for k in ["PIN GAUGE", "CALIPER", "DIAL", "SNAP GAUGE", "RATCHET", "WRENCH", "DOWEL PIN"]):
            return "Tooling & Inspection"
        return "Sparepart & Consumable CF"

    @classmethod
    def get_pareto_analysis(cls, periode: str = "2026", category: str = "ALL") -> dict:
        """
        Calculates Pareto analysis (80/20 rule) by Section / User and by Item.
        Compares Planning vs Actual PR and Actual GR.
        Supports category filter: ALL, CALIBRATION, PREVENTIVE, CONSUMABLE, CAPEX.
        Includes preventive breakdown if category is PREVENTIVE or ALL.
        """
        cat_upper = (category or "ALL").upper().strip()

        # 1. Fetch Planning items for the period
        header = PlanningHeader.query.filter(PlanningHeader.periode == periode).first()
        planning_by_user = {}
        planning_by_item = {}
        total_planned = 0.0

        if header:
            pd_query = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.status_realisasi != "CANCELLED"
            )

            if cat_upper == "CALIBRATION":
                pd_query = pd_query.filter(
                    PlanningDetail.kategori_id == 2,
                    PlanningDetail.item.ilike("%KALIBRASI%") | PlanningDetail.item.ilike("%CALIBRATION%")
                )
            elif cat_upper == "PREVENTIVE":
                pd_query = pd_query.filter(
                    PlanningDetail.kategori_id == 2,
                    PlanningDetail.item.ilike("%PREVENTIV%") | PlanningDetail.item.ilike("%PREVENTIVE%")
                )
            elif cat_upper == "CONSUMABLE":
                pd_query = pd_query.filter(PlanningDetail.kategori_id == 1)
            elif cat_upper == "CAPEX":
                pd_query = pd_query.filter(PlanningDetail.kategori_id == 3)

            pds = pd_query.all()

            for pd in pds:
                amt = float(pd.planning_amount or 0.0)
                total_planned += amt
                user = cls.extract_user_from_comment(pd.remarks) if pd.remarks else "QC Admin"
                planning_by_user[user] = planning_by_user.get(user, 0.0) + amt

                item_key = pd.item.strip()
                planning_by_item[item_key] = planning_by_item.get(item_key, 0.0) + amt

        # 2. Fetch Actual PR / PO records
        year_filter = (
            func.extract('year', PrPoData.request_date) == int(periode)
            if periode and periode.isdigit()
            else True
        )

        pr_query = PrPoData.query.filter(
            year_filter,
            PrPoData.status_ai != "CANCELLED"
        )

        if cat_upper == "CALIBRATION":
            pr_query = pr_query.filter(
                PrPoData.kategori_id == 2,
                PrPoData.description.ilike("%KALIBRASI%") | PrPoData.comment_text.ilike("%KALIBRASI%")
            )
        elif cat_upper == "PREVENTIVE":
            pr_query = pr_query.filter(
                PrPoData.kategori_id == 2,
                PrPoData.description.ilike("%PREVENTIV%") | PrPoData.comment_text.ilike("%PREVENTIV%") | PrPoData.comment_text.ilike("%MAINTENANCE C/F%")
            )
        elif cat_upper == "CONSUMABLE":
            pr_query = pr_query.filter(PrPoData.kategori_id == 1)
        elif cat_upper == "CAPEX":
            pr_query = pr_query.filter(PrPoData.kategori_id == 3)

        prs = pr_query.all()

        actual_by_user = {}
        actual_by_item = {}
        total_actual_pr = 0.0
        total_actual_gr = 0.0

        # Preventive breakdown container
        prev_breakdown = {
            "Modifikasi": {"pr": 0.0, "gr": 0.0, "count": 0, "items": []},
            "Perbaikan & Maintenance": {"pr": 0.0, "gr": 0.0, "count": 0, "items": []},
            "Tooling & Inspection": {"pr": 0.0, "gr": 0.0, "count": 0, "items": []},
            "Sparepart & Consumable CF": {"pr": 0.0, "gr": 0.0, "count": 0, "items": []}
        }

        for pr in prs:
            amt = float(pr.total_price or 0.0)
            total_actual_pr += amt
            has_gr = bool(pr.gr_legal_number)
            gr_amt = amt if has_gr else 0.0
            total_actual_gr += gr_amt

            user = cls.extract_user_from_comment(pr.comment_text)
            if user not in actual_by_user:
                actual_by_user[user] = {
                    "name": user,
                    "actual_pr": 0.0,
                    "actual_gr": 0.0,
                    "pr_count": 0,
                    "gr_count": 0,
                    "oop_count": 0,
                    "oop_amount": 0.0
                }
            actual_by_user[user]["actual_pr"] += amt
            actual_by_user[user]["actual_gr"] += gr_amt
            actual_by_user[user]["pr_count"] += 1
            if has_gr:
                actual_by_user[user]["gr_count"] += 1
            if pr.budget_status == "OOP":
                actual_by_user[user]["oop_count"] += 1
                actual_by_user[user]["oop_amount"] += amt

            # Item grouping
            item_name = pr.planning_detail.item if pr.planning_detail else (pr.description or "Unknown Item")
            item_name = item_name.strip()
            if item_name not in actual_by_item:
                actual_by_item[item_name] = {
                    "name": item_name,
                    "actual_pr": 0.0,
                    "actual_gr": 0.0,
                    "user": user,
                    "form": pr.kategori.kode if pr.kategori else "E1 - Consumable",
                    "budget_status": pr.budget_status or "ON_PLAN",
                    "pr_count": 0
                }
            actual_by_item[item_name]["actual_pr"] += amt
            actual_by_item[item_name]["actual_gr"] += gr_amt
            actual_by_item[item_name]["pr_count"] += 1

            # Check if this PR is preventive for breakdown
            is_prev = (
                pr.kategori_id == 2 and (
                    "PREVENTIV" in (pr.description or "").upper() or
                    "PREVENTIV" in (pr.comment_text or "").upper() or
                    "MAINTENANCE C/F" in (pr.comment_text or "").upper()
                )
            )
            if is_prev:
                act_type = cls.classify_preventive_activity(pr.description, pr.comment_text)
                prev_breakdown[act_type]["pr"] += amt
                prev_breakdown[act_type]["gr"] += gr_amt
                prev_breakdown[act_type]["count"] += 1
                prev_breakdown[act_type]["items"].append({
                    "pr_doc": pr.pr_doc_num,
                    "item": pr.description,
                    "amount": amt,
                    "gr": gr_amt,
                    "user": user,
                    "gr_num": pr.gr_legal_number
                })

        # 3. Build Pareto Users Table & Chart Data
        all_users = set(planning_by_user.keys()).union(set(actual_by_user.keys()))
        user_list = []
        for u in all_users:
            act = actual_by_user.get(u, {
                "name": u, "actual_pr": 0.0, "actual_gr": 0.0,
                "pr_count": 0, "gr_count": 0, "oop_count": 0, "oop_amount": 0.0
            })
            plan = planning_by_user.get(u, 0.0)
            user_list.append({
                "name": u,
                "planning": plan,
                "actual_pr": act["actual_pr"],
                "actual_gr": act["actual_gr"],
                "variance": plan - act["actual_pr"],
                "pr_count": act["pr_count"],
                "gr_count": act["gr_count"],
                "oop_count": act["oop_count"],
                "oop_amount": act["oop_amount"]
            })

        user_list.sort(key=lambda x: (x["actual_pr"], x["planning"]), reverse=True)

        running_user_spend = 0.0
        for item in user_list:
            running_user_spend += item["actual_pr"]
            item["share_pct"] = round((item["actual_pr"] / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0
            item["cumulative_pct"] = round((running_user_spend / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0

        # 4. Build Pareto Items Table & Chart Data (Top 30 items)
        all_items = set(planning_by_item.keys()).union(set(actual_by_item.keys()))
        item_list = []
        for it in all_items:
            act = actual_by_item.get(it, {
                "name": it, "actual_pr": 0.0, "actual_gr": 0.0,
                "user": "QC Admin", "form": "E1 - Consumable", "budget_status": "ON_PLAN", "pr_count": 0
            })
            plan = planning_by_item.get(it, 0.0)
            item_list.append({
                "name": it,
                "planning": plan,
                "actual_pr": act["actual_pr"],
                "actual_gr": act["actual_gr"],
                "variance": plan - act["actual_pr"],
                "user": act["user"],
                "form": "E1 - Consumable" if act["form"] in ["E-1", "E1"] else act["form"],
                "budget_status": act["budget_status"],
                "pr_count": act["pr_count"]
            })

        item_list.sort(key=lambda x: (x["actual_pr"], x["planning"]), reverse=True)

        running_item_spend = 0.0
        for item in item_list:
            running_item_spend += item["actual_pr"]
            item["share_pct"] = round((item["actual_pr"] / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0
            item["cumulative_pct"] = round((running_item_spend / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0

        # Format preventive breakdown list
        formatted_prev_breakdown = []
        total_prev_pr = sum(v["pr"] for v in prev_breakdown.values())
        for type_name, info in prev_breakdown.items():
            formatted_prev_breakdown.append({
                "type": type_name,
                "actual_pr": info["pr"],
                "actual_gr": info["gr"],
                "count": info["count"],
                "share_pct": round((info["pr"] / total_prev_pr * 100), 2) if total_prev_pr > 0 else 0.0,
                "items": info["items"][:10]
            })
        formatted_prev_breakdown.sort(key=lambda x: x["actual_pr"], reverse=True)

        return {
            "success": True,
            "periode": periode,
            "category": cat_upper,
            "summary": {
                "total_planned": total_planned,
                "total_actual_pr": total_actual_pr,
                "total_actual_gr": total_actual_gr,
                "total_variance": total_planned - total_actual_pr,
                "user_count": len(user_list),
                "item_count": len(item_list)
            },
            "by_user": user_list,
            "by_item": item_list[:30],
            "preventive_breakdown": formatted_prev_breakdown
        }

    @classmethod
    def get_user_commitment_chart(cls, periode: str = "2026") -> list:
        """
        Returns chart data for Procurement Commitment by User / PIC.
        """
        analysis = cls.get_pareto_analysis(periode, category="ALL")
        users = analysis.get("by_user", [])
        return [
            {
                "name": u["name"],
                "budget": float(u.get("planning", 0)),
                "actual": float(u.get("actual_pr", 0)),
                "saldo": max(0.0, float(u.get("planning", 0)) - float(u.get("actual_pr", 0)))
            }
            for u in users
        ]
