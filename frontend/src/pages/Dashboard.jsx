import { useState, useEffect, useRef } from 'react'
import s from './Dashboard.module.css'
import AlertBanner from '../components/AlertBanner'
import Tabs from '../components/Tabs'
import MetricCard from '../components/MetricCard'
import BudgetCard from '../components/BudgetCard'
import FormTable from '../components/FormTable'
import BudgetChart from '../components/BudgetChart'
import DetailModal from '../components/DetailModal'
import AllMonthlyDetailModal from '../components/AllMonthlyDetailModal'
import PrStatusModal from '../components/PrStatusModal'
import PrTrackingModal from '../components/PrTrackingModal'
import MonthlyPipelineChart from '../components/MonthlyPipelineChart'
import MonthlyBudgetUsageChart from '../components/MonthlyBudgetUsageChart'
import MonthlyItemDetailModal from '../components/MonthlyItemDetailModal'
import KpiBudgetUsageReport from '../components/KpiBudgetUsageReport'
import CancelledPlanningModal from '../components/CancelledPlanningModal'
import ParetoSectionChart from '../components/ParetoSectionChart'
import PeriodeSwitcher from '../components/SwitchComponent'
import { budgetApi } from '../api/budgetApi'
import { prApi } from '../api/prApi'
import { formatRp } from '../utils/format'
import { Loader2, AlertTriangle, Download, FileSpreadsheet, Layers, BarChart2, LayoutDashboard, TrendingUp, BarChart3, Table } from 'lucide-react'
import { exportBudgetSummaryToExcel } from '../utils/exportReport'

export default function Dashboard() {
  const [periode, setPeriode] = useState(String(new Date().getFullYear()))
  const [selectedForm, setSelectedForm] = useState(null)
  const [summary, setSummary] = useState(null)
  const [prSummary, setPrSummary] = useState(null)
  const [monthlySummary, setMonthlySummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const dashboardRef = useRef(null)
  const [showCancelledPlanningModal, setShowCancelledPlanningModal] = useState(false)
  const [selectedMonthForDetail, setSelectedMonthForDetail] = useState(null)
  const [userCommitmentData, setUserCommitmentData] = useState([])

  const handleExportAll = async () => {
    if (!dashboardRef.current) return
    try {
      setIsExporting(true)
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)
      const contentHeight = (canvas.height * contentWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight)
      pdf.save(`dashboard_report_${periode}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [periode])

  async function fetchSummary(showLoading = true) {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const [resBudget, resPr, resMonthly, resUserCommitment] = await Promise.all([
        budgetApi.getSummary(periode),
        prApi.getDashboardSummary(periode),
        prApi.getDashboardSummaryMonthly(periode),
        budgetApi.getUserCommitment(periode).catch(() => ({ success: false, data: [] }))
      ])

      if (resBudget.success) {
        setSummary(resBudget.data)
      } else {
        setError(resBudget.message || 'Failed to load budget data')
      }

      if (resPr.data?.success) {
        setPrSummary(resPr.data.data)
      }

      if (resMonthly.data?.success) {
        setMonthlySummary(resMonthly.data.data)
      }

      if (resUserCommitment?.success && Array.isArray(resUserCommitment.data)) {
        setUserCommitmentData(resUserCommitment.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h1>Dashboard Monitoring</h1>
            <p>Loading data...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Loading dashboard analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h1>Dashboard Monitoring</h1>
            <p>Budget monitoring for period {periode}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={fetchSummary}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const capex = summary?.capex ?? {
    budget: 0,
    actual_pr: 0,
    actual_gr: 0,
    saldo_pr: 0,
    saldo_gr: 0,
    persen_pr: 0,
    persen_gr: 0
  }
  const opex = summary?.opex ?? {
    budget: 0,
    actual_pr: 0,
    actual_gr: 0,
    saldo_pr: 0,
    saldo_gr: 0,
    persen_pr: 0,
    persen_gr: 0
  }
  const items = summary?.items ?? []

  const alerts = []

  // Check CAPEX & OPEX Thresholds (based on Planned PR)
  const capexActualPr = Number(capex.actual_pr || capex.actual || 0)
  const capexBudget = Number(capex.budget || 0)
  if (capexActualPr > capexBudget && capexBudget > 0) {
    alerts.push({
      type: 'danger',
      message: `Critical: CAPEX Planned PR exceeds budget limit by ${formatRp(capexActualPr - capexBudget)} (${Math.round((capexActualPr / capexBudget) * 100)}%)`
    })
  } else if (capexBudget > 0 && (capexActualPr / capexBudget) >= 0.8) {
    alerts.push({
      type: 'warning',
      message: `Budget Warning: CAPEX Planned PR has reached ${Math.round((capexActualPr / capexBudget) * 100)}% of total budget limit.`
    })
  }

  const opexActualPr = Number(opex.actual_pr || opex.actual || 0)
  const opexBudget = Number(opex.budget || 0)
  if (opexActualPr > opexBudget && opexBudget > 0) {
    alerts.push({
      type: 'danger',
      message: `Critical: OPEX Planned PR exceeds budget limit by ${formatRp(opexActualPr - opexBudget)} (${Math.round((opexActualPr / opexBudget) * 100)}%)`
    })
  } else if (opexBudget > 0 && (opexActualPr / opexBudget) >= 0.8) {
    alerts.push({
      type: 'warning',
      message: `Budget Warning: OPEX Planned PR has reached ${Math.round((opexActualPr / opexBudget) * 100)}% of total budget limit.`
    })
  }

  // Check Per-Form Early Warning
  items.forEach(item => {
    const b = Number(item.budget || 0)
    const a = Number(item.actual_pr || item.actual || 0)
    const formCode = item.kode === 'E-1' ? 'E1 - Consumable' : item.kode
    if (b > 0) {
      const pct = Math.round((a / b) * 100)
      if (pct > 100) {
        alerts.push({
          type: 'danger',
          message: `Over-Budget: Form ${formCode} (${item.nama || ''}) has exceeded budget (${pct}% - Deficit ${formatRp(a - b)})`
        })
      } else if (pct >= 80) {
        alerts.push({
          type: 'warning',
          message: `Early Warning: Form ${formCode} (${item.nama || ''}) has reached ${pct}% of total budget (${formatRp(a)} / ${formatRp(b)}).`
        })
      }
    }
  })

  // Export Excel Handler
  const handleExportExcel = async () => {
    await exportBudgetSummaryToExcel({
      periode,
      capex,
      opex,
      items
    })
  }

  // Chart data: Procurement Commitment by User / PIC (Top 10)
  const chartUser = (userCommitmentData || []).slice(0, 10).map(u => ({
    name: u.name,
    budget: Number(u.budget || 0),
    actual: Number(u.actual || 0),
    saldo: Math.max(0, Number(u.saldo || 0))
  }))

  // Chart data: per form
  const chartForm = items.map(item => ({
    name: item.kode === 'E-1' ? 'E1 - Consumable' : item.kode,
    budget: Number(item.budget || 0),
    actual: Number(item.actual_pr || item.actual || 0),
    saldo: Math.max(0, Number(item.saldo_pr !== undefined ? item.saldo_pr : (item.saldo || 0)))
  }))

  // Form table data map
  const budgetData = {}
  items.forEach(i => {
    budgetData[i.kode] = {
      budget: Number(i.budget || 0),
      actual: Number(i.actual_pr || i.actual || 0),
      actual_pr: Number(i.actual_pr || i.actual || 0),
      actual_gr: Number(i.actual_gr || 0),
      saldo: Number(i.saldo_pr !== undefined ? i.saldo_pr : (i.saldo || 0)),
      saldo_pr: Number(i.saldo_pr !== undefined ? i.saldo_pr : (i.saldo || 0)),
      saldo_gr: Number(i.saldo_gr || 0),
      persen_pr: i.persen_pr,
      persen_gr: i.persen_gr,
      nama: i.nama,
      type: i.tipe_formulir || i.type,
      is_over: i.is_over
    }
  })

  // PR Pipeline Mathematics Calculation
  const totalPr = Number(prSummary?.total_pr || 0)
  const matchedPr = Number(prSummary?.matched_pr ?? prSummary?.total_matched ?? 0)
  const needMappingPr = Number(prSummary?.need_mapping || 0)
  const inPipelinePr = Number(prSummary?.in_pipeline || 0)
  const oopPr = Number(prSummary?.out_of_plan ?? prSummary?.oop ?? 0)
  const cancelledPr = Number(prSummary?.cancelled_pr ?? prSummary?.cancelled_pr_count ?? 0)

  const pctMatched = totalPr > 0 ? (matchedPr / totalPr) * 100 : 0
  const pctNeedMapping = totalPr > 0 ? (needMappingPr / totalPr) * 100 : 0
  const pctInPipeline = totalPr > 0 ? (inPipelinePr / totalPr) * 100 : 0
  const pctOop = totalPr > 0 ? (oopPr / totalPr) * 100 : 0
  const pctCancelled = totalPr > 0 ? (cancelledPr / totalPr) * 100 : 0

  const dashboardTabs = [
    {
      id: 'overview',
      label: 'Overview & Visuals',
      icon: LayoutDashboard,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. CAPEX & OPEX Overview Cards */}
          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Budget Monitoring (CAPEX vs OPEX)
            </h2>
            <div className={s.budgetGrid}>
              <BudgetCard
                type="CAPEX"
                title="Capital Expenditure"
                budget={capex.budget}
                actualPr={capex.actual_pr || capex.actual}
                actualGr={capex.actual_gr}
                saldoPr={capex.saldo_pr !== undefined ? capex.saldo_pr : capex.saldo}
                saldoGr={capex.saldo_gr}
                persenPr={capex.persen_pr}
                persenGr={capex.persen_gr}
                onClick={() => setSelectedForm('CAPEX')}
              />
              <BudgetCard
                type="OPEX"
                title="Operational Expenditure"
                budget={opex.budget}
                actualPr={opex.actual_pr || opex.actual}
                actualGr={opex.actual_gr}
                saldoPr={opex.saldo_pr !== undefined ? opex.saldo_pr : opex.saldo}
                saldoGr={opex.saldo_gr}
                persenPr={opex.persen_pr}
                persenGr={opex.persen_gr}
                onClick={() => setSelectedForm('OPEX')}
              />
            </div>
          </section>

          {/* 2. PR Processing Pipeline Status */}
          <section className="card">
            <div className={s.pipelineWrapper}>
              <div className={s.pipelineHeader}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  PR Processing Pipeline Status
                </h2>
                <div className={s.pipelineTotalBadge}>
                  <Layers size={14} color="var(--primary)" />
                  <span>Total PRs Uploaded: <strong>{totalPr} Documents</strong></span>
                </div>
              </div>

              {/* 100% Proportional Progress Bar */}
              <div className={s.pipelineBar} title={`Matched: ${Math.round(pctMatched)}%, Need Mapping: ${Math.round(pctNeedMapping)}%, In Pipeline: ${Math.round(pctInPipeline)}%, OOP: ${Math.round(pctOop)}%, Cancelled: ${Math.round(pctCancelled)}%`}>
                <div className={`${s.pipelineSegment} ${s.matched}`} style={{ width: `${pctMatched}%` }} />
                <div className={`${s.pipelineSegment} ${s.needMapping}`} style={{ width: `${pctNeedMapping}%` }} />
                <div className={`${s.pipelineSegment} ${s.inPipeline}`} style={{ width: `${pctInPipeline}%` }} />
                <div className={`${s.pipelineSegment} ${s.oop}`} style={{ width: `${pctOop}%` }} />
                <div className={`${s.pipelineSegment} ${s.cancelled}`} style={{ width: `${pctCancelled}%` }} />
              </div>

              <div className={s.metricGrid}>
                <MetricCard
                  label="Mapped to Budget"
                  value={matchedPr}
                  sub={totalPr > 0 ? `${Math.round(pctMatched)}% (On / Over / Lower Cost)` : '0%'}
                  variant="success"
                  onClick={() => setSelectedForm('ON_PLAN')}
                />
                <MetricCard
                  label="Needs Review"
                  value={needMappingPr}
                  sub={totalPr > 0 ? `${Math.round(pctNeedMapping)}% of total PRs` : '0%'}
                  variant="purple"
                />
                <MetricCard
                  label="Out of Plan (OOP)"
                  value={oopPr}
                  sub={totalPr > 0 ? `${Math.round(pctOop)}% non-budget` : '0%'}
                  variant="warning"
                  onClick={() => setSelectedForm('OOP')}
                />
                <MetricCard
                  label="Cancelled PRs"
                  value={cancelledPr}
                  sub={totalPr > 0 ? `${Math.round(pctCancelled)}% cancelled` : '0%'}
                  variant="danger"
                  onClick={() => setSelectedForm('CANCELLED_PR')}
                />
              </div>
            </div>
          </section>

          {/* 3. Budget Realization Status */}
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Budget Realization Status (Matched PR)
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => setShowCancelledPlanningModal(true)}
                >
                  View Cancelled Planning Items
                </button>
              </div>
            </div>

            <div className={s.metricGrid} style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
              <MetricCard
                label="On Plan"
                value={prSummary?.on_plan ?? 0}
                sub="Within budget plan"
                variant="success"
                onClick={() => setSelectedForm('ON_PLAN')}
              />
              <MetricCard
                label="Over Budget"
                value={prSummary?.over_plan ?? 0}
                sub="Spend exceeds budget"
                variant="danger"
                onClick={() => setSelectedForm('OVER_PLAN')}
              />
              <MetricCard
                label="Lower Actual Cost"
                value={prSummary?.under_plan ?? 0}
                sub="Actual price lower than budget"
                variant="info"
                onClick={() => setSelectedForm('UNDER_PLAN')}
              />
              <MetricCard
                label="Out of Plan (OOP)"
                value={oopPr}
                sub="Not in planned budget"
                variant="warning"
                onClick={() => setSelectedForm('OOP')}
              />
              <MetricCard
                label="Cancelled PRs"
                value={cancelledPr}
                sub="PRs not executed"
                variant="danger"
                onClick={() => setSelectedForm('CANCELLED_PR')}
              />
            </div>
          </section>

          {/* 4. Document Tracking Stages */}
          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Procurement Tracking Stages
            </h2>
            <div className={s.metricGrid} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <MetricCard
                label="PR Stage"
                value={prSummary?.stage_pr ?? prSummary?.pr_stage ?? 0}
                sub="Purchase Requisition Requested"
                variant="warning"
                onClick={() => setSelectedForm('STAGE_PR')}
              />
              <MetricCard
                label="PO Stage"
                value={prSummary?.stage_po ?? prSummary?.po_stage ?? 0}
                sub="Purchase Order Issued"
                variant="info"
                onClick={() => setSelectedForm('STAGE_PO')}
              />
              <MetricCard
                label="GR Stage"
                value={prSummary?.stage_gr ?? prSummary?.gr_stage ?? 0}
                sub="Goods Receipt Completed"
                variant="success"
                onClick={() => setSelectedForm('STAGE_GR')}
              />
            </div>
          </section>

          {/* 5. Monthly Budget Usage Monitoring */}
          <MonthlyBudgetUsageChart
            title={`Monthly Budget Usage Monitoring (${periode})`}
            monthlyData={monthlySummary}
            onMonthClick={(month) => setSelectedMonthForDetail(month)}
          />

          {/* 6. Commitment & Realization Charts */}
          <div className={s.chartGrid}>
            <BudgetChart title="Procurement Commitment by User / PIC" data={chartUser} />
            <BudgetChart title="Realization by Budget Form" data={chartForm} />
          </div>
        </div>
      )
    },
    {
      id: 'pareto',
      label: 'Pareto Analysis',
      icon: BarChart2,
      content: (
        <section className="card">
          <ParetoSectionChart periode={periode} />
        </section>
      )
    },
    {
      id: 'monthly_analytics',
      label: 'PR Trends & Pipeline',
      icon: TrendingUp,
      content: (
        <section className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
            Monthly PR Status Distribution ({periode})
          </h2>
          <MonthlyPipelineChart
            data={monthlySummary}
            onDetailClick={() => setSelectedForm('ALL')}
          />
        </section>
      )
    },
    {
      id: 'kpi_report',
      label: 'Budget KPI Report (SAI)',
      icon: BarChart3,
      content: (
        <KpiBudgetUsageReport
          periode={periode}
          monthlyData={monthlySummary}
        />
      )
    },
    {
      id: 'rincian',
      label: 'Budget Form Breakdown',
      icon: Table,
      content: (
        <section className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
            Budget Form Summary & Details
          </h2>
          <FormTable data={budgetData} onRowClick={setSelectedForm} />
        </section>
      )
    }
  ]

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <LayoutDashboard size={26} color="var(--primary)" />
            Budget Monitoring Dashboard
          </h1>
          <p className={s.subtitle}>Budget monitoring & PR procurement pipeline for period {periode}</p>
        </div>
        <div className={s.headerRight}>
          <PeriodeSwitcher value={periode} onChange={setPeriode} />
          <button
            className="btn-secondary"
            onClick={handleExportExcel}
            title="Download Official Budget Realization Report (Excel)"
            style={{ fontSize: '13px', padding: '7px 12px' }}
          >
            <FileSpreadsheet size={15} color="#16a34a" />
            <span>Export Excel</span>
          </button>
          <button
            className="btn-primary"
            onClick={handleExportAll}
            disabled={isExporting}
            style={{ fontSize: '13px', padding: '7px 12px' }}
          >
            {isExporting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {alerts.length > 0 && <AlertBanner alerts={alerts} />}

      <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Tabs tabs={dashboardTabs} />
      </div>

      {selectedForm === 'ALL' ? (
        <AllMonthlyDetailModal
          periode={periode}
          onClose={() => setSelectedForm(null)}
        />
      ) : ['ON_PLAN', 'OVER_PLAN', 'UNDER_PLAN', 'OOP'].includes(selectedForm) ? (
        <PrStatusModal
          status={selectedForm}
          onClose={() => setSelectedForm(null)}
        />
      ) : selectedForm === 'CANCELLED_PR' ? (
        <PrStatusModal
          status="CANCELLED_PR"
          onClose={() => setSelectedForm(null)}
        />
      ) : ['STAGE_PR', 'STAGE_PO', 'STAGE_GR'].includes(selectedForm) ? (
        <PrTrackingModal
          stage={selectedForm.replace('STAGE_', '')}
          onClose={() => setSelectedForm(null)}
        />
      ) : selectedForm ? (
        <DetailModal
          type={selectedForm}
          periode={periode}
          summaryItems={items}
          onClose={() => {
            setSelectedForm(null)
            fetchSummary(false)
          }}
        />
      ) : null}
      {showCancelledPlanningModal && (
        <CancelledPlanningModal
          periode={periode}
          onClose={() => { setShowCancelledPlanningModal(false); fetchSummary(false); }}
        />
      )}
      {selectedMonthForDetail && (
        <MonthlyItemDetailModal
          periode={periode}
          month={selectedMonthForDetail}
          onClose={() => setSelectedMonthForDetail(null)}
        />
      )}
    </div>
  )
}