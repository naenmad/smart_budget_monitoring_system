# Smart Budget Monitoring System

## Deskripsi Singkat
Sistem monitoring anggaran Quality Control (QC) berbasis web yang mengotomatisasi klasifikasi dan pemetaan dokumen Purchase Requisition (PR) terhadap rencana anggaran (Planning). Sistem ini menyediakan pelacakan status pengadaan end-to-end mulai dari pembuatan PR hingga penerimaan barang (Goods Receipt), yang dirancang khusus untuk meningkatkan efisiensi proses procurement pada PT Summit Adyawinsa Indonesia.

## Fitur Utama
* **Klasifikasi Kategori Anggaran Hybrid 3-Layer**: Menggunakan algoritma pemrosesan berlapis mulai dari Regex Engine untuk deteksi pola pasti, Rule Base berbasis kata kunci CAPEX/OPEX, hingga Support Vector Machine (SVM) dengan TF-IDF sebagai metode fallback untuk mengenali data yang kompleks.
* **Fuzzy Item Mapping**: Proses pencocokan otomatis antara item PR dengan daftar rencana anggaran (Planning) menggunakan algoritma fuzzy (RapidFuzz), lengkap dengan dukungan review kandidat Top-5 dan penentuan status Out of Plan (OOP).
* **Pelacakan Status Pengadaan Otomatis (End-to-End)**: Melacak secara presisi setiap tahapan dokumen (PR Stage, PO Stage, GR Stage) berdasarkan riwayat data yang masuk tanpa memerlukan input manual berlebih.
* **Manajemen Siklus Hidup Anggaran**: Pengaturan status realisasi rencana anggaran dengan kendali terpusat yang meliputi tahap OPEN, PROSES, CLOSED, dan CANCELLED.
* **Dasbor & Pelaporan Komprehensif**: Menyajikan ringkasan serapan anggaran per kategori, matriks operasional bulanan, pelacakan proses dokumen, serta kemampuan ekspor laporan ke dalam format PDF.

### Klasifikasi Kategori Anggaran Hybrid 3-Layer
Setiap item PR diklasifikasikan ke kategori anggaran melalui tiga lapis, dari yang paling pasti ke yang paling probabilistik:
1. **Layer 1 — Regex** (`ai/regex_engine.py`) — mendeteksi kode Form eksplisit (I-1/E-1/E-9) atau jenis barang yang sudah dikenal (mis. tools/perkakas), langsung dengan confidence 1.0. Ada pengecualian untuk jasa perbaikan (kata seperti "repair"/"service") agar tidak salah diklasifikasikan sebagai pembelian aset baru.
2. **Layer 2 — Rule Base** (`ai/rule_base.py`) — fallback berbasis skor keyword CAPEX vs OPEX, hanya berjalan jika Layer 1 gagal menentukan Form.
3. **Layer 3 — SVM (TF-IDF)** — fallback terakhir menggunakan model machine learning untuk kasus yang tidak tertangkap dua layer sebelumnya--->Terbatas hanya untuk Form E-1 dan E-9 karena keterbatasan jumlah data untuk Form I-1.

## Teknologi yang Digunakan

**Backend**
* Bahasa Pemrograman: Python
* Framework: Flask
* ORM & Database: SQLAlchemy, MySQL 8.0
* Machine Learning: Scikit-learn (SVM, TF-IDF), RapidFuzz
* Keamanan: PyJWT (JSON Web Tokens)

**Frontend**
* Bahasa Pemrograman: JavaScript
* Framework: React, Vite
* Komponen & Visualisasi: Recharts, jsPDF, html2canvas

**Infrastruktur**
* Containerization: Docker, Docker Compose

## Struktur Folder
```text
smart_budget_monitoring_system/
├── backend/
│   ├── ai/               # Mesin kecerdasan buatan (Regex, Rule-based, Model SVM)
│   ├── database/         # Skema database MySQL dan skrip seed
│   ├── models/           # Definisi model ORM SQLAlchemy
│   ├── routes/           # Definisi endpoint API (Controller)
│   ├── services/         # Layanan logika bisnis (Mapping, Pipeline, Planning)
│   ├── utils/            # Utilitas pembantu (Otorisasi, Koneksi DB, Logging)
│   ├── app.py            # Entry point aplikasi backend
│   └── requirements.txt  # Daftar dependensi Python
├── frontend/
│   ├── src/
│   │   ├── api/          # Konfigurasi klien Axios untuk komunikasi API
│   │   ├── components/   # Komponen UI modular yang dapat digunakan ulang
│   │   ├── context/      # State management global (AuthContext)
│   │   ├── pages/        # Komponen halaman antarmuka pengguna
│   │   └── utils/        # Fungsi format dan utilitas klien
│   ├── public/           # Aset statis
│   └── package.json      # Daftar dependensi Node.js
├── docker-compose.yml    # Konfigurasi container untuk keseluruhan sistem
└── README.md             # Dokumentasi utama proyek
```

## Cara Instalasi dan Menjalankan Proyek

### Prasyarat Sistem
* Python 3.10 atau versi lebih baru
* Node.js 18 atau versi lebih baru
* MySQL 8.0 (atau instalasi Docker untuk container)

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)
1. Salin berkas konfigurasi environment untuk backend:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Sesuaikan nilai-nilai kredensial, seperti koneksi database dan JWT Secret pada berkas `.env`.
3. Mulai proses pembangunan dan eksekusi container:
   ```bash
   docker-compose up -d --build
   ```

### Opsi 2: Instalasi Manual

**Konfigurasi Backend:**
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat dan aktifkan virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Pengguna Windows: venv\Scripts\activate
   ```
3. Pasang semua dependensi sistem:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin berkas environment dan atur koneksi basis data:
   ```bash
   cp .env.example .env
   ```
5. Impor skema basis data ke MySQL dan jalankan seed data (opsional):
   ```bash
   mysql -u root -p < database/schema.sql
   python database/seed.py
   ```
6. Jalankan server backend:
   ```bash
   python app.py
   ```

**Konfigurasi Frontend:**
1. Buka sesi terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Pasang dependensi Node.js:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan lokal (development server):
   ```bash
   npm run dev
   ```

---
*Dokumen ini disusun untuk keperluan operasional teknis secara internal.*
