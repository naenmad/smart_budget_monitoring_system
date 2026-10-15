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
  FileDown,
  Activity,
  ChevronDown,
  ChevronUp,
  FileCheck2
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { toast } from 'react-hot-toast'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import { exportKalibrasiExcel } from '../utils/excelExport'
import s from './Kalibrasi.module.css'

const CATEGORY_META = {
  'Dimensi & Panjang': { label: 'Dimensi & Panjang' },
  'Sudut & Geometri': { label: 'Sudut & Geometri' },
  'Torsi & Gaya': { label: 'Torsi & Gaya' },
  'CMM & Presisi Khusus': { label: 'CMM & Presisi Khusus' },
  'Massa & Timbangan': { label: 'Massa & Timbangan' },
  'Thermal & Suhu': { label: 'Thermal & Suhu' },
  'Instrumen Lainnya': { label: 'Instrumen Lainnya' },
}

function getCatMeta(cat) {
  return CATEGORY_META[cat] || {
    label: cat || 'Lainnya',
  }
}

const formatYAxisRp = (val) => {
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`
  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
  return `${val}`
}

export default function Kalibrasi() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('actual') // 'actual' | 'plan'
  const [isExporting, setIsExporting] = useState(false)
  const [showStats, setShowStats] = useState(true)

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

  // Chart data: Monthly calibration spend
  const monthlyChartData = useMemo(() => {
    const stats = rawData.monthly_stats || {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return monthNames
      .map((m) => {
        const d = stats[m] || { count: 0, nominal: 0 }
        return {
          month: m,
          nominal: Number(d.nominal || 0),
          count: d.count || 0,
        }
      })
      .filter((d) => d.nominal > 0 || d.count > 0)
  }, [rawData.monthly_stats])

  // GR Status and tool volume
  const grStats = useMemo(() => {
    const actuals = rawData.actual_data || []
    const total = actuals.length
    const completed = actuals.filter((r) => r.has_gr).length
    const pending = total - completed
    const pct = total > 0 ? ((completed / total) * 100).toFixed(0) : '0'
    return { total, completed, pending, pct }
  }, [rawData.actual_data])

  // Tool categories ranked
  const toolCategoryList = useMemo(() => {
    const stats = rawData.tool_type_stats || {}
    const totalNom = rawData.summary?.total_actual_nominal || 1
    return Object.entries(stats)
      .map(([cat, val]) => ({
        name: cat,
        count: val.count || 0,
        nominal: val.nominal || 0,
        pct: Number(((val.nominal / totalNom) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.nominal - a.nominal)
  }, [rawData.tool_type_stats, rawData.summary?.total_actual_nominal])

  // Export current table view to CSV
  const handleExportCsv = () => {
    try {
      const header = activeView === 'actual'
        ? ['No', 'Bulan', 'Tanggal', 'Nama Alat', 'No Registrasi', 'Kategori Alat', 'Nominal Biaya (Rp)', 'No PR', 'No PO', 'No GR', 'Status', 'Laboratorium', 'PIC']
        : ['No', 'Bulan Plan', 'Bulan Actual', 'Nama Alat / Item', 'No Registrasi', 'Kategori', 'Planning Budget (Rp)', 'Actual Cost (Rp)', 'Selisih (Rp)', 'Status', 'PIC', 'Keterangan']

      const lines = [header.join(',')]
      if (activeView === 'actual') {
        displayedActualRows.forEach((r, idx) => {
          const cleanDesc = `"${(r.description || '').replace(/"/g, '""')}"`
          const noReg = `"${r.no_reg || '-'}"`
          const cat = `"${r.tipe_alat || '-'}"`
          const pr = `"${r.pr_doc_num || '-'}"`
          const po = `"${r.po_doc_num || '-'}"`
          const gr = `"${r.gr_legal_number || '-'}"`
          const supp = `"${r.supplier_name || 'Lab Kalibrasi'}"`
          lines.push([idx + 1, r.bulan_name || r.bulan, r.request_date || '-', cleanDesc, noReg, cat, r.total_price || 0, pr, po, gr, r.status, supp, r.pic].join(','))
        })
      } else {
        displayedPlanRows.forEach((r, idx) => {
          const cleanItem = `"${(r.item || '').replace(/"/g, '""')}"`
          const noReg = `"${r.no_reg || '-'}"`
          const cat = `"${r.tipe_alat || '-'}"`
          const rem = `"${(r.remarks || '').replace(/"/g, '""')}"`
          lines.push([idx + 1, r.month || '-', r.bulan_actual || '-', cleanItem, noReg, cat, r.planning_amount || 0, r.actual_amount || 0, r.selisih || 0, r.status_detail, r.pic, rem].join(','))
        })
      }

      const csvContent = '\uFEFF' + lines.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `KALIBRASI_QC_${activeView.toUpperCase()}_${periode}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('File data kalibrasi (CSV) berhasil diunduh!')
    } catch (err) {
      console.error('Export CSV error:', err)
      toast.error('Gagal mengekspor data kalibrasi')
    }
  }

  // Dedicated multi-sheet Excel export for Kalibrasi QC
  const handleExportExcel = () => {
    try {
      setIsExporting(true)
      exportKalibrasiExcel({
        actualRows: displayedActualRows.length > 0 ? displayedActualRows : rawData.actual_data,
        planRows: displayedPlanRows.length > 0 ? displayedPlanRows : rawData.planning_data,
        toolTypeStats: rawData.tool_type_stats,
        summary: rawData.summary,
        periode,
      })
      toast.success(`Laporan Kalibrasi Alat QC (${periode}) berhasil diunduh!`)
    } catch (err) {
      console.error('Export Kalibrasi error:', err)
      toast.error('Gagal mengekspor file Excel kalibrasi')
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
            onClick={handleExportExcel}
            disabled={isExporting}
            className={`${s.actionBtn} ${s.actionBtnPrimary}`}
            title="Download Laporan Excel Khusus Kalibrasi (Aktual & Plan)"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} color="#ffffff" />
            )}
            <span>Export Kalibrasi Excel</span>
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
              {rawData.summary.total_plan_count} Item Jadwal Kalibrasi
            </span>
          </div>
        </div>

        {/* Card 3: Realisasi vs Plan */}
        <div className={`${s.kpiCard} ${s.kpiCardCompare}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Realisasi vs Plan</span>
            <div className={s.kpiIconBox}>
              <Sliders size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {formatRp(rawData.summary.realized_plan_nominal)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgeNeutral}>
              {rawData.summary.total_plan_nominal > 0
                ? `${((rawData.summary.realized_plan_nominal / rawData.summary.total_plan_nominal) * 100).toFixed(1)}% dari Total Pagu Rencana`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 4: PIC Utama & Dokumen GR */}
        <div className={`${s.kpiCard} ${s.kpiCardPic}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Kelengkapan GR &amp; PIC</span>
            <div className={s.kpiIconBox}>
              <User size={18} color="#0f172a" />
            </div>
          </div>
          <div className={s.kpiValue}>
            {grStats.pct}% Selesai GR
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgePic}>
              PIC: {rawData.summary.pic_utama || 'Pak Aris'} ({grStats.completed}/{grStats.total})
            </span>
          </div>
        </div>
      </div>

      {/* ─── Historical Statistics & Category Distribution Section ─── */}
      <div className={s.statsSection}>
        <div className={s.statsHeader}>
          <div className={s.statsTitleGroup}>
            <Activity size={16} color="#2563eb" />
            <h2 className={s.statsTitle}>Statistik &amp; Volume Kalibrasi QC</h2>
            <span className={s.statsSub}>Analisis biaya bulanan, kategori instrumen, dan rasio penyelesaian dokumen GR</span>
          </div>
          <button
            type="button"
            className={s.statsToggleBtn}
            onClick={() => setShowStats(!showStats)}
            title={showStats ? 'Sembunyikan grafik' : 'Tampilkan grafik'}
          >
            <span>{showStats ? 'Sembunyikan' : 'Tampilkan Analitik'}</span>
            {showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showStats && (
          <div className={s.statsGrid}>
            {/* Chart: Tren Biaya Kalibrasi Bulanan */}
            <div className={s.chartCard}>
              <div className={s.chartHeader}>
                <span className={s.chartTitle}>Tren Biaya Kalibrasi Bulanan ({periode})</span>
                <span className={s.chartSub}>Nominal dalam Rupiah</span>
              </div>
              <div className={s.chartContainer}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatYAxisRp}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      width={45}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className={s.customTooltip}>
                              <div className={s.tooltipMonth}>Bulan: {label}</div>
                              <div className={s.tooltipRow}>
                                <span>Biaya Kalibrasi:</span>
                                <strong>{formatRp(data.nominal)}</strong>
                              </div>
                              <div className={s.tooltipSub}>
                                {data.count} alat ukur dikalibrasi
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="nominal" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Kategori Alat & Status GR */}
            <div className={s.catBreakdownCard}>
              <div className={s.chartHeader}>
                <span className={s.chartTitle}>Distribusi Kategori Instrumen</span>
                <span className={s.chartSub}>{toolCategoryList.length} kelompok alat ukur</span>
              </div>
              <div className={s.catList}>
                {toolCategoryList.length === 0 ? (
                  <div className={s.emptySmall}>Tidak ada data kategori</div>
                ) : (
                  toolCategoryList.slice(0, 5).map((item, idx) => (
                    <div key={item.name} className={s.catItem}>
                      <div className={s.catItemTop}>
                        <span className={s.catItemName}>{item.name}</span>
                        <span className={s.catItemNominal}>{formatRp(item.nominal)}</span>
                      </div>
                      <div className={s.catProgressBar}>
                        <div
                          className={s.catProgressFill}
                          style={{ width: `${Math.min(item.pct, 100)}%` }}
                        />
                      </div>
                      <div className={s.catItemMeta}>
                        <span>{item.count} alat</span>
                        <span>{item.pct}% dari biaya kalibrasi</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Filter & Toolbar ─── */}
      <div className={s.filterCard}>
        <div className={s.searchBox}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Cari nama alat, no registrasi, PR/PO, GR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>

        <div className={s.filterSelects}>
          {/* Filter Bulan */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={s.filterSelect}
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

          {/* Filter Tipe Alat */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={s.filterSelect}
            aria-label="Filter Kategori Alat"
          >
            <option value="ALL">Semua Kategori Alat</option>
            {Object.keys(CATEGORY_META).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={s.filterSelect}
            aria-label="Filter Status Dokumen"
          >
            <option value="ALL">Semua Status</option>
            <option value="SELESAI">Selesai GR / Terealisasi</option>
            <option value="PROSES">Dalam Proses / Belum GR</option>
          </select>
        </div>
      </div>

      {/* ─── Table Section ─── */}
      <div className={s.tableCard}>
        <div className={s.tableContainer}>
          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={32} className="animate-spin" color="#0f172a" />
              <p>Memuat data kalibrasi alat ukur...</p>
            </div>
          ) : currentRowsCount === 0 ? (
            <div className={s.emptyState}>
              <AlertCircle size={36} color="#94a3b8" />
              <p>Tidak ada transaksi kalibrasi yang sesuai dengan kriteria filter.</p>
            </div>
          ) : activeView === 'actual' ? (
            /* VIEW 1: TRANSAKSI AKTUAL & GR */
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '70px' }}>Bulan</th>
                  <th style={{ width: '90px' }}>Tanggal</th>
                  <th style={{ minWidth: '240px' }}>Nama Alat Ukur / Deskripsi</th>
                  <th style={{ width: '130px' }}>No Registrasi</th>
                  <th style={{ width: '140px' }}>Kategori Alat</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Biaya (Rp)</th>
                  <th style={{ width: '130px' }}>No PR / PO</th>
                  <th style={{ width: '120px' }}>No GR</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '150px' }}>Laboratorium / Vendor</th>
                  <th style={{ width: '100px' }}>PIC</th>
                </tr>
              </thead>
              <tbody>
                {displayedActualRows.map((r, idx) => {
                  return (
                    <tr key={r.id || idx}>
                      <td className={s.rowNum}>{idx + 1}</td>
                      <td>
                        <span className={s.monthBadge}>
                          {r.bulan_name || r.bulan}
                        </span>
                      </td>
                      <td className={s.dateCell}>
                        {r.request_date
                          ? new Date(r.request_date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className={s.nameCell}>
                        <div className={s.toolName}>{r.nama_alat}</div>
                        {r.description !== r.nama_alat && (
                          <div className={s.rawDesc} title={r.description}>
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.no_reg ? (
                          <span className={s.regBadge}>{r.no_reg}</span>
                        ) : (
                          <span className={s.textMuted}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={s.categoryTag}>
                          {r.tipe_alat}
                        </span>
                      </td>
                      <td className={s.nominalCell}>
                        {formatRp(r.total_price)}
                      </td>
                      <td className={s.docCell}>
                        {r.pr_doc_num && (
                          <div className={s.docItem}>
                            <span className={s.docLabel}>PR:</span>
                            <span className={s.docValue}>{r.pr_doc_num}</span>
                          </div>
                        )}
                        {r.po_doc_num && (
                          <div className={s.docItem}>
                            <span className={s.docLabel}>PO:</span>
                            <span className={s.docValue}>{r.po_doc_num}</span>
                          </div>
                        )}
                        {!r.pr_doc_num && !r.po_doc_num && (
                          <span className={s.textMuted}>-</span>
                        )}
                      </td>
                      <td className={s.docCell}>
                        {r.gr_legal_number ? (
                          <span className={s.grBadge}>
                            {r.gr_legal_number}
                          </span>
                        ) : (
                          <span className={s.textMuted}>Menunggu GR</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={r.has_gr ? s.statusCompleted : s.statusProcess}
                        >
                          {r.has_gr ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Selesai (GR)</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} />
                              <span>Proses</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className={s.vendorCell}>
                        <span title={r.supplier_name}>
                          {r.supplier_name || 'Lab Kalibrasi'}
                        </span>
                      </td>
                      <td className={s.picCell}>
                        <span className={s.picBadge}>
                          {r.pic || 'Pak Aris'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            /* VIEW 2: MASTER PLANNING & JADWAL */
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '80px' }}>Bulan Plan</th>
                  <th style={{ width: '80px' }}>Bulan Act</th>
                  <th style={{ minWidth: '240px' }}>Nama Alat Ukur (Plan)</th>
                  <th style={{ width: '130px' }}>No Registrasi</th>
                  <th style={{ width: '140px' }}>Kategori Alat</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Pagu Plan (Rp)</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Realisasi Act (Rp)</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Selisih (Rp)</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '100px' }}>PIC</th>
                  <th style={{ minWidth: '180px' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {displayedPlanRows.map((r, idx) => {
                  const isRealized = (r.actual_amount || 0) > 0
                  return (
                    <tr key={r.id || idx}>
                      <td className={s.rowNum}>{idx + 1}</td>
                      <td>
                        <span className={s.monthBadge}>{r.month || '-'}</span>
                      </td>
                      <td>
                        <span className={s.monthBadgeActual}>
                          {r.bulan_actual || '-'}
                        </span>
                      </td>
                      <td className={s.nameCell}>
                        <div className={s.toolName}>{r.nama_alat}</div>
                      </td>
                      <td>
                        {r.no_reg ? (
                          <span className={s.regBadge}>{r.no_reg}</span>
                        ) : (
                          <span className={s.textMuted}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={s.categoryTag}>
                          {r.tipe_alat}
                        </span>
                      </td>
                      <td className={s.nominalCell}>
                        {formatRp(r.planning_amount)}
                      </td>
                      <td
                        className={s.nominalCell}
                        style={{
                          color: isRealized ? '#16a34a' : '#94a3b8',
                          fontWeight: isRealized ? 700 : 500,
                        }}
                      >
                        {formatRp(r.actual_amount || 0)}
                      </td>
                      <td
                        className={s.nominalCell}
                        style={{
                          color: (r.selisih || 0) > 0 ? '#dc2626' : '#16a34a',
                        }}
                      >
                        {r.selisih ? formatRp(r.selisih) : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={isRealized ? s.statusCompleted : s.statusProcess}
                        >
                          {isRealized ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>{r.status_detail || 'Terealisasi'}</span>
                            </>
                          ) : (
                            <>
                              <Clock size={12} />
                              <span>{r.status_detail || 'Belum'}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className={s.picCell}>
                        <span className={s.picBadge}>
                          {r.pic || 'Pak Aris'}
                        </span>
                      </td>
                      <td className={s.remarksCell}>
                        {r.remarks || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── Table Footer Summary ─── */}
        <div className={s.tableFooter}>
          <div className={s.footerInfo}>
            <span>
              Menampilkan <strong>{currentRowsCount}</strong> data dari{' '}
              {activeView === 'actual'
                ? `${rawData.summary.total_actual_count} transaksi aktual`
                : `${rawData.summary.total_plan_count} item master planning`}
            </span>
          </div>

          <div className={s.footerTotal}>
            <span>Total Nilai:</span>
            <strong className={s.totalAmount}>
              {formatRp(currentRowsNominal)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}
