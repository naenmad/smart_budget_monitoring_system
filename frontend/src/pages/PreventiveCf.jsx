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
  Layers,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
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

export default function PreventiveCf() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
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

  // Export to Excel handler
  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const XLSX = await import('xlsx')
      const exportRows = filteredRows.map((r, idx) => ({
        'No': idx + 1,
        'Bulan Rencana': r.bulan_list || '-',
        'Kategori Aktivitas': r.activity,
        'Nama Item': r.item,
        'Spesifikasi Teknis': r.spesifikasi || '-',
        'Qty': r.qty || 0,
        'Unit': r.unit || '-',
        'Harga Satuan (Rp)': Number(r.cost || 0),
        'Total Pagu Plan (Rp)': Number(r.total_list || 0),
        'Realisasi Pembayaran GL (Rp)': Number(r.actual_gl || 0),
        'Nomor Dokumen GL': r.no_dokumen_gl || '-',
        'Status': (r.status || '').toLowerCase().includes('terealisasi') ? 'TEREALISASI' : 'PENDING'
      }))

      const ws = XLSX.utils.json_to_sheet(exportRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Preventive_CF')
      XLSX.writeFile(wb, `PREVENTIVE_CF_${periode}.xlsx`)
    } catch (err) {
      console.error('Export Excel failed:', err)
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
          </h1>
          <p className={s.subtitle}>
            Monitoring alokasi pemeliharaan, kategori 4 aktivitas, harga satuan (@ Rp), dan realisasi dokumen GL
          </p>
        </div>

        <div className={s.headerRight}>
          <PeriodeSwitcher value={periode} onChange={setPeriode} />
          <button
            className="btn-secondary"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} color="#16a34a" />}
            <span>Export Excel</span>
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
            <span className={s.kpiLabel}>Realisasi Pembayaran (GL)</span>
            <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(rawData.total_actual)}</span>
            <span className={s.kpiSub}>Serapan: {serapanPct}% dari pagu</span>
            <div className={s.kpiProgress}>
              <div
                className={s.kpiProgressBar}
                style={{ width: `${Math.min(Number(serapanPct), 100)}%`, background: '#10b981' }}
              />
            </div>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div
            className={s.kpiIcon}
            style={{ background: rawData.sisa < 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)' }}
          >
            <DollarSign size={20} color={rawData.sisa < 0 ? '#dc2626' : '#16a34a'} />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Sisa Alokasi Anggaran</span>
            <span className={s.kpiValue} style={{ color: rawData.sisa < 0 ? '#dc2626' : '#16a34a' }}>
              {formatRp(rawData.sisa)}
            </span>
            <span className={s.kpiSub}>{rawData.sisa >= 0 ? 'Budget masih aman' : 'Perhatian: Defisit'}</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} style={{ background: 'rgba(147,51,234,0.1)' }}>
            <TrendingUp size={20} color="#9333ea" />
          </div>
          <div className={s.kpiContent}>
            <span className={s.kpiLabel}>Distribusi Aktivitas</span>
            <span className={s.kpiValue} style={{ color: '#9333ea' }}>4 Kategori</span>
            <span className={s.kpiSub}>Sparepart, Perbaikan, Tooling, Modif</span>
          </div>
        </div>
      </div>

      {/* Activity Breakdown Section */}
      <div className={s.activitySection}>
        <div className={s.sectionHeader}>
          <span className={s.sectionTitle}>
            <Layers size={14} />
            Breakdown 4 Kategori Aktivitas (Klik untuk filter)
          </span>
          {selectedCategory !== 'ALL' && (
            <button
              type="button"
              className={s.resetBtn}
              onClick={() => setSelectedCategory('ALL')}
            >
              Reset Filter Kategori
            </button>
          )}
        </div>

        <div className={s.categoryGrid}>
          {categoryStats.map(cat => {
            const isActive = selectedCategory === cat.name
            return (
              <div
                key={cat.name}
                className={`${s.categoryCard} ${isActive ? s.categoryCardActive : ''}`}
                onClick={() => setSelectedCategory(isActive ? 'ALL' : cat.name)}
                role="button"
                tabIndex={0}
              >
                <div className={s.catTop}>
                  <span className={s.catName}>
                    <span className={s.catDot} style={{ background: cat.meta.color }} />
                    {cat.meta.label}
                  </span>
                  <span className={s.catBadge}>{cat.count} item</span>
                </div>
                <div className={s.catNominal}>{formatRp(cat.plan)}</div>
                <div className={s.catBar}>
                  <div
                    className={s.catFill}
                    style={{ width: `${cat.pctShare}%`, background: cat.meta.color }}
                  />
                </div>
                <div className={s.catBottom}>
                  <span>Realisasi: {formatRp(cat.actual)}</span>
                  <span>{cat.pctShare}% share</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className={s.toolbarCard}>
        <div className={s.toolbarRow}>
          <div className={s.monthPills}>
            <button
              type="button"
              className={`${s.monthPill} ${selectedMonth === 'ALL' ? s.monthPillActive : ''}`}
              onClick={() => setSelectedMonth('ALL')}
            >
              Semua Bulan ({allItems.length})
            </button>
            {monthList.map(m => (
              <button
                key={m}
                type="button"
                className={`${s.monthPill} ${selectedMonth === m ? s.monthPillActive : ''}`}
                onClick={() => setSelectedMonth(m)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className={s.filterGroup}>
            <select
              className={s.statusSelect}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua Status</option>
              <option value="TEREALISASI">Hanya Terealisasi</option>
              <option value="PENDING">Hanya Pending</option>
            </select>

            <div className={s.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Cari item, spesifikasi, part, doc..."
                className={s.searchInput}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {selectedCategory !== 'ALL' && (
          <div>
            <span className={s.activeFilterPill}>
              Filter Kategori: {CATEGORY_META[selectedCategory]?.label || selectedCategory}
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Master Data Table */}
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          {loading ? (
            <div className={s.emptyState}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
              <span>Memuat rincian Preventive C/F...</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={s.emptyState}>
              Tidak ada data yang cocok dengan kriteria filter yang dipilih.
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: 32, textAlign: 'center' }}>#</th>
                  <th style={{ width: 75 }}>Bulan</th>
                  <th style={{ width: 140 }}>Aktivitas</th>
                  <th style={{ minWidth: 260 }}>Item Pemeliharaan &amp; Spesifikasi</th>
                  <th style={{ width: 75, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 125, textAlign: 'right' }}>Harga Satuan (@)</th>
                  <th style={{ width: 125, textAlign: 'right' }}>Total Plan (Rp)</th>
                  <th style={{ width: 125, textAlign: 'right' }}>Realisasi GL (Rp)</th>
                  <th style={{ width: 110 }}>Ref Dokumen</th>
                  <th style={{ width: 95, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const meta = CATEGORY_META[r.activity] || { color: '#64748b', bg: '#f1f5f9' }
                  const isOk = (r.status || '').toLowerCase().includes('terealisasi')
                  return (
                    <tr key={r.id || idx}>
                      <td className={s.rowNum}>{idx + 1}</td>
                      <td>
                        <span className={s.monthBadge}>{r.bulan_list || '—'}</span>
                      </td>
                      <td>
                        <span
                          className={s.catTag}
                          style={{ color: meta.color, background: meta.bg }}
                        >
                          {r.activity}
                        </span>
                      </td>
                      <td>
                        <div className={s.itemName}>{r.item}</div>
                        {r.spesifikasi && (
                          <div className={s.itemSpec}>Spek: {r.spesifikasi}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 11 }}>
                        {r.qty || '—'} {r.unit || ''}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={s.unitPriceBadge}>
                          {r.cost ? formatRp(r.cost) : '—'}
                        </span>
                      </td>
                      <td className={s.nominalPlan}>
                        {formatRp(r.total_list)}
                      </td>
                      <td className={s.nominalActual}>
                        {r.actual_gl > 0 ? formatRp(r.actual_gl) : '—'}
                      </td>
                      <td>
                        {r.no_dokumen_gl ? (
                          <div className={s.docNum}>{r.no_dokumen_gl}</div>
                        ) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${s.statusBadge} ${isOk ? s.statusOk : s.statusPending}`}>
                          {isOk ? 'Terealisasi' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer */}
        <div className={s.tableFooter}>
          <span>
            Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{allItems.length}</strong> item
          </span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>
              Subtotal Plan: <strong style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                {formatRp(subtotalPlan)}
              </strong>
            </span>
            <span>
              Subtotal Realisasi GL: <strong style={{ color: '#10b981', fontFamily: 'JetBrains Mono' }}>
                {formatRp(subtotalActual)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
