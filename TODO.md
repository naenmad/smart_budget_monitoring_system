# 📋 Project Roadmap & Task List (TODO)

**Smart Budget Monitoring System**  
_Dokumen pelacakan tugas pengembangan, refactoring, dan optimasi sistem._

---

## 🚀 Selesai Dikerjakan (Recently Completed)

### 📊 1. Redesign Dashboard Monitoring Anggaran

- [x] **Pemisahan Total CAPEX dan OPEX**:
  - Hapus penggabungan gelondongan total budget CAPEX + OPEX di header overview Dashboard.
  - Tampilkan panel pemantauan mandiri untuk **Pagu & Realisasi CAPEX** dan **Pagu & Realisasi OPEX**.
- [x] **Dual Metric Realisasi Anggaran (PR vs GR)**:
  - Sediakan 2 indikator terpakai:
    1. **Ekspektasi / Komitmen (Berdasarkan PR/PO)**: Total nilai PR yang diajukan dan di-mapping.
    2. **Realisasi Fisik Faktur (Berdasarkan GR)**: Total nilai barang yang sudah diterima (GR terbit).
  - Tampilkan sisa saldo dan % utilisasi untuk masing-masing level (PR & GR).
- [x] **Klarifikasi & Perbaikan Status PR Pipeline**:
  - Hapus metrik membingungkan "Planning Active: 1".
  - Buat breakdown status PR yang matematis dan konsisten: `Total PR = Matched (On/Over/Under Plan) + Need Mapping + Out of Plan (OOP) + Dibatalkan (Cancelled)`.
  - Tambahkan progress bar visual proporsi 100%.
- [x] **Monitoring Budget Bulanan CAPEX & OPEX (Chart Interaktif)**:
  - Tampilkan chart perbandingan nominal bulanan (Jan–Des) untuk Planned Budget, Terpakai PR, Terpakai GR, dan % realisasi.
  - Sediakan filter switch: **Semua** | **CAPEX** | **OPEX**.
- [x] **Update Tabel Form & Export Excel**:
  - Sinkronkan tabel rincian formulir dan file export Excel dengan kolom Planning PR dan realisasi GR.
- [x] **Laporan Hasil Pelaksanaan KPI Anggaran (CAPEX & OPEX Standard SAI)**:
  - Implementasi grafik garis target vs aktual KPI ($\le 90\%$ OPEX & $100\%$ CAPEX).
  - Tampilan matriks 12-bulan resmi PT Summit Adyawinsa Indonesia dengan evaluasi 🟢 Sesuai Target / 🔺 Tidak Sesuai Target dan indikator GOOD.

---

## 🔮 Rencana Pengembangan Lanjutan (Future Enhancements)

### 🔄 1. Standarisasi Frontend Data Fetching & Modularisasi Komponen

- [ ] **Standarisasi React Query (TanStack Query)**:
  - Migrasi fetching manual `useEffect + useState + axios` yang tersebar di beberapa komponen menjadi Custom Hooks React Query (misal: `usePRHistory()`, `useItemMappings()`, `useUsers()`).
- [ ] **Pecah Monolithic Components**:
  - Refactor halaman berukuran besar (seperti `Users.jsx`, `Dashboard.jsx`, dan `ResultMatching.jsx`) menjadi sub-komponen terpisah (Form, Table, Modal, Filter).

### 🔒 2. Validasi Skema Tambahan

- [ ] **Validasi Skema Request Body (Pydantic / Marshmallow)**:
  - Pengetatan skema payload JSON untuk endpoint master data di masa mendatang jika dibutuhkan integrasi API eksternal.

docker compose up -d --build
