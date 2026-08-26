# 📋 Project Roadmap & Task List (TODO)
**Smart Budget Monitoring System**  
*Dokumen pelacakan tugas pengembangan, refactoring, dan optimasi sistem.*

---

## ✅ Selesai Dikerjakan (Recently Completed)
- [x] **Pusat Dokumentasi Terpadu (`docs/`)**: Penyusunan 11 dokumen panduan teknis lengkap (Arsitektur, API, DB Schema, Docker, AI Engine, Frontend, Development, Troubleshooting, dll).
- [x] **Keamanan Login & Anti-Autofill Password**: Penonaktifan autocomplete password browser dan proteksi password pada `Login.jsx`.
- [x] **Penyederhanaan Navigasi Sidebar**: Menghapus tautan eksternal API Docs dari sidebar menu agar lebih fokus dan bersih.
- [x] **Dropdown Pilihan Tahun Periode (Upload PR & Planning)**: Mengganti input manual teks dengan dropdown pilihan tahun interaktif otomatis (`2024` - `2029`) dengan default tahun berjalan.
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

## 🚀 Prioritas Tinggi (High Priority)

### 🧹 1. Codebase Cleanup & Arsitektur Dasar
- [ ] **Bersihkan Dead Code di Backend AI**:
  - Hapus atau refactor [`backend/ai/predict.py`](backend/ai/predict.py) yang menggunakan path dan import legacy, ganti/arahkan ke [`backend/services/classification_service.py`](backend/services/classification_service.py).
  - Hapus file kosong/temporary [`backend/backup_sebelum_migrasi_20260813_1543.sql`](backend/backup_sebelum_migrasi_20260813_1543.sql).
- [ ] **Konsolidasi Dependensi Python**:
  - Hapus file [`requirements.txt`](requirements.txt) di root project untuk menghindari kebingungan, satukan dokumentasi dependensi di [`backend/requirements.txt`](backend/requirements.txt).
- [ ] **Global Error Handler di Backend**:
  - Tambahkan `@app.errorhandler` terpusat di [`backend/app.py`](backend/app.py) untuk menangani 400, 404, 500, dan unhandled exception agar response selalu berformat standar JSON:
    ```json
    {
      "success": false,
      "message": "Pesan error",
      "error_code": "INTERNAL_SERVER_ERROR"
    }
    ```

### ⚡ 2. Optimasi Kinerja Frontend
- [ ] **Route-based Code Splitting (Lazy Loading)**:
  - Terapkan `React.lazy()` dan `<Suspense fallback={<LoadingSpinner />}>` di [`frontend/src/App.jsx`](frontend/src/App.jsx) untuk memecah bundle awal (>1.8 MB) menjadi chunks halaman yang ringan (<300 KB).
- [ ] **Dynamic Import untuk Library Berat**:
  - Terapkan dynamic import pada library berukuran besar seperti `xlsx`, `jspdf`, dan `html2canvas` agar hanya dimuat saat user menekan tombol Export/Upload.

---

## ⚖️ Prioritas Menengah (Medium Priority)

### 🛡️ 3. Database & Robust Transaction Handling
- [ ] **Session & Transaction Rollback Pattern**:
  - Bungkus batch processing (seperti parsing & insert ribuan baris Excel di `PRUploadService` dan `PlanningUploadService`) dengan blok `try...except...db.session.rollback()`.
- [ ] **Server-Side Pagination & Filter**:
  - Tambahkan pagination (`page`, `per_page` / `limit`, `offset`) pada endpoint yang berpotensi menghasilkan ribuan baris data:
    - `/api/v1/pr-po-data`
    - `/api/v1/upload-histories`
    - `/api/v1/planning/list`

### 🔄 4. Standarisasi Frontend Data Fetching & Modularisasi Komponen
- [ ] **Standarisasi React Query (TanStack Query)**:
  - Migrasi fetching manual `useEffect + useState + axios` yang tersebar di beberapa komponen menjadi Custom Hooks React Query (misal: `usePRHistory()`, `useItemMappings()`, `useUsers()`).
- [ ] **Pecah Monolithic Components**:
  - Refactor halaman berukuran besar (seperti `Users.jsx`, `Dashboard.jsx`, dan `ResultMatching.jsx`) menjadi sub-komponen terpisah (Form, Table, Modal, Filter).

### 🔒 5. Keamanan & Konfigurasi API
- [ ] **CORS Origins Restriction**:
  - Batasi whitelist origin CORS di production pada [`backend/app.py`](backend/app.py), jangan biarkan wildcard `*`.
- [ ] **Validasi Skema Request Body**:
  - Terapkan validasi input skema menggunakan Marshmallow / Pydantic untuk endpoint create/update data (User, Budget, Item Mapping).

---

## 🧪 Prioritas Lanjutan (Low Priority / Enhancement)

### 🤖 6. AI & Machine Learning Pipeline
- [ ] **Model Versioning & Dynamic Path**:
  - Buat konfigurasi path model SVM dan artefak TF-IDF yang dinamis melalui environment variable.
- [ ] **Retraining Script**:
  - Buat script otomasi pipeline retraining model SVM jika ada data PR hasil koreksi manual baru dari user.

### 🧪 7. Automated Testing & CI/CD
- [ ] **Backend Unit Testing (Pytest)**:
  - Tambahkan unit test untuk:
    - `ai/regex_engine.py`
    - `ai/rule_base.py`
    - `services/mapping/advanced_mapping_service.py`
- [ ] **Docker Multi-Stage Build**:
  - Perbarui [`docker-compose.yml`](docker-compose.yml) dan tambahkan `Dockerfile` backend & frontend dengan multi-stage build untuk lingkungan deployment production yang ramping.
