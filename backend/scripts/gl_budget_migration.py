        print("4. Inserting Master Budgets for 2026 (Finance Budget - Cost Control FA)...")
        sheet_kode = wb["Plan vs Actual (Kode)"]
        budget_totals = {}
        for r in range(5, sheet_kode.max_row + 1):
            kode = sheet_kode.cell(r, 1).value
            bulan_no = sheet_kode.cell(r, 5).value or 0
            plan = sheet_kode.cell(r, 6).value or 0
            act = sheet_kode.cell(r, 7).value or 0
            # Note 2: Budget Control (FA) Jan-Mar (months 1-3) = actual, Apr-Des (months 4-12) = plan
            fa_val = act if bulan_no in [1, 2, 3] else plan
            if kode:
                budget_totals[kode] = budget_totals.get(kode, 0) + fa_val

        for kode, nominal in budget_totals.items():
            if kode in kat_id_map:
                cur.execute(
                    """
                    INSERT INTO budget (kategori_id, periode, nominal, created_by, upload_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, NOW(), NOW());
                    """,
                    (kat_id_map[kode], "2026", Decimal(str(nominal)), 1, upload_id)
                )
        print(f"   Inserted {len(budget_totals)} master budget entries. Total FA Budget: Rp {sum(budget_totals.values()):,.2f}")
