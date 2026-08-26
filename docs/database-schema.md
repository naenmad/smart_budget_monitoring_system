# Skema Database — Smart Budget Monitoring & QC System

> Database: MySQL 8.0  
> Nama Database: `smart_budget_db`  
> Character Set: `utf8mb4` · Collation: `utf8mb4_unicode_ci`  
> Total Tabel: 11

---

## Daftar Isi

1. [users](#1-users)
2. [kategori](#2-kategori)
3. [budget](#3-budget)
4. [planning_header](#4-planning_header)
5. [planning_detail](#5-planning_detail)
6. [pr_po_data](#6-pr_po_data)
7. [klasifikasi_log](#7-klasifikasi_log)
8. [mapping_log](#8-mapping_log)
9. [item_mapping](#9-item_mapping)
10. [upload_history](#10-upload_history)
11. [system_settings](#11-system_settings)

---

## Entity Relationship Diagram

```
 users ──┬── 1:N ──→ upload_history ──── 1:N ──→ pr_po_data
         │                                        │  │  │
         ├── 1:N ──→ planning_header               │  │  │
         │              │                           │  │  │
         │              └── 1:N ──→ planning_detail │  │  │
         │                            ↑             │  │  │
         │                            │ N:1         │  │  │
         │                            │             │  │  │
         │           item_mapping ────┘             │  │  │
         │              ↑                           │  │  │
         │              │ N:1                       │  │  │
         │              │                           │  │  │
         └─────────── kategori ←── N:1 ─────────────┘  │  │
                         ↑                              │  │
                         │ N:1                          │  │
                         │                              │  │
                       budget ←── N:1 ──────────────────┘  │
                                                           │
                    klasifikasi_log ←── N:1 ────────────────┤
                    mapping_log ←── N:1 ────────────────────┘
```

---

## 1. `users`

Menyimpan akun pengguna sistem.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `username` | VARCHAR(100) | ❌ | — | Unique, nama login |
| `password` | VARCHAR(255) | ❌ | — | Hash Werkzeug (PBKDF2-SHA256) |
| `role` | ENUM('admin','manager') | ❌ | — | Role otorisasi |
| `is_active` | BOOL | ❌ | — | Status aktif/nonaktif |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |
| `updated_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

**Index**: UNIQUE(`username`)

---

## 2. `kategori`

Master data kategori anggaran.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `kode` | VARCHAR(20) | ❌ | — | Kode unik (E-1, E-9, I-1) |
| `nama` | VARCHAR(100) | ❌ | — | Nama kategori |
| `tipe_formulir` | ENUM('CAPEX','OPEX') | ✅ | — | Jenis formulir budget |

**Index**: UNIQUE(`kode`)

### Data Default (Seeder)

| Kode | Nama | Tipe |
|:-----|:-----|:-----|
| E-1 | Maintenance | OPEX |
| E-9 | Other Expense | OPEX |
| I-1 | Inventory | CAPEX |

---

## 3. `budget`

Nominal anggaran per kategori per periode.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `kategori_id` | BIGINT | ✅ | — | FK → kategori.id |
| `periode` | VARCHAR(30) | ✅ | — | Tahun anggaran (contoh: "2026") |
| `nominal` | NUMERIC(18,2) | ❌ | — | Jumlah budget (Rupiah) |
| `created_by` | BIGINT | ✅ | — | FK → users.id |
| `upload_id` | BIGINT | ✅ | — | FK → upload_history.id |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |
| `updated_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

---

## 4. `planning_header`

Header upload file planning budget.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `periode` | VARCHAR(30) | ❌ | — | Tahun planning |
| `user_id` | BIGINT | ❌ | — | FK → users.id (yang upload) |
| `filename` | VARCHAR(255) | ❌ | — | Nama file asli |
| `status` | ENUM('UPLOADING','SUCCESS','SUCCES','FAILED') | ✅ | — | Status proses |
| `uploaded_at` | DATETIME | ✅ | — | Waktu upload |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |
| `updated_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

---

## 5. `planning_detail`

Detail item rencana anggaran bulanan.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `planning_header_id` | BIGINT | ❌ | — | FK → planning_header.id |
| `kategori_id` | BIGINT | ✅ | — | FK → kategori.id |
| `month` | VARCHAR(20) | ✅ | — | Bulan (Jan, Feb, Mar, ...) |
| `item` | VARCHAR(255) | ❌ | — | Nama item rencana |
| `planning_amount` | NUMERIC(18,2) | ❌ | — | Nominal rencana |
| `remarks` | VARCHAR(255) | ✅ | — | Catatan |
| `status_realisasi` | ENUM('OPEN','PROSES','CLOSED','CANCELLED') | ❌ | — | Agregat status realisasi |
| `created_at` | TIMESTAMP | ✅ | — | — |
| `updated_at` | TIMESTAMP | ✅ | — | — |

---

## 6. `pr_po_data`

**Tabel utama** — Data Purchase Request / Purchase Order hasil upload dan proses AI pipeline.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `upload_id` | BIGINT | ✅ | — | FK → upload_history.id |
| `requisition_id` | VARCHAR(100) | ✅ | — | ID requisition dari ERP |
| `pr_doc_num` | VARCHAR(100) | ✅ | — | Nomor dokumen PR |
| `po_doc_num` | VARCHAR(100) | ✅ | — | Nomor dokumen PO |
| `request_date` | DATE | ✅ | — | Tanggal request PR |
| `order_date` | DATE | ✅ | — | Tanggal order PO |
| `description` | TEXT | ✅ | — | **Deskripsi item** (input utama AI) |
| `comment_text` | TEXT | ✅ | — | Komentar tambahan |
| `supplier_name` | VARCHAR(255) | ✅ | — | Nama supplier |
| `qty` | NUMERIC(15,2) | ✅ | — | Kuantitas |
| `uom` | VARCHAR(20) | ✅ | — | Unit of Measure |
| `unit_price` | NUMERIC(18,2) | ✅ | — | Harga satuan |
| `total_price` | NUMERIC(18,2) | ✅ | — | Total harga |
| `gr_legal_number` | VARCHAR(100) | ✅ | — | Nomor GR |
| `packing_slip` | VARCHAR(100) | ✅ | — | Packing slip |
| `receipt_date` | DATE | ✅ | — | Tanggal terima barang |
| `invoice` | VARCHAR(100) | ✅ | — | Nomor invoice |
| `invoice_date` | DATE | ✅ | — | Tanggal invoice |
| `pr_status` | VARCHAR(100) | ✅ | — | Status PR dari ERP |
| `po_status` | VARCHAR(100) | ✅ | — | Status PO dari ERP |
| `non_stock_item` | BOOL | ✅ | — | Apakah non-stock item |
| **Kolom AI & Pipeline** | | | | |
| `kategori_id` | BIGINT | ✅ | — | FK → kategori.id (hasil AI) |
| `budget_id` | BIGINT | ✅ | — | FK → budget.id |
| `planning_detail_id` | BIGINT | ✅ | — | FK → planning_detail.id |
| `status_ai` | ENUM | ✅ | — | `WAITING`, `PROCESSING`, `DONE`, `FAILED`, `NEED_MAPPING`, `CANCELLED` |
| `procurement_status` | ENUM | ✅ | — | `PR_CREATED`, `PO_ISSUED`, `PARTIAL_RECEIVED`, `GOODS_RECEIVED`, `COMPLETED` |
| `budget_status` | ENUM | ✅ | — | `ON_PLAN`, `OVER_PLAN`, `UNDER_PLAN`, `OOP` |
| `layer_klasifikasi` | SMALLINT | ✅ | — | 1=Rule Base, 2=Regex, 3=SVM |
| `metode_klasifikasi` | ENUM | ✅ | — | `RULE_BASE`, `REGEX`, `SVM`, `MANUAL` |
| `perlu_review` | BOOL | ✅ | — | Apakah butuh review manual |
| `kategori_id_koreksi` | BIGINT | ✅ | — | FK → kategori.id (koreksi manual) |
| `direview_oleh` | BIGINT | ✅ | — | FK → users.id |
| `direview_at` | DATETIME | ✅ | — | Waktu review |
| `dibatalkan_oleh` | BIGINT | ✅ | — | FK → users.id |
| `dibatalkan_at` | DATETIME | ✅ | — | Waktu pembatalan |
| `alasan_pembatalan` | TEXT | ✅ | — | Alasan pembatalan |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |
| `updated_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

### ENUM Values

**`status_ai`**: Siklus hidup AI pipeline

```
WAITING → PROCESSING → DONE
                     → FAILED
                     → NEED_MAPPING (butuh mapping manual)
CANCELLED (dibatalkan user)
```

**`budget_status`**: Hasil monitoring budget

| Status | Arti |
|:-------|:-----|
| `ON_PLAN` | Realisasi sesuai rencana |
| `OVER_PLAN` | Realisasi melebihi budget |
| `UNDER_PLAN` | Realisasi di bawah rencana |
| `OOP` | Out of Plan (tidak ada planning) |

---

## 7. `klasifikasi_log`

Log setiap percobaan klasifikasi AI per layer.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `pr_po_data_id` | BIGINT | ✅ | — | FK → pr_po_data.id |
| `layer` | SMALLINT | ✅ | — | 1=Rule Base, 2=Regex, 3=SVM |
| `method` | ENUM('RULE_BASE','REGEX','SVM') | ✅ | — | Metode yang digunakan |
| `berhasil` | BOOL | ✅ | — | Apakah layer ini berhasil klasifikasi |
| `kategori_hasil_id` | BIGINT | ✅ | — | FK → kategori.id (hasil prediksi) |
| `confidence_score` | NUMERIC(5,4) | ✅ | — | Skor kepercayaan (0.0000–1.0000) |
| `processing_time` | NUMERIC(10,4) | ✅ | — | Waktu proses dalam detik |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

---

## 8. `mapping_log`

Log percobaan mapping item PR ke planning detail.

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `pr_po_data_id` | BIGINT | ❌ | — | FK → pr_po_data.id (CASCADE) |
| `method` | ENUM('ITEM_MAPPING_RULE','FUZZY_MATCH','MANUAL') | ❌ | — | Metode mapping |
| `planning_detail_hasil_id` | BIGINT | ✅ | — | FK → planning_detail.id (SET NULL) |
| `confidence_score` | NUMERIC(5,4) | ✅ | — | Skor kecocokan |
| `rank_no` | INTEGER | ✅ | — | Peringkat kandidat |
| `is_selected` | BOOL | ✅ | — | Apakah kandidat ini dipilih |
| `processing_time` | NUMERIC(10,4) | ✅ | — | Waktu proses (detik) |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

---

## 9. `item_mapping`

Aturan mapping keyword → planning item (master rule).

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `kategori_id` | BIGINT | ✅ | — | FK → kategori.id |
| `keyword` | VARCHAR(255) | ❌ | — | Keyword yang dicocokkan |
| `planning_item` | VARCHAR(255) | ❌ | — | Item planning tujuan |
| `priority` | INTEGER | ✅ | — | Prioritas (semakin kecil = prioritas tinggi) |
| `is_active` | BOOL | ✅ | — | Status aktif rule |
| `created_at` | DATETIME | ✅ | — | — |
| `updated_at` | DATETIME | ✅ | — | — |

---

## 10. `upload_history`

Riwayat upload file Excel (PR/PO dan Budget).

| Kolom | Tipe | Nullable | Default | Keterangan |
|:------|:-----|:---------|:--------|:-----------|
| `id` | BIGINT | ❌ | AUTO_INCREMENT | Primary Key |
| `user_id` | BIGINT | ❌ | — | FK → users.id (uploader) |
| `original_filename` | VARCHAR(255) | ❌ | — | Nama file asli |
| `stored_filename` | VARCHAR(255) | ❌ | — | Nama file tersimpan (unique) |
| `total_data` | INTEGER | ✅ | — | Jumlah baris data |
| `status` | ENUM('UPLOADING','SUCCESS','FAILED') | ✅ | — | Status upload |
| `uploaded_at` | DATETIME | ✅ | — | Waktu upload |
| `created_at` | DATETIME | ✅ | CURRENT_TIMESTAMP | — |

**Index**: UNIQUE(`stored_filename`)

---

## 11. `system_settings`

Konfigurasi parameter sistem (threshold AI, dll).

> Tabel ini digunakan untuk menyimpan konfigurasi runtime yang dapat diubah tanpa restart server.

---

## Inisialisasi Database

### Via Docker (Otomatis)

Schema SQL dijalankan otomatis saat container MySQL pertama kali dibuat:
```yaml
# docker-compose.yml
volumes:
  - ./backend/database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
```

### Via Manual

```bash
mysql -u root -p smart_budget_db < backend/database/schema.sql
```

### Seeder (Data Awal)

```bash
# Local
PYTHONPATH=backend python backend/database/seed.py

# Docker
docker compose exec backend python database/seed.py
```

Data yang di-seed:
- **User admin**: username=`admin`, password=`admin123`, role=`admin`
- **Kategori**: E-1 (Maintenance), E-9 (Other Expense), I-1 (Inventory)
