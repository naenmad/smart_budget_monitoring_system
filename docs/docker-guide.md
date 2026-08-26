# Panduan Docker — Smart Budget Monitoring & QC System

> Panduan lengkap untuk menjalankan aplikasi menggunakan Docker Compose.  
> Membutuhkan: Docker Desktop ≥ 4.x dan Docker Compose v2

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Arsitektur Container](#2-arsitektur-container)
3. [Quick Start](#3-quick-start)
4. [Akses Layanan](#4-akses-layanan)
5. [Konfigurasi Environment](#5-konfigurasi-environment)
6. [Perintah Operasional](#6-perintah-operasional)
7. [Database Management](#7-database-management)
8. [Logs & Debugging](#8-logs--debugging)
9. [Port Kustom (Menghindari Konflik)](#9-port-kustom-menghindari-konflik)
10. [Rebuild & Update](#10-rebuild--update)
11. [Backup & Restore Database](#11-backup--restore-database)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prasyarat

| Kebutuhan | Minimum | Direkomendasikan |
|:----------|:--------|:-----------------|
| Docker Desktop | 4.x | Latest |
| Docker Compose | v2.x | v5.x |
| RAM tersedia | 2 GB | 4 GB |
| Disk kosong | 2 GB | 5 GB |

### Cek Instalasi

```bash
# Pastikan Docker daemon berjalan
docker info

# Cek versi Docker Compose
docker compose version
```

---

## 2. Arsitektur Container

```
┌──────────────────────────────────────────────────────────────────┐
│                     Docker Compose Stack                         │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ sbms-frontend │    │ sbms-backend  │    │ sbms-mysql   │       │
│  │ (Nginx)       │───→│ (Gunicorn)    │───→│ (MySQL 8.0)  │       │
│  │ Port: 5173    │    │ Port: 5001    │    │ Port: 3306   │       │
│  └──────────────┘    └──────────────┘    └──────┬───────┘       │
│                                                  │               │
│                                           ┌──────┴───────┐       │
│                                           │sbms-phpmyadmin│       │
│                                           │ Port: 8080    │       │
│                                           └──────────────┘       │
│                                                                  │
│  Network: sbms-network (bridge)                                  │
│  Volume:  mysql_data (persistent)                                │
└──────────────────────────────────────────────────────────────────┘
```

### Detail Container

| Container | Image | Port Host | Port Container | Deskripsi |
|:----------|:------|:----------|:---------------|:----------|
| `sbms-mysql` | `mysql:8.0` | 3306 | 3306 | Database MySQL dengan auto-init schema |
| `sbms-backend` | Custom (Python 3.11-slim) | 5001 | 5001 | Flask API + Gunicorn (4 workers) |
| `sbms-frontend` | Custom (Nginx Alpine) | 5173 | 80 | React SPA + reverse proxy ke backend |
| `sbms-phpmyadmin` | `phpmyadmin:latest` | 8080 | 80 | Web GUI manajemen database |

### Startup Order & Health Dependencies

```
mysql (start + healthcheck) 
  ├─→ backend (waits until mysql healthy)
  │     └─→ frontend (waits until backend started)
  └─→ phpmyadmin (waits until mysql healthy)
```

---

## 3. Quick Start

### Langkah 1: Hentikan Layanan Lokal yang Bentrok

```bash
# Hentikan MySQL lokal (Homebrew)
brew services stop mysql

# Hentikan frontend dev server (jika berjalan)
# Tekan Ctrl+C di terminal npm run dev

# Pastikan port bersih
lsof -i :3306 -i :5001 -i :5173 -i :8080
# Output harus kosong
```

### Langkah 2: Jalankan Docker Compose

```bash
cd /path/to/smart_budget_monitoring_system

# Build & jalankan semua container di background
docker compose up -d

# Tunggu ~30-60 detik untuk MySQL initialization
```

### Langkah 3: Seed Database (Pertama Kali)

```bash
# Jalankan seeder di dalam container backend
docker compose exec backend python database/seed.py
```

Output yang diharapkan:
```
========================================
Running Seeder
========================================
[OK] Admin berhasil dibuat
[OK] Kategori 'E-1' berhasil dibuat
[OK] Kategori 'E-9' berhasil dibuat
[OK] Kategori 'I-1' berhasil dibuat
========================================
Seeder selesai
========================================
```

### Langkah 4: Verifikasi

```bash
# Cek semua container berjalan
docker compose ps

# Test backend health
curl http://localhost:5001/health

# Test database connection
curl http://localhost:5001/db-test

# Test login API
curl -X POST http://localhost:5173/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 4. Akses Layanan

| Layanan | URL | Kredensial |
|:--------|:----|:-----------|
| **Frontend Web App** | http://localhost:5173 | admin / admin123 |
| **Backend Developer Portal** | http://localhost:5001 | — |
| **Swagger API Docs** | http://localhost:5001/apidocs/ | — |
| **OpenAPI JSON Spec** | http://localhost:5001/apispec_1.json | — |
| **phpMyAdmin** | http://localhost:8080 | root / rootpassword |
| **Database Direct** | `localhost:3306` | root / rootpassword |

---

## 5. Konfigurasi Environment

### File `.env` di Root Proyek

Buat file `.env` berdasarkan template:

```bash
cp .env.example .env
```

### Variabel yang Tersedia

| Variabel | Default | Keterangan |
|:---------|:--------|:-----------|
| `DB_PASSWORD` | `rootpassword` | Password root MySQL |
| `DB_NAME` | `smart_budget_db` | Nama database |
| `SECRET_KEY` | `smart-budget-secret-key-production` | Flask secret key |
| `JWT_SECRET_KEY` | `smart-budget-jwt-secret-key-production` | JWT signing key |
| `FLASK_ENV` | `production` | `development` atau `production` |
| `PORT` | `5001` | Port backend internal |
| `MYSQL_PORT` | `3306` | Port host untuk MySQL |
| `BACKEND_PORT` | `5001` | Port host untuk backend |
| `FRONTEND_PORT` | `5173` | Port host untuk frontend |
| `PMA_PORT` | `8080` | Port host untuk phpMyAdmin |

> ⚠️ **Penting**: Untuk production, **ganti semua secret key dan password default!**

---

## 6. Perintah Operasional

### Lifecycle Container

```bash
# Jalankan semua container (background)
docker compose up -d

# Jalankan dengan rebuild image
docker compose up --build -d

# Hentikan semua container (data tetap aman)
docker compose down

# Hentikan + HAPUS volume database (⚠️ data hilang!)
docker compose down -v

# Restart satu service
docker compose restart backend

# Hentikan satu service
docker compose stop frontend
```

### Monitoring

```bash
# Status semua container
docker compose ps

# Log semua service (real-time)
docker compose logs -f

# Log satu service saja
docker compose logs -f backend

# Log 100 baris terakhir
docker compose logs --tail=100 backend
```

### Eksekusi Command di Container

```bash
# Shell interaktif ke backend
docker compose exec backend bash

# Shell ke MySQL
docker compose exec mysql mysql -uroot -prootpassword smart_budget_db

# Jalankan Python script
docker compose exec backend python database/seed.py

# Jalankan test
docker compose exec backend pytest tests/
```

---

## 7. Database Management

### Auto-Initialization

Saat container MySQL pertama kali dibuat, schema secara otomatis dijalankan dari:
```
./backend/database/schema.sql → /docker-entrypoint-initdb.d/01-schema.sql
```

> **Catatan**: Auto-init hanya terjadi saat volume `mysql_data` **belum ada**. Jika database sudah pernah diinisialisasi, file schema tidak akan dijalankan ulang.

### Akses via phpMyAdmin

1. Buka http://localhost:8080
2. Server: `mysql` (sudah otomatis)
3. Username: `root`
4. Password: `rootpassword`

### Akses via CLI

```bash
docker compose exec mysql mysql -uroot -prootpassword smart_budget_db
```

### Reset Database Total

```bash
# Hentikan container + hapus volume
docker compose down -v

# Jalankan ulang (schema akan di-init ulang)
docker compose up -d

# Seed data awal
docker compose exec backend python database/seed.py
```

---

## 8. Logs & Debugging

### Lokasi Log

| Log | Lokasi Host | Keterangan |
|:----|:------------|:-----------|
| Backend (Gunicorn) | `./logs/backend/` | Mapped volume |
| MySQL | `./logs/mysql/` | Mapped volume |
| Docker stdout | `docker compose logs` | Real-time |

### Debugging Container yang Gagal Start

```bash
# Lihat log container yang crash
docker compose logs backend

# Cek status detail
docker inspect sbms-backend

# Masuk ke container walau aplikasi crash
docker compose run --rm backend bash
```

### Health Check

```bash
# Cek health MySQL
docker inspect --format='{{.State.Health.Status}}' sbms-mysql

# Cek health backend
docker inspect --format='{{.State.Health.Status}}' sbms-backend
```

---

## 9. Port Kustom (Menghindari Konflik)

Jika port default sudah dipakai aplikasi lain:

```bash
# Opsi 1: Via environment variable
MYSQL_PORT=3307 FRONTEND_PORT=5174 PMA_PORT=8081 docker compose up -d

# Opsi 2: Via file .env
echo "MYSQL_PORT=3307" >> .env
echo "FRONTEND_PORT=5174" >> .env
docker compose up -d
```

### Skenario Umum: MySQL Lokal Tetap Aktif

```bash
# MySQL Docker di port 3307, sisanya tetap default
MYSQL_PORT=3307 docker compose up -d
```

---

## 10. Rebuild & Update

### Setelah Mengubah Source Code

```bash
# Rebuild image yang berubah saja
docker compose up --build -d

# Force rebuild tanpa cache
docker compose build --no-cache backend
docker compose up -d
```

### Update Base Image

```bash
# Pull image terbaru
docker compose pull

# Rebuild & restart
docker compose up --build -d
```

### Cleanup

```bash
# Hapus image yang tidak dipakai
docker image prune -f

# Hapus semua resource Docker yang tidak dipakai (hati-hati!)
docker system prune -f
```

---

## 11. Backup & Restore Database

### Export (Backup)

```bash
# Dari container Docker
docker compose exec mysql mysqldump -uroot -prootpassword smart_budget_db > backup_$(date +%Y%m%d).sql

# Backup spesifik tabel
docker compose exec mysql mysqldump -uroot -prootpassword smart_budget_db pr_po_data budget > backup_partial.sql
```

### Import (Restore)

```bash
# Ke container Docker
docker compose exec -T mysql mysql -uroot -prootpassword smart_budget_db < backup_20260826.sql

# Atau via phpMyAdmin:
# 1. Buka http://localhost:8080
# 2. Pilih database smart_budget_db
# 3. Tab "Import" → pilih file SQL → Execute
```

### Migrasi dari MySQL Lokal ke Docker

```bash
# 1. Export dari MySQL lokal
mysqldump -u root smart_budget_db > local_backup.sql

# 2. Import ke Docker
docker compose exec -T mysql mysql -uroot -prootpassword smart_budget_db < local_backup.sql
```

---

## 12. Troubleshooting

### Container MySQL Tidak Mau Start

```bash
# Cek log
docker compose logs mysql

# Kemungkinan: port 3306 sudah dipakai
lsof -i :3306
# Solusi: matikan MySQL lokal atau gunakan port kustom
brew services stop mysql
```

### Backend Error: "Can't connect to MySQL"

```bash
# Pastikan MySQL sudah healthy
docker compose ps
# Jika mysql masih "health: starting", tunggu 15-30 detik

# Restart backend setelah MySQL ready
docker compose restart backend
```

### Frontend Blank / 502

```bash
# Cek apakah backend sudah running
docker compose ps

# Cek log nginx
docker compose logs frontend

# Kemungkinan: backend belum ready saat frontend start
docker compose restart frontend
```

### "Port already in use"

```bash
# Cari proses yang menggunakan port
lsof -i :5001
lsof -i :5173

# Kill proses atau gunakan port kustom
FRONTEND_PORT=5174 BACKEND_PORT=5002 docker compose up -d
```

### Performa Lambat (macOS)

Docker Desktop di macOS menggunakan virtualisasi. Tips:
1. Buka Docker Desktop → Settings → Resources
2. Alokasikan minimal **4 GB RAM** dan **2 CPUs**
3. Aktifkan **VirtioFS** untuk file sharing yang lebih cepat
