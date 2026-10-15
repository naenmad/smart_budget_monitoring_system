import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import { budgetApi } from '../api/budgetApi'
import { kategoriApi } from '../api/kategoriApi'
import { useAuth } from '../context/AuthContext'
import { formatRp } from '../utils/format'
import {
  PieChart,
  Sliders,
  UploadCloud,
  History,
  Save,
  Trash2,
  RefreshCw,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Layers,
  ArrowRight
} from 'lucide-react'
import s from './Budget.module.css'

const CURRENT_YEAR = String(new Date().getFullYear())
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(parseInt(CURRENT_YEAR, 10) - 2 + i))

export default function Budget() {
  const confirm = useConfirm()
  const { user } = useAuth()
  const [periode, setPeriode] = useState(CURRENT_YEAR)
  const [activeTab, setActiveTab] = useState('table') // 'table' | 'upload' | 'history'

  // Data from API
  const [kategoris, setKategoris] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local form inputs for editing allocations: { [kode]: stringNumber }
  const [glInputs, setGlInputs] = useState({})

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [katRes, budRes] = await Promise.all([
        kategoriApi.getAll(),
        budgetApi.getAll(periode),
      ])
      if (katRes.success) setKategoris(katRes.data || [])
      if (budRes.success) {
        setBudgets(budRes.data || [])
      }
    } catch (err) {
      console.error('Error fetching budget data:', err)
      toast.error('Gagal mengambil data alokasi budget')
    } finally {
      setLoading(false)
    }
  }, [periode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered categories for QC/QA budget setup (exclude E-6 Entertainment & OOP)
  const activeKategoris = useMemo(() => {
    return kategoris.filter(
      (k) => k.is_active && k.kode !== 'E-6' && k.kode !== 'OOP'
    )
  }, [kategoris])

  // Map existing budget record by category ID
  const budgetMapByKatId = useMemo(() => {
    const map = {}
    budgets.forEach((b) => {
      map[b.kategori_id] = b
    })
    return map
  }, [budgets])

  // Total allocated nominal for the active period
  const totalAllocatedNominal = useMemo(() => {
    return activeKategoris.reduce((sum, kat) => {
      const b = budgetMapByKatId[kat.id]
      return sum + (b ? parseFloat(b.nominal || 0) : 0)
    }, 0)
  }, [activeKategoris, budgetMapByKatId])

  // Count of active accounts with nominal > 0
  const populatedAccountsCount = useMemo(() => {
    return activeKategoris.filter((kat) => {
      const b = budgetMapByKatId[kat.id]
      return b && parseFloat(b.nominal || 0) > 0
    }).length
  }, [activeKategoris, budgetMapByKatId])

  // Largest allocation
  const largestAllocation = useMemo(() => {
    let maxNom = 0
    let maxKat = null
    activeKategoris.forEach((kat) => {
      const b = budgetMapByKatId[kat.id]
      const nom = b ? parseFloat(b.nominal || 0) : 0
      if (nom > maxNom) {
        maxNom = nom
        maxKat = kat
      }
    })
    return maxKat ? { name: maxKat.nama, nominal: maxNom, kode: maxKat.kode } : null
  }, [activeKategoris, budgetMapByKatId])

  // Handle single input change
  const handleInputChange = (kode, val) => {
    const rawDigits = val.replace(/\D/g, '')
    setGlInputs((prev) => ({
      ...prev,
      [kode]: rawDigits,
    }))
  }

  // Handle reset inputs
  const handleResetInputs = () => {
    setGlInputs({})
    toast('Input formulir telah direset', { icon: 'ℹ️' })
  }

  // Save all entered inputs to the database
  const handleSaveAllocations = async () => {
    const entriesToSave = Object.entries(glInputs)
      .filter(([_, val]) => val !== '' && !isNaN(parseFloat(val)))
      .map(([kode, val]) => {
        const kategori = activeKategoris.find((k) => k.kode === kode)
        return {
          kategori_id: kategori?.id,
          periode,
          nominal: parseFloat(val),
          created_by: user?.id,
        }
      })
      .filter((e) => e.kategori_id)

    if (entriesToSave.length === 0) {
      toast.error('Belum ada nominal baru yang diisi')
      return
    }

    setSaving(true)
    let successCount = 0
    let errorCount = 0

    for (const entry of entriesToSave) {
      try {
        const res = await budgetApi.create(entry)
        if (res.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    setSaving(false)
    if (successCount > 0) {
      toast.success(`${successCount} pagu anggaran berhasil disimpan!`)
      setGlInputs({})
      await fetchData()
    } else {
      toast.error('Gagal menyimpan alokasi budget')
    }
  }

  // Delete all budget for selected period
  const handleDeletePeriode = async () => {
    const ok = await confirm({
      title: `Hapus Seluruh Budget Tahun ${periode}?`,
      message: `Tindakan ini akan menghapus semua konfigurasi pagu anggaran untuk periode ${periode}. Data transaksi realisasi tidak akan terhapus.`,
      confirmText: 'Ya, Hapus Semua Budget',
      cancelText: 'Batal',
      type: 'danger',
    })
    if (!ok) return

    setLoading(true)
    try {
      const res = await budgetApi.deleteByPeriode(periode)
      if (res.success) {
        toast.success(res.message || `Budget tahun ${periode} berhasil dihapus`)
        setGlInputs({})
        await fetchData()
      } else {
        toast.error(res.message || 'Gagal menghapus budget')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus budget')
    } finally {
      setLoading(false)
    }
  }

  // Handle Excel upload
  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const dataBuffer = new Uint8Array(evt.target.result)
        const wb = XLSX.read(dataBuffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json(ws)

        if (!rawData || rawData.length === 0) {
          toast.error('File Excel kosong atau tidak terbaca')
          return
        }

        setSaving(true)
        let successCount = 0

        for (const row of rawData) {
          let kode = null
          let nominal = null
          let rowPeriode = periode

          for (const [k, v] of Object.entries(row)) {
            const cleanK = k.trim().toLowerCase().replace(/ /g, '_')
            if (['form', 'kode', 'kategori', 'kategori_kode', 'kode_gl', 'kode_account'].includes(cleanK)) {
              kode = String(v).trim().toUpperCase()
            }
            if (['budget', 'nominal', 'amount', 'total_budget', 'pagu'].includes(cleanK)) {
              nominal = v
            }
            if (['periode', 'tahun', 'year'].includes(cleanK)) {
              rowPeriode = String(v).trim()
            }
          }

          const kategori = activeKategoris.find((k) => k.kode.toUpperCase() === kode)
          if (!kategori || nominal === null || nominal === undefined) continue

          try {
            const res = await budgetApi.create({
              kategori_id: kategori.id,
              periode: String(rowPeriode),
              nominal: parseFloat(nominal),
              created_by: user?.id,
            })
            if (res.success) successCount++
          } catch (err) {
            console.error(`Error saving ${kode}:`, err)
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} baris data budget berhasil disinkronkan!`)
          await fetchData()
          setActiveTab('table')
        } else {
          toast.error('Tidak ada data budget yang cocok dengan kode account QC/QA')
        }
      } catch (err) {
        console.error('Parse Excel error:', err)
        toast.error('Gagal membaca file Excel')
      } finally {
        setSaving(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Kode_GL: '50032902-123200', Deskripsi: 'SUPPLIES EXPENSES (QUALITY - QC)', Periode: periode, Budget: 336413712 },
      { Kode_GL: '60290100-123200', Deskripsi: 'MARKETING EXPENSES (QUALITY - QC)', Periode: periode, Budget: 185400000 },
      { Kode_GL: '60290500-123200', Deskripsi: 'TRANSPORTATION EXPENSE - LOCAL (QUALITY - QC)', Periode: periode, Budget: 113400000 },
      { Kode_GL: '60290500-123000', Deskripsi: 'TRANSPORTATION EXPENSE - LOCAL (QUALITY - GNRL)', Periode: periode, Budget: 25920000 },
      { Kode_GL: '60290600-123200', Deskripsi: 'TRANSPORTATION EXPENSE - OVERSEA (QUALITY - QC)', Periode: periode, Budget: 35000000 },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Budget')
    XLSX.writeFile(wb, `TEMPLATE_BUDGET_ALOKASI_${periode}.xlsx`)
    toast.success('Template Excel berhasil diunduh!')
  }

  return (
    <div className={s.page}>
      {/* ─── Header ─── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <PieChart size={24} color="#0f172a" />
            Alokasi Budget (Setup)
            <span className={s.titleBadge}>Budget Configuration</span>
          </h1>
          <p className={s.subtitle}>
            Konfigurasi pagu anggaran belanja tahunan per Account &amp; Cost Center (Quality Control 123200 &amp; Quality General 123000).
          </p>
        </div>

        <div className={s.headerActions}>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className={s.periodeSelect}
            aria-label="Pilih Periode Tahun"
          >
            {YEAR_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr} {yr === CURRENT_YEAR ? '(Tahun Berjalan)' : ''}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className={s.actionBtn}
            title="Muat ulang data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {populatedAccountsCount > 0 && (
            <button
              onClick={handleDeletePeriode}
              disabled={loading}
              className={`${s.actionBtn} ${s.actionBtnDanger}`}
              title="Hapus seluruh alokasi periode ini"
            >
              <Trash2 size={14} />
              <span>Hapus Budget ({periode})</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className={s.kpiGrid}>
        <div className={`${s.kpiCard} ${s.kpiCardPrimary}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Total Pagu Anggaran</span>
            <div className={s.kpiIconBox}>
              <DollarSign size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {formatRp(totalAllocatedNominal)}
          </div>
          <div className={s.kpiSub}>
            <span>Tahun Anggaran {periode}</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardBlue}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Akun Berisi Anggaran</span>
            <div className={s.kpiIconBox}>
              <CheckCircle2 size={18} color="#2563eb" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: '#2563eb' }}>
            {populatedAccountsCount} / {activeKategoris.length}
          </div>
          <div className={s.kpiSub}>
            <span>Akun Operasional QC/QA Terdaftar</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardGreen}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Alokasi Pagu Terbesar</span>
            <div className={s.kpiIconBox}>
              <TrendingUp size={18} color="#16a34a" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ fontSize: '1.25rem' }}>
            {largestAllocation ? formatRp(largestAllocation.nominal) : 'Rp 0'}
          </div>
          <div className={s.kpiSub} title={largestAllocation?.name || '—'}>
            <span>{largestAllocation ? largestAllocation.kode : 'Belum diset'}</span>
          </div>
        </div>

        <div className={`${s.kpiCard} ${s.kpiCardSlate}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Cost Center Terkait</span>
            <div className={s.kpiIconBox}>
              <Layers size={18} color="#64748b" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ fontSize: '1.25rem' }}>
            123200 &amp; 123000
          </div>
          <div className={s.kpiSub}>
            <span>Quality Control &amp; Quality General</span>
          </div>
        </div>
      </div>

      {/* ─── Segmented Tab Switcher ─── */}
      <div className={s.tabNav}>
        <button
          onClick={() => setActiveTab('table')}
          className={`${s.tabBtn} ${activeTab === 'table' ? s.tabBtnActive : ''}`}
        >
          <Sliders size={15} />
          <span>Tabel Pagu Anggaran &amp; Input</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`${s.tabBtn} ${activeTab === 'upload' ? s.tabBtnActive : ''}`}
        >
          <UploadCloud size={15} />
          <span>Upload &amp; Sinkronisasi Excel</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`${s.tabBtn} ${activeTab === 'history' ? s.tabBtnActive : ''}`}
        >
          <History size={15} />
          <span>Riwayat Perubahan ({budgets.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: Tabel Pagu Anggaran & Input ─── */}
      {activeTab === 'table' && (
        <div className={s.tableContainer}>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: 44 }}>#</th>
                  <th className={s.th} style={{ width: 160 }}>Kode GL Account</th>
                  <th className={s.th} style={{ width: 100 }}>Cost Center</th>
                  <th className={s.th}>Deskripsi Akun Biaya</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 170 }}>Pagu Aktif (Rp)</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 200 }}>Input Penyesuaian (Rp)</th>
                  <th className={s.th} style={{ width: 160 }}>Proporsi Share</th>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: 110 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <Loader2 size={28} className="animate-spin" color="#0f172a" />
                        <span style={{ fontSize: '0.85rem' }}>Memuat data alokasi anggaran...</span>
                      </div>
                    </td>
                  </tr>
                ) : activeKategoris.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <AlertCircle size={32} color="#94a3b8" />
                        <div className={s.emptyTitle}>Tidak ada akun kategori yang aktif</div>
                        <div className={s.emptyDesc}>Pastikan master kategori akun QA &amp; QC telah terdaftar.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activeKategoris.map((kat, idx) => {
                    const b = budgetMapByKatId[kat.id]
                    const currentNominal = b ? parseFloat(b.nominal || 0) : 0
                    const isConfigured = currentNominal > 0

                    // Parse GL & Cost center
                    const [glCode, ccCode] = kat.kode.includes('-')
                      ? kat.kode.split('-')
                      : [kat.kode, '123200']

                    // Share of total
                    const pctShare = totalAllocatedNominal > 0
                      ? (currentNominal / totalAllocatedNominal) * 100
                      : 0

                    const inputValue = glInputs[kat.kode] !== undefined
                      ? glInputs[kat.kode]
                      : ''

                    return (
                      <tr key={kat.id} className={s.tr}>
                        <td className={`${s.td} ${s.indexCell}`}>{idx + 1}</td>
                        <td className={s.td}>
                          <span className={s.codeBadge}>{glCode}</span>
                        </td>
                        <td className={s.td}>
                          <span className={`${s.ccBadge} ${ccCode === '123000' ? s.cc123000 : s.cc123200}`}>
                            {ccCode === '123000' ? '123000 (QA)' : '123200 (QC)'}
                          </span>
                        </td>
                        <td className={s.td}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {kat.nama}
                          </div>
                          <span className={s.typeBadge}>{kat.tipe_formulir || 'OPEX'}</span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span style={{ fontWeight: 700, color: isConfigured ? '#0f172a' : '#94a3b8' }}>
                            {formatRp(currentNominal)}
                          </span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <input
                            type="text"
                            placeholder="Ketik angka baru..."
                            value={inputValue}
                            onChange={(e) => handleInputChange(kat.kode, e.target.value)}
                            className={s.amountInput}
                          />
                          {inputValue && (
                            <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.2rem' }}>
                              {formatRp(parseFloat(inputValue) || 0)}
                            </div>
                          )}
                        </td>
                        <td className={s.td}>
                          <div className={s.shareBarBox}>
                            <div className={s.shareTrack}>
                              <div
                                className={s.shareFill}
                                style={{ width: `${Math.min(pctShare, 100)}%` }}
                              />
                            </div>
                            <span className={s.sharePct}>{pctShare.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className={`${s.td} ${s.tdCenter}`}>
                          {isConfigured ? (
                            <span className={s.statusActive}>
                              <CheckCircle2 size={11} />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className={s.statusZero}>
                              <span>Belum Diset</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Sticky Action Bar */}
          <div className={s.tableActionBar}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Jumlah akun: <strong>{activeKategoris.length}</strong> | Total Pagu Periode {periode}:{' '}
              <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>
                {formatRp(totalAllocatedNominal)}
              </strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleResetInputs}
                className={s.btnSecondary}
                disabled={saving || Object.keys(glInputs).length === 0}
              >
                Reset Input
              </button>

              <button
                type="button"
                onClick={handleSaveAllocations}
                disabled={saving || Object.keys(glInputs).length === 0}
                className={s.btnPrimary}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Simpan Penyesuaian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Upload Excel ─── */}
      {activeTab === 'upload' && (
        <div className={s.uploadCard}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: '#0f172a' }}>
              Sinkronisasi Pagu Budget via File Excel
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Upload dokumen Microsoft Excel (.xlsx/.xls) untuk mengimpor atau memperbarui seluruh pagu anggaran kategori akun QC dan QA sekaligus.
            </p>
          </div>

          <div
            className={`${s.dropzone} ${isDragging ? s.dropzoneDragging : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              if (!saving) setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setIsDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (saving) return
              const f = e.dataTransfer.files?.[0]
              if (f) handleFile({ target: { files: [f] } })
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFile}
              disabled={saving}
            />

            {selectedFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <FileSpreadsheet size={36} color="#16a34a" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud size={36} color="#64748b" style={{ margin: '0 auto' }} />
                <div className={s.dropzoneTitle}>
                  {saving ? 'Sedang memproses dan menyimpan...' : 'Tarik & Letakkan file Excel di sini atau Klik untuk memilih'}
                </div>
                <div className={s.dropzoneSub}>Mendukung format .xlsx dan .xls (Kolom: Kode_GL, Deskripsi, Periode, Budget)</div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
            <button
              type="button"
              onClick={downloadTemplate}
              className={s.btnSecondary}
            >
              <Download size={14} />
              <span>Download Template Excel Resmi</span>
            </button>

            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Target Sinkronisasi: <strong>Periode {periode}</strong>
            </span>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Riwayat Perubahan ─── */}
      {activeTab === 'history' && (
        <div className={s.tableContainer}>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: 44 }}>#</th>
                  <th className={s.th} style={{ width: 140 }}>Tanggal Update</th>
                  <th className={s.th} style={{ width: 160 }}>Kode GL</th>
                  <th className={s.th}>Nama Akun Kategori</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 180 }}>Nominal Pagu (Rp)</th>
                  <th className={s.th} style={{ width: 100 }}>Periode</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <History size={32} color="#94a3b8" />
                        <div className={s.emptyTitle}>Belum ada riwayat alokasi</div>
                        <div className={s.emptyDesc}>Riwayat akan otomatis tercatat setiap kali alokasi budget disimpan.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  budgets.map((b, idx) => {
                    const kat = activeKategoris.find((k) => k.id === b.kategori_id)
                    return (
                      <tr key={b.id || idx} className={s.tr}>
                        <td className={`${s.td} ${s.indexCell}`}>{idx + 1}</td>
                        <td className={s.td} style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {b.updated_at || b.created_at
                            ? new Date(b.updated_at || b.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className={s.td}>
                          <span className={s.codeBadge}>{kat?.kode || '—'}</span>
                        </td>
                        <td className={s.td} style={{ fontWeight: 600 }}>
                          {kat?.nama || '—'}
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span style={{ fontWeight: 700 }}>{formatRp(parseFloat(b.nominal || 0))}</span>
                        </td>
                        <td className={s.td}>
                          <span className={s.typeBadge}>{b.periode}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
