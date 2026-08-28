import re

# Stopwords umum pengadaan & bahasa (Indonesian & English) yang tidak memiliki nilai klasifikasi
STOPWORDS = {
    "dan", "atau", "ke", "di", "dari", "untuk", "pada", "yang", "dengan", "dg",
    "adalah", "ini", "itu", "kami", "saya", "mohon", "tolong", "terima", "kasih",
    "pt", "cv", "tbk", "corp", "inc", "co", "ltd",
    "no", "nomor", "tgl", "tanggal", "item", "barang", "po", "pr", "doc", "dokumen",
    "the", "and", "or", "to", "in", "from", "for", "on", "with", "by", "of", "at"
}

# Normalisasi singkatan pengadaan manufaktur ke bentuk baku
ABBREVIATIONS = {
    "maint": "maintenance",
    "mnt": "maintenance",
    "srvc": "service",
    "srv": "service",
    "repr": "repair",
    "rpr": "repair",
    "sp": "sparepart",
    "spare": "sparepart",
    "part": "sparepart",
    "pemb": "pembelian",
    "pengg": "penggantian",
    "perb": "perbaikan",
    "inspek": "inspeksi",
    "cal": "kalibrasi",
    "calib": "kalibrasi",
    "meas": "measurement",
    "eq": "equipment",
    "equip": "equipment",
    "mach": "machine",
    "msn": "mesin",
    "hyd": "hydraulic",
    "pneu": "pneumatic",
    "elec": "electrical",
    "elkt": "elektrik",
    "strg": "storage",
    "wh": "warehouse",
}


def clean_text(text: str, remove_stopwords: bool = True) -> str:
    """
    Membersihkan dan menormalisasi teks PR/PO untuk fitur ekstraksi NLP/TF-IDF.
    
    1. Case folding (lowercase)
    2. Pertahankan strip pada kode (misal E-1, I-1) tapi ganti karakter aneh lain
    3. Normalisasi singkatan istilah manufaktur/pengadaan
    4. Penghapusan stopwords pengadaan
    5. Normalisasi spasi
    """
    if not text:
        return ""

    text = text.lower()

    # Ubah tanda hubung antar kode atau kata agar tetap rapi
    text = re.sub(r'[^a-zA-Z0-9\s\-]', ' ', text)

    # Pisahkan kata-kata
    tokens = text.split()
    processed_tokens = []

    for token in tokens:
        # Bersihkan dash di awal/akhir token saja (misal '-mesin-' -> 'mesin')
        token = token.strip('-')
        if not token:
            continue

        # Normalisasi singkatan jika ada di kamus
        normalized = ABBREVIATIONS.get(token, token)

        # Filter stopwords jika diminta
        if remove_stopwords and normalized in STOPWORDS:
            continue

        processed_tokens.append(normalized)

    return " ".join(processed_tokens).strip()