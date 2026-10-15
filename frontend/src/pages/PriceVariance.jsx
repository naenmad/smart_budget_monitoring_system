import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Scale,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  Layers,
  ArrowRight,
  Loader2,
  DollarSign
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './PriceVariance.module.css'

const SUBCATEGORY_META = {
  'Consumables QC': {
    label: 'Supplies Expenses (QC)',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.08)',
  },
  'Kalibrasi': {
    label: 'Kalibrasi Alat',
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.08)',
  },
  'Preventive C/F': {
    label: 'Preventive C/F',
    color: '#9333ea',
    bg: 'rgba(147, 51, 234, 0.08)',
  },
  'Marketing': {
    label: 'Marketing Expenses',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.08)',
  },
  'Transportation & BBM': {
    label: 'Transportation & BBM',
    color: '#475569',
    bg: 'rgba(71, 85, 105, 0.08)',
  },
}

function getSubcatMeta(sub) {
  return SUBCATEGORY_META[sub] || {
    label: sub || 'Other',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.08)',
  }
}

export default function PriceVariance() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [rawData, setRawData] = useState({
    total_items: 0,
    realized_items: 0,
    unrealized_items: 0,
    total_planning_amount: 0,
    total_actual_amount: 0,
    realized_planning_amount: 0,
    net_variance: 0,
    over_budget_count: 0,
    over_budget_amount: 0,
    saving_count: 0,
    saving_amount: 0,
    match_count: 0,
    subcat_stats: {},
    monthly_stats: {},
    data: [],
  })

  // Filters
  const [selectedSubcat, setSelectedSubcat] = useState('ALL')
  const [varianceFilter, setVarianceFilter] = useState('ALL') // 'ALL' | 'SAVING' | 'OVER' | 'MATCH' | 'UNREALIZED'
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getPriceVariance({
        periode,
        sub_kategori: selectedSubcat !== 'ALL' ? selectedSubcat : undefined,
        variance_status: varianceFilter !== 'ALL' ? varianceFilter : undefined,
        bulan: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        search: search.trim() || undefined,
      })
      if (res.data?.success) {
        setRawData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch price variance data:', err)
      toast.error('Gagal mengambil data perbandingan harga planning vs actual')
    } finally {
      setLoading(false)
    }
  }, [periode, selectedSubcat, varianceFilter, selectedMonth, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExportExcel = async () => {
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
      toast.success('File Master Database Budget (Sheet Plan vs Actual) berhasil diunduh!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Gagal mengunduh file Excel master budget')
    } finally {
      setIsExporting(false)
    }
  }

  const items = rawData.data || []

  // Computed summary for current filtered view
  const currentTotalPlan = useMemo(
    () => items.reduce((sum, r) => sum + (r.planning_amount || 0), 0),
    [items]
  )
  const currentTotalActual = useMemo(
    () => items.reduce((sum, r) => sum + (r.actual_amount || 0), 0),
    [items]
  )
  const currentNetVariance = currentTotalActual - currentTotalPlan

  return (
    <div className={s.container}>
      {/* ─── Header ─── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <Scale size={24} color="var(--primary, #2563eb)" />
            Perbandingan Harga (Plan vs Actual)
            <span className={s.titleBadge}>Price Variance</span>
          </h1>
          <p className={s.subtitle}>
            Komparasi harga satuan, kuantitas, dan varians anggaran barang realisasi vs rencana Master Budget tahun {periode}.
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
            onClick={handleExportExcel}
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

      {/* ─── KPI Strip ─── */}
      <div className={s.kpiGrid}>
        {/* Card 1: Net Variance */}
        <div className={`${s.kpiCard} ${s.kpiCardNet}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Net Realisasi vs Plan</span>
            <div className={s.kpiIconBox}>
              <Scale size={18} color="#059669" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: rawData.net_variance <= 0 ? '#16a34a' : '#dc2626' }}>
            {rawData.net_variance <= 0 ? 'Net Saving ' : 'Net Over '}
            {formatRp(Math.abs(rawData.net_variance))}
          </div>
          <div className={s.kpiSub}>
            <span>Act: {formatRp(rawData.total_actual_amount)} vs Plan Real: {formatRp(rawData.realized_planning_amount)}</span>
          </div>
        </div>

        {/* Card 2: Cost Saving */}
        <div className={`${s.kpiCard} ${s.kpiCardSaving}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Cost Saving (Efisiensi)</span>
            <div className={s.kpiIconBox}>
              <TrendingDown size={18} color="#16a34a" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: '#16a34a' }}>
            {formatRp(rawData.saving_amount)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgePositive}>
              <TrendingDown size={12} />
              {rawData.saving_count} Item Lebih Murah
            </span>
          </div>
        </div>

        {/* Card 3: Over Budget */}
        <div className={`${s.kpiCard} ${s.kpiCardOver}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Over Budget (Kenaikan)</span>
            <div className={s.kpiIconBox}>
              <TrendingUp size={18} color="#dc2626" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: '#dc2626' }}>
            {formatRp(rawData.over_budget_amount)}
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgeNegative}>
              <TrendingUp size={12} />
              {rawData.over_budget_count} Item Lebih Mahal
            </span>
          </div>
        </div>

        {/* Card 4: Progress Realisasi */}
        <div className={`${s.kpiCard} ${s.kpiCardRealized}`}>
          <div className={s.kpiTop}>
            <span className={s.kpiLabel}>Item Terealisasi</span>
            <div className={s.kpiIconBox}>
              <CheckCircle2 size={18} color="#2563eb" />
            </div>
          </div>
          <div className={s.kpiValue} style={{ color: '#2563eb' }}>
            {rawData.realized_items} / {rawData.total_items}
          </div>
          <div className={s.kpiSub}>
            <span>
              {rawData.total_items > 0
                ? `${((rawData.realized_items / rawData.total_items) * 100).toFixed(1)}% Terealisasi (${rawData.unrealized_items} Open)`
                : 'Belum ada data'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Subcategory Filter Strip ─── */}
      <div className={s.subcatStrip}>
        <button
          onClick={() => setSelectedSubcat('ALL')}
          className={`${s.subcatPill} ${selectedSubcat === 'ALL' ? s.subcatPillActive : ''}`}
        >
          <Layers size={13} />
          <span>Semua Sub-Kategori</span>
          <span className={s.pillCount}>{rawData.total_items}</span>
        </button>

        {Object.entries(rawData.subcat_stats || {}).map(([key, stat]) => {
          const meta = getSubcatMeta(key)
          const isActive = selectedSubcat === key
          return (
            <button
              key={key}
              onClick={() => setSelectedSubcat(key)}
              className={`${s.subcatPill} ${isActive ? s.subcatPillActive : ''}`}
              style={!isActive ? { borderColor: `${meta.color}33`, color: meta.color } : {}}
            >
              <span>{meta.label}</span>
              <span className={s.pillCount}>{stat.count}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Control Bar ─── */}
      <div className={s.controlCard}>
        {/* Status Filter Buttons */}
        <div className={s.filterGroup}>
          <button
            onClick={() => setVarianceFilter('ALL')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'ALL' ? s.statusFilterBtnActive : ''}`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setVarianceFilter('SAVING')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'SAVING' ? `${s.statusFilterBtnActive} ${s.statusSavingActive}` : ''}`}
          >
            Cost Saving ({rawData.saving_count})
          </button>
          <button
            onClick={() => setVarianceFilter('OVER')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'OVER' ? `${s.statusFilterBtnActive} ${s.statusOverActive}` : ''}`}
          >
            Over Budget ({rawData.over_budget_count})
          </button>
          <button
            onClick={() => setVarianceFilter('MATCH')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'MATCH' ? s.statusFilterBtnActive : ''}`}
          >
            Sesuai Budget ({rawData.match_count})
          </button>
          <button
            onClick={() => setVarianceFilter('UNREALIZED')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'UNREALIZED' ? s.statusFilterBtnActive : ''}`}
          >
            Belum Realisasi ({rawData.unrealized_items})
          </button>
        </div>

        {/* Month & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={s.monthSelect}
            aria-label="Filter Bulan"
          >
            <option value="ALL">Semua Bulan</option>
            <option value="Jan">Januari</option>
            <option value="Feb">Februari</option>
            <option value="Mar">Maret</option>
            <option value="Apr">April</option>
            <option value="Mei">Mei</option>
            <option value="Jun">Juni</option>
            <option value="Jul">Juli</option>
            <option value="Agu">Agustus</option>
            <option value="Sep">September</option>
            <option value="Okt">Oktober</option>
            <option value="Nov">November</option>
            <option value="Des">Desember</option>
          </select>

          <div className={s.searchBox}>
            <Search size={14} className={s.searchIcon} />
            <input
              type="text"
              placeholder="Cari barang, PIC, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className={s.tableContainer}>
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={`${s.th} ${s.thCenter}`} style={{ width: '45px' }}>#</th>
                <th className={`${s.th} ${s.thCenter}`} style={{ width: '85px' }}>Bulan</th>
                <th className={s.th} style={{ width: '150px' }}>Sub-Kategori</th>
                <th className={s.th}>Barang Planning vs Barang Realisasi</th>
                <th className={s.th} style={{ width: '100px' }}>PIC</th>
                <th className={`${s.th} ${s.thCenter}`} style={{ width: '90px' }}>Qty (P/A)</th>
                <th className={`${s.th} ${s.thRight}`} style={{ width: '120px' }}>Harga Satuan (P)</th>
                <th className={`${s.th} ${s.thRight}`} style={{ width: '120px' }}>Harga Satuan (A)</th>
                <th className={`${s.th} ${s.thRight}`} style={{ width: '125px' }}>Total Plan</th>
                <th className={`${s.th} ${s.thRight}`} style={{ width: '125px' }}>Total Actual</th>
                <th className={`${s.th} ${s.thRight}`} style={{ width: '135px' }}>Varians (Rp)</th>
                <th className={`${s.th} ${s.thCenter}`} style={{ width: '110px' }}>Status Evaluasi</th>
                <th className={s.th} style={{ width: '130px' }}>Catatan / Ref</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={13}>
                    <div className={s.emptyState}>
                      <Loader2 size={32} className="animate-spin" color="var(--primary, #2563eb)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Memuat perbandingan harga...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={13}>
                    <div className={s.emptyState}>
                      <AlertTriangle size={32} color="#94a3b8" />
                      <div className={s.emptyTitle}>Tidak ada item yang cocok</div>
                      <div className={s.emptySubtitle}>
                        Cobalah ubah filter status, sub-kategori, atau kata kunci pencarian.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const subMeta = getSubcatMeta(item.sub_kategori)
                  const isSaving = item.variance_type === 'SAVING'
                  const isOver = item.variance_type === 'OVER'
                  const isMatch = item.variance_type === 'MATCH'
                  const isUnrealized = item.variance_type === 'UNREALIZED'

                  const trClass = isOver ? s.trOver : isSaving ? s.trSaving : ''

                  return (
                    <tr key={item.id || idx} className={`${s.tr} ${trClass}`}>
                      <td className={`${s.td} ${s.tdCenter}`} style={{ color: '#64748b', fontSize: '0.74rem' }}>
                        {idx + 1}
                      </td>

                      <td className={`${s.td} ${s.tdCenter}`}>
                        <div className={s.badgeMonth}>
                          <span className={s.monthPlan} title="Bulan Rencana">{item.month || '-'}</span>
                          {item.bulan_actual && item.bulan_actual !== item.month && (
                            <span className={s.monthAct} title="Bulan Realisasi">Act: {item.bulan_actual}</span>
                          )}
                        </div>
                      </td>

                      <td className={s.td}>
                        <span
                          className={s.badgeSubcat}
                          style={{ color: subMeta.color, background: subMeta.bg }}
                        >
                          {subMeta.label}
                        </span>
                      </td>

                      <td className={s.td}>
                        <div className={s.itemCell}>
                          <span className={s.itemPlanName}>{item.item}</span>
                          {item.item_actual ? (
                            <span className={s.itemActName}>
                              <span className={s.itemActPrefix}>↳ Real:</span> {item.item_actual}
                            </span>
                          ) : (
                            <span className={s.itemActName} style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                              Belum ada item realisasi
                            </span>
                          )}
                        </div>
                      </td>

                      <td className={s.td}>
                        <span className={s.badgePic}>{item.pic || '-'}</span>
                      </td>

                      <td className={`${s.td} ${s.tdCenter}`} style={{ fontFamily: 'ui-monospace, monospace' }}>
                        {item.qty != null ? item.qty : '-'} / {item.actual_qty != null ? item.actual_qty : '-'}
                      </td>

                      <td className={`${s.td} ${s.tdRight}`}>
                        {item.unit_price_plan != null ? formatRp(item.unit_price_plan) : '-'}
                      </td>

                      <td className={`${s.td} ${s.tdRight}`}>
                        {item.unit_price_actual != null ? formatRp(item.unit_price_actual) : '-'}
                      </td>

                      <td className={`${s.td} ${s.tdRight}`} style={{ fontWeight: 600 }}>
                        {formatRp(item.planning_amount)}
                      </td>

                      <td
                        className={`${s.td} ${s.tdRight}`}
                        style={{
                          fontWeight: 700,
                          color: isOver ? '#dc2626' : isSaving ? '#16a34a' : 'inherit'
                        }}
                      >
                        {item.actual_amount > 0 ? formatRp(item.actual_amount) : '-'}
                      </td>

                      <td className={`${s.td} ${s.tdRight}`}>
                        {item.actual_amount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{
                              fontWeight: 700,
                              color: isSaving ? '#16a34a' : isOver ? '#dc2626' : '#2563eb'
                            }}>
                              {item.selisih > 0 ? `+${formatRp(item.selisih)}` : formatRp(item.selisih)}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: isSaving ? '#16a34a' : isOver ? '#dc2626' : '#64748b'
                            }}>
                              {item.selisih_percent > 0 ? `+${item.selisih_percent}%` : `${item.selisih_percent}%`}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      <td className={`${s.td} ${s.tdCenter}`}>
                        {isSaving && (
                          <span className={s.badgeVarianceSaving}>
                            <TrendingDown size={11} /> Saving
                          </span>
                        )}
                        {isOver && (
                          <span className={s.badgeVarianceOver}>
                            <TrendingUp size={11} /> Over
                          </span>
                        )}
                        {isMatch && (
                          <span className={s.badgeVarianceMatch}>
                            <CheckCircle2 size={11} /> Match
                          </span>
                        )}
                        {isUnrealized && (
                          <span className={s.badgeVarianceOpen}>
                            Open
                          </span>
                        )}
                      </td>

                      <td className={s.td}>
                        <div className={s.remarksText} title={item.remarks || item.baris_ref || ''}>
                          {item.baris_ref ? `Ref #${item.baris_ref} ` : ''}
                          {item.status_detail || item.remarks || '-'}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Footer Strip ─── */}
        <div className={s.tableFooter}>
          <span>
            Menampilkan <strong>{items.length}</strong> item dari total <strong>{rawData.total_items}</strong> item planning
          </span>

          <div className={s.footerStats}>
            <div className={s.footerStatItem}>
              <span className={s.footerStatLabel}>Total Plan:</span>
              <span className={s.footerStatVal}>{formatRp(currentTotalPlan)}</span>
            </div>
            <div className={s.footerStatItem}>
              <span className={s.footerStatLabel}>Total Actual:</span>
              <span className={s.footerStatVal}>{formatRp(currentTotalActual)}</span>
            </div>
            <div className={s.footerStatItem}>
              <span className={s.footerStatLabel}>Net Selisih:</span>
              <span
                className={s.footerStatVal}
                style={{ color: currentNetVariance <= 0 ? '#16a34a' : '#dc2626' }}
              >
                {currentNetVariance > 0 ? `+${formatRp(currentNetVariance)}` : formatRp(currentNetVariance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
