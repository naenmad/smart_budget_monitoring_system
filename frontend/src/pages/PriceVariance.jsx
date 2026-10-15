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
import { exportPriceVarianceExcel } from '../utils/excelExport'
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

  const items = rawData.data || []

  const handleExportExcel = () => {
    try {
      setIsExporting(true)
      exportPriceVarianceExcel({
        items,
        summary: rawData,
        periode
      })
      toast.success(`Laporan Price Variance QC (${periode}) berhasil diunduh!`)
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Gagal mengunduh file Excel perbandingan harga')
    } finally {
      setIsExporting(false)
    }
  }

  // Computed summary for current filtered view
  const currentTotalPlan = useMemo(
    () => items.reduce((sum, r) => sum + (r.planning_amount || 0), 0),
    [items]
  )
  const currentTotalActual = useMemo(
    () => items.reduce((sum, r) => sum + (r.actual_amount || 0), 0),
    [items]
  )
  const currentNetVariance = useMemo(
    () => items.reduce((sum, r) => sum + (r.price_variance || 0), 0),
    [items]
  )

  return (
    <div className={s.container}>
      {/* ─── Header ─── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <Scale size={24} color="#0f172a" />
            Perbandingan Harga (Plan vs Actual)
            <span className={s.titleBadge}>Variance Analysis</span>
          </h1>
          <p className={s.subtitle}>
            Analisis efisiensi selisih harga satuan (Cost Saving), lonjakan biaya di atas alokasi (Over Budget), dan item belum terealisasi.
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
            disabled={isExporting || items.length === 0}
            className={`${s.actionBtn} ${s.actionBtnPrimary}`}
            title="Download Excel Khusus Perbandingan Harga Plan vs Act"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            <span>Export Variance Excel</span>
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
          <div className={s.kpiValue}>
            {rawData.realized_items} / {rawData.total_items} Item
          </div>
          <div className={s.kpiSub}>
            <span className={s.kpiBadgeNeutral}>
              {rawData.total_items > 0
                ? `${((rawData.realized_items / rawData.total_items) * 100).toFixed(0)}% Realisasi Transaksi`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Subcategory Pill Strip ─── */}
      <div className={s.subcatStrip}>
        <button
          onClick={() => setSelectedSubcat('ALL')}
          className={`${s.subcatPill} ${selectedSubcat === 'ALL' ? s.subcatPillActive : ''}`}
        >
          <span>Semua Sub-Kategori</span>
          <span className={s.pillCount}>{rawData.total_items}</span>
        </button>
        {Object.entries(rawData.subcat_stats).map(([sub, stats]) => {
          const meta = getSubcatMeta(sub)
          const isSelected = selectedSubcat === sub
          return (
            <button
              key={sub}
              onClick={() => setSelectedSubcat(isSelected ? 'ALL' : sub)}
              className={`${s.subcatPill} ${isSelected ? s.subcatPillActive : ''}`}
            >
              <span className={s.subcatDot} style={{ background: meta.color }} />
              <span>{meta.label}</span>
              <span className={s.pillCount}>{stats.total_count}</span>
            </button>
          )
        })}
      </div>

      {/* ─── Control Bar (Filters & Search) ─── */}
      <div className={s.controlCard}>
        <div className={s.filterGroup}>
          {/* Status Variance Filter */}
          <button
            onClick={() => setVarianceFilter('ALL')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'ALL' ? s.statusFilterBtnActive : ''}`}
          >
            Semua
          </button>
          <button
            onClick={() => setVarianceFilter('SAVING')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'SAVING' ? s.statusFilterBtnActive : ''}`}
          >
            <TrendingDown size={14} color={varianceFilter === 'SAVING' ? '#ffffff' : '#16a34a'} />
            Cost Saving ({rawData.saving_count})
          </button>
          <button
            onClick={() => setVarianceFilter('OVER')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'OVER' ? s.statusFilterBtnActive : ''}`}
          >
            <TrendingUp size={14} color={varianceFilter === 'OVER' ? '#ffffff' : '#dc2626'} />
            Over Budget ({rawData.over_budget_count})
          </button>
          <button
            onClick={() => setVarianceFilter('MATCH')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'MATCH' ? s.statusFilterBtnActive : ''}`}
          >
            Sesuai Pagu ({rawData.match_count})
          </button>
          <button
            onClick={() => setVarianceFilter('UNREALIZED')}
            className={`${s.statusFilterBtn} ${varianceFilter === 'UNREALIZED' ? s.statusFilterBtnActive : ''}`}
          >
            Belum Realisasi ({rawData.unrealized_items})
          </button>
        </div>

        {/* Filter Bulan & Search */}
        <div className={s.searchAndMonth}>
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
            <Search size={15} className={s.searchIcon} />
            <input
              type="text"
              placeholder="Cari item planning, actual PO, PR..."
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
          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={32} className="animate-spin" color="#0f172a" />
              <p>Memuat analisis selisih harga...</p>
            </div>
          ) : items.length === 0 ? (
            <div className={s.emptyState}>
              <AlertTriangle size={36} color="#94a3b8" />
              <p>Tidak ada data perbandingan harga yang sesuai filter.</p>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th} style={{ width: '45px', textAlign: 'center' }}>No</th>
                  <th className={s.th} style={{ width: '75px' }}>Bulan</th>
                  <th className={s.th} style={{ width: '130px' }}>Sub Kategori</th>
                  <th className={s.th} style={{ minWidth: '220px' }}>Deskripsi Planning (Awal Tahun)</th>
                  <th className={s.th} style={{ minWidth: '220px' }}>Deskripsi Aktual Realisasi (PO/GL)</th>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: '80px' }}>Qty (P / A)</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: '110px' }}>Harga Sat Plan</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: '110px' }}>Harga Sat Act</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: '120px' }}>Total Plan</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: '120px' }}>Total Actual</th>
                  <th className={`${s.th} ${s.thRight}`} style={{ width: '120px' }}>Selisih (Variance)</th>
                  <th className={`${s.th} ${s.thCenter}`} style={{ width: '120px' }}>Status Selisih</th>
                  <th className={s.th} style={{ width: '130px' }}>Ref PR / PO</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => {
                  const meta = getSubcatMeta(r.sub_kategori)
                  const isSaving = r.variance_status === 'SAVING'
                  const isOver = r.variance_status === 'OVER_BUDGET'
                  const isMatch = r.variance_status === 'MATCH'

                  return (
                    <tr key={r.id || idx} className={s.tr}>
                      <td className={`${s.td} ${s.indexCell}`}>{idx + 1}</td>
                      <td className={s.td}>
                        <span className={s.monthBadge}>{r.month || '-'}</span>
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.subcatBadge}
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className={s.td}>
                        <div className={s.itemName}>{r.item_planning}</div>
                      </td>
                      <td className={s.td}>
                        <div className={s.actualItemName}>
                          {r.item_actual || (
                            <span className={s.unrealizedText}>Belum ada transaksi realisasi</span>
                          )}
                        </div>
                      </td>
                      <td className={`${s.td} ${s.tdCenter}`}>
                        <span className={s.qtyBadge}>
                          {r.qty_plan} / {r.qty_actual || 0}
                        </span>
                      </td>
                      <td className={`${s.td} ${s.tdRight}`}>
                        {formatRp(r.unit_price_plan)}
                      </td>
                      <td className={`${s.td} ${s.tdRight}`}>
                        {r.unit_price_actual ? formatRp(r.unit_price_actual) : '-'}
                      </td>
                      <td className={`${s.td} ${s.tdRight}`}>
                        <strong>{formatRp(r.planning_amount)}</strong>
                      </td>
                      <td className={`${s.td} ${s.tdRight}`}>
                        {r.actual_amount ? (
                          <strong style={{ color: '#0f172a' }}>{formatRp(r.actual_amount)}</strong>
                        ) : (
                          <span className={s.textMuted}>-</span>
                        )}
                      </td>
                      <td className={`${s.td} ${s.tdRight}`}>
                        {r.actual_amount > 0 ? (
                          <span
                            className={
                              isSaving
                                ? s.varianceSaving
                                : isOver
                                ? s.varianceOver
                                : s.varianceMatch
                            }
                          >
                            {isSaving ? '- ' : isOver ? '+ ' : ''}
                            {formatRp(Math.abs(r.price_variance))}
                          </span>
                        ) : (
                          <span className={s.textMuted}>-</span>
                        )}
                      </td>
                      <td className={`${s.td} ${s.tdCenter}`}>
                        {isSaving && (
                          <span className={s.badgeSaving}>
                            <TrendingDown size={12} />
                            <span>Cost Saving</span>
                          </span>
                        )}
                        {isOver && (
                          <span className={s.badgeOver}>
                            <TrendingUp size={12} />
                            <span>Over Budget</span>
                          </span>
                        )}
                        {isMatch && (
                          <span className={s.badgeMatch}>
                            <CheckCircle2 size={12} />
                            <span>Sesuai Pagu</span>
                          </span>
                        )}
                        {!isSaving && !isOver && !isMatch && (
                          <span className={s.badgeUnrealized}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td className={s.td}>
                        {r.pr_po_ref ? (
                          <span className={s.docRefPill}>{r.pr_po_ref}</span>
                        ) : (
                          <span className={s.textMuted}>-</span>
                        )}
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
          <div className={s.footerLeft}>
            <span>
              Menampilkan <strong>{items.length}</strong> item data (Filter aktif)
            </span>
          </div>

          <div className={s.footerRight}>
            <div className={s.footerStat}>
              <span className={s.statLabel}>Total Pagu Plan:</span>
              <span className={s.statValue}>{formatRp(currentTotalPlan)}</span>
            </div>
            <div className={s.footerStat}>
              <span className={s.statLabel}>Total Aktual:</span>
              <span className={s.statValue} style={{ color: '#0f172a' }}>{formatRp(currentTotalActual)}</span>
            </div>
            <div className={s.footerStat}>
              <span className={s.statLabel}>Net Variance:</span>
              <span
                className={s.statValue}
                style={{ color: currentNetVariance <= 0 ? '#16a34a' : '#dc2626' }}
              >
                {currentNetVariance <= 0 ? 'Saving ' : 'Over '}
                {formatRp(Math.abs(currentNetVariance))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
