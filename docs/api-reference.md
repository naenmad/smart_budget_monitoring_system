# Referensi API — Smart Budget Monitoring & QC System

> Base URL: `/api/v1`  
> Autentikasi: JWT Bearer Token (Header: `Authorization: Bearer <token>`)  
> Format Response: JSON  
> Dokumentasi Interaktif: [Swagger UI](http://localhost:5001/apidocs/)

---

## Daftar Isi

1. [Authentication & Users](#1-authentication--users)
2. [Kategori (Master Data)](#2-kategori-master-data)
3. [Budget](#3-budget)
4. [Planning Upload](#4-planning-upload)
5. [PR/PO Data](#5-prpo-data)
6. [PR Pipeline & Dashboard](#6-pr-pipeline--dashboard)
7. [Classification (AI)](#7-classification-ai)
8. [Mapping (Item → Planning)](#8-mapping-item--planning)
9. [Item Mapping (Master Rule)](#9-item-mapping-master-rule)
10. [Upload History](#10-upload-history)

---

## Konvensi Umum

### Response Sukses
```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": { ... }
}
```

### Response Error
```json
{
  "success": false,
  "message": "Pesan error deskriptif"
}
```

### HTTP Status Codes

| Code | Arti |
|:-----|:-----|
| `200` | OK — Request berhasil |
| `201` | Created — Resource baru berhasil dibuat |
| `400` | Bad Request — Input tidak valid |
| `401` | Unauthorized — Token tidak ada atau kadaluarsa |
| `403` | Forbidden — Role tidak memiliki akses |
| `404` | Not Found — Resource tidak ditemukan |
| `500` | Internal Server Error |

---

## 1. Authentication & Users

**Prefix**: `/api/v1/users`

### POST `/login`
Autentikasi user dan dapatkan JWT token.

| Parameter | Tipe | Wajib | Keterangan |
|:----------|:-----|:------|:-----------|
| `username` | string | ✅ | Username akun |
| `password` | string | ✅ | Password akun |

**Response** (200):
```json
{
  "success": true,
  "message": "Login berhasil",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "is_active": true
  }
}
```

---

### GET `/`
Daftar semua user. 🔒 **Requires**: `admin`

**Response** (200):
```json
{
  "success": true,
  "data": [
    { "id": 1, "username": "admin", "role": "admin", "is_active": true }
  ]
}
```

---

### POST `/`
Buat user baru. 🔒 **Requires**: `admin`

| Parameter | Tipe | Wajib | Keterangan |
|:----------|:-----|:------|:-----------|
| `username` | string | ✅ | Username baru (unique) |
| `password` | string | ✅ | Password (min. 6 karakter) |
| `role` | string | ✅ | `admin` atau `manager` |

---

### PUT `/<id>`
Update user. 🔒 **Requires**: `admin`

---

### DELETE `/<id>`
Hapus user. 🔒 **Requires**: `admin`

---

### PUT `/change-password`
Ganti password user yang sedang login. 🔒 **Requires**: Token valid

| Parameter | Tipe | Wajib | Keterangan |
|:----------|:-----|:------|:-----------|
| `old_password` | string | ✅ | Password lama |
| `new_password` | string | ✅ | Password baru (min. 6 karakter) |

---

## 2. Kategori (Master Data)

**Prefix**: `/api/v1/kategoris`

### GET `/`
Daftar semua kategori budget.

**Response** (200):
```json
{
  "success": true,
  "data": [
    { "id": 1, "kode": "E-1", "nama": "Maintenance", "tipe_formulir": "OPEX" },
    { "id": 2, "kode": "E-9", "nama": "Other Expense", "tipe_formulir": "OPEX" },
    { "id": 3, "kode": "I-1", "nama": "Inventory", "tipe_formulir": "CAPEX" }
  ]
}
```

### POST `/`
Buat kategori baru. 🔒 **Requires**: `admin`

### PUT `/<id>`
Update kategori. 🔒 **Requires**: `admin`

### DELETE `/<id>`
Hapus kategori. 🔒 **Requires**: `admin`

---

## 3. Budget

**Prefix**: `/api/v1/budgets`

### GET `/`
Daftar budget, support filter.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `periode` | string | Filter tahun (contoh: `2026`) |
| `kategori_id` | integer | Filter kategori |

### GET `/summary`
Ringkasan budget per kategori untuk satu periode.

| Query Param | Tipe | Wajib | Keterangan |
|:------------|:-----|:------|:-----------|
| `periode` | string | ✅ | Tahun anggaran |

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "kategori": "E-1",
      "nominal_budget": 500000000,
      "total_realisasi": 320000000,
      "sisa_budget": 180000000,
      "persentase": 64.0
    }
  ]
}
```

### POST `/upload`
Upload file Excel budget. 🔒 **Requires**: `admin`

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `file` | File (multipart) | File `.xlsx` |
| `periode` | string | Tahun anggaran |

---

## 4. Planning Upload

**Prefix**: `/api/v1/planning`

### POST `/upload`
Upload file planning budget (Excel). 🔒 **Requires**: `admin`

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `file` | File (multipart) | File `.xlsx` |
| `periode` | string | Tahun planning |

### GET `/headers`
Daftar planning header (riwayat upload planning).

### GET `/details`
Daftar detail item planning.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `periode` | string | Filter tahun |
| `kategori_id` | integer | Filter kategori |

---

## 5. PR/PO Data

**Prefix**: `/api/v1/pr-po-data`

### GET `/`
Daftar data PR/PO dengan filter lengkap.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `upload_id` | integer | Filter berdasarkan batch upload |
| `status_ai` | string | `WAITING`, `PROCESSING`, `DONE`, `FAILED`, `NEED_MAPPING`, `CANCELLED` |
| `kategori_id` | integer | Filter kategori |
| `budget_status` | string | `ON_PLAN`, `OVER_PLAN`, `UNDER_PLAN`, `OOP` |
| `perlu_review` | boolean | Filter yang butuh review manual |
| `page` | integer | Halaman (default: 1) |
| `per_page` | integer | Per halaman (default: 20) |

### GET `/<id>`
Detail satu data PR/PO.

### PUT `/<id>/review`
Review manual klasifikasi AI. 🔒 **Requires**: Token valid

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `kategori_id` | integer | ID kategori yang benar |

### PUT `/<id>/cancel`
Batalkan item PR/PO. 🔒 **Requires**: Token valid

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `alasan` | string | Alasan pembatalan |

---

## 6. PR Pipeline & Dashboard

**Prefix**: `/api/v1/pr`

### POST `/upload`
Upload file Excel PR/PO dan jalankan AI pipeline. 🔒 **Requires**: `admin`

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `file` | File (multipart) | File `.xlsx` PR/PO |
| `periode` | string | Tahun periode |

### POST `/retry-pipeline`
Retry pipeline untuk item yang gagal / NEED_MAPPING. 🔒 **Requires**: Token valid

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `pr_ids` | array[int] | Daftar ID PR yang ingin di-retry |
| `periode` | string | Periode tahun |

### GET `/dashboard_summary`
Summary statistik untuk dashboard utama.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `periode` | string | Tahun anggaran |

### GET `/dashboard_summary_monthly`
Summary bulanan untuk grafik pipeline.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `periode` | string | Tahun anggaran |

---

## 7. Classification (AI)

**Prefix**: `/api/v1/classification`

### GET `/data`
Dataset klasifikasi lengkap dengan statistik.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `page` | integer | Halaman |
| `per_page` | integer | Per halaman |
| `metode` | string | `RULE_BASE`, `REGEX`, `SVM`, `MANUAL` |

### POST `/predict`
Prediksi kategori untuk satu teks. 🔒 **Requires**: `admin`

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `text` | string | Deskripsi PR/PO yang ingin diprediksi |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "predicted_category": "E-1",
    "method": "SVM Model",
    "confidence": 0.89
  }
}
```

---

## 8. Mapping (Item → Planning)

**Prefix**: `/api/v1/mapping`

### GET `/candidates/<pr_id>`
Ambil kandidat planning detail yang cocok untuk satu PR.

### POST `/assign`
Assign mapping manual PR ke planning detail. 🔒 **Requires**: Token valid

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `pr_id` | integer | ID data PR |
| `planning_detail_id` | integer | ID planning detail tujuan |

### POST `/auto-approve`
Auto-approve mapping berdasarkan threshold confidence. 🔒 **Requires**: `admin`

---

## 9. Item Mapping (Master Rule)

**Prefix**: `/api/v1/item-mappings`

### GET `/`
Daftar semua aturan item mapping.

### GET `/suggestions`
Saran keyword mapping berdasarkan data historis.

### POST `/`
Buat aturan mapping baru. 🔒 **Requires**: `admin`

| Parameter | Tipe | Keterangan |
|:----------|:-----|:-----------|
| `keyword` | string | Keyword yang akan di-match |
| `planning_item` | string | Item planning tujuan |
| `kategori_id` | integer | ID kategori |
| `priority` | integer | Prioritas (semakin kecil, semakin tinggi) |

### PUT `/<id>`
Update aturan mapping. 🔒 **Requires**: `admin`

### DELETE `/<id>`
Hapus aturan mapping. 🔒 **Requires**: `admin`

---

## 10. Upload History

**Prefix**: `/api/v1/upload-histories`

### GET `/`
Daftar riwayat upload file.

| Query Param | Tipe | Keterangan |
|:------------|:-----|:-----------|
| `page` | integer | Halaman |
| `per_page` | integer | Per halaman |

### GET `/<id>`
Detail satu upload history.

### DELETE `/<id>`
Hapus riwayat upload beserta data terkait. 🔒 **Requires**: `admin`

---

## Endpoint Utilitas

| Method | Path | Fungsi |
|:-------|:-----|:-------|
| `GET` | `/` | Developer Portal (landing page) |
| `GET` | `/health` | Health check backend |
| `GET` | `/db-test` | Test koneksi database |
| `GET` | `/apidocs/` | Swagger UI interaktif |
| `GET` | `/apispec_1.json` | OpenAPI specification JSON |
| `GET` | `/docs` | Redirect ke Swagger UI |

---

## Autentikasi JWT

### Flow Login

```
1. POST /api/v1/users/login { username, password }
2. Server validasi → generate JWT token (berlaku 8 jam)
3. Client simpan token di localStorage
4. Setiap request: Header "Authorization: Bearer <token>"
5. Token expired → 401 → client redirect ke /login
```

### Payload JWT

```json
{
  "user_id": 1,
  "username": "admin",
  "role": "admin",
  "exp": 1787743244,
  "iat": 1787714444
}
```

### Role & Permission Matrix

| Endpoint | `admin` | `manager` |
|:---------|:-------:|:---------:|
| Login | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Upload PR/PO/Budget/Planning | ✅ | ❌ |
| Manage Users | ✅ | ❌ |
| Classification Data (view) | ✅ | ✅ |
| AI Predict | ✅ | ❌ |
| Review Mapping | ✅ | ✅ |
| Manage Item Mapping | ✅ | ❌ |
| Manage Kategori | ✅ | ❌ |
| Change Own Password | ✅ | ✅ |
