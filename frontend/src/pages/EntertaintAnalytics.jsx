import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts'
import {
  TrendingUp,
  Building2,
  User,
  Wallet,
  Receipt,
  Calendar,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { entertaintApi } from '../api/entertaintApi'
import s from './EntertaintAnalytics.module.css'

const formatRp = (num) => {
  if (num === null || num === undefined) return 'Rp 0'
  return `Rp ${Number(num).toLocaleString('id-ID')}`
}

const formatJuta = (num) => {
  if (!num) return '0'
  const val = Number(num)
  if (Math.abs(val) >= 1000000000) return `${(val / 1000000000).toFixed(1)} M`
  if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)} jt`
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)} rb`
  return String(val)
}

const PIE_COLORS = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#94a3b8'  // Gray
]

const QUARTAL_DATA = [
  {
    quarter: 'Q1 2026',
    months: 'Januari - Maret',
    target: 62773404,
    actual: 65732957,
    details: [
      { month: 'Januari', target: 12057869, actual: 29949352 },
      { month: 'Februari', target: 39654381, actual: 17252502 },
      { month: 'Maret', target: 11061154, actual: 18531103 }
    ]
  },
  {
    quarter: 'Q2 2026',
    months: 'April - Juni',
    target: 37412697,
    actual: 53572596,
    details: [
      { month: 'April', target: 13413681, actual: 16475253 },
      { month: 'Mei', target: 11820569, actual: 15090443 },
      { month: 'Juni', target: 12178447, actual: 22006900 }
    ]
  },
  {
    quarter: 'Q3 2026',
    months: 'Juli - September',
    target: 50215029,
    actual: 16631057,
    details: [
      { month: 'Juli', target: 23600320, actual: 16631057 },
      { month: 'Agustus', target: 14501551, actual: 0 },
      { month: 'September', target: 12113158, actual: 0 }
    ]
  },
  {
    quarter: 'Q4 2026',
    months: 'Oktober - Desember',
    target: 35000000,
    actual: 0,
    details: [
      { month: 'Oktober', target: 10883131, actual: 0 },
      { month: 'November', target: 12419605, actual: 0 },
      { month: 'Desember', target: 11696133, actual: 0 }
    ]
  }
]

export default function EntertaintAnalytics() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [selectedYear, setSelectedYear] = useState('')
  const [activeTableTab, setActiveTableTab] = useState('customer') // 'customer' | 'pic' | 'quartal'

  const fetchAnalytics = useCallback(async (year = selectedYear) => {
    setLoading(true)
    try {
      const res = await entertaintApi.getSummary({ periode: year || undefined })
      if (res.data?.success) {
        setData(res.data.data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data statistik analisis')
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleYearChange = (e) => {
    const yr = e.target.value
    setSelectedYear(yr)
    fetchAnalytics(yr)
  }

  // Memoized Pie Data (Top 5 + Lain-lain)
  const pieData = useMemo(() => {
    if (!data?.customer_distribution?.length) return []
    const top = data.customer_distribution.slice(0, 5)
    const rest = data.customer_distribution.slice(5)
    const restSum = rest.reduce((acc, c) => acc + c.total, 0)

    const result = top.map((item, idx) => ({
      name: item.customer,
      value: item.total,
      color: PIE_COLORS[idx % PIE_COLORS.length]
    }))

    if (restSum > 0) {
      result.push({
        name: 'Customer Lainnya',
        value: restSum,
        color: PIE_COLORS[5]
      })
    }
    return result
  }, [data])

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className={s.customTooltip}>
        <div className={s.tooltipTitle}>{label}</div>
        {payload.map((item, index) => (
          <div key={index} className={s.tooltipRow}>
            <span style={{ color: item.color || '#fff' }}>● {item.name}:</span>
            <span className={s.tooltipVal}>
              {item.unit === 'count' ? `${item.value}x kunjungan` : formatRp(item.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={s.container}>
      {/* ── Page Header ── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <TrendingUp size={26} color="var(--primary)" />
            Statistik & Analisis Visual Entertainment Cost
          </h1>
          <p className={s.subtitle}>
            Analisis tren belanja jamuan tamu, perbandingan arus kas kasbon QC, kontribusi per Customer, dan produktivitas PIC.
          </p>
        </div>

        <div className={s.actionButtons}>
          <select
            className={s.filterSelect}
            value={selectedYear}
            onChange={handleYearChange}
            title="Filter Tahun"
          >
            <option value="">Semua Periode</option>
            {data?.available_years?.map((yr) => (
              <option key={yr} value={yr}>Tahun {yr}</option>
            ))}
          </select>

          <button
            onClick={() => fetchAnalytics(selectedYear)}
            className={s.btnSecondary}
            title="Refresh data"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>

          <Link to="/entertaint-cost" className={s.btnPrimary}>
            <ArrowLeft size={16} />
            <span>Ke Buku Kas & Struk</span>
          </Link>
        </div>
      </div>

      {/* ── KPI Hero Cards ── */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
            <Receipt size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Akumulasi Pengeluaran</span>
            <span className={s.statVal}>{formatRp(data?.total_amount || 0)}</span>
            <span className={s.statSub}>
              <Calendar size={12} /> {data?.count_total || 0} Total Aktivitas Terdata
            </span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Klaim Lunas ({data?.lunas_percentage || 0}%)</span>
            <span className={s.statVal} style={{ color: '#16a34a' }}>
              {formatRp(data?.total_lunas || 0)}
            </span>
            <span className={s.statSub}>
              {data?.count_lunas || 0} Klaim Sudah Terbayarkan
            </span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
            <Clock size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Belum Dibayar ({data?.belum_lunas_percentage || 0}%)</span>
            <span className={s.statVal} style={{ color: '#dc2626' }}>
              {formatRp(data?.total_belum_lunas || 0)}
            </span>
            <span className={s.statSub}>
              {data?.count_belum_dibayar || 0} Klaim Menunggu Reimburse
            </span>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <Wallet size={24} />
          </div>
          <div className={s.statInfo}>
            <span className={s.statLabel}>Sisa Saldo Kasbon QC</span>
            <span className={s.statVal} style={{ color: '#d97706' }}>
              {formatRp(data?.cashflow_balance || 0)}
            </span>
            <span className={s.statSub}>
              Masuk: {formatJuta(data?.cashflow_in)} | Keluar: {formatJuta(data?.cashflow_out)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className={s.chartsGrid}>
        {/* Chart 1: Tren Pengeluaran Bulanan (Composed Bar & Line) */}
        <div className={`${s.chartCard} ${s.chartCardFull}`}>
          <div className={s.chartHeader}>
            <div className={s.chartTitleArea}>
              <h3 className={s.chartTitle}>
                <BarChart3 size={18} color="var(--primary)" />
                Tren Pengeluaran Bulanan & Frekuensi Kunjungan
              </h3>
              <p className={s.chartSubtitle}>
                Batang biru menunjukkan total biaya (IDR), garis oranye menunjukkan intensitas jumlah kunjungan/entertaint.
              </p>
            </div>
          </div>
          <div className={s.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.monthly_trend || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                <XAxis dataKey="month_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={formatJuta}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#f97316"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="total"
                  name="Total Biaya (IDR)"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Jumlah Kunjungan"
                  stroke="#f97316"
                  strokeWidth={3}
                  unit="count"
                  dot={{ r: 4, fill: '#f97316' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Komparasi Arus Kas Kasbon Bulanan (Cash In vs Cash Out) */}
        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <div className={s.chartTitleArea}>
              <h3 className={s.chartTitle}>
                <Wallet size={18} color="#16a34a" />
                Arus Kas Kasbon Bulanan (In vs Out)
              </h3>
              <p className={s.chartSubtitle}>
                Perbandingan uang masuk dari Marketing/Finance dengan pengeluaran ke PIC.
              </p>
            </div>
          </div>
          <div className={s.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.cashflow_monthly || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                <XAxis dataKey="month_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={formatJuta} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="uang_masuk" name="Uang Masuk (QC)" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="uang_keluar" name="Uang Keluar (PIC)" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Distribusi Pengeluaran per Customer (PT) */}
        <div className={s.chartCard}>
          <div className={s.chartHeader}>
            <div className={s.chartTitleArea}>
              <h3 className={s.chartTitle}>
                <PieIcon size={18} color="#7c3aed" />
                Porsi Biaya per Customer PT
              </h3>
              <p className={s.chartSubtitle}>
                Persentase pengeluaran terbesar berdasarkan PT mitra/pelanggan.
              </p>
            </div>
          </div>
          <div className={s.chartBody} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [
                    `${formatRp(val)} (${((val / (data?.total_amount || 1)) * 100).toFixed(1)}%)`,
                    name
                  ]}
                />
                <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Peringkat Pengeluaran 8 PIC Tertinggi */}
        <div className={`${s.chartCard} ${s.chartCardFull}`}>
          <div className={s.chartHeader}>
            <div className={s.chartTitleArea}>
              <h3 className={s.chartTitle}>
                <User size={18} color="var(--primary)" />
                Peringkat Akumulasi Klaim per PIC Tugas Luar
              </h3>
              <p className={s.chartSubtitle}>
                8 PIC dengan total penyerapan biaya entertaint tertinggi.
              </p>
            </div>
          </div>
          <div className={s.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={(data?.pic_ranking || []).slice(0, 8)}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.6} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickFormatter={formatJuta} tickLine={false} />
                <YAxis type="category" dataKey="pic" stroke="var(--text-muted)" fontSize={12} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total Biaya (IDR)" fill="#0284c7" radius={[0, 6, 6, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Detailed Analytics Table ── */}
      <div className={s.tableCard}>
        <div className={s.tableHeaderBar}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
              Rekapitulasi Analitis & Performa
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Rincian nominal, frekuensi aktivitas, dan rata-rata biaya per kunjungan.
            </p>
          </div>

          <div className={s.tableTabs}>
            <button
              onClick={() => setActiveTableTab('customer')}
              className={`${s.tableTabBtn} ${activeTableTab === 'customer' ? s.tableTabBtnActive : ''}`}
            >
              <Building2 size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'text-bottom' }} />
              Per Customer PT ({data?.customer_distribution?.length || 0})
            </button>
            <button
              onClick={() => setActiveTableTab('pic')}
              className={`${s.tableTabBtn} ${activeTableTab === 'pic' ? s.tableTabBtnActive : ''}`}
            >
              <User size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'text-bottom' }} />
              Per PIC Tugas Luar ({data?.pic_ranking?.length || 0})
            </button>
            <button
              onClick={() => setActiveTableTab('quartal')}
              className={`${s.tableTabBtn} ${activeTableTab === 'quartal' ? s.tableTabBtnActive : ''}`}
            >
              <Calendar size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'text-bottom' }} />
              Target vs Realisasi Kuartal 2026
            </button>
          </div>
        </div>

        <div className={s.tableResponsive}>
          {activeTableTab === 'quartal' ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Kuartal</th>
                  <th>Periode Bulan</th>
                  <th>Target Budget (IDR)</th>
                  <th>Realisasi Actual (IDR)</th>
                  <th>Sisa / Selisih (IDR)</th>
                  <th>Pencapaian (%)</th>
                </tr>
              </thead>
              <tbody>
                {QUARTAL_DATA.map((q, idx) => {
                  const pct = q.target > 0 ? ((q.actual / q.target) * 100).toFixed(1) : '0.0'
                  const diff = q.target - q.actual
                  const isOver = q.actual > q.target

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
                          {q.quarter}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{q.months}</td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-main)' }}>
                        {formatRp(q.target)}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: isOver ? '#dc2626' : '#16a34a' }}>
                        {formatRp(q.actual)}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: diff >= 0 ? '#16a34a' : '#dc2626' }}>
                        {diff >= 0 ? `+${formatRp(diff)}` : formatRp(diff)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={s.progressBarTrack}>
                            <div
                              className={s.progressBarFill}
                              style={{
                                width: `${Math.min(100, Number(pct))}%`,
                                background: isOver ? '#dc2626' : 'var(--primary)'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isOver ? '#dc2626' : 'var(--text-main)' }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-subtle)', fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: '12px 16px', fontSize: 13, textTransform: 'uppercase' }}>
                    Total Target Tahunan (Sheet Quartal 2026)
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-main)' }}>
                    Rp 185.399.999
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#16a34a' }}>
                    Rp 135.936.610
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#16a34a' }}>
                    +Rp 49.463.389 (Sisa Plafon)
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>
                      73.3% Terealisasi
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : activeTableTab === 'customer' ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Customer (PT)</th>
                  <th>Total Biaya (IDR)</th>
                  <th>Jumlah Kunjungan</th>
                  <th>Rata-rata per Kunjungan</th>
                  <th>Kontribusi (%)</th>
                </tr>
              </thead>
              <tbody>
                {data?.customer_distribution?.map((c, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.customer}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatRp(c.total)}
                    </td>
                    <td>{c.count} kali</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{formatRp(c.avg_per_event)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className={s.progressBarTrack}>
                          <div className={s.progressBarFill} style={{ width: `${Math.min(100, c.percentage)}%` }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                          {c.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama PIC Tugas Luar</th>
                  <th>Total Biaya (IDR)</th>
                  <th>Jumlah Penugasan</th>
                  <th>Rata-rata per Penugasan</th>
                </tr>
              </thead>
              <tbody>
                {data?.pic_ranking?.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.pic}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#0284c7' }}>
                      {formatRp(p.total)}
                    </td>
                    <td>{p.count} kali</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{formatRp(p.avg_per_event)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
