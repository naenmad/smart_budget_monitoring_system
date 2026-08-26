# Panduan Development — Smart Budget Monitoring & QC System

> Panduan setup environment development lokal, konvensi kode, dan alur kerja pengembangan.

---

## Daftar Isi

1. [Setup Environment Lokal](#1-setup-environment-lokal)
2. [Menjalankan Aplikasi (Development)](#2-menjalankan-aplikasi-development)
3. [Struktur Kode Backend](#3-struktur-kode-backend)
4. [Struktur Kode Frontend](#4-struktur-kode-frontend)
5. [Konvensi & Best Practices](#5-konvensi--best-practices)
6. [Testing](#6-testing)
7. [Environment Variables](#7-environment-variables)
8. [Proxy Configuration](#8-proxy-configuration)

---

## 1. Setup Environment Lokal

### Prasyarat

| Software | Versi Minimum | Cek Instalasi |
|:---------|:-------------|:--------------|
| Python | 3.11+ | `python3 --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| MySQL | 8.0 | `mysql --version` |
| Git | 2.x | `git --version` |

### Setup Backend

```bash
# 1. Masuk ke direktori backend
cd backend

# 2. Buat virtual environment
python3 -m venv venv

# 3. Aktifkan virtual environment
source venv/bin/activate   # macOS/Linux
# venv\Scripts\activate    # Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Salin konfigurasi environment
cp .env.example .env
# Edit .env sesuai konfigurasi MySQL lokal Anda
```

### Setup Frontend

```bash
# 1. Masuk ke direktori frontend
cd frontend

# 2. Install dependencies
npm install
```

### Setup Database

```bash
# 1. Buat database (jika belum ada)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS smart_budget_db;"

# 2. Import schema
mysql -u root -p smart_budget_db < backend/database/schema.sql

# 3. Jalankan seeder
PYTHONPATH=backend python backend/database/seed.py
```

---

## 2. Menjalankan Aplikasi (Development)

### Backend (Terminal 1)

```bash
cd backend
source venv/bin/activate
python app.py
# Server berjalan di http://localhost:5001
```

### Frontend (Terminal 2)

```bash
cd frontend
npm run dev -- --host
# Server berjalan di http://localhost:5173
# Akses dari HP: http://<IP_LOKAL>:5173
```

### Akses Aplikasi

| URL | Keterangan |
|:----|:-----------|
| http://localhost:5173 | Frontend (development, hot-reload) |
| http://localhost:5001 | Backend Developer Portal |
| http://localhost:5001/apidocs/ | Swagger API Docs |

---

## 3. Struktur Kode Backend

### Pola MVC + Service Layer

```
backend/
├── app.py                      # Entry point, Flask app factory
├── config.py                   # Konfigurasi database & secrets
├── swagger_config.py           # OpenAPI/Swagger setup
│
├── routes/                     # 🎮 Controller Layer (HTTP handling)
│   ├── user.py                 # /api/v1/users/*
│   ├── kategori.py             # /api/v1/kategoris/*
│   ├── budget.py               # /api/v1/budgets/*
│   ├── planning_upload.py      # /api/v1/planning/*
│   ├── pr.py                   # /api/v1/pr/*
│   ├── pr_po_data.py           # /api/v1/pr-po-data/*
│   ├── classification.py       # /api/v1/classification/*
│   ├── mapping.py              # /api/v1/mapping/*
│   ├── item_mapping.py         # /api/v1/item-mappings/*
│   ├── upload.py               # /api/v1/upload/*
│   └── upload_history.py       # /api/v1/upload-histories/*
│
├── services/                   # 🧠 Business Logic Layer
│   ├── user_service.py         # Auth, CRUD users
│   ├── budget_service.py       # Budget CRUD, upload parsing
│   ├── budget_monitoring_service.py  # Realisasi vs budget calculation
│   ├── classification_service.py     # AI classification orchestrator
│   ├── pipeline_service.py     # Full pipeline (classify → map → monitor)
│   ├── planning_services.py    # Planning CRUD
│   ├── pr_po_data_service.py   # PR/PO CRUD & filtering
│   ├── upload_service.py       # File upload handling
│   ├── upload_history_service.py
│   ├── kategori_service.py
│   ├── mapping/
│   │   ├── advanced_mapping_service.py  # Rule + Fuzzy mapping
│   │   └── item_mapping_service.py      # Item mapping CRUD
│   ├── planning/               # Planning-specific services
│   └── pr/                     # PR-specific services
│
├── models/                     # 📦 Data Layer (SQLAlchemy ORM)
│   ├── user.py                 # User model
│   ├── kategori.py             # Kategori model
│   ├── budget.py               # Budget model
│   ├── planning_header.py      # Planning header model
│   ├── planning_detail.py      # Planning detail model
│   ├── pr_po_data.py           # PR/PO data model (tabel utama)
│   ├── klasifikasi_log.py      # Klasifikasi log model
│   ├── mapping_log.py          # Mapping log model
│   ├── item_mapping.py         # Item mapping model
│   ├── upload_history.py       # Upload history model
│   └── system_setting.py       # System settings model
│
├── ai/                         # 🤖 AI/ML Engine
│   ├── predict.py              # Main predictor (Rule→Regex→SVM)
│   ├── rule_base.py            # CAPEX/OPEX keyword scoring
│   ├── regex_engine.py         # Regex pattern matching
│   └── preprocess.py           # Text preprocessing
│
├── utils/                      # 🔧 Utilities
│   ├── auth.py                 # JWT token generate/decode/decorators
│   ├── db.py                   # SQLAlchemy instance
│   ├── logger.py               # Logging setup
│   └── sanitize.py             # Input sanitization
│
├── database/
│   ├── schema.sql              # DDL (11 tabel)
│   ├── seed.py                 # Seeder runner
│   └── seeders/                # Individual seeder modules
│
├── templates/
│   └── index.html              # Developer Portal landing page
│
└── tests/
    ├── test_regex_engine.py    # Unit test regex classifier
    └── test_user_service.py    # Unit test user service
```

### Membuat Route Baru

```python
# 1. Buat file routes/my_feature.py
from flask import Blueprint, jsonify, request
from utils.auth import token_required

my_feature_bp = Blueprint("my_feature", __name__)

@my_feature_bp.route("/", methods=["GET"])
@token_required
def get_items():
    """Deskripsi Endpoint
    ---
    tags:
      - My Feature
    security:
      - Bearer: []
    responses:
      200:
        description: Berhasil
    """
    # panggil service, return JSON
    return jsonify({"success": True, "data": []})
```

```python
# 2. Register di app.py
from routes.my_feature import my_feature_bp
app.register_blueprint(my_feature_bp, url_prefix="/api/v1/my-feature")
```

---

## 4. Struktur Kode Frontend

### Arsitektur Komponen

```
frontend/src/
├── App.jsx                     # Root: routing & providers
├── main.jsx                    # Entry point (ReactDOM)
├── index.css                   # Global design tokens & styles
│
├── api/                        # 🌐 API Client Modules
│   ├── api.js                  # Axios instance + interceptors
│   ├── authApi.js              # Login/logout
│   ├── budgetApi.js            # Budget endpoints
│   ├── classificationApi.js    # AI classification endpoints
│   ├── kategoriApi.js          # Kategori master data
│   ├── mappingApi.js           # Mapping endpoints
│   ├── planningApi.js          # Planning endpoints
│   ├── prApi.js                # PR pipeline endpoints
│   ├── prPoDataApi.js          # PR/PO data CRUD
│   ├── itemMappingApi.js       # Item mapping rules
│   ├── uploadHistoryApi.js     # Upload history
│   └── userApi.js              # User management
│
├── context/                    # 🔄 React Context Providers
│   ├── AuthContext.jsx         # Authentication state (token, user, role)
│   └── ThemeContext.jsx        # Dark/light theme toggle
│
├── components/                 # 🧩 Reusable UI Components
│   ├── Sidebar.jsx             # Navigation sidebar
│   ├── TopNavbar.jsx           # Top navigation bar
│   ├── AppShell.jsx            # Layout wrapper (sidebar + content)
│   ├── ProtectedRoute.jsx      # Auth & role guard
│   ├── CommandPalette.jsx      # Ctrl+K command palette
│   ├── MetricCard.jsx          # Dashboard metric cards
│   ├── BudgetCard.jsx          # Budget summary card
│   ├── BudgetChart.jsx         # Recharts budget visualization
│   ├── MonthlyPipelineChart.jsx# Monthly pipeline bar chart
│   ├── DetailModal.jsx         # PR/PO detail modal
│   ├── ReviewModal.jsx         # Manual review modal
│   ├── PrStatusModal.jsx       # PR status detail
│   ├── PrTrackingModal.jsx     # PR tracking timeline
│   ├── ChangePasswordModal.jsx # Password change form
│   ├── AlertBanner.jsx         # Alert notification banner
│   ├── FormTable.jsx           # Reusable form table
│   ├── Tabs.jsx                # Tab navigation
│   ├── SwitchComponent.jsx     # Toggle switch
│   └── Footer.jsx              # Page footer
│
└── pages/                      # 📄 Page-Level Components
    ├── Login.jsx               # Login page
    ├── Dashboard.jsx           # Main dashboard
    ├── Budget.jsx              # Budget management
    ├── Classification.jsx      # AI classification data view
    ├── Predict.jsx             # Manual AI prediction
    ├── Users.jsx               # User management (admin)
    ├── ItemMapping.jsx         # Item mapping rules
    ├── PlanningUpload.jsx      # Upload planning file
    ├── PlanningList.jsx        # Planning list view
    ├── PrUpload.jsx            # Upload PR/PO file
    ├── PrHistory.jsx           # PR upload history
    ├── PrResult.jsx            # PR processing results
    └── MappingReview.jsx       # Mapping review & assignment
```

### Styling: CSS Modules

Setiap komponen dan halaman memiliki file `.module.css` tersendiri:
```
Login.jsx          → Login.module.css
Dashboard.jsx      → Dashboard.module.css
Sidebar.jsx        → Sidebar.module.css
```

Import di komponen:
```jsx
import styles from './MyComponent.module.css'

function MyComponent() {
  return <div className={styles.container}>...</div>
}
```

### Routing & Access Control

Didefinisikan di `App.jsx`:

| Path | Komponen | Role |
|:-----|:---------|:-----|
| `/login` | Login | Public |
| `/dashboard` | Dashboard | All authenticated |
| `/predict` | Predict | Admin only |
| `/budget` | Budget | Admin only |
| `/classification` | Classification | All authenticated |
| `/users` | Users | Admin only |
| `/master/item-mapping` | ItemMapping | Admin only |
| `/planning/upload` | PlanningUpload | Admin only |
| `/planning/list` | PlanningList | All authenticated |
| `/pr/upload` | PrUpload | Admin only |
| `/pr/history` | PrHistory | All authenticated |
| `/pr/result` | PrResult | All authenticated |
| `/pr/mapping-review` | MappingReview | All authenticated |

---

## 5. Konvensi & Best Practices

### Backend

- **Naming**: snake_case untuk file, variabel, dan fungsi Python
- **Blueprint**: Satu file route per domain (user, budget, pr, dll.)
- **Service Layer**: Semua logika bisnis di `services/`, bukan di routes
- **Auth Decorator**: Gunakan `@token_required` atau `@role_required('admin')`
- **Swagger Docstring**: Setiap endpoint wajib memiliki docstring OpenAPI
- **Error Handling**: Return `{"success": false, "message": "..."}` + HTTP status code
- **Database**: Gunakan SQLAlchemy ORM, hindari raw SQL kecuali reporting

### Frontend

- **Naming**: PascalCase untuk komponen React, camelCase untuk variabel/fungsi
- **Styling**: CSS Modules (bukan inline styles atau global class)
- **State**: React Query untuk server state, Context untuk client state (auth, theme)
- **API Calls**: Melalui modul di `src/api/`, bukan langsung `axios.get()`
- **Icons**: Gunakan `lucide-react` (konsisten satu library)
- **Notifications**: Gunakan `react-hot-toast`

---

## 6. Testing

### Backend Unit Tests

```bash
# Jalankan semua test
PYTHONPATH=backend pytest backend/tests -v

# Jalankan test spesifik
PYTHONPATH=backend pytest backend/tests/test_regex_engine.py -v

# Dengan coverage
PYTHONPATH=backend pytest backend/tests --cov=backend -v
```

### Frontend Build Validation

```bash
# Lint check
npm --prefix frontend run lint

# Production build (validates compilation)
npm --prefix frontend run build
```

### Python Syntax Check

```bash
python3 -m py_compile backend/app.py
python3 -m py_compile backend/swagger_config.py
```

---

## 7. Environment Variables

### Backend (`backend/.env`)

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_budget_db
SECRET_KEY=smart-budget-secret-key-development
JWT_SECRET_KEY=smart-budget-jwt-secret-key-development
```

### Frontend (opsional)

```env
VITE_API_URL=/api/v1       # Override API base URL (default: /api/v1)
```

---

## 8. Proxy Configuration

### Development (Vite Dev Server)

File `frontend/vite.config.js` mengatur proxy ke backend:

```js
server: {
  proxy: {
    '/api':              { target: 'http://localhost:5001' },
    '/apidocs':          { target: 'http://localhost:5001' },
    '/apispec_1.json':   { target: 'http://localhost:5001' },
    '/flasgger_static':  { target: 'http://localhost:5001' },
    '/docs':             { target: 'http://localhost:5001' },
  }
}
```

### Production (Docker Nginx)

File `frontend/nginx.conf` mengatur reverse proxy:

```nginx
location /api/ {
    proxy_pass http://backend:5001/api/;
}
location /apidocs/ {
    proxy_pass http://backend:5001/apidocs/;
}
```

> **Catatan**: Di production (Docker), hostname `backend` di-resolve oleh Docker DNS internal melalui jaringan `sbms-network`.
