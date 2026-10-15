import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Wrench,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Cog,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Tag,
  ExternalLink
} from 'lucide-react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './PreventiveCfSection.module.css'

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
  'Sparepart & Consumable CF': { color: '#2563eb', label: 'Sparepart & Consumable CF' },
  'Perbaikan & Maintenance': { color: '#dc2626', label: 'Perbaikan & Maintenance' },
  'Tooling & Inspection': { color: '#059669', label: 'Tooling & Inspection' },
  'Modifikasi': { color: '#9333ea', label: 'Modifikasi Jig & Fixture' },
}

export default function PreventiveCfSection({ periode = '2026' }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    total_plan: 0,
    total_actual: 0,
    sisa: 0,
    total_count: 0,
    monthly_stats: {},
    data: []
  })
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getPreventiveCf()
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to load preventive CF data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allItems = data.data || []

  // Classify each item once
  const classifiedItems = useMemo(() => {
    return allItems.map(it => ({
      ...it,
      activity: classifyActivity(it.item, it.spesifikasi)
    }))
  }, [allItems])

  // Category breakdown aggregation
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

    const totalPlan = data.total_plan || 1
    return Object.entries(stats).map(([name, val]) => ({
      name,
      ...val,
      pctShare: Math.round((val.plan / totalPlan) * 100) || 0,
      color: CATEGORY_META[name]?.color || '#64748b',
      displayName: CATEGORY_META[name]?.label || name,
    })).sort((a, b) => b.plan - a.plan)
  }, [classifiedItems, data.total_plan])

  // Month list from items
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
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i =>
        (i.item || '').toLowerCase().includes(q) ||
        (i.spesifikasi || '').toLowerCase().includes(q) ||
        (i.no_dokumen_gl || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [classifiedItems, selectedCategory, selectedMonth, search])

  const serapanPct = data.total_plan > 0 ? ((data.total_actual / data.total_plan) * 100).toFixed(1) : '0'

  return (
    <div className={s.container}>
      {/* Header Row */}
      <div className={s.headerRow}>
        <div className={s.titleArea}>
          <h3>
            <Wrench size={19} color="var(--primary)" />
            <span>Preventive C/F — Breakdown Aktivitas & Rincian Pengadaan</span>
          </h3>
          <p>
            Alokasi pemeliharaan mesin & perlengkapan C/F, klasifikasi 4 aktivitas, dan harga riil per barang
          </p>
        </div>
        <div className={s.headerActions}>
          <Link to="/preventive-cf" className={s.fullPageBtn} title="Buka dedicated page Preventive C/F">
            <span>Buka Halaman Penuh</span>
            <ExternalLink size={13} />
          </Link>
          <span className={s.badgeHeader}>Tahun {periode} · 70 Item</span>
          <button
            type="button"
            className={s.refreshBtn}
            onClick={fetchData}
            disabled={loading}
            title="Refresh data Preventive C/F"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className={s.kpiStrip}>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Total Pagu List (Plan)</span>
          <span className={s.kpiValue} style={{ color: 'var(--primary)' }}>
            {formatRp(data.total_plan)}
          </span>
          <span className={s.kpiSub}>70 Master Item Terencana</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Realisasi Pembayaran (GL)</span>
          <span className={s.kpiValue} style={{ color: '#10b981' }}>
            {formatRp(data.total_actual)}
          </span>
          <span className={s.kpiSub}>Serapan: {serapanPct}% dari pagu</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Sisa Alokasi List</span>
          <span className={s.kpiValue} style={{ color: data.sisa >= 0 ? '#10b981' : '#dc2626' }}>
            {formatRp(data.sisa)}
          </span>
          <span className={s.kpiSub}>{data.sisa >= 0 ? 'Budget masih mencukupi' : 'Defisit anggaran'}</span>
        </div>
        <div className={s.kpiCard}>
          <span className={s.kpiLabel}>Pembagian Aktivitas</span>
          <span className={s.kpiValue} style={{ color: '#9333ea' }}>
            4 Kategori
          </span>
          <span className={s.kpiSub}>Sparepart, Perbaikan, Tooling, Modif</span>
        </div>
      </div>

      {/* Split View: Left (Categories) & Right (Items with Unit Prices) */}
      <div className={s.splitView}>
        {/* Left: 4 Activity Categories */}
        <div className={s.categoryPanel}>
          <div className={s.panelLabel}>
            <span>Pembagian Aktivitas</span>
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                className={s.allCategoriesBtn}
                onClick={() => setSelectedCategory('ALL')}
              >
                Reset Filter
              </button>
            )}
          </div>

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
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                    {cat.displayName}
                  </span>
                  <span className={s.catBadge}>{cat.count} item</span>
                </div>
                <div className={s.catNominal}>{formatRp(cat.plan)}</div>
                <div className={s.progressBar}>
                  <div
                    className={s.progressFill}
                    style={{ width: `${cat.pctShare}%`, background: cat.color }}
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

        {/* Right: Items with Unit Prices (@ Rp) */}
        <div className={s.itemsPanel}>
          {/* Toolbar */}
          <div className={s.toolbar}>
            <div className={s.toolbarLeft}>
              <select
                className={s.monthSelect}
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="ALL">Semua Bulan Rencana</option>
                {monthList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {selectedCategory !== 'ALL' && (
                <span className={s.activeFilterPill}>
                  {CATEGORY_META[selectedCategory]?.label || selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ALL')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
                  >
                    ×
                  </button>
                </span>
              )}
            </div>

            <div className={s.searchBox}>
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Cari item, spesifikasi, part..."
                className={s.searchInput}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className={s.tableWrapper}>
            {loading ? (
              <div className={s.emptyState}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
                <span>Memuat rincian barang Preventive C/F...</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className={s.emptyState}>
                Tidak ada item yang sesuai dengan filter yang dipilih.
              </div>
            ) : (
              <table className={s.table}>
                <thead>
                  <tr>
                    <th style={{ width: 30, textAlign: 'center' }}>#</th>
                    <th style={{ width: 65 }}>Bulan</th>
                    <th style={{ minWidth: 200 }}>Item Pemeliharaan</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Qty</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Harga Satuan</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Total Plan</th>
                    <th style={{ width: 115, textAlign: 'right' }}>Realisasi GL</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td className={s.rowNum}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                        {row.bulan_list || '—'}
                      </td>
                      <td>
                        <div className={s.itemName}>{row.item}</div>
                        {row.spesifikasi && (
                          <div className={s.spec}>Spek: {row.spesifikasi}</div>
                        )}
                        {row.no_dokumen_gl && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                            Doc: {row.no_dokumen_gl}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 11 }}>
                        {row.qty || '—'} {row.unit || ''}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={s.unitPriceBadge}>
                          {row.cost ? formatRp(row.cost) : '—'}
                        </span>
                      </td>
                      <td className={s.nominalPlan}>{formatRp(row.total_list)}</td>
                      <td className={s.nominalActual}>
                        {row.actual_gl > 0 ? formatRp(row.actual_gl) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={row.status?.toLowerCase().includes('terealisasi') ? s.statusOk : s.statusPending}>
                          {row.status?.toLowerCase().includes('terealisasi') ? 'Terealisasi' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className={s.tableFooter}>
            <span>
              Menampilkan <strong>{filteredRows.length}</strong> dari <strong>{allItems.length}</strong> item Master Preventive C/F
            </span>
            <span>
              Subtotal Plan: <strong style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>
                {formatRp(filteredRows.reduce((sum, r) => sum + Number(r.total_list || 0), 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
