# Panduan Deployment — Smart Budget Monitoring & QC System

> Opsi deployment: Docker Compose (Self-hosted), Render, Railway, Vercel

---

## Daftar Isi

1. [Docker Compose (Rekomendasi)](#1-docker-compose-rekomendasi)
2. [Render (Cloud PaaS)](#2-render-cloud-paas)
3. [Railway](#3-railway)
4. [Vercel (Frontend Only)](#4-vercel-frontend-only)
5. [Production Checklist](#5-production-checklist)

---

## 1. Docker Compose (Rekomendasi)

Panduan lengkap Docker ada di [docker-guide.md](./docker-guide.md).

### Quick Deploy

```bash
# 1. Clone repository
git clone <repo_url>
cd smart_budget_monitoring_system

# 2. Konfigurasi environment
cp .env.example .env
# Edit .env → ganti semua password dan secret key!

# 3. Build & jalankan
docker compose up --build -d

# 4. Seed database (pertama kali)
docker compose exec backend python database/seed.py

# 5. Verifikasi
docker compose ps
curl http://localhost:5001/health
```

### Akses

| Layanan | URL |
|:--------|:----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5001 |
| Swagger Docs | http://localhost:5001/apidocs/ |
| phpMyAdmin | http://localhost:8080 |

---

## 2. Render (Cloud PaaS)

### Backend

File konfigurasi: `backend/render.yaml`

1. Buat **Web Service** baru di Render
2. Connect ke repository Git
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `gunicorn --bind 0.0.0.0:$PORT --workers 4 app:app`
6. Tambahkan environment variables:
   - `DATABASE_URL` — Connection string MySQL/PostgreSQL
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`

### Database

1. Buat **PostgreSQL** database di Render
2. Salin `Internal Database URL` ke `DATABASE_URL`

> **Catatan**: Backend otomatis mendeteksi `DATABASE_URL` dan mengkonversi `postgres://` → `postgresql+psycopg2://` untuk kompatibilitas SQLAlchemy.

---

## 3. Railway

1. Buat project baru di Railway
2. Deploy backend sebagai service terpisah (Root: `backend`)
3. Deploy MySQL sebagai addon
4. Set environment variables sama seperti Render
5. Start Command: `gunicorn --bind 0.0.0.0:$PORT --workers 4 app:app`

---

## 4. Vercel (Frontend Only)

File konfigurasi: `frontend/vercel.json`

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Setup

1. Import project di Vercel (Root: `frontend`)
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Set `VITE_API_URL` ke URL backend yang sudah di-deploy

---

## 5. Production Checklist

### Keamanan

- [ ] Ganti `SECRET_KEY` dan `JWT_SECRET_KEY` ke string random panjang
- [ ] Ganti `DB_PASSWORD` dari default `rootpassword`
- [ ] Set `FLASK_ENV=production`
- [ ] Pastikan `.env` ada di `.gitignore`
- [ ] Review CORS origins (jangan wildcard `*` di production sebenarnya)
- [ ] Aktifkan HTTPS (via reverse proxy atau cloud provider)

### Database

- [ ] Backup database secara berkala
- [ ] Test restore dari backup
- [ ] Set up MySQL replication (jika high-availability dibutuhkan)

### Monitoring

- [ ] Cek `/health` endpoint secara berkala
- [ ] Set up log aggregation (logs di `./logs/`)
- [ ] Monitor disk usage (uploads dan database)

### Performance

- [ ] Gunicorn workers = 2 × CPU cores + 1
- [ ] Aktifkan Nginx gzip compression (sudah dikonfigurasi)
- [ ] Set `staleTime` React Query sesuai kebutuhan
- [ ] Pertimbangkan Redis untuk caching jika traffic tinggi
