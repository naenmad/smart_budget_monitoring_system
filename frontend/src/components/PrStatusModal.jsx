import { useState, useEffect, useMemo } from 'react'
import s from './PrStatusModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { mappingApi } from '../api/mappingApi'
import { formatRp } from '../utils/format'
import { 
  FileText, 
  X, 
  Loader2, 
  TrendingUp, 
  AlertTriangle, 
  Wallet, 
  Target, 
  Receipt,
  Scale,
  Info
} from 'lucide-react'
import ScrollableCell from './ScrollableCell'

export default function PrStatusModal({ status, onClose }) {
  const [prList, setPrList] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const isOopView = status === 'OOP'
  const isCancelledPrView = status === 'CANCELLED_PR'
  const isOverPlanView = status === 'OVER_PLAN'

  useEffect(() => {
    fetchData()
  }, [status])

  async function fetchData() {
    setLoading(true)
    try {
      const params = isCancelledPrView
        ? { per_page: 200, status_ai: 'CANCELLED' }
        : { per_page: 200, budget_status: status }
      const res = await prPoDataApi.getAll(params)
      if (res.success) {
        setPrList(res.data || [])
      }
    } catch (err) {
      console.error('Error fetching PR status list:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUndo(prId) {
    if (!confirm('Batalkan status OOP item ini dan kembalikan ke antrian Review Mapping?')) return

    setProcessingId(prId)
    try {
      const res = await mappingApi.undoMapping(prId)
      if (res.data?.success) {
        setPrList(prev => prev.filter(p => p.id !== prId))
      } else {
        alert(res.data?.message || 'Gagal membatalkan status OOP')
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan status OOP')
    } finally {
      setProcessingId(null)
    }
  }

  // Calculate Aggregates for comparison without duplicating planning pagu
  const { totalRealized, totalPlanned, totalItemConsumed, netVariance, serapanPct, uniquePlanCount } = useMemo(() => {
    let realized = 0
    const planMap = new Map()

    prList.forEach(p => {
      const prPrice = Number(p.total_price || 0)
      realized += prPrice

      const planId = p.planning_detail_id || p.planning_detail?.id
      if (planId) {
        if (!planMap.has(planId)) {
          const pagu = Number(p.planning_pagu || p.planning_detail?.planning_amount || 0)
          const consumed = Number(p.planning_total_consumed ?? prPrice)
          planMap.set(planId, { pagu, consumed })
        }
      } else if (p.planning_pagu) {
        const itemKey = p.planning_item || p.description
        if (!planMap.has(itemKey)) {
          planMap.set(itemKey, {
            pagu: Number(p.planning_pagu || 0),
            consumed: Number(p.total_price || 0)
          })
        }
      }
    })

    let planned = 0
    let itemConsumed = 0
    planMap.forEach(item => {
      planned += item.pagu
      itemConsumed += item.consumed
    })

    // If no planned items (e.g. OOP), planned is 0
    const variance = planned > 0 ? (planned - (itemConsumed || realized)) : (0 - realized)
    const pct = planned > 0 ? ((itemConsumed || realized) / planned) * 100 : (realized > 0 ? 100 : 0)

    return {
      totalRealized: realized,
      totalPlanned: planned,
      totalItemConsumed: itemConsumed || realized,
      netVariance: variance,
      serapanPct: pct,
      uniquePlanCount: planMap.size
    }
  }, [prList])

  const title = {
    ON_PLAN: 'ON PLAN (Sesuai Budget)',
    OVER_PLAN: 'OVER BUDGET (Melebihi Pagu Anggaran)',
    UNDER_PLAN: 'UNDER PLAN (Dibawah Pagu)',
    OOP: 'OOP (Out of Plan - Tanpa Perencanaan)',
    CANCELLED_PR: 'PR Dibatalkan Langsung',
  }[status] || status

  const handleExportPDF = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text(`Laporan Rincian Budget - ${title}`, 14, 18)

      doc.setFontSize(10)
      doc.text(`Total Data: ${prList.length} PR | Total Realisasi PR: ${formatRp(totalRealized)} | Total Pagu Item: ${formatRp(totalPlanned)}`, 14, 25)

      const tableColumn = ["PR Doc", "Description", "Item Planning Terkait", "Pagu Planning", "Realisasi PR", "Akumulasi Item", "Status Saldo Item", "Kategori"]
      const tableRows = []

      prList.forEach(pr => {
        const pagu = pr.planning_pagu || pr.planning_detail?.planning_amount || 0
        const real = pr.total_price || 0
        const consumed = pr.planning_total_consumed ?? real
        const rem = pagu > 0 ? (pagu - consumed) : -real

        const prData = [
          pr.pr_doc_num || '-',
          pr.description || '-',
          pr.planning_item || pr.planning_detail?.item || (isOopView ? 'Out of Plan' : '-'),
          formatRp(pagu),
          formatRp(real),
          formatRp(consumed),
          pagu > 0 ? (rem < 0 ? `-${formatRp(Math.abs(rem))} (Over)` : `+${formatRp(rem)} (Sisa)`) : (isOopView ? 'OOP' : '-'),
          pr.kategori_kode || '-'
        ]
        tableRows.push(prData)
      })

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] }
      })

      doc.save(`Laporan_${status}_${new Date().getTime()}.pdf`)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h2>
              {status === 'OVER_PLAN' && <AlertTriangle size={20} color="#dc2626" />}
              {status === 'ON_PLAN' && <Target size={20} color="#16a34a" />}
              <span>Detail {title}</span>
            </h2>
            <p>Daftar perbandingan Pagu Planning vs Realisasi Pengadaan PR</p>
          </div>
          <div className={s.headerActions}>
            {prList.length > 0 && (
              <button onClick={handleExportPDF} className={s.exportBtn}>
                <FileText size={14} />
                <span>Export PDF</span>
              </button>
            )}
            <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={s.content}>
          {/* Info Banner for OVER_PLAN explanation */}
          {isOverPlanView && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--text-body)'
            }}>
              <Info size={16} color="#dc2626" style={{ shrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: '#dc2626' }}>Catatan Penentuan Status Over Budget:</strong>
                <div style={{ marginTop: 2, color: 'var(--text-muted)' }}>
                  Sebuah PR ditandai <strong>OVER BUDGET</strong> bukan hanya jika nominal satu PR melebihi pagu, melainkan ketika <strong>total akumulasi seluruh PR yang ter-mapping ke Item Planning tersebut</strong> telah melampaui Pagu Anggaran yang direncanakan.
                </div>
              </div>
            </div>
          )}

          {/* Summary KPI Comparison Grid */}
          {!loading && prList.length > 0 && (
            <div className={s.kpiGrid}>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Receipt size={13} /> Total Realisasi PR</span>
                <span className={s.kpiValue}>{formatRp(totalRealized)}</span>
                <span className={s.kpiSub}>{prList.length} Dokumen PR</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Wallet size={13} /> Total Pagu Planning Terkait</span>
                <span className={s.kpiValue}>{formatRp(totalPlanned)}</span>
                <span className={s.kpiSub}>{uniquePlanCount} Item Planning Unik</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Scale size={13} /> Akumulasi Sisa / Over</span>
                <span className={`${s.kpiValue} ${netVariance < 0 ? s.kpiValueDanger : s.kpiValueSuccess}`}>
                  {netVariance >= 0 ? `+${formatRp(netVariance)}` : `-${formatRp(Math.abs(netVariance))}`}
                </span>
                <span className={s.kpiSub}>{netVariance < 0 ? 'Overbudget Defisit' : 'Sisa Saldo Anggaran'}</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><TrendingUp size={13} /> Rasio Serapan</span>
                <span className={`${s.kpiValue} ${serapanPct > 100 ? s.kpiValueDanger : ''}`}>
                  {serapanPct.toFixed(1)}%
                </span>
                <span className={s.kpiSub}>Dari Pagu Item Terkait</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={18} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Memuat data perbandingan...
            </div>
          ) : prList.length === 0 ? (
            <div className={s.emptyState}>
              Belum ada data untuk status ini.
            </div>
          ) : (
            <div className={s.tableContainer}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>PR Doc</th>
                    <th>Deskripsi Barang (PR)</th>
                    <th>Item Planning Terkait</th>
                    <th className={s.right}>Pagu Planning</th>
                    <th className={s.right}>Realisasi PR Ini</th>
                    <th className={s.right}>Akumulasi Terpakai</th>
                    <th className={s.center}>Saldo Item Planning</th>
                    <th className={s.center}>Kategori</th>
                    {isOopView && <th className={s.center}>Aksi</th>}
                    {isCancelledPrView && <th>Alasan Pembatalan</th>}
                  </tr>
                </thead>
                <tbody>
                  {prList.map((pr) => {
                    const pagu = Number(pr.planning_pagu || pr.planning_detail?.planning_amount || 0)
                    const real = Number(pr.total_price || 0)
                    const totalConsumed = Number(pr.planning_total_consumed ?? real)
                    const remaining = pagu > 0 ? (pagu - totalConsumed) : -real
                    const isItemOver = pagu > 0 && totalConsumed > pagu

                    return (
                      <tr key={pr.id}>
                        <td className={s.monospace}>{pr.pr_doc_num || '-'}</td>
                        <td>
                          <ScrollableCell text={pr.description} maxWidth={280} />
                        </td>
                        <td>
                          {pr.planning_item || pr.planning_detail?.item ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {pr.planning_item || pr.planning_detail?.item}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Bulan: {pr.planning_month || pr.planning_detail?.month || '-'}
                                {pr.planning_remarks ? ` · ${pr.planning_remarks}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {isOopView ? 'Out of Plan (Tanpa Planning)' : 'Belum Terhubung'}
                            </span>
                          )}
                        </td>
                        <td className={s.right}>
                          {pagu > 0 ? formatRp(pagu) : '-'}
                        </td>
                        <td className={s.right} style={{ fontWeight: 600 }}>
                          {formatRp(real)}
                        </td>
                        <td className={s.right} style={{ fontSize: '12px' }}>
                          {pagu > 0 ? (
                            <div>
                              <div style={{ fontWeight: 600, color: isItemOver ? '#dc2626' : 'var(--text-main)' }}>
                                {formatRp(totalConsumed)}
                              </div>
                              <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                ({((totalConsumed / pagu) * 100).toFixed(0)}% dari pagu)
                              </div>
                            </div>
                          ) : '-'}
                        </td>
                        <td className={s.center}>
                          {pagu > 0 ? (
                            <span className={remaining < 0 ? s.badgeDanger : s.badgeSuccess}>
                              {remaining < 0 ? `-${formatRp(Math.abs(remaining))} (Over)` : `+${formatRp(remaining)} (Sisa)`}
                            </span>
                          ) : (
                            <span className={s.badgeOop}>OOP</span>
                          )}
                        </td>
                        <td className={s.center}>
                          <span className={s.categoryBadge}>{pr.kategori_kode || '-'}</span>
                        </td>
                        {isOopView && (
                          <td className={s.center}>
                            <button
                              onClick={() => handleUndo(pr.id)}
                              disabled={processingId === pr.id}
                              className={s.undoBtn}
                              title="Kembalikan ke antrian Review Mapping"
                            >
                              {processingId === pr.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <span>Batalkan OOP</span>
                              )}
                            </button>
                          </td>
                        )}
                        {isCancelledPrView && (
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {pr.alasan_pembatalan || 'Dibatalkan oleh Admin'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}