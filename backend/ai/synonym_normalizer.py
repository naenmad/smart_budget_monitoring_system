import re


class SynonymNormalizer:
    """
    Modul normalisasi kamus teknis industri otomotif, perkakas bengkel/QC, 
    alat ukur/kalibrasi, dan bahan operasional.
    Mendukung penyeragaman singkatan dan konsep bilingual (ID <-> EN).
    """

    # Singkatan pengadaan umum -> Istilah baku
    ABBREVIATIONS = {
        r'\bclnr\b': 'cleaner',
        r'\bcln\b': 'clean',
        r'\blub\b': 'lubricant',
        r'\boil\b': 'pelumas oli',
        r'\bcal\b': 'kalibrasi',
        r'\bcalib\b': 'kalibrasi',
        r'\bprev\b': 'preventive',
        r'\bmaint\b': 'maintenance',
        r'\bsrv\b': 'service',
        r'\bops\b': 'operasional',
        r'\bop\b': 'operasional',
        r'\bpcs\b': '',
        r'\bset\b': '',
        r'\bbtl\b': 'botol',
        r'\bcan\b': 'kaleng',
        r'\bpck\b': 'pack',
        r'\bpkg\b': 'package',
        r'\bdr\b': 'diameter',
        r'\bdia\b': 'diameter',
        r'\bhex\b': 'baut hex',
        r'\bblt\b': 'bolt baut',
        r'\bstr\b': 'straight',
        r'\bwd40\b': 'wd-40 pelumas cairan penetran',
        r'\bwd-40\b': 'wd-40 pelumas cairan penetran',
        r'\bmeas\b': 'ukur'
    }

    # Konsep ekuivalen (Bilingual & Domain Synonyms)
    # Format: Kata/Frasa -> Konsep Kanonikal yang memperkaya pencarian
    EQUIVALENCES = [
        # Kebersihan & Chemical
        (r'\b(floor cleaner|pembersih lantai|karbol|pembersih keramik)\b', 'pembersih lantai floor cleaner'),
        (r'\b(hand soap|sabun cuci tangan|sabun tangan)\b', 'sabun tangan hand soap'),
        (r'\b(dish soap|sabun cuci piring|sunlight)\b', 'sabun piring dish soap'),
        (r'\b(contact cleaner|pembersih kontak elektronik)\b', 'contact cleaner pembersih kontak'),
        (r'\b(brake cleaner|pembersih rem)\b', 'brake cleaner pembersih rem'),
        (r'\b(degreaser|pembersih minyak gemuk)\b', 'degreaser pembersih gemuk'),
        (r'\b(lubricant|pelumas|pelumas semprot|grease|gemuk)\b', 'pelumas lubricant grease gemuk'),
        (r'\b(cable tie|kabel tis|tali tis|zip tie)\b', 'kabel tis cable tie zip tie'),
        (r'\b(tissue|tisu|paper towel)\b', 'tisu tissue paper'),

        # Alat Tulis & Kantor (ATK)
        (r'\b(staple remover|pencabut isi staples|pencabut staples|alat pelepas staples)\b', 'pencabut isi staples staple remover'),
        (r'\b(stapler|staples|stepler|isi staples)\b', 'stapler staples isi stepler'),
        (r'\b(cutter|pisau cutter|utility knife)\b', 'cutter pisau pisau pemotong'),
        (r'\b(scissors|gunting)\b', 'gunting scissors'),
        (r'\b(ballpoint|pulpen|bolpoin|pen)\b', 'pulpen ballpoint pen'),
        (r'\b(marker|spidol|whiteboard marker|permanent marker)\b', 'spidol marker pen'),
        (r'\b(glue|lem|perekat|double tape|isolasi)\b', 'lem perekat tape adhesive'),
        (r'\b(paper|kertas|hvs|kertas a4|kertas f4)\b', 'kertas paper hvs'),
        (r'\b(binder|map|ordner|folder)\b', 'binder map ordner folder file'),

        # Alat Ukur & Kalibrasi (QC / Metrologi)
        (r'\b(caliper|jangka sorong|sketmat|vernier caliper|digital caliper)\b', 'jangka sorong caliper vernier sketmat'),
        (r'\b(micrometer|mikrometer|outside micrometer|inside micrometer)\b', 'mikrometer micrometer'),
        (r'\b(dial gauge|dial indicator|indikator dial)\b', 'dial gauge indicator ukur'),
        (r'\b(height gauge|alat ukur tinggi)\b', 'height gauge alat ukur tinggi'),
        (r'\b(ruler|penggaris|mistar|steel ruler)\b', 'penggaris mistar ruler'),
        (r'\b(measuring tape|meteran|pita ukur)\b', 'meteran pita ukur measuring tape'),
        (r'\b(torque wrench|kunci torsi|tork)\b', 'kunci torsi torque wrench'),
        (r'\b(block gauge|gauge block)\b', 'block gauge alat kalibrasi'),
        (r'\b(pin gauge|gauge pin)\b', 'pin gauge alat ukur presisi'),
        (r'\b(thermometer|termometer|temperature gauge)\b', 'termometer thermometer suhu'),
        (r'\b(scale|timbangan|timbangan digital|weight scale)\b', 'timbangan scale weight'),

        # Workshop, Safety, & Maintenance
        (r'\b(safety shoes|sepatu safety|sepatu keselamatan)\b', 'sepatu safety shoes keselamatan'),
        (r'\b(gloves|sarung tangan|cotton gloves|nitrile gloves|latex gloves)\b', 'sarung tangan gloves safety'),
        (r'\b(mask|masker|respirator)\b', 'masker mask respirator'),
        (r'\b(safety glasses|kacamata safety|goggles)\b', 'kacamata safety glasses goggles'),
        (r'\b(helmet|helm safety)\b', 'helm safety helmet'),
        (r'\b(grinding wheel|batu gerinda|mata gerinda|amplas)\b', 'batu gerinda mata grinding wheel abrasive'),
        (r'\b(drill bit|mata bor)\b', 'mata bor drill bit'),
        (r'\b(wrench|kunci pas|kunci ring|spanner)\b', 'kunci pas kunci ring wrench spanner'),
        (r'\b(screwdriver|obeng|obeng plus|obeng minus)\b', 'obeng screwdriver tool'),
        (r'\b(hex key|kunci l|allen key)\b', 'kunci l allen key hex wrench'),
        (r'\b(battery|baterai|batre|accu|aki)\b', 'baterai battery accu aki power'),
        (r'\b(preventive|perawatan berkala|servis berkala|pemeliharaan)\b', 'preventive maintenance perawatan berkala servis')
    ]

    @classmethod
    def normalize_text(cls, text: str) -> str:
        """
        Membersihkan teks, mengekspansi singkatan, dan menyertakan konsep sinonim.
        """
        if not text:
            return ""

        result = text.lower()

        # 1. Bersihkan tanda baca yang tidak penting
        result = re.sub(r"['\"`\(\)\[\]\{\}]", " ", result)
        result = re.sub(r"[-_/\\,;:]+", " ", result)
        result = re.sub(r"\s+", " ", result).strip()

        # 2. Ekspansi konsep sinonim (Frasa multi-kata terlebih dahulu)
        for pattern, canonical in cls.EQUIVALENCES:
            if re.search(pattern, result, re.IGNORECASE):
                result = re.sub(pattern, canonical, result, flags=re.IGNORECASE)

        # 3. Ekspansi singkatan teknis / kata tunggal
        for pattern, repl in cls.ABBREVIATIONS.items():
            result = re.sub(pattern, repl, result, flags=re.IGNORECASE)

        # 4. Final cleaning
        result = re.sub(r"\s+", " ", result).strip()
        return result
