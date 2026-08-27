# 🏭 Smart Budget Monitoring & QC System
**PT Summit Adyawinsa Indonesia (SAI)**

Sistem monitoring anggaran belanja (CAPEX/OPEX) berbasis AI untuk unit Purchasing & Quality Control. Sistem ini mengotomatisasi klasifikasi Purchase Requisition (PR) menggunakan model SVM + Regex Engine, serta menyediakan dashboard monitoring realisasi budget real-time.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────┐
│        Browser (Pengguna)               │
└──────────────────┬──────────────────────┘
                   │ Port 80
┌──────────────────▼──────────────────────┐
│  Frontend Container (Nginx)             │
│  - React 19 + Vite (Static)             │
│  - Proxy /api/* → backend:5001          │
└──────────────────┬──────────────────────┘
                   │ Internal Network
┌──────────────────▼──────────────────────┐
│  Backend Container (Flask + Gunicorn)   │
│  - REST API di port 5001                │
│  - AI Classifier (SVM + Regex)          │
│  - Uploads file parsing                 │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  MySQL Container (Port 3306)            │
│  - Database: smart_budget_db            │
│  - Schema otomatis diinisialisasi       │
└─────────────────────────────────────────┘
```

**Port yang digunakan:**
| Service | Port | Keterangan |
|---|---|---|
| Frontend (Nginx) | **80** | Aplikasi web utama |
| Backend (Flask) | **5001** | REST API (internal) |
| MySQL | **3306** | Database (internal) |
| phpMyAdmin | **8080** | Database UI (opsional) |

---

## ⚙️ Prasyarat

Pastikan server sudah terinstall:
- **Docker** ≥ 24.0 → [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** ≥ 2.20 → sudah termasuk dalam Docker Desktop

```bash
# Verifikasi instalasi
docker --version
docker compose version
```

---

## 🚀 Cara Deploy (Production)

### Langkah 1 — Clone Repository

```bash
git clone <URL_REPOSITORY_INI>
cd smart_budget_monitoring_system
```

### Langkah 2 — Konfigurasi Environment

```bash
# Salin template environment variables
cp .env.example .env
```

Buka file `.env` dan **wajib ganti** nilai berikut:

```env
DB_PASSWORD=password_database_yang_kuat
SECRET_KEY=string_acak_minimal_32_karakter
JWT_SECRET_KEY=string_acak_lain_minimal_32_karakter
```

> 💡 **Generate key aman:** `python -c "import secrets; print(secrets.token_hex(32))"`

### Langkah 3 — Jalankan Docker

```bash
# Build dan jalankan semua container
docker compose up -d --build

# Cek semua container berjalan
docker compose ps
```

Output yang diharapkan:
```
NAME             STATUS          PORTS
sbms-mysql       Up (healthy)    3306/tcp
sbms-backend     Up (healthy)    0.0.0.0:5001->5001/tcp
sbms-frontend    Up              0.0.0.0:80->80/tcp
sbms-phpmyadmin  Up              0.0.0.0:8080->80/tcp
```

### Langkah 4 — Inisialisasi Data Awal (Pertama Kali)

Setelah semua container berjalan (±30 detik), jalankan seeder untuk mengisi data master:

```bash
docker compose exec backend python database/seed.py
```

### Langkah 5 — Akses Aplikasi

| URL | Keterangan |
|---|---|
| `http://IP_SERVER` | Aplikasi web utama |
| `http://IP_SERVER:8080` | phpMyAdmin (manajemen database) |
| `http://IP_SERVER:5001/health` | Health check backend |

**Akun Default (setelah seed):**
| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `user` | `user123` | Pengguna biasa |

> ⚠️ **Segera ganti password default setelah login pertama!**

---

## 🔧 Operasional Harian

### Melihat Log

```bash
# Log semua service
docker compose logs -f

# Log service spesifik
docker compose logs -f backend
docker compose logs -f frontend
```

### Restart Service

```bash
# Restart semua
docker compose restart

# Restart service tertentu
docker compose restart backend
```

### Update Aplikasi (setelah ada kode baru)

```bash
git pull
docker compose up -d --build
```

### Backup Database

```bash
# Backup
docker compose exec mysql mysqldump -u root -p${DB_PASSWORD} smart_budget_db > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -i mysql mysql -u root -p${DB_PASSWORD} smart_budget_db < backup_TANGGAL.sql
```

### Reset Database (HATI-HATI: menghapus semua data)

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend python database/seed.py
```

---

## 📁 Struktur Proyek

```
smart_budget_monitoring_system/
├── backend/                 # Flask REST API + AI Engine
│   ├── ai/                  # SVM Model, Regex Engine, Rule Base
│   ├── database/            # Schema SQL & Seeder
│   ├── models/              # SQLAlchemy ORM Models
│   ├── routes/              # API Endpoints (Blueprint)
│   ├── services/            # Business Logic Layer
│   ├── tests/               # Unit Tests
│   ├── uploads/             # Temporary Excel upload storage
│   ├── Dockerfile           # Backend container config
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Template environment variables
├── frontend/                # React 19 + Vite Web App
│   ├── src/                 # Source code
│   ├── nginx.conf           # Nginx production config (API proxy)
│   └── Dockerfile           # Frontend multi-stage build
├── docs/                    # Dokumentasi teknis lengkap
├── docker-compose.yml       # Orchestrasi semua container
├── .env.example             # Template environment variables Docker
└── README.md                # Dokumen ini
```

---

## 📚 Dokumentasi Teknis

Dokumentasi lengkap tersedia di folder [`docs/`](./docs/):

| Dokumen | Keterangan |
|---|---|
| [architecture.md](./docs/architecture.md) | Arsitektur sistem & tech stack |
| [database-schema.md](./docs/database-schema.md) | Skema database & relasi tabel |
| [api-reference.md](./docs/api-reference.md) | Referensi REST API |
| [docker-guide.md](./docs/docker-guide.md) | Panduan lengkap Docker |
| [ai-engine.md](./docs/ai-engine.md) | Dokumentasi AI classifier |
| [troubleshooting.md](./docs/troubleshooting.md) | Panduan troubleshooting |

---

## 🛟 Troubleshooting

**Container tidak mau start:**
```bash
docker compose logs mysql
docker compose logs backend
```

**Backend tidak bisa connect ke database:**
```bash
# Cek apakah MySQL sudah healthy
docker compose ps
# Tunggu health check MySQL selesai, biasanya 30-60 detik
```

**Port 80 sudah dipakai:**
```bash
# Edit .env dan ganti FRONTEND_PORT
FRONTEND_PORT=8090
docker compose up -d
```

Lihat [troubleshooting.md](./docs/troubleshooting.md) untuk panduan lebih lengkap.

---

## 📞 Kontak

**Sistem:** Smart Budget Monitoring & QC System  
**Organisasi:** PT Summit Adyawinsa Indonesia  
**Divisi:** Purchasing & Quality Control
