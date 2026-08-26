# Arsitektur Sistem — Smart Budget Monitoring & QC System

> PT Summit Adyawinsa Indonesia (SAI) — Internal Tool  
> Versi Dokumen: 1.0 · Terakhir diperbarui: Agustus 2026

---

## 1. Ringkasan Sistem

**Smart Budget Monitoring & QC System** adalah aplikasi web full-stack internal
untuk memonitor realisasi anggaran (budget) departemen QC PT SAI, mengklasifikasi
dokumen Purchase Request / Purchase Order (PR/PO) secara otomatis menggunakan
AI/ML, dan melacak alur procurement dari PR → PO → Goods Received → Invoice.

---

## 2. Diagram Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PENGGUNA (BROWSER)                         │
│               React SPA (Vite + React 19 + Recharts)              │
└────────────────┬──────────────────────────────────┬─────────────────┘
                 │ HTTP/REST (Axios)                │ Swagger UI
                 ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API GATEWAY (Flask)                     │
│                     Port 5001 · Gunicorn (Prod)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │   Routes     │  │  Services    │  │  AI Engine               │  │
│  │ (Blueprint)  │→ │ (Business    │→ │ ┌─────────┐ ┌─────────┐ │  │
│  │              │  │  Logic)      │  │ │Regex/   │→│  SVM    │ │  │
│  │ 11 modules   │  │              │  │ │Rule Base│ │(TF-IDF) │ │  │
│  └─────────────┘  └──────────────┘  │ └─────────┘ └─────────┘ │  │
│                                      └──────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ SQLAlchemy ORM
                                 ▼
                  ┌──────────────────────────────┐
                  │       MySQL 8.0 Database     │
                  │       smart_budget_db         │
                  │       11 Tabel Relasional     │
                  └──────────────────────────────┘
```

---

## 3. Technology Stack

### Backend (Python 3.11)

| Komponen | Library | Versi | Fungsi |
|:---------|:--------|:------|:-------|
| Web Framework | Flask | 3.1.3 | REST API server |
| ORM | SQLAlchemy | 2.0.51 | Object-Relational Mapping |
| Migration | Flask-Migrate (Alembic) | 4.1.0 | Schema migration |
| CORS | Flask-CORS | 6.0.5 | Cross-Origin support |
| Auth | PyJWT | 2.13.0 | JSON Web Token |
| Database Driver | PyMySQL | 1.2.0 | MySQL connector |
| ML / AI | scikit-learn | ≥1.3.0 | SVM classifier (TF-IDF) |
| Fuzzy Matching | rapidfuzz | ≥3.0.0 | Item-to-planning mapping |
| Data Processing | pandas + openpyxl | ≥2.0 | Excel file parsing |
| API Docs | Flasgger | ≥0.9.7.1 | Swagger/OpenAPI 2.0 auto-docs |
| WSGI Server | Gunicorn | ≥21.2.0 | Production multi-worker server |

### Frontend (Node.js 20)

| Komponen | Library | Versi | Fungsi |
|:---------|:--------|:------|:-------|
| UI Framework | React | 19.2.6 | Component-based UI |
| Build Tool | Vite | 8.0.12 | Dev server & bundler |
| Routing | react-router-dom | 7.15.1 | SPA client-side routing |
| State / Cache | @tanstack/react-query | 5.101.4 | Server state management |
| HTTP Client | Axios | 1.16.1 | REST API calls |
| Charts | Recharts | 3.8.1 | Data visualization |
| Icons | lucide-react | 1.16.0 | Icon library |
| Notifications | react-hot-toast | 2.6.0 | Toast notifications |
| PDF Export | jsPDF + jspdf-autotable | 4.2.1 | Report export |
| Excel Export | xlsx (SheetJS) | 0.18.5 | Spreadsheet export |
| Styling | CSS Modules | — | Scoped component styling |

### Infrastructure

| Komponen | Teknologi | Keterangan |
|:---------|:----------|:-----------|
| Database | MySQL 8.0 | Via Docker atau Homebrew |
| Web Server (Prod) | Nginx Alpine | Reverse proxy & SPA serving |
| Containerization | Docker Compose | 4-container orchestration |
| DB Admin | phpMyAdmin | Web-based MySQL GUI |

---

## 4. Pola Arsitektur: MVC + Service Layer

```
Request → Route (Controller) → Service (Business Logic) → Model (ORM) → Database
                                     ↓
                              AI Engine (jika klasifikasi)
```

### Layer

| Layer | Lokasi | Tanggung Jawab |
|:------|:-------|:---------------|
| **Routes** (Controller) | `backend/routes/*.py` | Menerima HTTP request, validasi input, memanggil service, mengembalikan JSON response |
| **Services** (Business Logic) | `backend/services/*.py` | Logika bisnis murni, pipeline processing, tidak tahu soal HTTP |
| **Models** (ORM) | `backend/models/*.py` | Definisi tabel database, relasi antar-entitas |
| **AI Engine** | `backend/ai/*.py` | Pipeline klasifikasi 3-layer (Rule Base → Regex → SVM) |
| **Utils** | `backend/utils/*.py` | Cross-cutting concerns: auth JWT, logging, sanitization |

---

## 5. AI Classification Pipeline

Sistem mengklasifikasi setiap item PR/PO ke dalam kategori budget melalui 3 layer berurutan:

```
┌──────────────────────┐
│  INPUT: Deskripsi PR  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐     Hit?     ┌────────────────┐
│ Layer 1: Rule Base   │ ──────Yes──→ │ Return kategori │
│ (Exact keyword match)│              └────────────────┘
└──────────┬───────────┘
           │ No
           ▼
┌──────────────────────┐     Hit?     ┌────────────────┐
│ Layer 2: Regex Engine│ ──────Yes──→ │ Return kategori │
│ (Pattern matching)   │              └────────────────┘
└──────────┬───────────┘
           │ No
           ▼
┌──────────────────────┐  Confidence  ┌────────────────┐
│ Layer 3: SVM Model   │ ──≥ 0.70──→ │ Return kategori │
│ (TF-IDF vectorizer)  │              └────────────────┘
└──────────┬───────────┘
           │ < 0.70
           ▼
┌──────────────────────┐
│  UNKNOWN / Low Conf. │
│  → Manual Review     │
└──────────────────────┘
```

### Detail Layer

1. **Rule Base** (`ai/rule_base.py`) — Keyword CAPEX vs OPEX scoring
2. **Regex Engine** (`ai/regex_engine.py`) — Pattern matching untuk kode kategori (E-1, E-9, I-1) dan inventory keywords
3. **SVM Model** (`ai/predict.py`) — Machine learning classifier dengan TF-IDF vectorizer, threshold confidence 0.70

---

## 6. Full Pipeline Processing

Setiap PR/PO yang di-upload melewati pipeline lengkap:

```
Upload Excel → Parse → Simpan ke DB (status: WAITING)
     ↓
Classification Pipeline (3-layer AI)
     ↓
Item Mapping (Rule → Fuzzy Match ke Planning Detail)
     ↓
Budget Monitoring (hitung realisasi vs budget)
     ↓
Status: ON_PLAN / OVER_PLAN / UNDER_PLAN / OOP
```

---

## 7. Skema Database (ERD Ringkas)

```
users ─────────────────────── 1:N ──→ upload_history
  │                                        │
  │                                        │ 1:N
  │                                        ▼
  │                                   pr_po_data ←── N:1 ── kategori
  │                                     │    │                  │
  │                                     │    │                  │ 1:N
  │                                     │    │                  ▼
  │                                     │    └── N:1 ──→ budget
  │                                     │
  │                                     ├── 1:N ──→ klasifikasi_log
  │                                     ├── 1:N ──→ mapping_log
  │                                     └── N:1 ──→ planning_detail
  │                                                      │
  │                                                      │ N:1
  │                                                      ▼
  └── 1:N ──→ planning_header ──── 1:N ──→ planning_detail
                                                │
                                        item_mapping ←── N:1 ── kategori
```

### Tabel Utama

| Tabel | Deskripsi | Kolom Kunci |
|:------|:----------|:------------|
| `users` | Akun pengguna (admin/manager) | username, password (hashed), role |
| `kategori` | Master kategori budget | kode (E-1, E-9, I-1), tipe_formulir (CAPEX/OPEX) |
| `budget` | Nominal anggaran per kategori per periode | kategori_id, periode, nominal |
| `planning_header` | Header upload file planning | periode, filename, status |
| `planning_detail` | Detail item planning per bulan | item, planning_amount, month, status_realisasi |
| `pr_po_data` | Data PR/PO hasil upload & klasifikasi | description, status_ai, metode_klasifikasi, budget_status |
| `klasifikasi_log` | Log hasil klasifikasi AI tiap layer | layer, method, confidence_score |
| `mapping_log` | Log hasil mapping ke planning item | method, confidence_score, is_selected |
| `item_mapping` | Aturan mapping keyword → planning item | keyword, planning_item, priority |
| `upload_history` | Riwayat upload file Excel | original_filename, total_data, status |
| `system_settings` | Konfigurasi threshold & parameter | — |

---

## 8. Struktur Direktori Proyek

```
smart_budget_monitoring_system/
├── backend/                    # Flask REST API
│   ├── ai/                     # AI/ML engine
│   │   ├── predict.py          # Orchestrator klasifikasi (Rule→Regex→SVM)
│   │   ├── rule_base.py        # Layer 1 & 2: CAPEX/OPEX keyword detection
│   │   ├── regex_engine.py     # Layer 2: Regex pattern matching
│   │   └── preprocess.py       # Text preprocessing (clean_text)
│   ├── config.py               # Database URI & Flask config
│   ├── database/
│   │   ├── schema.sql          # DDL lengkap (11 tabel)
│   │   ├── seed.py             # Seeder runner
│   │   └── seeders/            # Individual seeder modules
│   ├── models/                 # SQLAlchemy ORM models (11 model)
│   ├── routes/                 # Flask Blueprint routes (11 modul)
│   ├── services/               # Business logic layer
│   │   ├── pipeline_service.py # Full pipeline orchestrator
│   │   ├── classification_service.py
│   │   ├── mapping/            # Item mapping services
│   │   ├── budget_service.py
│   │   └── ...
│   ├── utils/                  # Auth (JWT), logging, sanitization
│   ├── swagger_config.py       # OpenAPI/Swagger configuration
│   ├── templates/index.html    # Developer Portal landing page
│   ├── Dockerfile              # Production container (Gunicorn)
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React SPA (Vite)
│   ├── src/
│   │   ├── api/                # Axios API modules (12 modul)
│   │   ├── components/         # Reusable UI components (19 komponen)
│   │   ├── context/            # React Context (Auth, Theme)
│   │   ├── pages/              # Page-level components (13 halaman)
│   │   ├── App.jsx             # Root component & routing
│   │   └── index.css           # Global design tokens & styles
│   ├── nginx.conf              # Production Nginx config
│   ├── Dockerfile              # Multi-stage build container
│   └── package.json            # Node.js dependencies
│
├── docker-compose.yml          # 4-container orchestration
├── docs/                       # 📂 Dokumentasi terpusat (dokumen ini)
├── README.md                   # Quick-start guide
└── TODO.md                     # Task tracker
```

---

## 9. Keamanan

| Mekanisme | Implementasi |
|:----------|:-------------|
| **Autentikasi** | JWT (HS256), token berlaku 8 jam |
| **Otorisasi** | Role-based: `admin`, `manager` |
| **Password** | Werkzeug `generate_password_hash` (PBKDF2-SHA256) |
| **CORS** | Flask-CORS wildcard (internal network) |
| **Environment** | Secrets di `.env`, tidak di-commit ke Git |
| **Interceptor** | Axios auto-logout jika 401 Unauthorized |

---

## 10. Deployment Modes

| Mode | Cara Jalankan | Kegunaan |
|:-----|:-------------|:---------|
| **Local Development** | `npm run dev` + `python app.py` | Development & debugging |
| **Docker Compose** | `docker compose up -d` | Staging & production |
| **Cloud (Render/Railway)** | `Procfile` + `render.yaml` | Cloud deployment |
