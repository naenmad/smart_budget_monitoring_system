import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { entertaintApi } from '../api/entertaintApi'
import s from './EntertaintCost.module.css'
import {
  Receipt,
  Plus,
  Download,
  Upload,
  UploadCloud,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  User,
  RotateCw,
  ZoomIn,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  MapPin,
  Database,
  TrendingUp
} from 'lucide-react'

const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0'
  return `Rp ${Number(num).toLocaleString('id-ID')}`
}

export default function EntertaintCost() {
  // Navigation Tabs: 'claims' | 'cashflow' | 'masters'
  const [currentMainTab, setCurrentMainTab] = useState('claims')

  // -------------------------------------------------------------
  // TAB 1: CLAIMS STATE
  // -------------------------------------------------------------
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [pic, setPic] = useState('')
  const [statusPembayaran, setStatusPembayaran] = useState('')
  const [statusClaim, setStatusClaim] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Modal Form State (Create / Edit Claim)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [activeFormTab, setActiveFormTab] = useState('umum')

  // Initial Form Fields
  const initialFormState = {
    tanggal: new Date().toISOString().slice(0, 10),
    deskripsi: '',
    status_pembayaran: 'BELUM_DIBAYAR',
    status_claim: 'OPEN',
    pic_entertaint: '',
    customer: '',
    place_of_occurrence: '',
    customer_member: '',
    sai_member: '',
    tanggal_kasbon: '',
    total_kasbon: '',
    status_kasbon: 'Belum Lunas',
    tanggal_closing: '',
    keterangan: '',
    part_no: '',
    part_name: '',
    problem: '',
    problem_maker: '',
    qty_problem: '',
    struk_1: '',
    struk_2: '',
    struk_3: '',
    struk_4: '',
    total_amount: ''
  }
  const [formData, setFormData] = useState(initialFormState)

  // Receipt Attachments State
  const [selectedFiles, setSelectedFiles] = useState([])
  const [filePreviews, setFilePreviews] = useState([])
  const [existingReceipts, setExistingReceipts] = useState([])
  const fileInputRef = useRef(null)

  // Lightbox State
  const [lightboxData, setLightboxData] = useState(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  const [lightboxRotation, setLightboxRotation] = useState(0)

  // -------------------------------------------------------------
  // TAB 2: CASHFLOW / KASBON STATE
  // -------------------------------------------------------------
  const [cashflowList, setCashflowList] = useState([])
  const [cashflowSummary, setCashflowSummary] = useState(null)
  const [cashflowLoading, setCashflowLoading] = useState(false)
  const [isCashflowModalOpen, setIsCashflowModalOpen] = useState(false)
  const [cashflowFormData, setCashflowFormData] = useState({
    doc_no: '',
    tanggal: new Date().toISOString().slice(0, 10),
    flow_type: 'OUT',
    account_deskripsi: '',
    uang_masuk: '',
    uang_keluar: '',
    status_entertaint: 'Open',
    keterangan: ''
  })

  // -------------------------------------------------------------
  // TAB 3: MASTER DATA STATE
  // -------------------------------------------------------------
  const [masterData, setMasterData] = useState({ customers: [], pics: [], places: [], customer_members: [], total: 0 })
  const [newMasterCustomer, setNewMasterCustomer] = useState('')
  const [newMasterPic, setNewMasterPic] = useState('')
  const [newMasterPlace, setNewMasterPlace] = useState('')
  const [newMasterMember, setNewMasterMember] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // -------------------------------------------------------------
  // EXCEL IMPORT STATE
  // -------------------------------------------------------------
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)

  // -------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await entertaintApi.getAll({
        page,
        per_page: 15,
        search,
        customer,
        pic,
        status_pembayaran: statusPembayaran,
        status_claim: statusClaim,
        start_date: startDate,
        end_date: endDate
      })
      if (res.data?.success) {
        setItems(res.data.data || [])
        setTotalPages(res.data.pages || 1)
        setTotalRecords(res.data.total || 0)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data Entertainment Cost')
    } finally {
      setLoading(false)
    }
  }, [page, search, customer, pic, statusPembayaran, statusClaim, startDate, endDate])

  const fetchSummary = useCallback(async () => {
    try {
      const res = await entertaintApi.getSummary()
      if (res.data?.success) {
        setSummary(res.data.data)
      }
    } catch (err) {
      console.error('Gagal memuat summary:', err)
    }
  }, [])

  const fetchCashflow = useCallback(async () => {
    setCashflowLoading(true)
    try {
      const res = await entertaintApi.getCashflows({ per_page: 100 })
      if (res.data?.success) {
        setCashflowList(res.data.data || [])
        setCashflowSummary(res.data.summary)
      }
    } catch (err) {
      console.error('Gagal memuat buku kas kasbon:', err)
    } finally {
      setCashflowLoading(false)
    }
  }, [])

  const fetchMasters = useCallback(async () => {
    try {
      const res = await entertaintApi.getMasters()
      if (res.data?.success) {
        setMasterData(res.data.data)
      }
    } catch (err) {
      console.error('Gagal memuat data master referensi:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchSummary()
    fetchCashflow()
    fetchMasters()
  }, [fetchSummary, fetchCashflow, fetchMasters])

  // Recalculate Total Struk from Struk #1 - #4
  const handleStrukChange = (field, val) => {
    const updated = { ...formData, [field]: val }
    const s1 = parseFloat(updated.struk_1 || 0)
    const s2 = parseFloat(updated.struk_2 || 0)
    const s3 = parseFloat(updated.struk_3 || 0)
    const s4 = parseFloat(updated.struk_4 || 0)
    const sum = s1 + s2 + s3 + s4
    if (sum > 0) {
      updated.total_amount = String(sum)
    }
    setFormData(updated)
  }

  // Export Excel
  const handleExport = async () => {
    const toastId = toast.loading('Membuat laporan Excel multi-sheet beserta foto struk...')
    try {
      await entertaintApi.exportExcel({
        search,
        customer,
        pic,
        status_pembayaran: statusPembayaran,
        status_claim: statusClaim,
        start_date: startDate,
        end_date: endDate
      })
      toast.success('Laporan Excel 4 Sheet (termasuk Foto Struk) berhasil diunduh', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengekspor laporan Excel', { id: toastId })
    }
  }

  // Import Excel Handler
  const handleImportSubmit = async (e) => {
    e.preventDefault()
    if (!importFile) {
      toast.error('Pilih file Excel (.xlsx) terlebih dahulu')
      return
    }

    const formDataUpload = new FormData()
    formDataUpload.append('file', importFile)

    setIsImporting(true)
    setImportResult(null)
    const toastId = toast.loading('Mengunggah dan menyinkronkan data Excel...')

    try {
      const res = await entertaintApi.importExcel(formDataUpload)
      toast.success(res.message || 'Import Excel berhasil diproses!', { id: toastId })
      setImportResult(res.data)
      fetchData()
      fetchSummary()
      fetchCashflow()
      fetchMasters()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.message || 'Gagal memproses file Excel'
      toast.error(msg, { id: toastId })
    } finally {
      setIsImporting(false)
    }
  }

  // Open Create Claim Modal
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData(initialFormState)
    setSelectedFiles([])
    setFilePreviews([])
    setExistingReceipts([])
    setActiveFormTab('utama')
    setIsFormModalOpen(true)
  }

  // Open Edit Claim Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setFormData({
      tanggal: item.tanggal ? item.tanggal.slice(0, 10) : '',
      deskripsi: item.deskripsi || '',
      struk_1: item.struk_1 ? String(item.struk_1) : '',
      struk_2: item.struk_2 ? String(item.struk_2) : '',
      struk_3: item.struk_3 ? String(item.struk_3) : '',
      struk_4: item.struk_4 ? String(item.struk_4) : '',
      total_amount: item.total_amount !== null ? String(item.total_amount) : '',
      status_pembayaran: item.status_pembayaran || 'BELUM_DIBAYAR',
      status_claim: item.status_claim || 'OPEN',
      pic_entertaint: item.pic_entertaint || '',
      customer: item.customer || '',
      place_of_occurrence: item.place_of_occurrence || '',
      customer_member: item.customer_member || '',
      sai_member: item.sai_member || '',
      tanggal_kasbon: item.tanggal_kasbon ? item.tanggal_kasbon.slice(0, 10) : '',
      total_kasbon: item.total_kasbon !== null ? String(item.total_kasbon) : '',
      status_kasbon: item.status_kasbon || 'Belum Lunas',
      tanggal_closing: item.tanggal_closing ? item.tanggal_closing.slice(0, 10) : '',
      keterangan: item.keterangan || '',
      part_no: item.part_no || '',
      part_name: item.part_name || '',
      problem: item.problem || '',
      problem_maker: item.problem_maker || '',
      qty_problem: item.qty_problem !== null && item.qty_problem !== undefined ? String(item.qty_problem) : ''
    })
    setSelectedFiles([])
    setFilePreviews([])
    setExistingReceipts(item.receipts || [])
    setActiveFormTab('utama')
    setIsFormModalOpen(true)
  }

  // Receipt File Select
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setSelectedFiles((prev) => [...prev, ...files])
    const newPreviews = files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`
    }))
    setFilePreviews((prev) => [...prev, ...newPreviews])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveNewFile = (index) => {
    if (filePreviews[index]?.url) URL.revokeObjectURL(filePreviews[index].url)
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteExistingReceipt = async (receiptId) => {
    if (!confirm('Hapus foto struk ini secara permanen?')) return
    try {
      const res = await entertaintApi.deleteReceipt(receiptId)
      if (res.data?.success) {
        setExistingReceipts((prev) => prev.filter((r) => r.id !== receiptId))
        toast.success('Foto struk berhasil dihapus')
        fetchData()
        fetchSummary()
      }
    } catch (err) {
      toast.error('Gagal menghapus foto struk')
    }
  }

  // Submit Claim Form
  const handleSubmitClaim = async (e) => {
    e.preventDefault()
    if (!formData.tanggal) return toast.error('Tanggal entertaint wajib diisi')
    if (!formData.deskripsi.trim()) return toast.error('Deskripsi entertaint wajib diisi')

    setIsSubmitting(true)
    const toastId = toast.loading(editingItem ? 'Menyimpan perubahan...' : 'Mencatat klaim & mengompres struk ke WebP...')

    try {
      if (editingItem) {
        await entertaintApi.update(editingItem.id, formData)
        if (selectedFiles.length > 0) {
          const filePayload = new FormData()
          selectedFiles.forEach((f) => filePayload.append('receipts', f))
          await entertaintApi.uploadReceipts(editingItem.id, filePayload)
        }
        toast.success('Entertainment Cost berhasil diperbarui', { id: toastId })
      } else {
        const payload = new FormData()
        Object.entries(formData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) payload.append(k, v)
        })
        selectedFiles.forEach((f) => payload.append('receipts', f))
        await entertaintApi.create(payload)
        toast.success('Klaim dan struk (.webp) berhasil disimpan', { id: toastId })
      }

      setIsFormModalOpen(false)
      fetchData()
      fetchSummary()
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Gagal menyimpan data', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Claim
  const handleDeleteClaim = async (item) => {
    if (!confirm(`Hapus catatan "${item.deskripsi}" beserta seluruh lampiran struknya?`)) return
    try {
      const res = await entertaintApi.delete(item.id)
      if (res.data?.success) {
        toast.success('Catatan berhasil dihapus')
        fetchData()
        fetchSummary()
      }
    } catch (err) {
      toast.error('Gagal menghapus catatan')
    }
  }

  // Cashflow Submit
  const handleCashflowSubmit = async (e) => {
    e.preventDefault()
    if (!cashflowFormData.account_deskripsi.trim()) return toast.error('Deskripsi transaksi kasbon wajib diisi')

    try {
      const res = await entertaintApi.createCashflow(cashflowFormData)
      if (res.data?.success) {
        toast.success('Transaksi kasbon berhasil dicatat')
        setIsCashflowModalOpen(false)
        setCashflowFormData({
          doc_no: '',
          tanggal: new Date().toISOString().slice(0, 10),
          flow_type: 'OUT',
          account_deskripsi: '',
          uang_masuk: '',
          uang_keluar: '',
          status_entertaint: 'Open',
          keterangan: ''
        })
        fetchCashflow()
        fetchSummary()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mencatat kasbon')
    }
  }

  const handleDeleteCashflow = async (id) => {
    if (!confirm('Hapus riwayat transaksi kasbon ini?')) return
    try {
      await entertaintApi.deleteCashflow(id)
      toast.success('Transaksi kasbon berhasil dihapus')
      fetchCashflow()
      fetchSummary()
    } catch (err) {
      toast.error('Gagal menghapus kasbon')
    }
  }

  // Master Items Handlers
  const handleAddMaster = async (category, name, setter) => {
    if (!name.trim()) return toast.error('Nama master tidak boleh kosong')
    try {
      const res = await entertaintApi.createMaster({ category, name: name.trim() })
      if (res.data?.success) {
        toast.success(`Berhasil menambahkan ke daftar ${category}`)
        setter('')
        fetchMasters()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan master item')
    }
  }

  const handleDeleteMaster = async (id, name) => {
    if (!confirm(`Hapus "${name}" dari master list?`)) return
    try {
      await entertaintApi.deleteMaster(id)
      toast.success('Item master berhasil dihapus')
      fetchMasters()
    } catch (err) {
      toast.error('Gagal menghapus item master')
    }
  }

  // Lightbox Handlers
  const handleOpenLightbox = (receiptList, initialIndex = 0) => {
    if (!receiptList || receiptList.length === 0) return
    setLightboxData({ receipts: receiptList, currentIndex: initialIndex })
    setLightboxZoom(1)
    setLightboxRotation(0)
  }

  return (
    <div className={s.container}>
      {/* ── Page Header ── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <Receipt size={26} color="var(--primary)" />
            Entertainment Cost & Kasbon QC
          </h1>
          <p className={s.subtitle}>
            Digitalisasi jamuan tamu, customer visit, closing problem QA, buku kas kasbon, dan pengarsipan struk terkompresi (.webp).
          </p>
        </div>

        <div className={s.actionButtons}>
          <Link to="/entertaint-analytics" className={s.btnSecondary} title="Buka Dashboard Visual & Analisis Statistik">
            <TrendingUp size={16} color="var(--primary)" />
            <span>Statistik & Analisis</span>
          </Link>
          <button
            onClick={() => {
              setIsImportModalOpen(true)
              setImportFile(null)
              setImportResult(null)
            }}
            className={s.btnSecondary}
            title="Upload dan Sinkronisasi File Excel (.xlsx)"
          >
            <Upload size={16} color="var(--primary)" />
            <span>Upload Excel</span>
          </button>
          <button onClick={handleExport} className={s.btnSecondary} title="Download Laporan Excel 4 Sheet (termasuk Foto Struk)">
            <Download size={16} />
            <span>Download Excel</span>
          </button>
          {currentMainTab === 'claims' && (
            <button onClick={handleOpenCreate} className={s.btnPrimary}>
              <Plus size={16} />
              <span>Catat Klaim Baru</span>
            </button>
          )}
          {currentMainTab === 'cashflow' && (
            <button onClick={() => setIsCashflowModalOpen(true)} className={s.btnPrimary}>
              <Plus size={16} />
              <span>Catat Mutasi Kasbon</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-Tab Navigation Bar ── */}
      <div className={s.tabNav}>
        <button
          onClick={() => setCurrentMainTab('claims')}
          className={`${s.tabBtn} ${currentMainTab === 'claims' ? s.tabBtnActive : ''}`}
        >
          <Receipt size={17} />
          <span>Klaim & Lampiran Struk</span>
          <span className={s.tabBadge}>{totalRecords}</span>
        </button>

        <button
          onClick={() => setCurrentMainTab('cashflow')}
          className={`${s.tabBtn} ${currentMainTab === 'cashflow' ? s.tabBtnActive : ''}`}
        >
          <Wallet size={17} />
          <span>Arus Kas Kasbon & Saldo QC</span>
          <span className={s.tabBadge}>{cashflowList.length}</span>
        </button>

        <button
          onClick={() => setCurrentMainTab('masters')}
          className={`${s.tabBtn} ${currentMainTab === 'masters' ? s.tabBtnActive : ''}`}
        >
          <Database size={17} />
          <span>Master Referensi (PT & PIC)</span>
          <span className={s.tabBadge}>{masterData.total || 62}</span>
        </button>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
            <Receipt size={22} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Total Biaya Klaim</span>
            <span className={s.statVal}>{formatRp(summary?.total_amount || 0)}</span>
            <span className={s.statSub}>{summary?.count_total || 0} Aktivitas Dicatat</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Klaim Lunas (Sudah Dibayar)</span>
            <span className={s.statVal} style={{ color: '#16a34a' }}>{formatRp(summary?.total_lunas || 0)}</span>
            <span className={s.statSub}>{summary?.count_lunas || 0} Klaim Selesai</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
            <Clock size={22} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Belum Dibayar</span>
            <span className={s.statVal} style={{ color: '#dc2626' }}>{formatRp(summary?.total_belum_lunas || 0)}</span>
            <span className={s.statSub}>{summary?.count_belum_dibayar || 0} Menunggu Pembayaran</span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <Wallet size={22} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Sisa Saldo Kasbon QC</span>
            <span className={s.statVal} style={{ color: '#d97706' }}>
              {formatRp(cashflowSummary?.current_balance ?? summary?.cashflow_balance ?? 0)}
            </span>
            <span className={s.statSub}>Balance Arus Kasbon</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: CLAIMS TAB                                        */}
      {/* ========================================================= */}
      {currentMainTab === 'claims' && (
        <>
          {/* Search & Filters */}
          <div className={s.filterCard}>
            <div className={s.filterRow}>
              <div className={s.searchBox}>
                <Search size={16} className={s.searchIcon} />
                <input
                  type="text"
                  className={s.searchInput}
                  placeholder="Cari deskripsi, customer, PIC, part no..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>

              {/* Customer Dropdown from Master */}
              <select
                className={s.selectInput}
                value={customer}
                onChange={(e) => {
                  setCustomer(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Customer: Semua</option>
                {masterData.customers?.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* PIC Dropdown from Master */}
              <select
                className={s.selectInput}
                value={pic}
                onChange={(e) => {
                  setPic(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">PIC: Semua</option>
                {masterData.pics?.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>

              <select
                className={s.selectInput}
                value={statusPembayaran}
                onChange={(e) => {
                  setStatusPembayaran(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Status Bayar: Semua</option>
                <option value="SUDAH_DIBAYAR">Sudah Dibayar (Lunas)</option>
                <option value="BELUM_DIBAYAR">Belum Dibayar</option>
              </select>

              <select
                className={s.selectInput}
                value={statusClaim}
                onChange={(e) => {
                  setStatusClaim(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Claim: Semua</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSE">CLOSE</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="date"
                  className={s.dateInput}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                  title="Dari Tanggal"
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>s/d</span>
                <input
                  type="date"
                  className={s.dateInput}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                  title="Sampai Tanggal"
                />
              </div>

              {(search || customer || pic || statusPembayaran || statusClaim || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearch('')
                    setCustomer('')
                    setPic('')
                    setStatusPembayaran('')
                    setStatusClaim('')
                    setStartDate('')
                    setEndDate('')
                    setPage(1)
                  }}
                  className={s.btnReset}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Claims Table */}
          <div className={s.tableCard}>
            <div className={s.tableResponsive}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>PIC & Customer</th>
                    <th>Deskripsi & Problem</th>
                    <th>Rincian Struk (#1-#4)</th>
                    <th>Total Struk</th>
                    <th>Status Bayar</th>
                    <th>Claim</th>
                    <th>Foto Struk</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Memuat data klaim...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Belum ada data klaim entertainment yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {(page - 1) * 15 + idx + 1}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: 13 }}>
                              {item.pic_entertaint || '-'}
                            </strong>
                            <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}>
                              {item.customer || '-'}
                            </span>
                            {item.place_of_occurrence && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <MapPin size={11} /> {item.place_of_occurrence}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 360 }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4 }}>
                              {item.deskripsi}
                            </span>
                            {item.part_no && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Part: {item.part_no} {item.part_name ? `(${item.part_name})` : ''}
                              </span>
                            )}
                            {item.customer_member && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Tamu: {item.customer_member}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 11.5, fontFamily: 'JetBrains Mono' }}>
                          {(item.struk_1 > 0 || item.struk_2 > 0 || item.struk_3 > 0 || item.struk_4 > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {item.struk_1 > 0 && <span>#1: {formatRp(item.struk_1)}</span>}
                              {item.struk_2 > 0 && <span>#2: {formatRp(item.struk_2)}</span>}
                              {item.struk_3 > 0 && <span>#3: {formatRp(item.struk_3)}</span>}
                              {item.struk_4 > 0 && <span>#4: {formatRp(item.struk_4)}</span>}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
                          {formatRp(item.total_amount)}
                        </td>
                        <td>
                          {item.status_pembayaran === 'SUDAH_DIBAYAR' ? (
                            <span className={s.badgePaid}>Lunas</span>
                          ) : (
                            <span className={s.badgeUnpaid}>Belum Lunas</span>
                          )}
                        </td>
                        <td>
                          {item.status_claim === 'CLOSE' ? (
                            <span className={s.badgeClose}>CLOSE</span>
                          ) : (
                            <span className={s.badgeOpen}>OPEN</span>
                          )}
                        </td>
                        <td>
                          {item.receipts && item.receipts.length > 0 ? (
                            <div className={s.receiptStack}>
                              {item.receipts.slice(0, 3).map((r, rIdx) => (
                                <img
                                  key={r.id}
                                  src={r.url}
                                  alt={r.original_name}
                                  className={s.receiptThumb}
                                  title={`${r.original_name} (${r.file_size_formatted}) - Klik untuk perbesar`}
                                  onClick={() => handleOpenLightbox(item.receipts, rIdx)}
                                />
                              ))}
                              {item.receipts.length > 3 && (
                                <button
                                  className={s.moreReceiptsBtn}
                                  onClick={() => handleOpenLightbox(item.receipts, 3)}
                                  title="Lihat semua struk"
                                >
                                  +{item.receipts.length - 3}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Tanpa Struk
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={s.rowActions}>
                            {item.receipts && item.receipts.length > 0 && (
                              <button
                                onClick={() => handleOpenLightbox(item.receipts, 0)}
                                className={s.iconBtn}
                                title="Lihat Struk"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className={s.iconBtn}
                              title="Edit Catatan & Tambah Struk"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteClaim(item)}
                              className={`${s.iconBtn} ${s.iconBtnDanger}`}
                              title="Hapus"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={s.pagination}>
              <span className={s.pageInfo}>
                Menampilkan {items.length} dari {totalRecords} klaim
              </span>
              <div className={s.pageControls}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={s.pageBtn}
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, margin: '0 8px', color: 'var(--text-main)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={s.pageBtn}
                >
                  <span>Selanjutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: CASHFLOW TAB (BUDGET ENTERTAINT)                  */}
      {/* ========================================================= */}
      {currentMainTab === 'cashflow' && (
        <div className={s.tableCard}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
                Buku Arus Kas Kasbon QC (Budget Entertaint)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Catatan mutasi uang masuk dari Marketing/Finance dan uang keluar ke PIC beserta perhitungan saldo balance.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Uang Masuk:</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', fontFamily: 'JetBrains Mono' }}>
                  {formatRp(cashflowSummary?.total_uang_masuk || 0)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Uang Keluar:</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', fontFamily: 'JetBrains Mono' }}>
                  {formatRp(cashflowSummary?.total_uang_keluar || 0)}
                </div>
              </div>
            </div>
          </div>

          <div className={s.tableResponsive}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Doc No.</th>
                  <th>Tanggal</th>
                  <th>Tipe Arus</th>
                  <th>Akun / Deskripsi Mutasi</th>
                  <th>Uang Masuk (ke QC)</th>
                  <th>Uang Keluar (ke PIC)</th>
                  <th>Saldo (Balance)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {cashflowLoading ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Memuat data arus kas...
                    </td>
                  </tr>
                ) : cashflowList.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      Belum ada mutasi arus kas kasbon yang dicatat.
                    </td>
                  </tr>
                ) : (
                  cashflowList.map((cf, idx) => (
                    <tr key={cf.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{cf.doc_no || '-'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {cf.tanggal ? new Date(cf.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td>
                        {cf.flow_type === 'IN' ? (
                          <span className={s.badgeCashIn}>
                            <ArrowDownLeft size={12} /> MASUK
                          </span>
                        ) : (
                          <span className={s.badgeCashOut}>
                            <ArrowUpRight size={12} /> KELUAR
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {cf.account_deskripsi}
                        {cf.keterangan && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 'normal' }}>
                            {cf.keterangan}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#16a34a' }}>
                        {cf.uang_masuk > 0 ? formatRp(cf.uang_masuk) : '-'}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#dc2626' }}>
                        {cf.uang_keluar > 0 ? formatRp(cf.uang_keluar) : '-'}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--text-main)' }}>
                        {formatRp(cf.balance)}
                      </td>
                      <td>
                        <span className={cf.status_entertaint?.toLowerCase().includes('close') ? s.badgeClose : s.badgeOpen}>
                          {cf.status_entertaint}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteCashflow(cf.id)}
                          className={`${s.iconBtn} ${s.iconBtnDanger}`}
                          title="Hapus Mutasi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: MASTER DATA TAB                                   */}
      {/* ========================================================= */}
      {currentMainTab === 'masters' && (
        <div className={s.mastersGrid}>
          {/* Card 1: Customer List */}
          <div className={s.masterSectionCard}>
            <div className={s.masterSectionHeader}>
              <h3 className={s.masterSectionTitle}>
                <Building2 size={18} color="var(--primary)" />
                <span>Daftar PT Customer ({masterData.customers.length})</span>
              </h3>
            </div>
            <div className={s.masterItemList}>
              {masterData.customers.map((c) => (
                <span key={c.id} className={s.masterItemChip}>
                  <span>{c.name}</span>
                  <button
                    onClick={() => handleDeleteMaster(c.id, c.name)}
                    className={s.masterItemDelete}
                    title="Hapus"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className={s.masterAddForm}>
              <input
                type="text"
                className={s.input}
                style={{ flex: 1 }}
                placeholder="Tambah PT Customer baru..."
                value={newMasterCustomer}
                onChange={(e) => setNewMasterCustomer(e.target.value)}
              />
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => handleAddMaster('CUSTOMER', newMasterCustomer, setNewMasterCustomer)}
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Card 2: PIC Tugas Luar */}
          <div className={s.masterSectionCard}>
            <div className={s.masterSectionHeader}>
              <h3 className={s.masterSectionTitle}>
                <User size={18} color="var(--primary)" />
                <span>Daftar PIC Tugas Luar ({masterData.pics.length})</span>
              </h3>
            </div>
            <div className={s.masterItemList}>
              {masterData.pics.map((p) => (
                <span key={p.id} className={s.masterItemChip}>
                  <span>{p.name}</span>
                  <button
                    onClick={() => handleDeleteMaster(p.id, p.name)}
                    className={s.masterItemDelete}
                    title="Hapus"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className={s.masterAddForm}>
              <input
                type="text"
                className={s.input}
                style={{ flex: 1 }}
                placeholder="Tambah PIC Tugas Luar baru..."
                value={newMasterPic}
                onChange={(e) => setNewMasterPic(e.target.value)}
              />
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => handleAddMaster('PIC', newMasterPic, setNewMasterPic)}
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Card 3: Place of Occurrence */}
          <div className={s.masterSectionCard}>
            <div className={s.masterSectionHeader}>
              <h3 className={s.masterSectionTitle}>
                <MapPin size={18} color="var(--primary)" />
                <span>Lokasi Kejadian ({masterData.places.length})</span>
              </h3>
            </div>
            <div className={s.masterItemList}>
              {masterData.places.map((pl) => (
                <span key={pl.id} className={s.masterItemChip}>
                  <span>{pl.name}</span>
                  <button
                    onClick={() => handleDeleteMaster(pl.id, pl.name)}
                    className={s.masterItemDelete}
                    title="Hapus"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className={s.masterAddForm}>
              <input
                type="text"
                className={s.input}
                style={{ flex: 1 }}
                placeholder="Tambah lokasi kejadian..."
                value={newMasterPlace}
                onChange={(e) => setNewMasterPlace(e.target.value)}
              />
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => handleAddMaster('PLACE', newMasterPlace, setNewMasterPlace)}
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Card 4: Customer Relation Contacts */}
          <div className={s.masterSectionCard} style={{ gridColumn: 'span 2' }}>
            <div className={s.masterSectionHeader}>
              <h3 className={s.masterSectionTitle}>
                <User size={18} color="#7c3aed" />
                <span>Direktori Personil / Kontak Customer ({masterData.customer_members?.length || 0} Kontak)</span>
              </h3>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Berasal dari lembar "Customer Relation List Name" (MMKI, HPM, SIM, dll.)
              </span>
            </div>
            <div className={s.masterItemList} style={{ maxHeight: 260 }}>
              {masterData.customer_members?.map((cm) => (
                <span key={cm.id} className={s.masterItemChip} style={{ fontSize: 11 }}>
                  <span>{cm.name}</span>
                  <button
                    onClick={() => handleDeleteMaster(cm.id, cm.name)}
                    className={s.masterItemDelete}
                    title="Hapus"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className={s.masterAddForm} style={{ marginTop: 14 }}>
              <input
                type="text"
                placeholder="Nama personil / kontak baru (misal: Pak Budi MMKI)..."
                value={newMasterMember}
                onChange={(e) => setNewMasterMember(e.target.value)}
                className={s.input}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMaster('CUSTOMER_MEMBER', newMasterMember, setNewMasterMember)}
              />
              <button
                className={s.btnPrimary}
                onClick={() => handleAddMaster('CUSTOMER_MEMBER', newMasterMember, setNewMasterMember)}
              >
                + Tambah Personil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT CLAIM FORM                           */}
      {/* ========================================================= */}
      {isFormModalOpen && (
        <div className={s.modalBackdrop}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                <Receipt size={20} color="var(--primary)" />
                <span>{editingItem ? 'Edit Entertainment Cost' : 'Catat Entertainment Cost Baru'}</span>
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className={s.modalClose}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Internal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 22px' }}>
              <button
                type="button"
                onClick={() => setActiveFormTab('utama')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeFormTab === 'utama' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeFormTab === 'utama' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                1. Info Utama & Struk
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('detail')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeFormTab === 'detail' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeFormTab === 'detail' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                2. Problem QA & Kasbon
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('struk')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeFormTab === 'struk' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeFormTab === 'struk' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>3. Lampiran Foto Struk</span>
                {(selectedFiles.length > 0 || existingReceipts.length > 0) && (
                  <span style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {selectedFiles.length + existingReceipts.length}
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} style={{ display: 'contents' }}>
              <div className={s.modalBody}>
                {activeFormTab === 'utama' && (
                  <div className={s.formGrid}>
                    <div className={s.formGroup}>
                      <label className={s.label}>
                        Tanggal Entertaint <span className={s.required}>*</span>
                      </label>
                      <input
                        type="date"
                        className={s.input}
                        required
                        value={formData.tanggal}
                        onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>
                        PIC Entertaint (QC)
                        <span style={{ fontSize: 10.5, color: 'var(--primary)', marginLeft: 6, fontWeight: 500 }}>
                          (Ketik baru: auto-simpan)
                        </span>
                      </label>
                      <input
                        type="text"
                        list="pic-list"
                        className={s.input}
                        placeholder="Pilih atau ketik nama PIC baru..."
                        value={formData.pic_entertaint}
                        onChange={(e) => setFormData({ ...formData, pic_entertaint: e.target.value })}
                      />
                      <datalist id="pic-list">
                        {masterData.pics?.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>
                        Customer (PT)
                        <span style={{ fontSize: 10.5, color: 'var(--primary)', marginLeft: 6, fontWeight: 500 }}>
                          (Ketik baru: auto-simpan)
                        </span>
                      </label>
                      <input
                        type="text"
                        list="customer-list"
                        className={s.input}
                        placeholder="Pilih atau ketik nama PT baru..."
                        value={formData.customer}
                        onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                      />
                      <datalist id="customer-list">
                        {masterData.customers?.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>
                        Lokasi Kejadian (Place of Occurrence)
                        <span style={{ fontSize: 10.5, color: 'var(--primary)', marginLeft: 6, fontWeight: 500 }}>
                          (Ketik baru: auto-simpan)
                        </span>
                      </label>
                      <input
                        type="text"
                        list="place-list"
                        className={s.input}
                        placeholder="Pilih atau ketik lokasi baru..."
                        value={formData.place_of_occurrence}
                        onChange={(e) => setFormData({ ...formData, place_of_occurrence: e.target.value })}
                      />
                      <datalist id="place-list">
                        {masterData.places?.map((pl) => (
                          <option key={pl.id} value={pl.name} />
                        ))}
                      </datalist>
                    </div>

                    {/* Breakdown Struk #1 - #4 */}
                    <div className={s.formGroupFull}>
                      <div className={s.sectionDivider}>
                        <span className={s.sectionHeading}>Rincian Nominal Struk (#1 s/d #4)</span>
                      </div>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Struk #1 (IDR)</label>
                      <input
                        type="number"
                        className={s.input}
                        placeholder="0"
                        value={formData.struk_1}
                        onChange={(e) => handleStrukChange('struk_1', e.target.value)}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Struk #2 (IDR)</label>
                      <input
                        type="number"
                        className={s.input}
                        placeholder="0"
                        value={formData.struk_2}
                        onChange={(e) => handleStrukChange('struk_2', e.target.value)}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Struk #3 (IDR)</label>
                      <input
                        type="number"
                        className={s.input}
                        placeholder="0"
                        value={formData.struk_3}
                        onChange={(e) => handleStrukChange('struk_3', e.target.value)}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Struk #4 (IDR)</label>
                      <input
                        type="number"
                        className={s.input}
                        placeholder="0"
                        value={formData.struk_4}
                        onChange={(e) => handleStrukChange('struk_4', e.target.value)}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>
                        Total Struk Keseluruhan (IDR)
                      </label>
                      <input
                        type="number"
                        className={s.input}
                        style={{ fontWeight: 700, color: 'var(--primary)' }}
                        placeholder="0"
                        value={formData.total_amount}
                        onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Status Pembayaran</label>
                      <select
                        className={s.modalSelect}
                        value={formData.status_pembayaran}
                        onChange={(e) => setFormData({ ...formData, status_pembayaran: e.target.value })}
                      >
                        <option value="BELUM_DIBAYAR">Belum Dibayar</option>
                        <option value="SUDAH_DIBAYAR">Sudah Dibayar (Lunas)</option>
                      </select>
                    </div>

                    <div className={s.formGroupFull}>
                      <label className={s.label}>
                        Deskripsi Kegiatan / Concerning Job <span className={s.required}>*</span>
                      </label>
                      <textarea
                        className={s.textarea}
                        required
                        placeholder="Contoh: Clossing problem RAIL ROOF FRONT wrong spec nut 1 Unit"
                        value={formData.deskripsi}
                        onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {activeFormTab === 'detail' && (
                  <div className={s.formGrid}>
                    <div className={s.formGroup}>
                      <label className={s.label}>Status Claim (Marketing)</label>
                      <select
                        className={s.modalSelect}
                        value={formData.status_claim}
                        onChange={(e) => setFormData({ ...formData, status_claim: e.target.value })}
                      >
                        <option value="OPEN">OPEN (Pending)</option>
                        <option value="CLOSE">CLOSE (Selesai)</option>
                      </select>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Tanggal Closing</label>
                      <input
                        type="date"
                        className={s.input}
                        value={formData.tanggal_closing}
                        onChange={(e) => setFormData({ ...formData, tanggal_closing: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Tanggal Kasbon</label>
                      <input
                        type="date"
                        className={s.input}
                        value={formData.tanggal_kasbon}
                        onChange={(e) => setFormData({ ...formData, tanggal_kasbon: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Nominal Kasbon (IDR)</label>
                      <input
                        type="number"
                        className={s.input}
                        placeholder="0"
                        value={formData.total_kasbon}
                        onChange={(e) => setFormData({ ...formData, total_kasbon: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Customer Member (Hadir)</label>
                      <input
                        type="text"
                        list="customer-members-datalist"
                        className={s.input}
                        placeholder="Pilih dari 99 kontak personil atau ketik nama..."
                        value={formData.customer_member}
                        onChange={(e) => setFormData({ ...formData, customer_member: e.target.value })}
                      />
                      <datalist id="customer-members-datalist">
                        {masterData.customer_members?.map((cm) => (
                          <option key={cm.id} value={cm.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>SAI Member (Hadir)</label>
                      <input
                        type="text"
                        list="sai-members-datalist"
                        className={s.input}
                        placeholder="Pilih atau ketik nama personel SAI..."
                        value={formData.sai_member}
                        onChange={(e) => setFormData({ ...formData, sai_member: e.target.value })}
                      />
                      <datalist id="sai-members-datalist">
                        {masterData.pics?.map((p) => (
                          <option key={p.id} value={p.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Part Number</label>
                      <input
                        type="text"
                        className={s.input}
                        placeholder="Contoh: 76331W030P"
                        value={formData.part_no}
                        onChange={(e) => setFormData({ ...formData, part_no: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroup}>
                      <label className={s.label}>Part Name / Problem</label>
                      <input
                        type="text"
                        className={s.input}
                        placeholder="Contoh: RAIL ROOF SIDE INR LH"
                        value={formData.part_name}
                        onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                      />
                    </div>

                    <div className={s.formGroupFull}>
                      <label className={s.label}>Keterangan / Catatan Tambahan</label>
                      <textarea
                        className={s.textarea}
                        placeholder="Catatan kwitansi, transfer, atau info dokumen"
                        value={formData.keterangan}
                        onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {activeFormTab === 'struk' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div
                      className={s.dropzone}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={36} className={s.dropzoneIcon} />
                      <span className={s.dropzoneText}>
                        Klik atau seret foto-foto struk ke sini
                      </span>
                      <span className={s.dropzoneHint}>
                        Mendukung multiple upload tanpa batas. Semua gambar otomatis dikompresi dan dikonversi ke format WebP super ringan!
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                      />
                    </div>

                    {filePreviews.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                          Struk Baru yang Akan Diunggah & Dikonversi ({filePreviews.length}):
                        </div>
                        <div className={s.previewGrid}>
                          {filePreviews.map((p, pIdx) => (
                            <div key={pIdx} className={s.previewItem}>
                              <img src={p.url} alt={p.name} className={s.previewImg} />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(pIdx)}
                                className={s.removeImgBtn}
                                title="Batal"
                              >
                                <X size={12} />
                              </button>
                              <div className={s.previewMeta}>{p.size}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {existingReceipts.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, marginTop: 12 }}>
                          Struk yang Sudah Tersimpan di Server ({existingReceipts.length}):
                        </div>
                        <div className={s.previewGrid}>
                          {existingReceipts.map((r) => (
                            <div key={r.id} className={s.previewItem}>
                              <img src={r.url} alt={r.original_name} className={s.previewImg} />
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingReceipt(r.id)}
                                className={s.removeImgBtn}
                                title="Hapus dari server"
                              >
                                <Trash2 size={12} />
                              </button>
                              <div className={s.previewMeta}>{r.file_size_formatted}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className={s.btnSecondary}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={s.btnPrimary}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan & Kompres Struk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE CASHFLOW RECORD                             */}
      {/* ========================================================= */}
      {isCashflowModalOpen && (
        <div className={s.modalBackdrop}>
          <div className={s.modalContent} style={{ maxWidth: 520 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                <Wallet size={20} color="var(--primary)" />
                <span>Catat Mutasi Kasbon QC</span>
              </h2>
              <button onClick={() => setIsCashflowModalOpen(false)} className={s.modalClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCashflowSubmit}>
              <div className={s.modalBody}>
                <div className={s.formGroup}>
                  <label className={s.label}>Tipe Mutasi</label>
                  <select
                    className={s.modalSelect}
                    value={cashflowFormData.flow_type}
                    onChange={(e) => setCashflowFormData({ ...cashflowFormData, flow_type: e.target.value })}
                  >
                    <option value="OUT">CASH OUT (Uang Keluar ke PIC)</option>
                    <option value="IN">CASH IN (Uang Masuk dari Marketing/Finance)</option>
                  </select>
                </div>

                <div className={s.formGrid}>
                  <div className={s.formGroup}>
                    <label className={s.label}>Tanggal Transaksi</label>
                    <input
                      type="date"
                      className={s.input}
                      required
                      value={cashflowFormData.tanggal}
                      onChange={(e) => setCashflowFormData({ ...cashflowFormData, tanggal: e.target.value })}
                    />
                  </div>

                  <div className={s.formGroup}>
                    <label className={s.label}>Nomor Dokumen (Opsional)</label>
                    <input
                      type="text"
                      className={s.input}
                      placeholder="QA/2026/VII/CO28"
                      value={cashflowFormData.doc_no}
                      onChange={(e) => setCashflowFormData({ ...cashflowFormData, doc_no: e.target.value })}
                    />
                  </div>
                </div>

                <div className={s.formGroup}>
                  <label className={s.label}>
                    {cashflowFormData.flow_type === 'IN' ? 'Nominal Uang Masuk (IDR)' : 'Nominal Uang Keluar (IDR)'}
                  </label>
                  <input
                    type="number"
                    className={s.input}
                    required
                    placeholder="Contoh: 1500000"
                    value={cashflowFormData.flow_type === 'IN' ? cashflowFormData.uang_masuk : cashflowFormData.uang_keluar}
                    onChange={(e) => {
                      if (cashflowFormData.flow_type === 'IN') {
                        setCashflowFormData({ ...cashflowFormData, uang_masuk: e.target.value, uang_keluar: '' })
                      } else {
                        setCashflowFormData({ ...cashflowFormData, uang_keluar: e.target.value, uang_masuk: '' })
                      }
                    }}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.label}>Akun / Deskripsi Transaksi</label>
                  <input
                    type="text"
                    className={s.input}
                    required
                    placeholder="Contoh: Kasbon Pak Kir ke Indomatsumoto"
                    value={cashflowFormData.account_deskripsi}
                    onChange={(e) => setCashflowFormData({ ...cashflowFormData, account_deskripsi: e.target.value })}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.label}>Status Entertaint</label>
                  <input
                    type="text"
                    className={s.input}
                    placeholder="Open / CLOSE"
                    value={cashflowFormData.status_entertaint}
                    onChange={(e) => setCashflowFormData({ ...cashflowFormData, status_entertaint: e.target.value })}
                  />
                </div>

                <div className={s.formGroup}>
                  <label className={s.label}>Catatan / Keterangan</label>
                  <textarea
                    className={s.textarea}
                    placeholder="Catatan mutasi kasbon..."
                    value={cashflowFormData.keterangan}
                    onChange={(e) => setCashflowFormData({ ...cashflowFormData, keterangan: e.target.value })}
                  />
                </div>
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsCashflowModalOpen(false)}
                  className={s.btnSecondary}
                >
                  Batal
                </button>
                <button type="submit" className={s.btnPrimary}>
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LIGHTBOX IMAGE VIEWER                              */}
      {/* ========================================================= */}
      {lightboxData && lightboxData.receipts.length > 0 && (
        <div className={s.lightboxBackdrop} onClick={() => setLightboxData(null)}>
          <div className={s.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={s.lightboxClose}
              onClick={() => setLightboxData(null)}
              title="Tutup (Esc)"
            >
              <X size={28} />
            </button>

            <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={lightboxData.receipts[lightboxData.currentIndex].url}
                alt={lightboxData.receipts[lightboxData.currentIndex].original_name}
                className={s.lightboxImg}
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  transition: 'transform 0.15s ease'
                }}
              />
            </div>

            <div className={s.lightboxToolbar}>
              {lightboxData.receipts.length > 1 && (
                <button
                  onClick={() => setLightboxData((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.receipts.length) % prev.receipts.length
                  }))}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              <span>
                {lightboxData.currentIndex + 1} / {lightboxData.receipts.length} · {lightboxData.receipts[lightboxData.currentIndex].file_size_formatted} (WebP)
              </span>

              {lightboxData.receipts.length > 1 && (
                <button
                  onClick={() => setLightboxData((prev) => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.receipts.length
                  }))}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <ChevronRight size={20} />
                </button>
              )}

              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

              <button
                onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                title="Perbesar"
              >
                <ZoomIn size={18} />
              </button>

              <button
                onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                title="Putar"
              >
                <RotateCw size={18} />
              </button>

              <a
                href={lightboxData.receipts[lightboxData.currentIndex].url}
                download={lightboxData.receipts[lightboxData.currentIndex].file_name}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', marginLeft: 6 }}
                title="Unduh"
              >
                <Download size={18} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: IMPORT EXCEL                                       */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className={s.modalBackdrop}>
          <div className={s.modalContent} style={{ maxWidth: 540 }}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                <FileSpreadsheet size={20} color="var(--primary)" />
                <span>Upload & Sinkronisasi Excel (.xlsx)</span>
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className={s.modalClose}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div className={s.modalBody}>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
                  Unggah file Excel monitoring Anda. Sistem akan membaca lembar <strong>Claim Cost Entertaint</strong> dan <strong>Budget Entertaint</strong> secara otomatis, mendeteksi baris baru, serta memperbarui data tanpa risiko dobel (UPSERT Lossless).
                </p>

                <div
                  className={s.importDropzone}
                  onClick={() => importFileRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={importFileRef}
                    accept=".xlsx, .xlsm"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0])
                        setImportResult(null)
                      }
                    }}
                  />
                  <UploadCloud size={38} color="var(--primary)" />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-main)' }}>
                      {importFile ? importFile.name : 'Klik atau seret file Excel ke sini'}
                    </span>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Format yang didukung: .xlsx (Maks 15 MB)'}
                    </p>
                  </div>
                </div>

                {importResult && (
                  <div className={s.importResultCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <span style={{ fontWeight: 600, fontSize: 12.5, color: '#065f46' }}>
                        Hasil Sinkronisasi Berhasil
                      </span>
                    </div>
                    <div className={s.importResultGrid}>
                      <div className={s.importResultItem}>
                        <div className={s.importResultItemVal} style={{ color: '#10b981' }}>
                          +{importResult.created_claims}
                        </div>
                        <div className={s.importResultItemLbl}>Klaim Baru</div>
                      </div>
                      <div className={s.importResultItem}>
                        <div className={s.importResultItemVal} style={{ color: '#2563eb' }}>
                          {importResult.updated_claims}
                        </div>
                        <div className={s.importResultItemLbl}>Diperbarui</div>
                      </div>
                      <div className={s.importResultItem}>
                        <div className={s.importResultItemVal} style={{ color: '#7c3aed' }}>
                          {importResult.cashflow_synced}
                        </div>
                        <div className={s.importResultItemLbl}>Buku Kas</div>
                      </div>
                      <div className={s.importResultItem}>
                        <div className={s.importResultItemVal} style={{ color: '#475569' }}>
                          {importResult.total_rows_parsed}
                        </div>
                        <div className={s.importResultItemLbl}>Total Baris</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={s.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className={s.btnSecondary}
                >
                  {importResult ? 'Selesai' : 'Batal'}
                </button>
                <button
                  type="submit"
                  disabled={!importFile || isImporting}
                  className={s.btnPrimary}
                  style={{ minWidth: 140 }}
                >
                  {isImporting ? 'Menyinkronkan...' : 'Mulai Sinkronisasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
