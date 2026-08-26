# Panduan Frontend — Smart Budget Monitoring & QC System

> React 19 + Vite 8 + CSS Modules  
> Icon Library: Lucide React · Charts: Recharts · State: React Query

---

## Daftar Isi

1. [Halaman & Fitur](#1-halaman--fitur)
2. [Design System](#2-design-system)
3. [State Management](#3-state-management)
4. [Komponen Reusable](#4-komponen-reusable)
5. [Fitur Khusus](#5-fitur-khusus)

---

## 1. Halaman & Fitur

### Login (`/login`)
- Autentikasi username + password
- JWT token disimpan di localStorage
- Redirect otomatis ke `/dashboard` setelah login berhasil
- Responsive: mendukung tampilan mobile

### Dashboard (`/dashboard`)
- **Metric Cards**: Total PR, PR Terklasifikasi, Budget Terpakai, Pipeline Aktif
- **Budget Chart**: Visualisasi perbandingan budget vs realisasi per kategori (Recharts)
- **Monthly Pipeline Chart**: Grafik batang bulanan alur PR/PO
- **Filter Periode**: Dropdown tahun untuk filtrasi data

### Budget Management (`/budget`) — Admin Only
- Tabel anggaran per kategori per periode
- Upload file Excel budget
- Summary: nominal budget, total realisasi, sisa, persentase
- Export PDF & Excel

### AI Prediction (`/predict`) — Admin Only
- Input teks deskripsi PR/PO secara manual
- Prediksi kategori AI secara real-time
- Tampilkan metode (Rule Base / Regex / SVM) dan confidence score

### Classification Data (`/classification`)
- Dataset lengkap hasil klasifikasi AI
- Filter: metode klasifikasi, status, kategori
- Statistik akurasi per metode
- Pagination server-side

### User Management (`/users`) — Admin Only
- CRUD akun pengguna
- Role assignment (admin / manager)
- Toggle status aktif/nonaktif
- Ganti password (sendiri atau user lain oleh admin)

### Item Mapping (`/master/item-mapping`) — Admin Only
- CRUD aturan mapping keyword → planning item
- Saran keyword otomatis dari data historis
- Filter per kategori

### Planning Upload (`/planning/upload`) — Admin Only
- Upload file Excel rencana anggaran
- Preview data sebelum submit
- Parsing otomatis per bulan dan per item

### Planning List (`/planning/list`)
- Daftar planning detail dengan filter periode dan kategori
- Status realisasi: OPEN, PROSES, CLOSED, CANCELLED

### PR Upload (`/pr/upload`) — Admin Only
- Upload file Excel PR/PO
- Pipeline otomatis: klasifikasi AI → mapping → budget monitoring
- Progress indicator per batch

### PR History (`/pr/history`)
- Riwayat upload batch PR/PO
- Detail per batch: total data, tanggal upload, status

### PR Result (`/pr/result`)
- Hasil processing pipeline per item PR
- Status AI, budget status, metode klasifikasi
- Review & koreksi manual

### Mapping Review (`/pr/mapping-review`)
- Daftar PR yang butuh mapping manual (NEED_MAPPING)
- Kandidat planning detail dengan confidence score
- Assign / reject mapping
- Retry pipeline setelah mapping

---

## 2. Design System

### Warna & Token

Didefinisikan di `frontend/src/index.css`:

```css
:root {
  /* Primary & Accent Colors */
  --primary: #6366f1;        /* Indigo */
  --primary-hover: #4f46e5;
  --accent: #22d3ee;         /* Cyan accent */

  /* Neutral Palette */
  --bg-primary: #0f172a;     /* Dark background */
  --bg-secondary: #1e293b;
  --bg-card: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border: #334155;

  /* Semantic Colors */
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;
}
```

### Typography

- Font: **Plus Jakarta Sans** (Google Fonts)
- Fallback: system-ui, sans-serif

### Dark Mode

- Tema gelap adalah default
- Toggle via `ThemeContext.jsx`
- CSS variables swap pada `[data-theme="light"]`

---

## 3. State Management

### Server State: React Query

```jsx
import { useQuery, useMutation } from '@tanstack/react-query'

// GET data
const { data, isLoading } = useQuery({
  queryKey: ['budgets', periode],
  queryFn: () => budgetApi.getSummary(periode)
})

// POST/PUT/DELETE
const mutation = useMutation({
  mutationFn: (data) => userApi.create(data),
  onSuccess: () => queryClient.invalidateQueries(['users'])
})
```

**Konfigurasi default** (di `App.jsx`):
- `refetchOnWindowFocus: false`
- `retry: 1`
- `staleTime: 5 menit`

### Client State: React Context

| Context | State | Fungsi |
|:--------|:------|:-------|
| `AuthContext` | `user`, `token`, `isAuthenticated` | Login, logout, cek role |
| `ThemeContext` | `theme` (dark/light) | Toggle tema |

### Local Storage

| Key | Konten |
|:----|:-------|
| `token` | JWT token string |
| `user` | JSON user profile |

---

## 4. Komponen Reusable

| Komponen | Props Utama | Fungsi |
|:---------|:------------|:-------|
| `AppShell` | children | Layout wrapper (Sidebar + TopNavbar + content) |
| `ProtectedRoute` | `roles` (array) | Guard: redirect ke login jika tidak terautentikasi |
| `Sidebar` | — | Navigasi utama + menu items + link Swagger |
| `TopNavbar` | — | Search, theme toggle, user info |
| `CommandPalette` | — | Ctrl+K quick navigation |
| `MetricCard` | `title`, `value`, `icon`, `trend` | Kartu metrik dashboard |
| `BudgetCard` | `data` | Kartu summary budget |
| `BudgetChart` | `data` | Bar chart budget vs realisasi |
| `MonthlyPipelineChart` | `data` | Stacked bar chart bulanan |
| `DetailModal` | `prData`, `onClose` | Modal detail PR/PO |
| `ReviewModal` | `prData`, `kategoris`, `onSubmit` | Modal review klasifikasi |
| `FormTable` | `columns`, `data` | Tabel form data entry |
| `Tabs` | `items`, `activeTab` | Tab navigation |
| `AlertBanner` | `type`, `message` | Banner notifikasi |
| `SwitchComponent` | `checked`, `onChange` | Toggle switch |

---

## 5. Fitur Khusus

### Command Palette (Ctrl+K)

Navigasi cepat ke semua halaman melalui keyboard shortcut Ctrl+K.

### Export PDF/Excel

Tersedia di halaman Budget dan PR Result:
- **PDF**: `jsPDF` + `jspdf-autotable` (tabel otomatis)
- **Excel**: `xlsx` (SheetJS)

### Responsive Mobile

- Sidebar auto-collapse di layar kecil
- Layout card responsive (grid → stack)
- Touch-friendly button sizes

### Auto Token Refresh

Axios interceptor di `api.js` menangani:
- Auto-inject `Authorization: Bearer` header
- Auto-redirect ke `/login` jika response 401
- Clear localStorage & sessionStorage saat token expired
