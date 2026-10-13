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
import MonthlyBudgetUsageChart from '../components/MonthlyBudgetUsageChart'
import MonthlyItemDetailModal from '../components/MonthlyItemDetailModal'
import KpiBudgetUsageReport from '../components/KpiBudgetUsageReport'
import CancelledPlanningModal from '../components/CancelledPlanningModal'
import ParetoSectionChart from '../components/ParetoSectionChart'
import PeriodeSwitcher from '../components/SwitchComponent'
import { budgetApi } from '../api/budgetApi'
import { prApi } from '../api/prApi'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import {
  Loader2, AlertTriangle, Download, FileSpreadsheet,
  BarChart2, LayoutDashboard, BarChart3, Table,
  ClipboardList, TrendingUp, Wallet, CheckCircle2,
  PackageCheck, ArrowRight
} from 'lucide-react'
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
          <div className={s.titleArea}>
            <h1 className={s.title}>Dashboard Monitoring</h1>
            <p className={s.subtitle}>Memuat data...</p>
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
          <div className={s.titleArea}>
            <h1 className={s.title}>Dashboard Monitoring</h1>
            <p className={s.subtitle}>Budget monitoring for period {periode}</p>
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

  const items = summary?.items ?? []

  // Overall Budget Aggregation
  const totalBudget = Number(summary?.total_budget || 0)
  const totalActualPr = Number(summary?.total_actual_pr || summary?.total_actual || 0)
  const totalActualGr = Number(summary?.total_actual_gr || 0)
  const totalSaldoPr = Number(summary?.total_saldo_pr !== undefined ? summary.total_saldo_pr : (totalBudget - totalActualPr))
  const totalPctPr = totalBudget > 0 ? Math.round((totalActualPr / totalBudget) * 100) : 0
  const totalPctGr = totalBudget > 0 ? Math.round((totalActualGr / totalBudget) * 100) : 0

  // Cost Center Aggregation: Quality Control (123200) vs Quality General (123000)
  const qcItems = items.filter(i => (i.kode || '').includes('123200'))
  const qcBudget = qcItems.reduce((s, i) => s + Number(i.budget || 0), 0)
  const qcActualPr = qcItems.reduce((s, i) => s + Number(i.actual_pr || i.actual || 0), 0)
  const qcActualGr = qcItems.reduce((s, i) => s + Number(i.actual_gr || 0), 0)
  const qcSaldoPr = qcBudget - qcActualPr
  const qcSaldoGr = qcBudget - qcActualGr
  const qcPctPr = qcBudget > 0 ? Math.round((qcActualPr / qcBudget) * 100) : 0
  const qcPctGr = qcBudget > 0 ? Math.round((qcActualGr / qcBudget) * 100) : 0

  const gnrlItems = items.filter(i => (i.kode || '').includes('123000'))
  const gnrlBudget = gnrlItems.reduce((s, i) => s + Number(i.budget || 0), 0)
  const gnrlActualPr = gnrlItems.reduce((s, i) => s + Number(i.actual_pr || i.actual || 0), 0)
  const gnrlActualGr = gnrlItems.reduce((s, i) => s + Number(i.actual_gr || 0), 0)
  const gnrlSaldoPr = gnrlBudget - gnrlActualPr
  const gnrlSaldoGr = gnrlBudget - gnrlActualGr
  const gnrlPctPr = gnrlBudget > 0 ? Math.round((gnrlActualPr / gnrlBudget) * 100) : 0
  const gnrlPctGr = gnrlBudget > 0 ? Math.round((gnrlActualGr / gnrlBudget) * 100) : 0

  // Only show an alert if total budget is genuinely exceeded
  const alerts = []
  if (totalActualPr > totalBudget && totalBudget > 0) {
    alerts.push({
      type: 'danger',
      message: `Total pengeluaran melebihi anggaran tahunan sebesar ${formatRp(totalActualPr - totalBudget)} (${totalPctPr}%)`
    })
  } else if (totalBudget > 0 && totalPctPr >= 90) {
    alerts.push({
      type: 'warning',
      message: `Peringatan: Realisasi anggaran telah mencapai ${totalPctPr}% dari total alokasi.`
    })
  }

  // Official 5-Sheet Database Budget Excel Export Handler
  const handleExportExcel = async () => {
    try {
      setIsExporting(true)
      const res = await planningApi.exportDatabaseBudget(periode)
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DATABASE_WEB_BUDGET_${periode}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Database budget export error, falling back to local export:', err)
      await exportBudgetSummaryToExcel({ periode, items })
    } finally {
      setIsExporting(false)
    }
  }

  // Chart data: Procurement Commitment by User / PIC (Top 10)
  const chartUser = (userCommitmentData || []).slice(0, 10).map(u => ({
    name: (u.name || '').toUpperCase(),
    budget: Number(u.budget || 0),
    actual: Number(u.actual || 0),
    saldo: Math.max(0, Number(u.saldo || 0))
  }))

  // Chart data: per Account
  const chartForm = items
    .filter(item => Number(item.budget || 0) > 0 || Number(item.actual_pr || item.actual || 0) > 0)
    .map(item => ({
      name: item.nama ? (item.nama.length > 25 ? item.nama.slice(0, 23) + '..' : item.nama) : item.kode,
      kode: item.kode,
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

  // Realization Counts
  const oopPr = Number(prSummary?.out_of_plan ?? prSummary?.oop ?? 0)
  const cancelledPr = Number(prSummary?.cancelled_pr ?? prSummary?.cancelled_pr_count ?? 0)

  const dashboardTabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: LayoutDashboard,
      content: (
        <div className={s.overviewLayout}>

          {/* ── ROW 1: 4 KPI Hero Cards ── */}
          <div className={s.kpiRow}>
            <div className={s.kpiCard} onClick={() => setSelectedForm('TOTAL')} role="button" tabIndex={0}>
              <div className={s.kpiIcon} style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Wallet size={20} color="#6366f1" />
              </div>
              <div className={s.kpiBody}>
                <span className={s.kpiLabel}>Actual Finance Budget {periode}</span>
                <span className={s.kpiValue} style={{ color: '#6366f1' }}>{formatRp(totalBudget)}</span>
                <span className={s.kpiSub}>13 Akun Resmi · Cost Control FA</span>
              </div>
            </div>

            <div className={s.kpiCard} onClick={() => setSelectedForm('TOTAL')} role="button" tabIndex={0}>
              <div className={s.kpiIcon} style={{ background: 'rgba(37,99,235,0.1)' }}>
                <TrendingUp size={20} color="#2563eb" />
              </div>
              <div className={s.kpiBody}>
                <span className={s.kpiLabel}>Realisasi Pemakaian</span>
                <span className={s.kpiValue} style={{ color: '#2563eb' }}>{formatRp(totalActualPr)}</span>
                <span className={s.kpiSub}>{totalPctPr}% dari total anggaran</span>
              </div>
              <div className={s.kpiProgress}>
                <div className={s.kpiProgressTrack}>
                  <div
                    className={s.kpiProgressBar}
                    style={{ width: `${Math.min(totalPctPr, 100)}%`, background: '#2563eb' }}
                  />
                </div>
              </div>
            </div>

            <div className={s.kpiCard} onClick={() => setSelectedForm('TOTAL')} role="button" tabIndex={0}>
              <div className={s.kpiIcon} style={{ background: 'rgba(16,185,129,0.1)' }}>
                <PackageCheck size={20} color="#10b981" />
              </div>
              <div className={s.kpiBody}>
                <span className={s.kpiLabel}>Actual (Fisik Diterima)</span>
                <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(totalActualGr)}</span>
                <span className={s.kpiSub}>{totalPctGr}% barang selesai diterima</span>
              </div>
              <div className={s.kpiProgress}>
                <div className={s.kpiProgressTrack}>
                  <div
                    className={s.kpiProgressBar}
                    style={{ width: `${Math.min(totalPctGr, 100)}%`, background: '#10b981' }}
                  />
                </div>
              </div>
            </div>

            <div
              className={s.kpiCard}
              onClick={() => setSelectedForm('TOTAL')}
              role="button"
              tabIndex={0}
              style={{ borderColor: totalSaldoPr < 0 ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)' }}
            >
              <div
                className={s.kpiIcon}
                style={{ background: totalSaldoPr < 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)' }}
              >
                <CheckCircle2 size={20} color={totalSaldoPr < 0 ? '#dc2626' : '#16a34a'} />
              </div>
              <div className={s.kpiBody}>
                <span className={s.kpiLabel}>Sisa Saldo Anggaran</span>
                <span
                  className={s.kpiValue}
                  style={{ color: totalSaldoPr < 0 ? '#dc2626' : '#16a34a' }}
                >
                  {formatRp(totalSaldoPr)}
                </span>
                <span className={s.kpiSub}>
                  {totalSaldoPr >= 0
                    ? `${Math.max(0, 100 - totalPctPr)}% budget masih aman`
                    : 'PERHATIAN: Budget melebihi alokasi'}
                </span>
              </div>
            </div>
          </div>

          {/* ── ROW 2: Cost Center Cards side by side ── */}
          <div className={s.costCenterRow}>
            <div className={s.costCenterHeader}>
              <span className={s.sectionLabel}>Alokasi per Cost Center</span>
              <span className={s.sectionHint}>Klik kartu untuk lihat detail account</span>
            </div>
            <div className={s.budgetGrid}>
              <BudgetCard
                type="QC"
                badgeLabel="Quality - QC"
                title="Quality - QC (123200 · 8 Account)"
                budget={qcBudget}
                actualPr={qcActualPr}
                actualGr={qcActualGr}
                saldoPr={qcSaldoPr}
                saldoGr={qcSaldoGr}
                persenPr={qcPctPr}
                persenGr={qcPctGr}
                onClick={() => setSelectedForm('123200')}
              />
              <BudgetCard
                type="GNRL"
                badgeLabel="Quality - General"
                title="Quality - General (123000 · 5 Account)"
                budget={gnrlBudget}
                actualPr={gnrlActualPr}
                actualGr={gnrlActualGr}
                saldoPr={gnrlSaldoPr}
                saldoGr={gnrlSaldoGr}
                persenPr={gnrlPctPr}
                persenGr={gnrlPctGr}
                onClick={() => setSelectedForm('123000')}
              />
            </div>
          </div>

          {/* ── ROW 3: Monthly Chart (full width) ── */}
          <div className={s.chartSection}>
            <MonthlyBudgetUsageChart
              title={`Monitoring Pemakaian Anggaran Bulanan (${periode})`}
              monthlyData={monthlySummary}
              onMonthClick={(month) => setSelectedMonthForDetail(month)}
            />
          </div>

          {/* ── ROW 4: Two charts side by side ── */}
          <div className={s.dualChartRow}>
            <div className={s.chartCard}>
              <div className={s.chartCardHeader}>
                <span className={s.chartCardTitle}>Komitmen Pengadaan per PIC</span>
                <span className={s.chartCardHint}>Top 10 PIC berdasarkan nilai PR</span>
              </div>
              <BudgetChart title="" data={chartUser} />
            </div>
            <div className={s.chartCard}>
              <div className={s.chartCardHeader}>
                <span className={s.chartCardTitle}>Realisasi Per Akun</span>
                <span className={s.chartCardHint}>Distribusi anggaran per GL account</span>
              </div>
              <BudgetChart title="" data={chartForm} />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'procurement',
      label: 'Status Pengadaan',
      icon: ClipboardList,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Document Tracking Stages */}
          <section className="card">
            <div className={s.sectionTitleRow}>
              <div>
                <h2 className={s.sectionTitle}>Procurement Tracking Stages</h2>
                <p className={s.sectionSubtitle}>Status terkini alur pengadaan dokumen PR → PO → Receive</p>
              </div>
            </div>
            <div className={s.stageGrid}>
              <div className={s.stageCard} onClick={() => setSelectedForm('STAGE_PR')} style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(254,243,199,0.4)' }}>
                <span className={s.stageNum} style={{ color: '#d97706' }}>
                  {prSummary?.stage_pr ?? prSummary?.pr_stage ?? 0}
                </span>
                <span className={s.stageLabel} style={{ color: '#92400e' }}>PR Stage</span>
                <span className={s.stageSub}>Purchase Requisition</span>
                <ArrowRight size={14} color="#d97706" style={{ marginTop: 'auto' }} />
              </div>
              <div className={s.stageCard} onClick={() => setSelectedForm('STAGE_PO')} style={{ borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(239,246,255,0.6)' }}>
                <span className={s.stageNum} style={{ color: '#2563eb' }}>
                  {prSummary?.stage_po ?? prSummary?.po_stage ?? 0}
                </span>
                <span className={s.stageLabel} style={{ color: '#1d4ed8' }}>PO Stage</span>
                <span className={s.stageSub}>Purchase Order Issued</span>
                <ArrowRight size={14} color="#2563eb" style={{ marginTop: 'auto' }} />
              </div>
              <div className={s.stageCard} onClick={() => setSelectedForm('STAGE_GR')} style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(240,253,244,0.6)' }}>
                <span className={s.stageNum} style={{ color: '#10b981' }}>
                  {prSummary?.stage_gr ?? prSummary?.gr_stage ?? 0}
                </span>
                <span className={s.stageLabel} style={{ color: '#065f46' }}>RECIEVE</span>
                <span className={s.stageSub}>Goods Received</span>
                <CheckCircle2 size={14} color="#10b981" style={{ marginTop: 'auto' }} />
              </div>
            </div>
          </section>

          {/* Budget Realization Status */}
          <section className="card">
            <div className={s.sectionTitleRow}>
              <div>
                <h2 className={s.sectionTitle}>Budget Realization Status</h2>
                <p className={s.sectionSubtitle}>Klasifikasi dokumen pengadaan terhadap perencanaan anggaran</p>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '5px 12px', whiteSpace: 'nowrap' }}
                onClick={() => setShowCancelledPlanningModal(true)}
              >
                Lihat Planning Dibatalkan
              </button>
            </div>
            <div className={s.realizationGrid}>
              <div className={s.realCard} onClick={() => setSelectedForm('ON_PLAN')} style={{ borderColor: 'rgba(22,163,74,0.25)', background: 'rgba(240,253,244,0.5)' }}>
                <span className={s.realNum} style={{ color: '#16a34a' }}>{prSummary?.on_plan ?? 0}</span>
                <span className={s.realLabel}>On Plan</span>
                <span className={s.realSub}>Sesuai rencana</span>
              </div>
              <div className={s.realCard} onClick={() => setSelectedForm('OVER_PLAN')} style={{ borderColor: 'rgba(220,38,38,0.25)', background: 'rgba(254,242,242,0.5)' }}>
                <span className={s.realNum} style={{ color: '#dc2626' }}>{prSummary?.over_plan ?? 0}</span>
                <span className={s.realLabel}>Over Budget</span>
                <span className={s.realSub}>Melebihi alokasi</span>
              </div>
              <div className={s.realCard} onClick={() => setSelectedForm('UNDER_PLAN')} style={{ borderColor: 'rgba(37,99,235,0.25)', background: 'rgba(239,246,255,0.5)' }}>
                <span className={s.realNum} style={{ color: '#2563eb' }}>{prSummary?.under_plan ?? 0}</span>
                <span className={s.realLabel}>Lower Cost</span>
                <span className={s.realSub}>Lebih hemat</span>
              </div>
              <div className={s.realCard} onClick={() => setSelectedForm('OOP')} style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(254,243,199,0.5)' }}>
                <span className={s.realNum} style={{ color: '#d97706' }}>{oopPr}</span>
                <span className={s.realLabel}>Out of Plan</span>
                <span className={s.realSub}>Tidak terencana</span>
              </div>
              <div className={s.realCard} onClick={() => setSelectedForm('CANCELLED_PR')} style={{ borderColor: 'rgba(107,114,128,0.25)', background: 'rgba(249,250,251,0.5)' }}>
                <span className={s.realNum} style={{ color: '#6b7280' }}>{cancelledPr}</span>
                <span className={s.realLabel}>Cancelled</span>
                <span className={s.realSub}>PR dibatalkan</span>
              </div>
            </div>
          </section>
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
      id: 'kpi_report',
      label: 'Budget KPI Report',
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
      label: 'Rincian Account',
      icon: Table,
      content: (
        <section className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
            Rincian Account · Quality QC &amp; General
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
            <LayoutDashboard size={24} color="var(--primary)" />
            Dashboard Monitoring Anggaran
          </h1>
          <p className={s.subtitle}>
            Pemantauan anggaran resmi Finance (Cost Control FA) · Periode {periode}
          </p>
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
