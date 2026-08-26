# Panduan Diagnostik & Pemecahan Masalah (Troubleshooting)

> PT Summit Adyawinsa Indonesia — Smart Budget Monitoring & QC System  
> Referensi perbaikan cepat untuk kendala teknis backend, frontend, database, AI, dan container.

---

## Daftar Kasus Troubleshooting

1. [Vite HTTP Proxy Error (ECONNREFUSED)](#1-vite-http-proxy-error-econnrefused)
2. [Tampilan Mobile / iPhone Terlalu Zoom In Saat Input](#2-tampilan-mobile--iphone-terlalu-zoom-in-saat-input)
3. [Halaman Layar Putih (Blank Screen) / Error Render](#3-halaman-layar-putih-blank-screen--error-render)
4. [Akses Jaringan Lokal (IP HP) Gagal Memuat Data](#4-akses-jaringan-lokal-ip-hp-gagal-memuat-data)
5. [Konflik Port Docker (Port Already in Use)](#5-konflik-port-docker-port-already-in-use)
6. [Database Docker Kosong Setelah Pertama Kali Dijalankan](#6-database-docker-kosong-setelah-pertama-kali-dijalankan)
7. [Token JWT Kedaluwarsa / Sering Logout Sendiri](#7-token-jwt-kedaluwarsa--sering-logout-sendiri)
8. [File Excel Upload Gagal Diproses](#8-file-excel-upload-gagal-diproses)

---

## 1. Vite HTTP Proxy Error (ECONNREFUSED)

### Gejala
Di terminal frontend muncul pesan error:
```
[vite] http proxy error: /api/v1/users/login
AggregateError [ECONNREFUSED]
```

### Penyebab
Frontend React mencoba menghubungi backend di `http://localhost:5001`, namun server backend Flask sedang tidak aktif.

### Solusi
1. Pastikan backend aktif dengan menjalankan:
   ```bash
   cd backend
   source venv/bin/activate
   python app.py
   ```
2. Atau jika menggunakan Docker, pastikan container `sbms-backend` berstatus *Up (healthy)*:
   ```bash
   docker compose ps
   ```

---

## 2. Tampilan Mobile / iPhone Terlalu Zoom In Saat Input

### Gejala
Ketika pengguna mengetuk field input teks di browser Safari iOS (iPhone), layar otomatis melakukan *zoom-in* sehingga tata letak terpotong dan harus di-zoom out manual.

### Penyebab
iOS Safari secara otomatis memperbesar tampilan jika ukuran `font-size` pada elemen `<input>`, `<select>`, atau `<textarea>` berukuran kurang dari `16px`.

### Solusi
Pastikan seluruh elemen input pada CSS Modules menggunakan ukuran font minimal `16px` pada viewport mobile:
```css
@media (max-width: 768px) {
  .inputField,
  .selectField,
  input[type="text"],
  input[type="password"] {
    font-size: 16px !important;
  }
}
```

---

## 3. Halaman Layar Putih (Blank Screen) / Error Render

### Gejala
Salah satu halaman web (misal: *Model Klasifikasi AI* atau *Mapping Review*) hanya menampilkan layar kosong putih di desktop.

### Penyebab
Terjadi uncaught runtime JavaScript exception, umumnya akibat mengakses properti dari objek `null` / `undefined` saat data API belum selesai di-fetch atau saat format payload API berbeda.

### Solusi
1. Buka **Browser DevTools** (tekan `F12` atau `Cmd+Option+I`), lalu periksa tab **Console**.
2. Gunakan *optional chaining* (`data?.items?.map(...)`) dan *fallback default values* di komponen React:
   ```jsx
   const classifications = data?.data || []
   ```
3. Pastikan `react-hot-toast` atau modal dialog membungkus state kondisional dengan aman.

---

## 4. Akses Jaringan Lokal (IP HP) Gagal Memuat Data

### Gejala
Frontend dibuka di HP via IP Wi-Fi (misal: `http://172.20.10.3:5173/`), halaman login tampil, tetapi saat diklik login atau navigasi, data gagal dimuat (Network Error).

### Penyebab
Vite dev server berjalan di komputer dengan IP lokal, namun konfigurasi Axios atau proxy menunjuk ke alamat `localhost` yang tidak dapat dijangkau dari perangkat eksternal HP.

### Solusi
1. Jalankan Vite dev server dengan flag host:
   ```bash
   npm run dev -- --host
   ```
2. Gunakan relative path `/api/v1` pada Axios baseURL (yang otomatis dialihkan melalui Vite proxy).
3. Jika menggunakan Docker di jaringan lokal, buka `http://<IP_KOMPUTER>:5173` di mana Nginx langsung meneruskan request ke backend container via internal network.

---

## 5. Konflik Port Docker (Port Already in Use)

### Gejala
Pesan error saat menjalankan `docker compose up -d`:
```
Error response from daemon: driver failed programming external connectivity on endpoint sbms-mysql: Bind for 0.0.0.0:3306 failed: port is already allocated
```

### Penyebab
Port `3306` (MySQL) atau port `5173` (Vite) sedang digunakan oleh proses lokal native di laptop Anda.

### Solusi
* **Solusi A (Matikan Service Lokal)**:
  ```bash
  brew services stop mysql
  # Lalu jalankan Docker kembali
  docker compose up -d
  ```
* **Solusi B (Gunakan Custom Port Mapping Tanpa Mematikan Dev Lokal)**:
  ```bash
  MYSQL_PORT=3307 FRONTEND_PORT=5174 docker compose up -d
  ```

---

## 6. Database Docker Kosong Setelah Pertama Kali Dijalankan

### Gejala
Login selalu gagal dengan pesan *Username atau password salah* setelah fresh install Docker.

### Penyebab
File `schema.sql` hanya membuat struktur tabel (*DDL*), data akun admin default dan master kategori belum di-seed.

### Solusi
Jalankan perintah seeder di dalam container backend:
```bash
docker compose exec backend python database/seed.py
```
Akun default akan terbuat:
* **Username**: `admin`
* **Password**: `admin123`

---

## 7. Token JWT Kedaluwarsa / Sering Logout Sendiri

### Gejala
Sistem tiba-tiba kembali ke halaman login saat sedang membuka menu atau mengunggah data.

### Penyebab
Secara standar, token JWT berlaku selama **8 jam** (sesuai shift jam kerja di `backend/utils/auth.py`). Axios response interceptor otomatis mengarahkan ke `/login` jika menerima status HTTP 401 Unauthorized.

### Solusi
1. Cukup lakukan login kembali untuk mendapatkan token sesi baru yang valid.
2. Jika ingin memperpanjang durasi token untuk keperluan development, ubah nilai `JWT_EXPIRES_HOURS` di `backend/utils/auth.py`.

---

## 8. File Excel Upload Gagal Diproses

### Gejala
Pesan error saat mengunggah file PR/PO atau Planning Budget: *Format file tidak sesuai* atau *Kolom wajib tidak ditemukan*.

### Penyebab
Struktur kolom spreadsheet Excel tidak sesuai dengan template standar sistem (misal nama header huruf besar/kecil berbeda atau format tanggal tidak valid).

### Solusi
Pastikan file Excel berformat `.xlsx` dengan susunan kolom standar:
* **File PR/PO**: Memuat kolom `Requisition ID`, `PR Doc Num`, `PO Doc Num`, `Request Date`, `Description`, `Total Price`, `Supplier Name`.
* **File Planning**: Memuat kolom `Kategori`, `Bulan` (Jan–Dec), `Item`, `Planning Amount`.
