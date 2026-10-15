import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Gauge,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Filter,
  User,
  Sliders,
  Loader2,
  AlertCircle,
  FileDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './Kalibrasi.module.css'

const CATEGORY_META = {
  'Dimensi & Panjang': {
    label: 'Dimensi & Panjang',
  },
  'Sudut & Geometri': {
    label: 'Sudut & Geometri',
  },
  'Torsi & Gaya': {
    label: 'Torsi & Gaya',
  },
  'CMM & Presisi Khusus': {
    label: 'CMM & Presisi Khusus',
  },
  'Massa & Timbangan': {
    label: 'Massa & Timbangan',
  },
  'Thermal & Suhu': {
    label: 'Thermal & Suhu',
  },
  'Instrumen Lainnya': {
    label: 'Instrumen Lainnya',
  },
}

function getCatMeta(cat) {
  return CATEGORY_META[cat] || {
    label: cat || 'Lainnya',
  }
}

export default function Kalibrasi() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('actual') // 'actual' | 'plan'
  const [isExporting, setIsExporting] = useState(false)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'SELESAI' | 'PROSES'
  const [search, setSearch] = useState('')

  const [rawData, setRawData] = useState({
    summary: {
      total_actual_nominal: 0,
      total_actual_count: 0,
      filtered_actual_count: 0,
      total_plan_nominal: 0,
      total_plan_count: 0,
      filtered_plan_count: 0,
      realized_plan_nominal: 0,
      pic_utama: 'Pak Aris',
    },
    tool_type_stats: {},
    monthly_stats: {},
    actual_data: [],
    planning_data: [],
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getKalibrasi({
        periode,
        bulan: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        tipe_alat: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        search: search.trim() || undefined,
      })
      if (res.data?.success) {
        setRawData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch kalibrasi data:', err)
      toast.error('Gagal mengambil data kalibrasi alat ukur QC')
    } finally {
      setLoading(false)
    }
  }, [periode, selectedMonth, selectedCategory, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered actual rows by status filter
  const displayedActualRows = useMemo(() => {
    let rows = rawData.actual_data || []
    if (statusFilter === 'SELESAI') {
      rows = rows.filter((r) => r.has_gr)
    } else if (statusFilter === 'PROSES') {
      rows = rows.filter((r) => !r.has_gr)
    }
    return rows
  }, [rawData.actual_data, statusFilter])

  // Filtered plan rows by status filter
  const displayedPlanRows = useMemo(() => {
    let rows = rawData.planning_data || []
    if (statusFilter === 'SELESAI') {
      rows = rows.filter((r) => (r.actual_amount || 0) > 0)
    } else if (statusFilter === 'PROSES') {
      rows = rows.filter((r) => (r.actual_amount || 0) === 0)
    }
    return rows
  }, [rawData.planning_data, statusFilter])

  // Current view rows and nominal total
  const currentRowsCount = activeView === 'actual' ? displayedActualRows.length : displayedPlanRows.length
  const currentRowsNominal = useMemo(() => {
    if (activeView === 'actual') {
      return displayedActualRows.reduce((sum, r) => sum + (r.total_price || 0), 0)
    }
    return displayedPlanRows.reduce((sum, r) => sum + (r.planning_amount || 0), 0)
  }, [activeView, displayedActualRows, displayedPlanRows])

  // Export current table view to CSV
  const handleExportCsv = () => {
    try {
      let csvContent = '\uFEFF' // BOM for UTF-8
      if (activeView === 'actual') {
        csvContent += 'No,Bulan,Tanggal,Nama Alat,No Registrasi,Kategori Alat,Nominal Biaya (Rp),No PR,No PO,No GR,Status,Laboratorium,PIC\n'
        displayedActualRows.forEach((r, idx) => {
          const cleanDesc = `"${(r.description || '').replace(/"/g, '""')}"`
          const noReg = `"${r.no_reg || '-'}"`
          const cat = `"${r.tipe_alat || '-'}"`
          const pr = `"${r.pr_doc_num || '-'}"`
          const po = `"${r.po_doc_num || '-'}"`
          const gr = `"${r.gr_legal_number || '-'}"`
          const supp = `"${r.supplier_name || 'Lab Kalibrasi'}"`
          csvContent += `${idx + 1},${r.bulan_name || r.bulan},${r.request_date || '-'},${cleanDesc},${noReg},${cat},${r.total_price || 0},${pr},${po},${gr},${r.status},${supp},${r.pic}\n`
        })
      } else {
        csvContent += 'No,Bulan Plan,Bulan Actual,Nama Alat / Item,No Registrasi,Kategori,Planning Budget (Rp),Actual Cost (Rp),Selisih (Rp),Status,PIC,Keterangan\n'
        displayedPlanRows.forEach((r, idx) => {
          const cleanItem = `"${(r.item || '').replace(/"/g, '""')}"`
          const noReg = `"${r.no_reg || '-'}"`
          const cat = `"${r.tipe_alat || '-'}"`
          const rem = `"${(r.remarks || '').replace(/"/g, '""')}"`
          csvContent += `${idx + 1},${r.month || '-'},${r.bulan_actual || '-'},${cleanItem},${noReg},${cat},${r.planning_amount || 0},${r.actual_amount || 0},${r.selisih || 0},${r.status_detail},${r.pic},${rem}\n`
        })
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KALIBRASI_QC_${activeView.toUpperCase()}_${periode}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('File data kalibrasi berhasil diunduh!')
    } catch (err) {
      console.error('Export CSV error:', err)
      toast.error('Gagal mengekspor data kalibrasi')
    }
  }

  // Export full master budget excel
  const handleExportMaster = async () => {
    try {
      setIsExporting(true)
      const res = await planningApi.exportDatabaseBudget(periode)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `DATABASE_WEB_BUDGET_${periode}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('File Master Database Budget berhasil diunduh!')
    } catch (err) {
      console.error('Export Master error:', err)
      toast.error('Gagal mengunduh file master budget')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={s.container}>
      {/* ─── Header ─── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <Gauge size={24} color="#0f172a" />
            Kalibrasi Alat Ukur QC
            <span className={s.titleBadge}>Equipment Calibration</span>
          </h1>
          <p className={s.subtitle}>
            Monitoring registrasi alat, jadwal kalibrasi tahunan, transaksi realisasi &amp; dokumen Good Receipt (GR), serta biaya kalibrasi lab eksternal terakreditasi.
          </p>
        </div>

        <div className={s.headerActions}>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            className={s.monthSelect}
            aria-label="Pilih Periode Tahun"
          >
            <option value="2026">Periode 2026</option>
            <option value="2025">Periode 2025</option>
            <option value="2024">Periode 2024</option>
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

          <button
            onClick={handleExportCsv}
            className={s.actionBtn}
            title="Download CSV tabel saat ini"
          >
            <FileDown size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportMaster}
            disabled={isExporting}
            className={`${s.actionBtn} ${s.actionBtnPrimary}`}
            title="Download Excel DATABASE WEB BUDGET"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            <span>Export Master Excel</span>
          </button>
        </div>
      </div>

      {/* ─── Mode Switcher Bar ─── */}
      <div className={s.modeSwitcher}>
        <button
          onClick={() => setActiveView('actual')}
          className={`${s.modeBtn} ${activeView === 'actual' ? s.modeBtnActive : ''}`}
        >
          <Layers size={15} />
          <span>Transaksi Aktual &amp; GR</span>
          <span className={s.modeCountBadge}>
            {rawData.summary.total_actual_count}
          </span>
        </button>

        <button
          onClick={() => setActiveView('plan')}
          className={`${s.modeBtn} ${activeView === 'plan' ? s.modeBtnActive : ''}`}
        >
          <Calendar size={15} />
          <span>Master Planning &amp; Jadwal</span>
          <span className={s.modeCountBadge}>
            {rawData.summary.total_plan_count}
          </span>
        </button>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className={s.kpiGrid}>
        {/* Card 1: Actual Realization */}
        <div className={`${s.kpiCard} ${s.kpiCardActual}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Total Biaya Aktual</span>
            <div className={s.kpiIconBox}>
              <CheckCircle2 size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {formatRp(rawData.summary.total_actual_nominal)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgeNeutral}>
              {rawData.summary.total_actual_count} Transaksi Kalibrasi Terdata
            </span>
          </div>
        </div>

        {/* Card 2: Master Plan Budget */}
        <div className={`${s.kpiCard} ${s.kpiCardPlan}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Budget Master Plan</span>
            <div className={s.kpiIconBox}>
              <Calendar size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {formatRp(rawData.summary.total_plan_nominal)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgeNeutral}>
              {rawData.summary.total_plan_count} Instrumen Terjadwal
            </span>
          </div>
        </div>

        {/* Card 3: Realized Master Plan */}
        <div className={`${s.kpiCard} ${s.kpiCardRealized}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Realisasi Plan Terverifikasi</span>
            <div className={s.kpiIconBox}>
              <Sliders size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: '#16a34a' }}>
            {formatRp(rawData.summary.realized_plan_nominal)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgePositive}>
              {((rawData.summary.realized_plan_nominal / (rawData.summary.total_plan_nominal || 1)) * 100).toFixed(1)}% Terealisasi
            </span>
          </div>
        </div>

        {/* Card 4: PIC Utama */}
        <div className={`${s.kpiCard} ${s.kpiCardPic}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>PIC Utama &amp; Lab</span>
            <div className={s.kpiIconBox}>
              <User size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {rawData.summary.pic_utama || 'Pak Aris'}
          </div>
          <div className={s.kpiSub}>
            <span>QC Specialist &amp; Lab Eksternal</span>
          </div>
        </div>
      </div>

      {/* ─── Instrument Category Breakdown Strip ─── */}
      <div className={s.categoryStrip}>
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`${s.categoryPill} ${selectedCategory === 'ALL' ? s.categoryPillActive : ''}`}
        >
          <span>Semua Kategori</span>
          <span className={s.pillCount}>
            {activeView === 'actual' ? rawData.summary.total_actual_count : rawData.summary.total_plan_count}
          </span>
        </button>

        {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
          const stat = rawData.tool_type_stats[catKey] || { count: 0, nominal: 0 }
          const isActive = selectedCategory === catKey
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(isActive ? 'ALL' : catKey)}
              className={`${s.categoryPill} ${isActive ? s.categoryPillActive : ''}`}
            >
              <span>{meta.label}</span>
              <span className={s.pillCount}>{stat.count}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Filter & Search Control Bar ─── */}
      <div className={s.controlCard}>
        <div className={s.filterGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="#64748b" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Status:
            </span>
          </div>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`${s.statusFilterBtn} ${statusFilter === 'ALL' ? s.statusFilterBtnActive : ''}`}
          >
            Semua Status
          </button>

          <button
            onClick={() => setStatusFilter('SELESAI')}
            className={`${s.statusFilterBtn} ${statusFilter === 'SELESAI' ? s.statusFilterBtnActive : ''}`}
          >
            <CheckCircle2 size={13} />
            <span>{activeView === 'actual' ? 'Selesai (GR)' : 'Terealisasi'}</span>
          </button>

          <button
            onClick={() => setStatusFilter('PROSES')}
            className={`${s.statusFilterBtn} ${statusFilter === 'PROSES' ? s.statusFilterBtnActive : ''}`}
          >
            <Clock size={13} />
            <span>{activeView === 'actual' ? 'Dalam Proses' : 'Belum Realisasi'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={s.monthSelect}
            aria-label="Filter Bulan"
          >
            <option value="ALL">Semua Bulan</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>

          <div className={s.searchBox}>
            <Search size={14} className={s.searchIcon} />
            <input
              type="text"
              placeholder="Cari nama alat, no reg, PR/PO/GR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>
      </div>

      {/* ─── Table Section ─── */}
      <div className={s.tableContainer}>
        <div className={s.tableWrapper}>
          {activeView === 'actual' ? (
            /* VIEW 1: TRANSAKSI AKTUAL & GR */
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: 44 }}>#</th>
                  <th className={s.th} style={{ width: 75 }}>Bulan</th>
                  <th className={s.th} style={{ width: 100 }}>Tanggal</th>
                  <th className={s.th}>Nama Alat Ukur &amp; Spesifikasi</th>
                  <th className={s.th} style={{ width: 120 }}>No. Registrasi</th>
                  <th className={s.th} style={{ width: 150 }}>Kategori Alat</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 130 }}>Biaya (Rp)</th>
                  <th className={s.th} style={{ width: 130 }}>Dokumen PR / PO</th>
                  <th className={s.th} style={{ width: 130 }}>No. GR / Status</th>
                  <th className={s.th} style={{ width: 90 }}>PIC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <Loader2 size={28} className="animate-spin" color="#0f172a" />
                        <span style={{ fontSize: '0.85rem' }}>Memuat data transaksi kalibrasi...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedActualRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <AlertCircle size={32} color="#94a3b8" />
                        <div className={s.emptyTitle}>Tidak ada transaksi kalibrasi yang cocok</div>
                        <div className={s.emptyDesc}>
                          Coba sesuaikan filter bulan, kategori alat, status dokumen, atau kata kunci pencarian.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedActualRows.map((row, idx) => {
                    const catMeta = getCatMeta(row.tipe_alat)
                    return (
                      <tr key={row.id || idx} className={s.tr}>
                        <td className={`${s.td} ${s.indexCell}`}>{idx + 1}</td>
                        <td className={s.td}>
                          <span className={s.monthBadge}>{row.bulan_name || `Bln ${row.bulan}`}</span>
                        </td>
                        <td className={s.td} style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {row.request_date || row.receipt_date || '—'}
                        </td>
                        <td className={s.td}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {row.nama_alat}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }} title={row.description}>
                            {row.description}
                          </div>
                        </td>
                        <td className={s.td}>
                          {row.no_reg ? (
                            <span className={s.noRegBadge}>{row.no_reg}</span>
                          ) : (
                            <span className={s.noRegEmpty}>—</span>
                          )}
                        </td>
                        <td className={s.td}>
                          <span className={s.toolTypeBadge}>
                            {catMeta.label}
                          </span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span className={s.costPositive}>{formatRp(row.total_price)}</span>
                        </td>
                        <td className={s.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {row.pr_doc_num && (
                              <span className={s.docPill} title={`PR: ${row.pr_doc_num}`}>
                                PR: {row.pr_doc_num}
                              </span>
                            )}
                            {row.po_doc_num && (
                              <span className={s.docPill} title={`PO: ${row.po_doc_num}`}>
                                PO: {row.po_doc_num}
                              </span>
                            )}
                            {!row.pr_doc_num && !row.po_doc_num && (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td className={s.td}>
                          {row.has_gr ? (
                            <div>
                              <span className={s.statusSelesai}>
                                <CheckCircle2 size={11} />
                                <span>SELESAI (GR)</span>
                              </span>
                              {row.gr_legal_number && (
                                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                                  {row.gr_legal_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={s.statusProses}>
                              <Clock size={11} />
                              <span>PROSES</span>
                            </span>
                          )}
                        </td>
                        <td className={s.td}>
                          <span className={s.picBadge}>{row.pic || 'Pak Aris'}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* VIEW 2: MASTER PLANNING KALIBRASI */
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: 44 }}>#</th>
                  <th className={s.th} style={{ width: 110 }}>Jadwal Plan</th>
                  <th className={s.th}>Nama Alat / Item Master Plan</th>
                  <th className={s.th} style={{ width: 120 }}>No. Registrasi</th>
                  <th className={s.th} style={{ width: 150 }}>Kategori Alat</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 130 }}>Budget Plan (Rp)</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 130 }}>Actual Cost (Rp)</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: 120 }}>Selisih (Rp)</th>
                  <th className={s.th} style={{ width: 120 }}>Status Realisasi</th>
                  <th className={s.th} style={{ width: 90 }}>PIC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <Loader2 size={28} className="animate-spin" color="#0f172a" />
                        <span style={{ fontSize: '0.85rem' }}>Memuat jadwal master planning...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedPlanRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={s.emptyCell}>
                      <div className={s.emptyState}>
                        <AlertCircle size={32} color="#94a3b8" />
                        <div className={s.emptyTitle}>Tidak ada item master plan yang cocok</div>
                        <div className={s.emptyDesc}>
                          Coba sesuaikan filter bulan, kategori alat, atau kata kunci pencarian.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedPlanRows.map((row, idx) => {
                    const catMeta = getCatMeta(row.tipe_alat)
                    const isRealized = (row.actual_amount || 0) > 0
                    return (
                      <tr key={row.id || idx} className={s.tr}>
                        <td className={`${s.td} ${s.indexCell}`}>{idx + 1}</td>
                        <td className={s.td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span className={s.monthBadge}>Plan: {row.month || '—'}</span>
                            {row.bulan_actual && (
                              <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                                Act: {row.bulan_actual}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={s.td}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {row.nama_alat}
                          </div>
                          {row.remarks && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                              {row.remarks}
                            </div>
                          )}
                        </td>
                        <td className={s.td}>
                          {row.no_reg ? (
                            <span className={s.noRegBadge}>{row.no_reg}</span>
                          ) : (
                            <span className={s.noRegEmpty}>—</span>
                          )}
                        </td>
                        <td className={s.td}>
                          <span className={s.toolTypeBadge}>
                            {catMeta.label}
                          </span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span style={{ fontWeight: 600 }}>{formatRp(row.planning_amount)}</span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span style={{ fontWeight: 600, color: isRealized ? '#16a34a' : '#94a3b8' }}>
                            {formatRp(row.actual_amount)}
                          </span>
                        </td>
                        <td className={`${s.td} ${s.tdRight}`}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: row.selisih > 0 ? '#dc2626' : row.selisih < 0 ? '#16a34a' : '#64748b',
                            }}
                          >
                            {formatRp(row.selisih)}
                          </span>
                        </td>
                        <td className={s.td}>
                          {isRealized ? (
                            <span className={s.statusSelesai}>
                              <CheckCircle2 size={11} />
                              <span>{row.status_detail || 'Terealisasi'}</span>
                            </span>
                          ) : (
                            <span className={s.statusProses}>
                              <Clock size={11} />
                              <span>Belum Realisasi</span>
                            </span>
                          )}
                        </td>
                        <td className={s.td}>
                          <span className={s.picBadge}>{row.pic || 'Pak Aris'}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── Table Footer ─── */}
        <div className={s.tableFooter}>
          <div>
            Menampilkan <strong>{currentRowsCount}</strong> baris data kalibrasi{' '}
            {activeView === 'actual' ? '(Transaksi Realisasi)' : '(Item Master Plan)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span>Total Nominal Terpilih:</span>
            <span className={s.footerTotal}>{formatRp(currentRowsNominal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
