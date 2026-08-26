import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  ArrowRight, 
  LayoutDashboard, 
  Database, 
  Cpu, 
  UploadCloud, 
  ListFilter, 
  DollarSign, 
  FileText, 
  History, 
  FileCheck, 
  CheckSquare, 
  Users,
  Sun,
  Moon,
  FileSpreadsheet,
  Table,
  Layers,
  PieChart,
  BarChart3,
  TrendingUp,
  Loader2,
  FileCode2,
  Tag,
  X
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { prApi } from '../api/prApi'
import { budgetApi } from '../api/budgetApi'
import { exportBudgetSummaryToExcel } from '../utils/exportReport'
import toast from 'react-hot-toast'
import s from './CommandPalette.module.css'

// 1. Master Search Index
const STATIC_ITEMS = [
  // ── Halaman / Menu ──
  { path: '/dashboard', label: 'Dashboard Monitoring', type: 'page', category: 'Halaman', icon: LayoutDashboard, keywords: 'overview ringkasan beranda home summary statistik realisasi budget' },
  { path: '/master/item-mapping', label: 'Item Mapping Rules', type: 'page', category: 'Halaman', icon: Database, keywords: 'master data keyword aturan kata kunci mapping kamus sinonim pencocokan' },
  { path: '/classification', label: 'Model Klasifikasi AI (SVM & TF-IDF)', type: 'page', category: 'Halaman', icon: Cpu, keywords: 'machine learning ai klasifikasi kategori svm support vector machine akurasi confidence matrix' },
  { path: '/planning/upload', label: 'Upload Planning Anggaran', type: 'page', category: 'Halaman', icon: UploadCloud, keywords: 'import excel upload planning anggaran master pagu tahunan template rencana' },
  { path: '/planning/list', label: 'Daftar Planning Anggaran', type: 'page', category: 'Halaman', icon: ListFilter, keywords: 'list planning daftar rencana anggaran e-1 e-9 i-1 bulanan pagu detail' },
  { path: '/budget', label: 'Budget Monitoring & Setup', type: 'page', category: 'Halaman', icon: DollarSign, keywords: 'budget setting setup anggaran tahunan pagu capex opex saldo sisa' },
  { path: '/pr/upload', label: 'Upload Purchase Requisition', type: 'page', category: 'Halaman', icon: FileText, keywords: 'upload import pr purchase requisition po purchase order data excel' },
  { path: '/pr/history', label: 'Riwayat PR / PO Upload', type: 'page', category: 'Halaman', icon: History, keywords: 'history riwayat log unggahan pr po tanggal pengupload batch data' },
  { path: '/pr/result', label: 'Result Matching & Validasi', type: 'page', category: 'Halaman', icon: FileCheck, keywords: 'result matching hasil validasi status pr planning oop overplan underplan' },
  { path: '/pr/mapping-review', label: 'Mapping Review & Bulk Action', type: 'page', category: 'Halaman', icon: CheckSquare, keywords: 'review validasi bulk action konfirmasi manual need mapping persetujuan massal batch' },
  { path: '/users', label: 'Kelola Pengguna Sistem', type: 'page', category: 'Halaman', icon: Users, keywords: 'user manajemen role admin viewer manager user pengaturan hak akses akun' },

  // ── Card & Widget ──
  { path: '/dashboard', label: 'Card: Budget Overview (Total, Terpakai, Saldo)', type: 'card', category: 'Card & Widget', icon: Layers, keywords: 'card total budget terpakai saldo overview ringkasan metrik dashboard pagu' },
  { path: '/dashboard', label: 'Card: Analisis CAPEX & OPEX', type: 'card', category: 'Card & Widget', icon: PieChart, keywords: 'card capex opex capital operational perbandingan grafik budget modal operasional' },
  { path: '/dashboard', label: 'Card: Status PR Pipeline (On Plan, Over, Under, OOP)', type: 'card', category: 'Card & Widget', icon: BarChart3, keywords: 'card status pipeline pr on plan over plan under plan out of plan need mapping cancelled' },
  { path: '/dashboard', label: 'Card: PR Tracking Stages (Stage PR, PO, GR)', type: 'card', category: 'Card & Widget', icon: TrendingUp, keywords: 'card tracking tahapan stage pr purchase requisition stage po order stage gr goods receipt' },
  { path: '/classification', label: 'Card: Metrik Akurasi & Confusion Matrix SVM', type: 'card', category: 'Card & Widget', icon: Cpu, keywords: 'card akurasi model svm precision recall f1-score confusion matrix tf-idf ai' },
  { path: '/budget', label: 'Card: Status Pagu Anggaran Aktif per Kategori', type: 'card', category: 'Card & Widget', icon: DollarSign, keywords: 'card pagu aktif e-1 e-9 i-1 limit budget monitoring' },

  // ── Tabel & Data ──
  { path: '/dashboard', label: 'Tabel: Rincian Form Budget (E-1, E-9, I-1)', type: 'table', category: 'Tabel & Data', icon: Table, keywords: 'tabel rincian form budget data realisasi persen persentase warning over saldo' },
  { path: '/pr/result', label: 'Tabel: Hasil Matching AI & Realisasi PR', type: 'table', category: 'Tabel & Data', icon: Table, keywords: 'tabel hasil matching result realisasi pr status ai kode kategori verifikasi' },
  { path: '/planning/list', label: 'Tabel: Rincian Anggaran Tahunan per Bulan', type: 'table', category: 'Tabel & Data', icon: Table, keywords: 'tabel detail planning per bulan januari desember amount nominal rencana' },
  { path: '/master/item-mapping', label: 'Tabel: Rule Keyword Mapping Kata Kunci', type: 'table', category: 'Tabel & Data', icon: Table, keywords: 'tabel mapping sinonim kamus aturan pencocokan item nama barang kata kunci' },
  { path: '/pr/mapping-review', label: 'Tabel: Antrian PR Butuh Konfirmasi Manual', type: 'table', category: 'Tabel & Data', icon: Table, keywords: 'tabel review need mapping fuzzy match score skor rank kandidat antrian' },

  // ── Aksi Cepat ──
  {
    actionKey: 'export_excel',
    label: 'Aksi: Export Laporan Realisasi Anggaran Resmi (Excel)',
    type: 'action',
    category: 'Aksi Cepat',
    icon: FileSpreadsheet,
    keywords: 'export download excel spreadsheet unduh xlsx laporan budget resmi realisasi file cetak'
  },
  {
    actionKey: 'toggle_theme',
    label: 'Aksi: Ganti Tema Aplikasi (Dark / Light Mode)',
    type: 'action',
    category: 'Aksi Cepat',
    icon: Sun,
    keywords: 'ganti tema dark mode light mode gelap terang tampilan warna toggle switch theme'
  },
  {
    path: '/pr/mapping-review',
    label: 'Aksi: Jalankan Bulk Approval / OOP Massal',
    type: 'action',
    category: 'Aksi Cepat',
    icon: CheckSquare,
    keywords: 'bulk action approve massal setujui bersamaan oop batch review centang semua'
  },
  {
    path: '/planning/upload',
    label: 'Aksi: Upload File Excel Anggaran Baru',
    type: 'action',
    category: 'Aksi Cepat',
    icon: UploadCloud,
    keywords: 'unggah import file excel planning baru tahun anggaran'
  }
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [livePrResults, setLivePrResults] = useState([])
  const [isSearchingLive, setIsSearchingLive] = useState(false)
  
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  // Detect OS for shortcut hint
  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return false
    return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent || '')
  }, [])
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K'

  // Global shortcut and custom event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleCustomOpen = () => {
      setIsOpen(true)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleCustomOpen)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleCustomOpen)
    }
  }, [])

  // Auto focus and reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setLivePrResults([])
      setIsSearchingLive(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Live Database Search when user types PR number / keyword
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setLivePrResults([])
      setIsSearchingLive(false)
      return
    }

    setIsSearchingLive(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await prApi.getAll({ search: trimmed, per_page: 6 })
        if (res.data?.data) {
          setLivePrResults(res.data.data)
        } else {
          setLivePrResults([])
        }
      } catch (err) {
        setLivePrResults([])
      } finally {
        setIsSearchingLive(false)
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [query])

  // Strict Multi-word Filtering for Static Items
  const filteredStaticItems = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return STATIC_ITEMS

    const words = q.split(/\s+/).filter(Boolean)

    return STATIC_ITEMS.filter(item => {
      const fullText = `${item.label} ${item.category} ${item.keywords || ''} ${item.path || ''}`.toLowerCase()
      // Every typed word must be present in the item
      return words.every(word => fullText.includes(word))
    })
  }, [query])

  // Strict Multi-word Filtering for Live PR Database Items
  const filteredLiveItems = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q || q.length < 2) return []

    const words = q.split(/\s+/).filter(Boolean)

    return livePrResults
      .filter(pr => {
        const prText = `${pr.pr_doc_num || ''} ${pr.description || ''} ${pr.supplier_name || ''} ${pr.budget_status || ''} ${pr.status_ai || ''}`.toLowerCase()
        return words.every(word => prText.includes(word))
      })
      .map(pr => ({
        path: `/pr/result?search=${encodeURIComponent(pr.pr_doc_num || pr.description || '')}`,
        label: `PR: ${pr.pr_doc_num || '-'} — ${pr.description || 'Tanpa Keterangan'}`,
        subText: `Supplier: ${pr.supplier_name || '-'} | Status: ${pr.budget_status || pr.status_ai || '-'} | Rp ${Number(pr.total_price || 0).toLocaleString('id-ID')}`,
        type: 'pr_doc',
        category: 'Data Dokumen PR',
        icon: FileCode2,
        rawPr: pr
      }))
  }, [livePrResults, query])

  // Combine results
  const combinedItems = useMemo(() => {
    return [...filteredStaticItems, ...filteredLiveItems]
  }, [filteredStaticItems, filteredLiveItems])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [combinedItems.length])

  // Handle Action / Navigation
  const handleExecute = async (item) => {
    if (!item) return

    if (item.actionKey === 'toggle_theme') {
      toggleTheme()
      toast.success(theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap')
    } else if (item.actionKey === 'export_excel') {
      try {
        toast.loading('Menyiapkan laporan Excel...', { id: 'excel_export' })
        const currYear = String(new Date().getFullYear())
        const res = await budgetApi.getSummary(currYear)
        if (res.success && res.data) {
          exportBudgetSummaryToExcel({
            periode: currYear,
            capex: res.data.capex,
            opex: res.data.opex,
            items: res.data.items || []
          })
          toast.success('Laporan Excel berhasil diunduh!', { id: 'excel_export' })
        } else {
          toast.error('Gagal mengambil data budget', { id: 'excel_export' })
        }
      } catch (err) {
        toast.error('Terjadi kesalahan saat export', { id: 'excel_export' })
      }
    } else if (item.path) {
      navigate(item.path)
    }
    setIsOpen(false)
  }

  const handleModalKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, combinedItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && combinedItems.length > 0) {
      e.preventDefault()
      handleExecute(combinedItems[selectedIndex])
    }
  }

  if (!isOpen) return null

  return (
    <div className={s.overlay} onClick={() => setIsOpen(false)}>
      <div 
        className={s.modal} 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleModalKeyDown}
      >
        <div className={s.inputWrapper}>
          <Search className={s.searchIcon} size={18} />
          <input
            ref={inputRef}
            className={s.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari halaman, card, tabel, nomor PR/PO... (${shortcutLabel})`}
          />
          {query && (
            <button
              type="button"
              className={s.clearBtn}
              onClick={() => setQuery('')}
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
          {isSearchingLive && (
            <Loader2 size={15} className={`animate-spin ${s.liveSearchSpinner}`} />
          )}
          <div className={s.shortcutHint}>
            <kbd className={s.kbd}>{shortcutLabel}</kbd>
          </div>
        </div>

        <div className={s.results}>
          {combinedItems.length > 0 ? (
            <div className={s.list}>
              {combinedItems.map((item, i) => {
                const IconComponent = item.icon || Tag
                return (
                  <div
                    key={(item.path || '') + (item.label || '') + i}
                    className={`${s.item} ${i === selectedIndex ? s.itemActive : ''}`}
                    onClick={() => handleExecute(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className={s.itemContent}>
                      <div className={`${s.itemIconWrap} ${s['type_' + item.type] || ''}`}>
                        <IconComponent size={16} />
                      </div>
                      <div className={s.itemDetails}>
                        <div className={s.itemMainLine}>
                          <span className={s.itemLabel}>{item.label}</span>
                          <span className={s.itemCategory}>{item.category}</span>
                        </div>
                        {item.subText && (
                          <div className={s.itemSubText}>{item.subText}</div>
                        )}
                      </div>
                    </div>
                    {i === selectedIndex && <ArrowRight size={15} className={s.enterIcon} />}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={s.noResults}>
              Tidak ditemukan halaman, card, tabel, atau nomor PR untuk "{query}"
            </div>
          )}
        </div>
        
        <div className={s.footerHint}>
          <span className={s.footerSectionTag}>
            {query.trim() ? `${combinedItems.length} hasil ditemukan` : 'Pencarian Universal: Halaman, Card, Tabel, Dokumen PR'}
          </span>
          <div className={s.footerKeys}>
            <span><kbd className={s.kbd}>↑</kbd> <kbd className={s.kbd}>↓</kbd> Navigasi</span>
            <span><kbd className={s.kbd}>↵</kbd> Buka</span>
            <span><kbd className={s.kbd}>ESC</kbd> Tutup</span>
          </div>
        </div>
      </div>
    </div>
  )
}
