import re

# Keyword untuk Transportasi & Perjalanan Dinas QC (60290500-123200)
TRANSPORT_KEYWORDS = [
    r"\bBBM\b",
    r"\bBENSIN\b",
    r"\bSOLAR\b",
    r"\bPERTAMAX\b",
    r"\bTOL\b",
    r"\bPARKIR\b",
    r"\bTRANSPORT\b",
    r"\bTRANSPORTASI\b",
    r"\bTRAVEL\b",
    r"\bTIKET\b",
    r"\bSEWA\s+MOBIL\b",
]

# Keyword untuk Pemeliharaan / Perbaikan Mesin QC (50032802-123200)
REPAIR_KEYWORDS = [
    r"\bREPAIR\b",
    r"\bSERVICE\s+MESIN\b",
    r"\bPERBAIKAN\s+MESIN\b",
    r"\bOVERHAUL\b",
    r"\bMAINTENANCE\s+PLANT\b",
    r"\bSPAREPART\s+MESIN\b",
]

# Keyword untuk ATK / Stationary (60290800-123200)
STATIONARY_KEYWORDS = [
    r"\bATK\b",
    r"\bSTATIONARY\b",
    r"\bKERTAS\s+A4\b",
    r"\bKERTAS\s+HVS\b",
    r"\bBALLPOINT\b",
    r"\bBULPEN\b",
    r"\bTONER\b",
    r"\bTINTA\s+PRINTER\b",
    r"\bMAP\s+FOLDER\b",
]

# Keyword untuk Perlengkapan Kerja & Consumable QC (50032902-123200)
SUPPLIES_QC_KEYWORDS = [
    r"\bSARUNG\s+TANGAN\b",
    r"\bSAFETY\s+GLOVES?\b",
    r"\bMASKER\b",
    r"\bBATU\s+GERINDA\b",
    r"\bAMPLAS\b",
    r"\bMATA\s+BOR\b",
    r"\bCUTTING\s+TOOL\b",
    r"\bSEPATU\s+SAFETY\b",
    r"\bSAFETY\s+SHOES?\b",
    r"\bKACAMATA\s+SAFETY\b",
    r"\bEARPLUG\b",
    r"\bBUBBLE\s+WRAP\b",
    r"\bLABEL\s+STIKER\b",
    r"\bKERTAS\s+THERMAL\b",
    r"\bKAIN\s+MAJUN\b",
    r"\bREFILL\s+BLADE\b",
    r"\bPISAU\s+CUTTER\b",
    r"\bKABEL\s+TIES\b",
    r"\bISOLASI\b",
    r"\bLAKBAN\b",
    r"\bSEALANT\b",
    r"\bWD40\b",
    r"\bKALIBRASI\b",
    r"\bCALIBRATION\b",
    r"\bPREVENTIVE\b",
]

def regex_predict(text: str):
    """
    Layer 1: Pattern Matching Berbasis Regex untuk Akun GL & Cost Center.
    """
    if not text:
        return None

    text_up = text.upper()

    # 1. Exact GL Account mentions di teks
    if "50032902" in text_up:
        return "50032902-123000" if "123000" in text_up or "GNRL" in text_up else "50032902-123200"
    if "60290500" in text_up:
        return "60290500-123000" if "123000" in text_up or "GNRL" in text_up else "60290500-123200"
    if "60290100" in text_up:
        return "60290100-123000" if "123000" in text_up or "GNRL" in text_up else "60290100-123200"
    if "50032802" in text_up:
        return "50032802-123200"
    if "60290800" in text_up:
        return "60290800-123000" if "123000" in text_up or "GNRL" in text_up else "60290800-123200"
    if "60291100" in text_up:
        return "60291100-123000"

    # 2. Match Transport & Local Travel
    if any(re.search(p, text_up) for p in TRANSPORT_KEYWORDS):
        return "60290500-123000" if "GNRL" in text_up else "60290500-123200"

    # 3. Match ATK / Stationary
    if any(re.search(p, text_up) for p in STATIONARY_KEYWORDS):
        return "60290800-123000" if "GNRL" in text_up else "60290800-123200"

    # 4. Match Repair & Maintenance Mesin QC
    if any(re.search(p, text_up) for p in REPAIR_KEYWORDS):
        return "50032802-123200"

    # 5. Match Supplies & Consumables QC
    if any(re.search(p, text_up) for p in SUPPLIES_QC_KEYWORDS):
        return "50032902-123200"

    return None