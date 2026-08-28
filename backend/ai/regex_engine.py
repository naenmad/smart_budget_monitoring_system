import re

# Keyword eksplisit untuk Inventory / CAPEX / Tools & Instruments (I-1)
INVENTORY_KEYWORDS = [
    r"\bKUNCI\s+L\b",
    r"\bKUNCI\s+SHOCK\b",
    r"\bKUNCI\s+RING\b",
    r"\bKUNCI\s+PAS\b",
    r"\bTOOLBOX\b",
    r"\bTOOL\s+SET\b",
    r"\bTOOL\s+BOX\b",
    r"\bPEMOTONG\s+KERTAS\b",
    r"\bVERNIER\s+CALIPER\b",
    r"\bCALIPER\b",
    r"\bDIAL\s+INDICATOR\b",
    r"\bMICROMETER\b",
    r"\bHEIGHT\s+GAUGE\b",
    r"\bPIN\s+GAUGE\b",
    r"\bBLOCK\s+GAUGE\b",
    r"\bTORQUE\s+WRENCH\b",
    r"\bMULTIMETER\b",
    r"\bROUGHNESS\s+TESTER\b",
    r"\bTHICKNESS\s+GAUGE\b",
    r"\bBENCH\s+VISE\b",
    r"\bRAGUM\b",
    r"\bCRIMPING\s+TOOL\b",
]

# Keyword indikator jasa atau perbaikan yang mengubah status item menjadi E-1 (Maintenance/Repair)
REPAIR_INDICATORS = [
    r"\bREPAIR\b",
    r"\bSERVICE\b",
    r"\bSERVIS\b",
    r"\bPERBAIKAN\b",
    r"\bBENERIN\b",
    r"\bMAINTENANCE\b",
    r"\bOVERHAUL\b",
    r"\bKALIBRASI\b",
    r"\bCALIBRATION\b",
    r"\bREKONDISI\b",
    r"\bBUBUT\b",
    r"\bMILLING\b",
    r"\bREWINDING\b",
]

# Keyword indikator consumable / habis pakai (E-9)
CONSUMABLE_KEYWORDS = [
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
]


def regex_predict(text: str):
    """
    Layer 1: Pattern Matching Berbasis Regex
    Mengidentifikasi kode kategori langsung atau istilah deterministik.
    """
    if not text:
        return None

    text_up = text.upper()

    # 1. Exact Category Code Mentions
    if re.search(r'\bI[- ]?1\b', text_up):
        return "I-1"
    if re.search(r'\bE[- ]?1\b', text_up):
        return "E-1"
    if re.search(r'\bE[- ]?9\b', text_up):
        return "E-9"

    # 2. Cek apakah ada indikasi jasa perbaikan / maintenance / overhaul (Prioritas Tertinggi -> E-1)
    is_repair = any(re.search(p, text_up) for p in REPAIR_INDICATORS)
    if is_repair:
        return "E-1"

    # 3. Cek apakah barang consumable / safety / tooling habis pakai (E-9)
    for pattern in CONSUMABLE_KEYWORDS:
        if re.search(pattern, text_up):
            return "E-9"

    # 4. Cek apakah alat inventaris / alat ukur / peralatan tetap (I-1)
    for pattern in INVENTORY_KEYWORDS:
        if re.search(pattern, text_up):
            return "I-1"

    return None