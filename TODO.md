# 📋 Project Roadmap & Task List (TODO)
**Smart Budget Monitoring System**  
*Dokumen pelacakan tugas pengembangan, refactoring, dan optimasi sistem.*

---

## ✅ Selesai Dikerjakan (Recently Completed)
- [x] **Route-based Code Splitting (Lazy Loading Frontend)**: Menerapkan `React.lazy()` & `<Suspense fallback={<PageLoader />}>` di `App.jsx`, memecah bundle monolitik 1.94 MB menjadi modul terisolasi per halaman (<250 KB per chunk).
- [x] **Global JSON Error Handler di Flask Backend**: Menambahkan `@app.errorhandler` terpusat di `backend/app.py` untuk error 400, 404, 405, 500, dan unhandled exception dengan response JSON konsisten `{ "success": false, "message": "...", "error_code": "..." }`.
- [x] **Cleanup File Redundan & Dead Code Backend AI**: Menghapus file 0-byte `backup_sebelum_migrasi_20260813_1543.sql`, menghapus root `requirements.txt` duplikat, dan merefactor `backend/ai/predict.py` dengan lazy loading.
- [x] **Pembersihan Aset Gambar Tidak Terpakai**: Menghapus 7 file gambar redundan (~1.13 MB) di `frontend/src/assets/` dan `frontend/public/` (`bg_gedung.webp`, `budget_walpaper.webp`, `balon.webp`, `hero.webp`, `sai_nobg.webp`, `vite.svg`, `favicon.svg`).
- [x] **Pusat Dokumentasi Terpadu (`docs/`)**: Penyusunan 11 dokumen panduan teknis lengkap (Arsitektur, API, DB Schema, Docker, AI Engine, Frontend, Development, Troubleshooting, dll).
- [x] **Docker Multi-Stage Build & Container Stack**: Setup `Dockerfile` frontend (Node &rarr; Nginx) & backend (Gunicorn) dengan multi-container orchestration di `docker-compose.yml`.
- [x] **Keamanan Login & Anti-Autofill Password**: Penonaktifan autocomplete password browser dan proteksi password pada `Login.jsx`.
- [x] **Dropdown Pilihan Tahun Periode (Upload PR, Planning & Budget)**: Mengganti input manual teks dengan dropdown pilihan tahun interaktif otomatis (`2024` - `2029`) dengan default tahun berjalan.
- [x] **Dokumentasi REST API Interaktif (Swagger UI / Flasgger)**: Integrasi OpenAPI 3.0 via `/apidocs/` dan `/docs`, JWT Bearer authorization, 8 domain tags.
- [x] **Pencegahan iOS Safari Auto-Zoom & Network Redirect Bug**: Perbaikan viewport, 16px input font size di mobile, serta penghilangan Werkzeug 308 redirect pada akses IP lokal.
- [x] **Form Validation & Standardisasi Akun Pengguna**: Format username tanpa spasi `^[a-z0-9_.-]{3,30}$` dan password min 6 karakter pada backend & frontend.
- [x] **Redesign Laman Login**: Tema enterprise modern selaras dengan sistem, branding PT SAI, Lucide icons, dan modal bantuan lupa password ke Admin.
- [x] **Styling Card Item PR (Mapping Review)**: Memperbaiki class layout CSS PR item card dan daftar kandidat AI agar berjarak proporsional dan tidak menumpuk.
- [x] **Sinkronisasi PR Tracking Stages Dashboard**: Key alignment backend response (`stage_pr`, `stage_po`, `stage_gr`) dan safe fallback di Dashboard.
- [x] **Pilihan Jumlah Item per Halaman (Pagination)**: Opsi 10, 25, 50, 100 baris per halaman pada Model Klasifikasi AI, Riwayat PR/PO, dan Result Matching.
- [x] **Responsivitas Mobile Card Otomatisasi & Threshold AI**: Layout 1-kolom fleksibel pada viewport mobile tanpa horizontal overflow.
- [x] **Admin Reset/Ubah Password Pengguna Lain**: Tombol dan modal interaktif reset password akun pengguna lain di halaman Manajemen Akun.

---

## 🚀 Prioritas Pengembangan Berikutnya (Next Milestones)

### 🛡️ 1. Database & Robust Transaction Handling
- [ ] **Session & Transaction Rollback Pattern**:
  - Bungkus batch processing (seperti parsing & insert ribuan baris Excel di `PRUploadService` dan `PlanningUploadService`) dengan blok `try...except...db.session.rollback()`.
- [ ] **Dynamic Import untuk Library Berat**:
  - Terapkan dynamic import pada library berukuran besar seperti `xlsx`, `jspdf`, dan `html2canvas` agar hanya dimuat saat user menekan tombol Export/Upload.

### 🔄 2. Standarisasi Frontend Data Fetching & Modularisasi Komponen
- [ ] **Standarisasi React Query (TanStack Query)**:
  - Migrasi fetching manual `useEffect + useState + axios` yang tersebar di beberapa komponen menjadi Custom Hooks React Query (misal: `usePRHistory()`, `useItemMappings()`, `useUsers()`).
- [ ] **Pecah Monolithic Components**:
  - Refactor halaman berukuran besar (seperti `Users.jsx`, `Dashboard.jsx`, dan `ResultMatching.jsx`) menjadi sub-komponen terpisah (Form, Table, Modal, Filter).

### 🔒 3. Keamanan & Konfigurasi API
- [ ] **CORS Origins Restriction**:
  - Batasi whitelist origin CORS di production pada [`backend/app.py`](backend/app.py), jangan biarkan wildcard `*`.
- [ ] **Validasi Skema Request Body**:
  - Terapkan validasi input skema menggunakan Marshmallow / Pydantic untuk endpoint create/update data (User, Budget, Item Mapping).

### 🤖 4. AI & Machine Learning Pipeline
- [ ] **Model Versioning & Dynamic Path**:
  - Buat konfigurasi path model SVM dan artefak TF-IDF yang dinamis melalui environment variable.
- [ ] **Retraining Script**:
  - Buat script otomasi pipeline retraining model SVM jika ada data PR hasil koreksi manual baru dari user.
- [ ] **Automated Testing Suite**:
  - Perluas unit test untuk `services/mapping/advanced_mapping_service.py` dan `services/budget_monitoring_service.py`.
