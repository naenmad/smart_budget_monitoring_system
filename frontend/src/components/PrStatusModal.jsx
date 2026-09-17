import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
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
  Info,
  Users
} from 'lucide-react'
import ScrollableCell from './ScrollableCell'

function extractUser(comment) {
  if (!comment) return 'QC General'
  const c = comment.toUpperCase()
  const m = c.match(/PIC\s*[:]?\s*([A-Z0-9_ ]+?)(?:\/|$|\n)/)
  if (m) {
    let val = m[1].trim().replace(/^(MR\.?|MS\.?|MRS\.?)\s*/, '')
    if (val.length >= 2) return val.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
  }
  if (c.includes('QC INCOMING') || c.includes('INCOMING')) return 'QC Incoming'
  if (c.includes('DIGITALISASI')) return 'QC Digitalization'
  if (c.includes('ASSY') || c.includes('LINE')) return 'QC Production'
  return 'QC Admin'
}

export default function PrStatusModal({ status, onClose }) {
  const confirm = useConfirm()
  const [prList, setPrList] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const isOopView = status === 'OOP'
  const isCancelledPrView = status === 'CANCELLED_PR'
  const isOverPlanView = status === 'OVER_PLAN'

  useEffect(() => {
    fetchPrs()
  }, [status])

  async function fetchPrs() {
    setLoading(true)
    try {
      const params = isCancelledPrView
        ? { per_page: 200, status_ai: 'CANCELLED' }
        : { per_page: 200, budget_status: status }
      const res = await prPoDataApi.getAll(params)
      if (res.data?.success || res.success) {
        setPrList(res.data?.data || res.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch status modal data:', err)
      toast.error('Failed to load PR status details')
    } finally {
      setLoading(false)
    }
  }

  async function handleUndo(prId) {
    const isOk = await confirm({
      title: 'Cancel OOP Status?',
      message: 'Cancel OOP status for this item and return it to the Review Mapping queue?',
      confirmText: 'Yes, Return',
      cancelText: 'Cancel',
      type: 'warning'
    })
    if (!isOk) return

    setProcessingId(prId)
    try {
      const res = await mappingApi.undoMapping(prId)
      if (res.data?.success) {
        toast.success('OOP status removed and returned to Review queue')
        setPrList(prev => prev.filter(p => p.id !== prId))
      } else {
        toast.error(res.data?.message || 'Failed to cancel OOP status')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel OOP status')
    } finally {
      setProcessingId(null)
    }
  }

  // Calculate Aggregates for comparison
  const { totalRealized, totalPlanned, totalGrRealized, netVariance, serapanPct, uniquePlanCount } = useMemo(() => {
    let realized = 0
    let grRealized = 0
    const planMap = new Map()

    prList.forEach(p => {
      const prPrice = Number(p.total_price || 0)
      realized += prPrice
      if (p.gr_legal_number) {
        grRealized += prPrice
      }

      const planId = p.planning_detail_id || p.planning_detail?.id
      if (planId) {
        if (!planMap.has(planId)) {
          const planAmount = Number(p.planning_pagu || p.planning_detail?.planning_amount || 0)
          const consumed = Number(p.planning_total_consumed ?? prPrice)
          planMap.set(planId, { planAmount, consumed })
        }
      } else if (p.planning_pagu) {
        const itemKey = p.planning_item || p.description
        if (!planMap.has(itemKey)) {
          planMap.set(itemKey, {
            planAmount: Number(p.planning_pagu || 0),
            consumed: Number(p.total_price || 0)
          })
        }
      }
    })

    let planned = 0
    let itemConsumed = 0
    planMap.forEach(item => {
      planned += item.planAmount
      itemConsumed += item.consumed
    })

    const variance = planned > 0 ? (planned - (itemConsumed || realized)) : (0 - realized)
    const pct = planned > 0 ? ((itemConsumed || realized) / planned) * 100 : (realized > 0 ? 100 : 0)

    return {
      totalRealized: realized,
      totalPlanned: planned,
      totalGrRealized: grRealized,
      netVariance: variance,
      serapanPct: pct,
      uniquePlanCount: planMap.size
    }
  }, [prList])

  const title = {
    ON_PLAN: 'ON PLAN (Within Budget)',
    OVER_PLAN: 'OVER BUDGET (Exceeding Budget)',
    UNDER_PLAN: 'LOWER ACTUAL COST (Under Budget)',
    OOP: 'OOP (Out of Plan - Non Budget)',
    CANCELLED_PR: 'Cancelled PRs',
  }[status] || status

  const handleExportPDF = async () => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text(`Budget Breakdown Report - ${title}`, 14, 18)

      doc.setFontSize(10)
      doc.text(`Total Records: ${prList.length} PRs | Total PR Cost: ${formatRp(totalRealized)} | Planned Budget: ${formatRp(totalPlanned)}`, 14, 25)

      const tableColumn = ["PR Doc", "Item Description", "PIC / Section", "Linked Planning Item", "Form", "Planning", "Cost PR", "Actual GR", "Over Cost"]
      const tableRows = []

      prList.forEach(pr => {
        const planAmount = pr.planning_pagu || pr.planning_detail?.planning_amount || 0
        const costPr = pr.total_price || 0
        const isItemOver = planAmount > 0 && costPr > planAmount
        const itemVariance = planAmount > 0 ? (planAmount - costPr) : -costPr
        const hasGr = Boolean(pr.gr_legal_number)
        const grAmount = Number(pr.actual_gr_amount ?? (hasGr ? costPr : 0))
        const formLabel = pr.kategori_kode === 'E-1' ? 'E1 - Consumable' : (pr.kategori_kode || '-')
        const picName = pr.pic || extractUser(pr.comment_text)

        const prData = [
          pr.pr_doc_num || '-',
          pr.description || '-',
          picName,
          pr.planning_item || pr.planning_detail?.item || (isOopView ? 'Out of Plan' : '-'),
          formLabel,
          planAmount > 0 ? formatRp(planAmount) : '-',
          formatRp(costPr),
          hasGr ? `${formatRp(grAmount)} (${pr.gr_legal_number || ''})` : 'Pending GR (Rp 0)',
          planAmount > 0 ? (isItemOver ? `+${formatRp(costPr - planAmount)} (Over)` : `${formatRp(costPr)} (Within Plan)`) : `+${formatRp(costPr)} (OOP)`,
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

      doc.save(`Report_${status}_${new Date().getTime()}.pdf`)
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
              <span>{title} Breakdown</span>
            </h2>
            <p>Comparative analysis of Planned Budget vs Actual Procurement PR & GR</p>
          </div>
          <div className={s.headerActions}>
            {prList.length > 0 && (
              <button onClick={handleExportPDF} className={s.exportBtn}>
                <FileText size={14} />
                <span>Export PDF</span>
              </button>
            )}
            <button className={s.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={s.content}>
          {/* Over Budget Notice */}
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
                <strong style={{ color: '#dc2626' }}>Over Budget Reference & Item Tracking:</strong>
                <div style={{ marginTop: 2, color: 'var(--text-muted)' }}>
                  Each purchase requisition displays its exact <strong>Cost PR</strong> and realized <strong>Actual GR per item</strong> as an official price and volume baseline for next year's budget planning reference.
                </div>
              </div>
            </div>
          )}

          {/* Summary KPI Comparison Grid */}
          {!loading && prList.length > 0 && (
            <div className={s.kpiGrid}>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Receipt size={13} /> Total Cost PR (Pembelian)</span>
                <span className={s.kpiValue}>{formatRp(totalRealized)}</span>
                <span className={s.kpiSub}>{prList.length} PR Documents</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Wallet size={13} /> Planned Budget</span>
                <span className={s.kpiValue}>{formatRp(totalPlanned)}</span>
                <span className={s.kpiSub}>{uniquePlanCount} Unique Planned Items</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><Scale size={13} /> Net Over Cost / Balance</span>
                <span className={`${s.kpiValue} ${netVariance < 0 ? s.kpiValueDanger : s.kpiValueSuccess}`}>
                  {netVariance >= 0 ? `+${formatRp(netVariance)}` : `-${formatRp(Math.abs(netVariance))}`}
                </span>
                <span className={s.kpiSub}>{netVariance < 0 ? 'Budget Deficit (Over)' : 'Remaining Balance'}</span>
              </div>
              <div className={s.kpiCard}>
                <span className={s.kpiLabel}><TrendingUp size={13} /> Actual GR (Pengeluaran)</span>
                <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(totalGrRealized)}</span>
                <span className={s.kpiSub}>Goods Received Physically</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={18} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Loading comparative data...
            </div>
          ) : prList.length === 0 ? (
            <div className={s.emptyState}>
              No records found for this status.
            </div>
          ) : (
            <div className={s.tableContainer}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>PR Doc</th>
                    <th>Item Description</th>
                    <th>PIC / Section</th>
                    <th>Linked Planning Item</th>
                    <th className={s.center}>Form</th>
                    <th className={s.right}>Planning</th>
                    <th className={s.right}>Cost PR</th>
                    <th className={s.right}>Actual GR</th>
                    <th className={s.center}>Over Cost</th>
                    {isOopView && <th className={s.center}>Action</th>}
                    {isCancelledPrView && <th>Cancellation Reason</th>}
                  </tr>
                </thead>
                <tbody>
                  {prList.map((pr) => {
                    const planAmount = Number(pr.planning_pagu || pr.planning_detail?.planning_amount || 0)
                    const costPr = Number(pr.total_price || 0)
                    const itemVariance = planAmount > 0 ? (planAmount - costPr) : -costPr
                    const isItemOver = planAmount > 0 && costPr > planAmount
                    const hasGr = Boolean(pr.gr_legal_number)
                    const grAmount = Number(pr.actual_gr_amount ?? (hasGr ? costPr : 0))
                    const formDisplay = pr.kategori_kode === 'E-1' ? 'E1 - Consumable' : (pr.kategori_kode || '-')
                    const picName = pr.pic || extractUser(pr.comment_text)

                    return (
                      <tr key={pr.id}>
                        <td className={s.monospace}>{pr.pr_doc_num || '-'}</td>
                        <td>
                          <ScrollableCell text={pr.description} maxWidth={220} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, color: 'var(--text-main)', fontSize: 12 }}>
                            <Users size={12} color="var(--primary)" />
                            <span>{picName}</span>
                          </div>
                          {pr.comment_text && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pr.comment_text}>
                              {pr.comment_text}
                            </div>
                          )}
                        </td>
                        <td>
                          {pr.planning_item || pr.planning_detail?.item ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {pr.planning_item || pr.planning_detail?.item}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Month: {pr.planning_month || pr.planning_detail?.month || '-'}
                                {pr.planning_remarks ? ` · ${pr.planning_remarks}` : ''}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {isOopView ? 'Out of Plan (Unbudgeted)' : 'Not Linked'}
                            </span>
                          )}
                        </td>
                        <td className={s.center}>
                          <span className={s.categoryBadge}>{formDisplay}</span>
                        </td>
                        <td className={s.right}>
                          {planAmount > 0 ? formatRp(planAmount) : '-'}
                        </td>
                        <td className={s.right} style={{ fontWeight: 600, color: '#2563eb' }}>
                          {formatRp(costPr)}
                        </td>
                        <td className={s.right} style={{ fontSize: '12px' }}>
                          {hasGr ? (
                            <div>
                              <span style={{ color: '#10b981', fontWeight: 700 }} title={`GR: ${pr.gr_legal_number}`}>
                                {formatRp(grAmount)}
                              </span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {pr.gr_legal_number}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Pending GR</span>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rp 0</div>
                            </div>
                          )}
                        </td>
                        <td className={s.center}>
                          {planAmount > 0 ? (
                            isItemOver ? (
                              <span className={s.badgeDanger} title={`Cost exceeds plan by ${formatRp(costPr - planAmount)}`}>
                                +{formatRp(costPr - planAmount)} (Over)
                              </span>
                            ) : (
                              <span className={s.badgeSuccess} title={`Within plan budget (Variance: +${formatRp(itemVariance)})`}>
                                {formatRp(costPr)} (Within Plan)
                              </span>
                            )
                          ) : (
                            <span className={s.badgeOop} title="Out of Plan expenditure">
                              +{formatRp(costPr)} (OOP)
                            </span>
                          )}
                        </td>
                        {isOopView && (
                          <td className={s.center}>
                            <button
                              onClick={() => handleUndo(pr.id)}
                              disabled={processingId === pr.id}
                              className={s.undoBtn}
                              title="Return to Review Mapping queue"
                            >
                              {processingId === pr.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                'Return'
                              )}
                            </button>
                          </td>
                        )}
                        {isCancelledPrView && (
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {pr.alasan_pembatalan || 'No reason specified'}
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