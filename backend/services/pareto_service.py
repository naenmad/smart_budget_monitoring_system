import re
from sqlalchemy import func
from models.planning_header import PlanningHeader
from models.planning_detail import PlanningDetail
from models.pr_po_data import PrPoData
from models.kategori import Kategori
from models.budget import Budget
from utils.db import db


class ParetoService:
    """
    Service to generate 80/20 Pareto spend analysis:
    1. By Section / User
    2. By Item Description
    """

    @classmethod
    def clean_user_name(cls, raw_name: str) -> str:
        if not raw_name:
            return "QC GENERAL"
        s = str(raw_name).strip()
        known_map = {
            "QC ADMIN": "QC ADMIN",
            "QC ADMINISTRASI": "QC ADMIN",
            "ADMIN QC": "QC ADMIN",
            "KALIBRASI": "KALIBRASI",
            "CALIBRATION": "KALIBRASI",
            "CUSTOMER": "CUSTOMER",
            "CUSTOMER CLAIM": "CUSTOMER",
            "ASSY": "ASSY",
            "QC PRODUCTION": "ASSY",
            "PRODUCTION": "ASSY",
            "QUALITY - GNRL": "QUALITY - GENERAL",
            "QUALITY - GENERAL": "QUALITY - GENERAL",
            "QUALITY - QC": "QUALITY - QC",
            "QE CF": "QE CF",
            "TL-VS": "TL-VS",
            "TL-QC": "TL-QC",
            "CMM": "CMM",
            "QE": "QE",
            "QC INCOMING": "QC INCOMING",
            "INCOMING": "QC INCOMING",
            "DIGITALISASI": "QC DIGITALIZATION",
            "QC DIGITALIZATION": "QC DIGITALIZATION",
            "QC GENERAL": "QC GENERAL",
            "TIDAK TERCANTUM DI GL": "QE CF",
            "TIDAK TERCANTUM": "QE CF",
        }
        upper_s = s.upper()
        if upper_s in known_map:
            return known_map[upper_s]
        return upper_s

    @classmethod
    def extract_user_from_comment(cls, comment: str) -> str:
        if not comment:
            return "QC GENERAL"
        c = comment.upper()
        # Look for pattern: PIC : NAME or PIC NAME
        m = re.search(r"PIC\s*[:]?\s*([A-Z0-9_ ]+?)(?:/|$|\n)", c)
        if m:
            val = m.group(1).strip()
            val = re.sub(r"^(MR\.?|MS\.?|MRS\.?)\s*", "", val)
            if len(val) >= 2:
                return cls.clean_user_name(val)
        if "QC INCOMING" in c or "INCOMING" in c:
            return "QC INCOMING"
        if "DIGITALISASI" in c:
            return "QC DIGITALIZATION"
        if "ASSY" in c or "LINE" in c:
            return "ASSY"
        return "QC ADMIN"

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
        Supports category filter: ALL, OPEX, CAPEX, CALIBRATION, PREVENTIVE, CONSUMABLE.
        Includes preventive breakdown if category is PREVENTIVE or ALL.
        """
        cat_upper = (category or "ALL").upper().strip()

        # 1. Fetch Planning items for the period
        header = PlanningHeader.query.filter(PlanningHeader.periode == periode).first()
        planning_by_user = {}
        planning_by_item = {}
        total_planned_from_items = 0.0

        if header:
            pd_query = PlanningDetail.query.filter(
                PlanningDetail.planning_header_id == header.id,
                PlanningDetail.status_realisasi != "CANCELLED"
            )

            if cat_upper == "CALIBRATION":
                pd_query = pd_query.filter(
                    PlanningDetail.sub_kategori.ilike("%Kalibrasi%") |
                    PlanningDetail.item.ilike("%KALIBRASI%") |
                    PlanningDetail.item.ilike("%CALIBRATION%")
                )
            elif cat_upper == "PREVENTIVE":
                pd_query = pd_query.filter(
                    PlanningDetail.sub_kategori.ilike("%Preventive%") |
                    PlanningDetail.item.ilike("%PREVENTIV%")
                )
            elif cat_upper == "CONSUMABLE":
                pd_query = pd_query.filter(
                    PlanningDetail.sub_kategori.ilike("%Consumable%")
                )
            elif cat_upper in ["CAPEX", "OPEX"]:
                pd_query = pd_query.join(Kategori, PlanningDetail.kategori_id == Kategori.id).filter(
                    Kategori.tipe_formulir == cat_upper
                )
            elif cat_upper in ["TRANSPORT", "TRANSPORTATION"]:
                pd_query = pd_query.join(Kategori, PlanningDetail.kategori_id == Kategori.id).filter(
                    Kategori.kode.like("60290500%")
                )
            elif cat_upper == "MARKETING":
                pd_query = pd_query.join(Kategori, PlanningDetail.kategori_id == Kategori.id).filter(
                    Kategori.kode.like("60290100%")
                )
            elif cat_upper != "ALL":
                pd_query = pd_query.join(Kategori, PlanningDetail.kategori_id == Kategori.id).filter(
                    Kategori.kode == cat_upper
                )

            pds = pd_query.all()

            for pd in pds:
                amt = float(pd.planning_amount or 0.0)
                total_planned_from_items += amt
                raw_user = pd.pic if pd.pic else (pd.remarks if pd.remarks else "QC ADMIN")
                user = cls.clean_user_name(raw_user)
                planning_by_user[user] = planning_by_user.get(user, 0.0) + amt

                item_key = pd.item.strip()
                planning_by_item[item_key] = planning_by_item.get(item_key, 0.0) + amt

        # Fetch Finance Budget (Cost Control FA) from Budget table
        b_query = db.session.query(func.coalesce(func.sum(Budget.nominal), 0)).filter(Budget.periode == periode)
        if cat_upper == "123200":
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode.like("%123200"))
        elif cat_upper == "123000":
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode.like("%123000"))
        elif cat_upper in ["CAPEX", "OPEX"]:
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.tipe_formulir == cat_upper)
        elif cat_upper in ["TRANSPORT", "TRANSPORTATION"]:
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode.like("60290500%"))
        elif cat_upper == "MARKETING":
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode.like("60290100%"))
        elif cat_upper == "CONSUMABLE":
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode == "50032902-123200")
        elif cat_upper != "ALL":
            b_query = b_query.join(Kategori, Budget.kategori_id == Kategori.id).filter(Kategori.kode == cat_upper)
        
        fa_budget_nominal = float(b_query.scalar() or 0.0)
        total_planned = fa_budget_nominal if fa_budget_nominal > 0 else total_planned_from_items

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
                PrPoData.description.ilike("%KALIBRASI%") |
                PrPoData.comment_text.ilike("%KALIBRASI%") |
                PrPoData.status_detail.ilike("%Kalibrasi%")
            )
        elif cat_upper == "PREVENTIVE":
            pr_query = pr_query.filter(
                PrPoData.status_detail.ilike("%Preventive%") |
                PrPoData.description.ilike("%PREVENTIV%") |
                PrPoData.comment_text.ilike("%PREVENTIV%")
            )
        elif cat_upper == "CONSUMABLE":
            pr_query = pr_query.filter(
                PrPoData.gl_account == "50032902",
                ~PrPoData.description.ilike("%KALIBRASI%"),
                ~PrPoData.status_detail.ilike("%Preventive%")
            )
        elif cat_upper in ["CAPEX", "OPEX"]:
            pr_query = pr_query.join(Kategori, PrPoData.kategori_id == Kategori.id).filter(
                Kategori.tipe_formulir == cat_upper
            )
        elif cat_upper in ["TRANSPORT", "TRANSPORTATION"]:
            pr_query = pr_query.filter(PrPoData.gl_account == "60290500")
        elif cat_upper == "MARKETING":
            pr_query = pr_query.filter(PrPoData.gl_account == "60290100")
        elif cat_upper != "ALL":
            pr_query = pr_query.join(Kategori, PrPoData.kategori_id == Kategori.id).filter(
                Kategori.kode == cat_upper
            )

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
            pr_val = float(pr.total_price or 0.0)
            gr_val = float(pr.total_price or 0.0) if pr.gr_legal_number else 0.0

            total_actual_pr += pr_val
            total_actual_gr += gr_val

            # Determine User / Section
            if pr.planning_detail and getattr(pr.planning_detail, "pic", None):
                user = cls.clean_user_name(pr.planning_detail.pic)
            elif getattr(pr, "pengaju", None):
                user = cls.clean_user_name(pr.pengaju)
            else:
                user = cls.extract_user_from_comment(pr.comment_text)

            if user not in actual_by_user:
                actual_by_user[user] = {"pr": 0.0, "gr": 0.0, "count": 0, "oop_count": 0, "oop_nominal": 0.0}
            actual_by_user[user]["pr"] += pr_val
            actual_by_user[user]["gr"] += gr_val
            actual_by_user[user]["count"] += 1
            if pr.budget_status == "OOP":
                actual_by_user[user]["oop_count"] += 1
                actual_by_user[user]["oop_nominal"] += pr_val

            # Determine Item Key
            item_name = pr.planning_item if hasattr(pr, "planning_item") and pr.planning_item else pr.description
            item_key = (item_name or "Unknown Item").strip()
            if item_key not in actual_by_item:
                actual_by_item[item_key] = {
                    "pr": 0.0,
                    "gr": 0.0,
                    "count": 0,
                    "form": pr.kategori.kode if pr.kategori else "OPEX",
                    "budget_status": pr.budget_status or "ON_PLAN",
                    "tipe_formulir": pr.kategori.tipe_formulir if pr.kategori else "OPEX"
                }
            actual_by_item[item_key]["pr"] += pr_val
            actual_by_item[item_key]["gr"] += gr_val
            actual_by_item[item_key]["count"] += 1

            # Populate Preventive activities breakdown
            desc_text = pr.description or ""
            is_prev = (
                "PREVENTIV" in desc_text.upper() or
                (pr.status_detail and "Preventive" in pr.status_detail) or
                (pr.comment_text and "PREVENTIV" in pr.comment_text.upper())
            )
            if is_prev:
                act_type = cls.classify_preventive_activity(desc_text, pr.comment_text)
                prev_breakdown[act_type]["pr"] += pr_val
                prev_breakdown[act_type]["gr"] += gr_val
                prev_breakdown[act_type]["count"] += 1
                prev_breakdown[act_type]["items"].append({
                    "no_pr": getattr(pr, "pr_doc_num", None) or getattr(pr, "requisition_id", ""),
                    "item": pr.description,
                    "user": user,
                    "pr_amount": pr_val,
                    "gr_amount": gr_val
                })

        # 3. Format and Rank Pareto by User
        all_users = set(planning_by_user.keys()).union(set(actual_by_user.keys()))
        user_list = []
        for u in all_users:
            plan = planning_by_user.get(u, 0.0)
            act_info = actual_by_user.get(u, {"pr": 0.0, "gr": 0.0, "count": 0, "oop_count": 0, "oop_nominal": 0.0})
            user_list.append({
                "name": u,
                "planning": plan,
                "planned_budget": plan,
                "actual_pr": act_info["pr"],
                "actual_gr": act_info["gr"],
                "spend": act_info["pr"],
                "variance": plan - act_info["pr"],
                "count": act_info["count"],
                "oop_count": act_info["oop_count"],
                "oop_nominal": act_info["oop_nominal"]
            })

        user_list.sort(key=lambda x: x["actual_pr"], reverse=True)
        running_user_sum = 0.0
        for u in user_list:
            running_user_sum += u["actual_pr"]
            u["cumulative_spend"] = running_user_sum
            u["share_pct"] = round((u["actual_pr"] / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0
            u["cumulative_pct"] = round((running_user_sum / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0

        # 4. Format and Rank Pareto by Item
        all_items = set(planning_by_item.keys()).union(set(actual_by_item.keys()))
        item_list = []
        for it in all_items:
            plan = planning_by_item.get(it, 0.0)
            act = actual_by_item.get(it, {
                "pr": 0.0, "gr": 0.0, "count": 0,
                "user": "QC ADMIN", "form": "Consumables", "budget_status": "ON_PLAN", "pr_count": 0
            })
            item_list.append({
                "name": it,
                "planned_budget": plan,
                "actual_pr": act["pr"],
                "actual_gr": act["gr"],
                "spend": act["pr"],
                "variance": plan - act["pr"],
                "count": act["count"],
                "user": act.get("user", "QC ADMIN"),
                "form": act.get("form", "Consumables"),
                "budget_status": act.get("budget_status", "ON_PLAN")
            })

        item_list.sort(key=lambda x: x["actual_pr"], reverse=True)
        running_item_sum = 0.0
        for it in item_list:
            running_item_sum += it["actual_pr"]
            it["cumulative_spend"] = running_item_sum
            it["share_pct"] = round((it["actual_pr"] / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0
            it["cumulative_pct"] = round((running_item_sum / total_actual_pr * 100), 2) if total_actual_pr > 0 else 0.0

        # 5. Format Preventive Breakdown
        total_prev_pr = sum(b["pr"] for b in prev_breakdown.values())
        formatted_prev_breakdown = []
        for act_name, info in prev_breakdown.items():
            formatted_prev_breakdown.append({
                "type": act_name,
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
