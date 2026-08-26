# Pusat Dokumentasi — Smart Budget Monitoring & QC System

> **PT Summit Adyawinsa Indonesia (SAI)**  
> Dokumentasi Teknis & Panduan Operasional Sistem Pemantauan Anggaran Departemen QC  
> *Versi 1.0 · Terakhir Diperbarui: Agustus 2026*

---

## 📚 Struktur Direktori Dokumentasi

Semua dokumentasi teknis sistem telah dipusatkan di dalam direktori `docs/` dengan klasifikasi topik berikut:

```
docs/
├── README.md               # 📌 Indeks & Panduan Navigasi Dokumentasi (Dokumen ini)
├── architecture.md         # 🏗️ Arsitektur Sistem, Tech Stack, & Pola MVC Service Layer
├── business-process.md     # 🏢 Proses Bisnis QC, Kategori Anggaran, & Alur Procurement
├── api-reference.md        # 📡 Referensi Lengkap REST API & Spesifikasi OpenAPI 2.0
├── database-schema.md      # 🗄️ Skema Database MySQL (11 Tabel, DDL, Relasi & ERD)
├── ai-engine.md            # 🤖 Mesin AI/ML, 3-Layer Hybrid Classifier, & Fuzzy Matching
├── frontend-guide.md       # 🎨 Panduan Frontend React 19, CSS Modules, & State Management
├── development-guide.md    # 💻 Setup Development Lokal, Struktur Kode, & Konvensi
├── docker-guide.md         # 🐳 Panduan Lengkap Docker Compose, Multi-Container, & DB Tools
├── deployment-guide.md     # 🚀 Prosedur Deployment Produksi & Cloud (Docker, Render, Vercel)
└── troubleshooting.md      # 🔧 Panduan Diagnostik & Solusi Masalah Teknis
```

---

## 📑 Ringkasan Dokumen & Tautan Cepat

| Dokumen | Topik Pembahasan | Target Pembaca |
|:---|:---|:---|
| **[architecture.md](./architecture.md)** | Arsitektur menyeluruh, integrasi Flask + React, diagram data flow, dan security baseline. | Software Architect, Fullstack Dev |
| **[business-process.md](./business-process.md)** | Aturan bisnis PT SAI, klasifikasi form E-1, E-9, I-1, status PR/PO, dan kalkulasi budget realisasi. | Product Owner, QC Engineer, Auditor |
| **[api-reference.md](./api-reference.md)** | Daftar seluruh 11 modul endpoint, format request/response JSON, otentikasi JWT, dan role matrix. | Frontend Dev, API Consumer |
| **[database-schema.md](./database-schema.md)** | Rincian 11 tabel MySQL `smart_budget_db`, tipe kolom, enum, foreign keys, indeks, dan seeder default. | Backend Dev, Database Admin |
| **[ai-engine.md](./ai-engine.md)** | Pipeline 3-layer klasifikasi (Rule Base → Regex → Linear SVM TF-IDF), confidence scoring, dan RapidFuzz. | Data Scientist, AI/ML Engineer |
| **[frontend-guide.md](./frontend-guide.md)** | Komponen React 19, Recharts, Lucide Icons, sistem CSS Modules, theme dark mode, dan interceptor. | Frontend Developer, UI/UX Designer |
| **[development-guide.md](./development-guide.md)** | Panduan setup Python virtualenv, Node.js npm, konvensi penulisan kode, dan unit testing pytest. | Developer Baru / Onboarding |
| **[docker-guide.md](./docker-guide.md)** | Panduan praktis Docker Compose (Gunicorn, Nginx, MySQL 8.0, phpMyAdmin), port mapping, dan backup DB. | DevOps Engineer, System Admin |
| **[deployment-guide.md](./deployment-guide.md)** | Prosedur rilis staging & production, konfigurasi cloud Render/Railway/Vercel, dan checklist keamanan. | DevOps, Release Manager |
| **[troubleshooting.md](./troubleshooting.md)** | Langkah penanganan kendala error proxy, iOS viewport zoom, layar putih, port collision, dan seeding. | Support Team, Developer |

---

## 🌐 Tautan Layanan & Developer Portals (Live)

Ketika sistem sedang berjalan (baik mode local development maupun mode Docker):

* **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
* **Backend Developer Health Hub**: [http://localhost:5001](http://localhost:5001)
* **Dokumentasi Interaktif Swagger UI**: [http://localhost:5001/apidocs/](http://localhost:5001/apidocs/)
* **Database phpMyAdmin GUI**: [http://localhost:8080](http://localhost:8080)

---

## 🔐 Kredensial Default (Testing & Development)

* **Aplikasi Web**: Username `admin` / Password `admin123`
* **phpMyAdmin**: Server `mysql` / User `root` / Password `rootpassword`
