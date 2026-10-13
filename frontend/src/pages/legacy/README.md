# Folder Modul Legacy (Arsip PR & AI Matching)

Folder ini berisi halaman modul lama yang sebelumnya digunakan untuk:
1. Upload file Purchase Requisition (PR) mentah dari SAP (`PrUpload.jsx`, `PrHistory.jsx`)
2. Verifikasi & Matching fuzzy nama item PR ke Planning (`PrVerification.jsx`, `PrResult.jsx`, `MappingReview.jsx`, `MappingGraph.jsx`)
3. Kamus sinonim barang (`ItemMapping.jsx`)
4. Evaluasi model Machine Learning SVM (`Classification.jsx`)

---

### Cara Mengaktifkan Kembali (Restore ke Sidebar Menu)
Jika sewaktu-waktu modul ini ingin dimunculkan lagi di navigasi Sidebar:
1. Buka file `frontend/src/components/Sidebar.jsx`
2. Ubah baris:
   ```javascript
   export const SHOW_LEGACY_MODULES = false
   ```
   menjadi:
   ```javascript
   export const SHOW_LEGACY_MODULES = true
   ```
Menu "Purchase Requisition" dan "Master Data & AI" akan langsung otomatis muncul kembali di sidebar!

---

### Cara Menghapus Permanen (Permanent Deletion)
Jika sudah yakin 100% tidak akan digunakan lagi di masa depan:
1. Hapus folder ini: `rm -rf frontend/src/pages/legacy`
2. Hapus blok rute legacy di `frontend/src/App.jsx`
3. Hapus konfigurasi `LEGACY_MENU_CONFIG` di `frontend/src/components/Sidebar.jsx`
