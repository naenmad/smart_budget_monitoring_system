import re

CAPEX_RULES = [
    r"\bNEW\s+MACHINE\b",
    r"\bNEW\s+EQUIPMENT\b",
    r"\bINVESTMENT\b",
    r"\bINVESTASI\b",
    r"\bINSTALLATION\b",
    r"\bINSTALASI\b",
    r"\bPURCHASE\b",
    r"\bPROJECT\b",
    r"\bPROYEK\b",
    r"\bASSET\b",
    r"\bASET\b",
    r"\bMESIN\s+BARU\b",
    r"\bALAT\s+BARU\b",
    r"\bPEMBELIAN\s+MESIN\b",
    r"\bBELI\s+MESIN\b",
    r"\bMESIN\s+PRESS\b",
    r"\bMESIN\s+LAS\b",
    r"\bROBOT\s+BARU\b",
]

OPEX_RULES = [
    r"\bMAINTENANCE\b",
    r"\bPERAWATAN\b",
    r"\bREPAIR\b",
    r"\bPERBAIKAN\b",
    r"\bSERVIS\b",
    r"\bSERVICE\b",
    r"\bSPARE\s*PARTS?\b",
    r"\bSUKU\s*CADANG\b",
    r"\bCONSUMABLE\b",
    r"\bHABIS\s*PAKAI\b",
]


def detect_budget_type(text: str):
    """
    Layer 2 — fallback kalau Layer 1 (regex_predict) gagal menentukan form kode.
    Menentukan apakah item masuk form CAPEX atau OPEX berbasis keyword bilingual.
    """
    if not text:
        return None

    text_up = text.upper()

    capex_score = sum(1 for r in CAPEX_RULES if re.search(r, text_up))
    opex_score = sum(1 for r in OPEX_RULES if re.search(r, text_up))

    if capex_score > opex_score:
        return "CAPEX"
    if opex_score > capex_score:
        return "OPEX"

    return None  # skor sama atau 0 -> lanjut ke Layer 3 (SVM)