import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wrench,
  Search,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Layers,
  Calendar,
  Filter,
  DollarSign,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { toast } from 'react-hot-toast'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import { exportPreventiveCfExcel } from '../utils/excelExport'
import PeriodeSwitcher from '../components/SwitchComponent'
import s from './PreventiveCf.module.css'

function classifyActivity(item, spec) {
  const txt = `${item || ''} ${spec || ''}`.toUpperCase()
  if (['MODIF', 'BRACKET', 'SWING GAUGE', 'MAKING BOARD', 'JIG', 'MODIFIKASI'].some(k => txt.includes(k))) {
    return 'Modifikasi'
  }
  if (['REPAIR', 'PERBAIKAN', 'PAINT', 'CAT', 'CORRECTION', 'SERVICE'].some(k => txt.includes(k))) {
    return 'Perbaikan & Maintenance'
  }
  if (['PIN GAUGE', 'CALIPER', 'DIAL', 'SNAP GAUGE', 'RATCHET', 'WRENCH', 'DOWEL PIN'].some(k => txt.includes(k))) {
    return 'Tooling & Inspection'
  }
  return 'Sparepart & Consumable CF'
}

const CATEGORY_META = {
  'Sparepart & Consumable CF': { color: '#2563eb', bg: 'rgba(37,99,235,0.08)', label: 'Sparepart & Consumable CF' },
  'Perbaikan & Maintenance': { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', label: 'Perbaikan & Maintenance' },
  'Tooling & Inspection': { color: '#059669', bg: 'rgba(16,185,129,0.08)', label: 'Tooling & Inspection' },
  'Modifikasi': { color: '#9333ea', bg: 'rgba(147,51,234,0.08)', label: 'Modifikasi Jig & Fixture' },
}

const formatYAxisRp = (val) => {
  if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}M`
  if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`
  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`
  return `${val}`
}

export default function PreventiveCf() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [rawData, setRawData] = useState({
    total_plan: 0,
    total_actual: 0,
    sisa: 0,
    total_count: 0,
    monthly_stats: {},
    data: []
  })
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'TEREALISASI' | 'PENDING'
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getPreventiveCf()
      if (res.data?.success) {
        setRawData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch preventive CF data:', err)
      toast.error('Gagal mengambil data Preventive C/F')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allItems = rawData.data || []

  // Classify all items
  const classifiedItems = useMemo(() => {
    return allItems.map(it => ({
      ...it,
      activity: classifyActivity(it.item, it.spesifikasi)
    }))
  }, [allItems])

  // Category stats
  const categoryStats = useMemo(() => {
    const stats = {
      'Sparepart & Consumable CF': { count: 0, plan: 0, actual: 0 },
      'Perbaikan & Maintenance': { count: 0, plan: 0, actual: 0 },
      'Tooling & Inspection': { count: 0, plan: 0, actual: 0 },
      'Modifikasi': { count: 0, plan: 0, actual: 0 },
    }

    classifiedItems.forEach(it => {
      const cat = it.activity
      if (stats[cat]) {
        stats[cat].count += 1
        stats[cat].plan += Number(it.total_list || 0)
        stats[cat].actual += Number(it.actual_gl || 0)
      }
    })

    const totalPlan = rawData.total_plan || 1
    return Object.entries(stats).map(([name, val]) => ({
      name,
      ...val,
      pctShare: Math.round((val.plan / totalPlan) * 100) || 0,
      meta: CATEGORY_META[name] || { color: '#64748b', bg: '#f1f5f9', label: name },
    })).sort((a, b) => b.plan - a.plan)
  }, [classifiedItems, rawData.total_plan])

  // Chart data: Plan vs Actual per category
  const categoryChartData = useMemo(() => {
    return categoryStats.map((c) => ({
      name: c.name
        .replace(' & Consumable CF', '')
        .replace(' & Maintenance', '')
        .replace(' & Inspection', ''),
      fullName: c.name,
      'Pagu Plan': c.plan,
      'Realisasi GL': c.actual,
      count: c.count
    }))
  }, [categoryStats])

  // Chart data: Monthly timeline
  const monthlyChartData = useMemo(() => {
    const stats = rawData.monthly_stats || {}
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return monthOrder
      .map((m) => {
        const item = stats[m] || { plan: 0, actual: 0, count: 0 }
        return {
          month: m,
          'Pagu Plan': Number(item.plan || 0),
          'Realisasi GL': Number(item.actual || 0),
          count: item.count || 0
        }
      })
      .filter((d) => d['Pagu Plan'] > 0 || d['Realisasi GL'] > 0)
  }, [rawData.monthly_stats])

  // Unique month list
  const monthList = useMemo(() => {
    const set = new Set()
    allItems.forEach(i => { if (i.bulan_list) set.add(i.bulan_list) })
    return Array.from(set)
  }, [allItems])

  // Filtered rows
  const filteredRows = useMemo(() => {
    let list = classifiedItems
    if (selectedCategory !== 'ALL') {
      list = list.filter(i => i.activity === selectedCategory)
    }
    if (selectedMonth !== 'ALL') {
      list = list.filter(i => i.bulan_list === selectedMonth)
    }
    if (statusFilter === 'TEREALISASI') {
      list = list.filter(i => (i.status || '').toLowerCase().includes('terealisasi'))
    } else if (statusFilter === 'PENDING') {
      list = list.filter(i => !(i.status || '').toLowerCase().includes('terealisasi'))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i =>
        (i.item || '').toLowerCase().includes(q) ||
        (i.spesifikasi || '').toLowerCase().includes(q) ||
        (i.no_dokumen_gl || '').toLowerCase().includes(q) ||
        (i.activity || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [classifiedItems, selectedCategory, selectedMonth, statusFilter, search])

  // Dedicated export handler for Preventive CF
  const handleExportExcel = () => {
    try {
      setIsExporting(true)
      exportPreventiveCfExcel({
        items: filteredRows.length > 0 ? filteredRows : classifiedItems,
        categoryStats,
        summary: rawData,
        periode
      })
      toast.success(`Laporan Preventive C/F (${periode}) berhasil diunduh!`)
    } catch (err) {
      console.error('Export Excel failed:', err)
      toast.error('Gagal mengekspor data Preventive C/F')
    } finally {
      setIsExporting(false)
    }
  }

  const serapanPct = rawData.total_plan > 0
    ? ((rawData.total_actual / rawData.total_plan) * 100).toFixed(1)
    : '0'

  const subtotalPlan = filteredRows.reduce((acc, r) => acc + Number(r.total_list || 0), 0)
  const subtotalActual = filteredRows.reduce((acc, r) => acc + Number(r.actual_gl || 0), 0)

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <Wrench size={24} color="var(--primary)" />
            <span>Preventive C/F (Cutting Fixture)</span>
            <span className={s.titleBadge}>QC Tooling Maintenance</span>
          </h1>
          <p className={s.subtitle}>
            Monitoring alokasi pemeliharaan, kategori 4 aktivitas, harga satuan (@ Rp), dan realisasi dokumen GL
          </p>
        </div>

        <div className={s.headerRight}>
          <PeriodeSwitcher value={periode} onChange={setPeriode} />
          <button
            type="button"
            className={s.exportBtn}
            onClick={handleExportExcel}
            disabled={isExporting || allItems.length === 0}
            title="Download Laporan Excel Khusus Preventive C/F"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={15} />}
            <span>{isExporting ? 'Mengekspor...' : 'Export Excel Preventive'}</span>
          </button>
          <button
            type="button"
            className={s.iconBtn}
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Hero Cards */}
      <div className={s.kpiGrid}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'rgba(37,99,235,0.1)' }}>
            <Layers size={20} color="#2563eb" />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Total Pagu Plan</span>
            <span className={s.kpiValue} style={{ color: '#2563eb' }}>{formatRp(rawData.total_plan)}</span>
            <span className={s.kpiSub}>70 Master Item Terencana</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'rgba(16,185,129,0.1)' }}>
            <CheckCircle2 size={20} color="#10b981" />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Realisasi Aktual GL</span>
            <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(rawData.total_actual)}</span>
            <span className={s.kpiSub}>Serapan: <strong>{serapanPct}%</strong></span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'rgba(245,158,11,0.1)' }}>
            <DollarSign size={20} color="#f59e0b" />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Sisa Pagu Budget</span>
            <span className={s.kpiValue} style={{ color: '#f59e0b' }}>{formatRp(rawData.sisa)}</span>
            <span className={s.kpiSub}>Alokasi belum terealisasi</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'rgba(147,51,234,0.1)' }}>
            <TrendingUp size={20} color="#9333ea" />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Tingkat Realisasi</span>
            <span className={s.kpiValue} style={{ color: '#9333ea' }}>{serapanPct}%</span>
            <div className={s.progressBarMini}>
              <div
                className={s.progressFillMini}
                style={{
                  width: `${Math.min(Number(serapanPct), 100)}%`,
                  background: Number(serapanPct) > 90 ? '#ef4444' : '#9333ea'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Category Split Cards */}
      <div className={s.categoryGrid}>
        {categoryStats.map(cat => {
          const isSelected = selectedCategory === cat.name
          const catSerapan = cat.plan > 0 ? ((cat.actual / cat.plan) * 100).toFixed(0) : '0'
          return (
            <div
              key={cat.name}
              className={`${s.catCard} ${isSelected ? s.catCardActive : ''}`}
              onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat.name)}
              style={{ '--cat-color': cat.meta.color }}
            >
              <div className={s.catHeader}>
                <span className={s.catBadge} style={{ background: cat.meta.bg, color: cat.meta.color }}>
                  {cat.meta.label}
                </span>
                <span className={s.catCount}>{cat.count} Item</span>
              </div>
              <div className={s.catAmounts}>
                <div className={s.catAmountRow}>
                  <span className={s.catAmountLabel}>Plan:</span>
                  <span className={s.catAmountValue}>{formatRp(cat.plan)}</span>
                </div>
                <div className={s.catAmountRow}>
                  <span className={s.catAmountLabel}>Actual:</span>
                  <span className={s.catAmountValue} style={{ color: cat.actual > 0 ? '#10b981' : '#94a3b8' }}>
                    {formatRp(cat.actual)}
                  </span>
                </div>
              </div>
              <div className={s.catFooter}>
                <span className={s.catShare}>{cat.pctShare}% dari Pagu</span>
                <span className={s.catSerapan} style={{ color: Number(catSerapan) > 0 ? '#10b981' : '#64748b' }}>
                  Serapan: {catSerapan}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Historical Statistics Section ── */}
      <div className={s.statsSection}>
        <div className={s.statsHeader}>
          <div className={s.statsTitleGroup}>
            <Activity size={16} color="#2563eb" />
            <h2 className={s.statsTitle}>Statistik &amp; Analisis Kategori Preventive C/F</h2>
            <span className={s.statsSub}>Komparasi Pagu Rencana vs Realisasi GL per kelompok aktivitas dan timeline bulanan</span>
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
            {/* Chart 1: Plan vs Actual per Kategori */}
            <div className={s.chartCard}>
              <div className={s.chartHeader}>
                <span className={s.chartTitle}>Pagu Plan vs Realisasi GL per Kategori</span>
                <span className={s.chartSub}>Nominal dalam Rupiah</span>
              </div>
              <div className={s.chartContainer}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
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
                              <div className={s.tooltipMonth}>{data.fullName}</div>
                              <div className={s.tooltipRow}>
                                <span style={{ color: '#94a3b8' }}>Pagu Plan:</span>
                                <strong>{formatRp(data['Pagu Plan'])}</strong>
                              </div>
                              <div className={s.tooltipRow}>
                                <span style={{ color: '#60a5fa' }}>Realisasi GL:</span>
                                <strong style={{ color: '#34d399' }}>{formatRp(data['Realisasi GL'])}</strong>
                              </div>
                              <div className={s.tooltipSub}>{data.count} item terdaftar</div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="Pagu Plan" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Realisasi GL" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Timeline Eksekusi Bulanan */}
            <div className={s.chartCard}>
              <div className={s.chartHeader}>
                <span className={s.chartTitle}>Timeline Eksekusi Anggaran Bulanan</span>
                <span className={s.chartSub}>Distribusi jadwal pemeliharaan</span>
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
                                <span style={{ color: '#94a3b8' }}>Pagu:</span>
                                <strong>{formatRp(data['Pagu Plan'])}</strong>
                              </div>
                              <div className={s.tooltipRow}>
                                <span style={{ color: '#60a5fa' }}>Realisasi:</span>
                                <strong style={{ color: '#34d399' }}>{formatRp(data['Realisasi GL'])}</strong>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="Pagu Plan" fill="#cbd5e1" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Realisasi GL" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className={s.filterBar}>
        <div className={s.filterGroup}>
          <div className={s.searchBox}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Cari item, spek, no GL, kategori..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua 4 Kategori</option>
            {categoryStats.map(c => (
              <option key={c.name} value={c.name}>{c.meta.label}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua Bulan</option>
            {monthList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua Status</option>
            <option value="TEREALISASI">Terealisasi Saja</option>
            <option value="PENDING">Pending Saja</option>
          </select>
        </div>

        <div className={s.filterSummary}>
          <span>Menampilkan <strong>{filteredRows.length}</strong> dari {allItems.length} item</span>
        </div>
      </div>

      {/* Table Section */}
      <div className={s.tableCard}>
        <div className={s.tableContainer}>
          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={32} className="animate-spin" color="var(--primary)" />
              <p>Memuat data Preventive C/F...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={s.emptyState}>
              <AlertCircle size={36} color="var(--text-muted)" />
              <p>Tidak ada data Preventive C/F yang sesuai dengan filter.</p>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '70px' }}>Bulan</th>
                  <th style={{ width: '130px' }}>Kategori</th>
                  <th style={{ minWidth: '220px' }}>Item Pemeliharaan CF</th>
                  <th style={{ minWidth: '200px' }}>Spesifikasi Teknis</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Qty / Unit</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Harga Satuan</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Pagu Plan</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Realisasi GL</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Dokumen GL</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const meta = CATEGORY_META[r.activity] || { color: '#64748b', bg: '#f1f5f9' }
                  const isRealized = (r.status || '').toLowerCase().includes('terealisasi')
                  return (
                    <tr key={r.id || idx}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <span className={s.monthBadge}>{r.bulan_list || '-'}</span>
                      </td>
                      <td>
                        <span
                          className={s.catPill}
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {r.activity}
                        </span>
                      </td>
                      <td className={s.itemCell}>
                        <div className={s.itemName}>{r.item}</div>
                      </td>
                      <td className={s.specCell}>
                        <div className={s.specText}>{r.spesifikasi || '-'}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {r.qty || 1} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{r.unit || 'pcs'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatRp(r.cost)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatRp(r.total_list)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: Number(r.actual_gl || 0) > 0 ? '#10b981' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatRp(r.actual_gl || 0)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.no_dokumen_gl ? (
                          <span className={s.docBadge}>{r.no_dokumen_gl}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={isRealized ? s.statusRealized : s.statusPending}>
                          {isRealized ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Terealisasi</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={12} />
                              <span>Pending</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer Summary */}
        <div className={s.tableFooter}>
          <div className={s.footerSummary}>
            <span>Subtotal ({filteredRows.length} item):</span>
            <span className={s.footerPlan}>Plan: <strong>{formatRp(subtotalPlan)}</strong></span>
            <span className={s.footerActual}>Actual: <strong>{formatRp(subtotalActual)}</strong></span>
            <span className={s.footerSisa}>Sisa: <strong>{formatRp(subtotalPlan - subtotalActual)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
