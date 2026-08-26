import { useState, useEffect, useRef } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
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
import CancelledPlanningModal from '../components/CancelledPlanningModal'
import PeriodeSwitcher from '../components/SwitchComponent'
import { budgetApi } from '../api/budgetApi'
import { prApi } from '../api/prApi'
import { formatRp } from '../utils/format'
import { Loader2, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react'
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

  const handleExportAll = async () => {
    if (!dashboardRef.current) return
    try {
      setIsExporting(true)
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
      const [resBudget, resPr, resMonthly] = await Promise.all([
        budgetApi.getSummary(periode),
        prApi.getDashboardSummary(periode),
        prApi.getDashboardSummaryMonthly(periode)
      ])

      if (resBudget.success) {
        setSummary(resBudget.data)
      } else {
        setError(resBudget.message || 'Gagal memuat data budget')
      }

      if (resPr.data?.success) {
        setPrSummary(resPr.data.data)
      }

      if (resMonthly.data?.success) {
        setMonthlySummary(resMonthly.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data dashboard')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h1>Dashboard</h1>
            <p>Memuat data...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={18} className="animate-spin" />
          <span>Memuat data dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h1>Dashboard</h1>
            <p>Monitoring budget {periode}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={fetchSummary}>
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  const totalBudget = summary?.total_budget ?? 0
  const totalActual = summary?.total_actual ?? 0
  const totalSaldo = summary?.total_saldo ?? 0
  const overCount = summary?.over_count ?? 0

  const capex = summary?.capex ?? { budget: 0, actual: 0, saldo: 0 }
  const opex = summary?.opex ?? { budget: 0, actual: 0, saldo: 0 }
  const items = summary?.items ?? []

  const alerts = []

  // Check CAPEX & OPEX Thresholds
  if (capex.actual > capex.budget && capex.budget > 0) {
    alerts.push({
      type: 'danger',
      message: `Kritis: CAPEX telah melebihi pagu anggaran sebesar ${formatRp(capex.actual - capex.budget)} (${Math.round((capex.actual / capex.budget) * 100)}%)`
    })
  } else if (capex.budget > 0 && (capex.actual / capex.budget) >= 0.8) {
    alerts.push({
      type: 'warning',
      message: `Peringatan Plafon: Realisasi CAPEX telah mencapai ${Math.round((capex.actual / capex.budget) * 100)}% dari total pagu anggaran.`
    })
  }

  if (opex.actual > opex.budget && opex.budget > 0) {
    alerts.push({
      type: 'danger',
      message: `Kritis: OPEX telah melebihi pagu anggaran sebesar ${formatRp(opex.actual - opex.budget)} (${Math.round((opex.actual / opex.budget) * 100)}%)`
    })
  } else if (opex.budget > 0 && (opex.actual / opex.budget) >= 0.8) {
    alerts.push({
      type: 'warning',
      message: `Peringatan Plafon: Realisasi OPEX telah mencapai ${Math.round((opex.actual / opex.budget) * 100)}% dari total pagu anggaran.`
    })
  }

  // Check Per-Form Early Warning
  items.forEach(item => {
    const b = Number(item.budget || 0)
    const a = Number(item.actual || 0)
    if (b > 0) {
      const pct = Math.round((a / b) * 100)
      if (pct > 100) {
        alerts.push({
          type: 'danger',
          message: `Over-Budget: Form ${item.kode} (${item.nama || ''}) telah melebihi anggaran (${pct}% - Defisit ${formatRp(a - b)})`
        })
      } else if (pct >= 80) {
        alerts.push({
          type: 'warning',
          message: `Peringatan Dini: Form ${item.kode} (${item.nama || ''}) telah mencapai ${pct}% dari pagu anggaran (${formatRp(a)} / ${formatRp(b)}).`
        })
      }
    }
  })

  // Export Excel Handler
  const handleExportExcel = () => {
    exportBudgetSummaryToExcel({
      periode,
      capex,
      opex,
      items
    })
  }

  // Chart data: CAPEX vs OPEX
  const chartCapexOpex = [
    {
      name: 'CAPEX',
      budget: Number(capex.budget || 0),
      actual: Number(capex.actual || 0),
      saldo: Math.max(0, Number(capex.saldo || 0))
    },
    {
      name: 'OPEX',
      budget: Number(opex.budget || 0),
      actual: Number(opex.actual || 0),
      saldo: Math.max(0, Number(opex.saldo || 0))
    }
  ]

  // Chart data: per form
  const chartForm = items.map(item => ({
    name: item.kode,
    budget: Number(item.budget || 0),
    actual: Number(item.actual || 0),
    saldo: Math.max(0, Number(item.saldo || 0))
  }))

  // Form table data map
  const budgetData = {}
  items.forEach(i => {
    budgetData[i.kode] = {
      budget: Number(i.budget || 0),
      actual: Number(i.actual || 0),
      saldo: Number(i.saldo || 0),
      nama: i.nama,
      type: i.tipe_formulir || i.type,
      is_over: i.is_over
    }
  })

  const overItems = items.filter(i => i.is_over).map(i => i.kode)
  const overSubText = overItems.length > 0
    ? `${overItems.join(', ')} perlu perhatian`
    : 'Semua dalam batas'

  const dashboardTabs = [
    {
      id: 'overview',
      label: 'Ringkasan Utama',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Budget Overview</h2>
            <div className={s.metricGrid}>
              <MetricCard
                label="Total budget"
                value={formatRp(totalBudget)}
                sub="CAPEX + OPEX"
              />
              <MetricCard
                label="Terpakai"
                value={formatRp(totalActual)}
                sub={totalBudget > 0 ? `${Math.round((totalActual / totalBudget) * 100)}% dari total` : '—'}
                variant="danger"
              />
              <MetricCard
                label="Saldo"
                value={formatRp(totalSaldo)}
                sub={totalBudget > 0 ? `${Math.round((totalSaldo / totalBudget) * 100)}% dari total` : '—'}
                variant="success"
              />
              <MetricCard
                label="Over budget"
                value={`${overCount} form`}
                sub={overSubText}
                variant={overCount > 0 ? 'warning' : 'default'}
              />
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>PR Pipeline Status</h2>
            <div className={s.metricGrid}>
              <MetricCard
                label="Planning Active"
                value={prSummary?.planning_active || 0}
                sub="Form Planning"
                variant="info"
              />
              <MetricCard
                label="Total PR"
                value={prSummary?.total_pr || 0}
                sub="Data Uploaded"
                variant="yellow"
              />
              <MetricCard
                label="Total Matched"
                value={prSummary?.total_matched || 0}
                sub="Ke Planning Detail"
                variant="success"
              />
              <MetricCard
                label="Need Mapping"
                value={prSummary?.need_mapping || 0}
                sub="Belum di-mapping"
                variant="purple"
              />
            </div>
          </section>

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Realisasi Budget vs PR Status</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                  onClick={() => setShowCancelledPlanningModal(true)}
                >
                  Lihat Planning Dibatalkan
                </button>
              </div>
            </div>

            <div className={s.metricGrid} style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
              <MetricCard
                label="On Plan"
                value={prSummary?.on_plan ?? 0}
                sub="Sesuai planning"
                variant="success"
                onClick={() => setSelectedForm('ON_PLAN')}
              />
              <MetricCard
                label="Over Plan"
                value={prSummary?.over_plan ?? 0}
                sub="Realisasi melebihi"
                variant="danger"
                onClick={() => setSelectedForm('OVER_PLAN')}
              />
              <MetricCard
                label="Under Plan"
                value={prSummary?.under_plan ?? 0}
                sub="Masih ada sisa"
                variant="info"
                onClick={() => setSelectedForm('UNDER_PLAN')}
              />
              <MetricCard
                label="Out of Plan"
                value={prSummary?.out_of_plan ?? prSummary?.oop ?? 0}
                sub="Tidak ada di plan"
                variant="warning"
                onClick={() => setSelectedForm('OOP')}
              />
              <MetricCard
                label="PR Dibatalkan"
                value={prSummary?.cancelled_pr ?? prSummary?.cancelled_pr_count ?? 0}
                sub="PR tidak terealisasi"
                variant="danger"
                onClick={() => setSelectedForm('CANCELLED_PR')}
              />
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>PR Tracking Stages</h2>
            <div className={s.metricGrid} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <MetricCard
                label="Stage PR"
                value={prSummary?.stage_pr ?? prSummary?.pr_stage ?? 0}
                sub="Purchase Requisition"
                variant="warning"
                onClick={() => setSelectedForm('STAGE_PR')}
              />
              <MetricCard
                label="Stage PO"
                value={prSummary?.stage_po ?? prSummary?.po_stage ?? 0}
                sub="Purchase Order Terbit"
                variant="info"
                onClick={() => setSelectedForm('STAGE_PO')}
              />
              <MetricCard
                label="Stage GR"
                value={prSummary?.stage_gr ?? prSummary?.gr_stage ?? 0}
                sub="Goods Receipt Selesai"
                variant="success"
                onClick={() => setSelectedForm('STAGE_GR')}
              />
            </div>
          </section>

          <section className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Tren Realisasi Budget per Bulan ({periode})</h2>
            <MonthlyPipelineChart
              data={monthlySummary}
              onDetailClick={() => setSelectedForm('ALL')}
            />
          </section>
        </div>
      )
    },
    {
      id: 'capex_opex',
      label: 'Analisis CAPEX & OPEX',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={s.budgetGrid}>
            <BudgetCard type="CAPEX" {...capex} onClick={() => setSelectedForm('CAPEX')} />
            <BudgetCard type="OPEX" {...opex} onClick={() => setSelectedForm('OPEX')} />
          </div>

          <div className={s.chartGrid}>
            <BudgetChart title="Grafik CAPEX vs OPEX" data={chartCapexOpex} />
            <BudgetChart title="Grafik per form" data={chartForm} />
          </div>
        </div>
      )
    },
    {
      id: 'rincian',
      label: 'Rincian Form',
      content: (
        <section className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>Rincian Form Budget</h2>
          <FormTable data={budgetData} onRowClick={setSelectedForm} />
        </section>
      )
    }
  ]

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div className={s.headerLeft}>
          <h1>Dashboard Monitoring</h1>
          <p>Monitoring budget & PR Pipeline periode {periode}</p>
        </div>
        <div className={s.headerRight}>
          <PeriodeSwitcher value={periode} onChange={setPeriode} />
          <button
            className="btn-secondary"
            onClick={handleExportExcel}
            title="Download Laporan Realisasi Anggaran Resmi (Excel)"
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
    </div>
  )
}