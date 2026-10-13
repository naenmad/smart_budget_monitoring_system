import { useState, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import s from './DetailModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { formatRp } from '../utils/format'
import { X, Loader2 } from 'lucide-react'
import ScrollableCell from './ScrollableCell'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

const BADGE_MAP = {
    '50032902-123200': s.badgeE1,
    '60290100-123200': s.badgeE9,
    '60290500-123200': s.badgeI1,
    '60290500-123000': s.badgeCap,
    'CAPEX': s.badgeCap,
    'OPEX': s.badgeCap,
}

const TYPE_COLORS = {
    'CAPEX': '#3B82F6',
    'OPEX': '#10B981',
    '50032902-123200': '#2563eb',
    '60290100-123200': '#8b5cf6',
    '60290500-123200': '#059669',
    '60290500-123000': '#10b981',
}

const fmtYAxis = (n) => {
    if (Math.abs(n) >= 1000) return `${n < 0 ? '-' : ''}Rp ${(Math.abs(n) / 1000).toFixed(0)}K`
    return `${n < 0 ? '-' : ''}Rp ${Math.abs(n)}`
}

export default function DetailModal({ type, periode, summaryItems, onClose }) {
    const [activeTab, setActiveTab] = useState('trx')
    const [transactions, setTransactions] = useState([])
    const [monthlyData, setMonthlyData] = useState([])
    const [loading, setLoading] = useState(true)

    // Find summary info from parent data
    const isQc = type === '123200' || type === 'QC'
    const isGnrl = type === '123000' || type === 'GNRL'
    const isTotal = type === 'TOTAL'
    const summaryItem = summaryItems?.find(i => i.kode === type)

    // Aggregate based on type
    let budget = 0, actual = 0, saldo = 0
    let modalTitle = `Detail ${type}`

    if (isQc) {
        modalTitle = 'Detail Quality - QC (123200)'
        const typeItems = summaryItems?.filter(i => (i.kode || '').includes('123200')) || []
        budget = typeItems.reduce((sum, i) => sum + Number(i.budget || 0), 0)
        actual = typeItems.reduce((sum, i) => sum + Number(i.actual_pr || i.actual || 0), 0)
        saldo = budget - actual
    } else if (isGnrl) {
        modalTitle = 'Detail Quality - General (123000)'
        const typeItems = summaryItems?.filter(i => (i.kode || '').includes('123000')) || []
        budget = typeItems.reduce((sum, i) => sum + Number(i.budget || 0), 0)
        actual = typeItems.reduce((sum, i) => sum + Number(i.actual_pr || i.actual || 0), 0)
        saldo = budget - actual
    } else if (isTotal) {
        modalTitle = `Detail Actual Finance Budget ${periode}`
        budget = (summaryItems || []).reduce((sum, i) => sum + Number(i.budget || 0), 0)
        actual = (summaryItems || []).reduce((sum, i) => sum + Number(i.actual_pr || i.actual || 0), 0)
        saldo = budget - actual
    } else if (type === 'CAPEX' || type === 'OPEX') {
        modalTitle = `Detail Anggaran ${type}`
        const typeItems = summaryItems?.filter(i => i.tipe_formulir === type) || []
        budget = typeItems.reduce((sum, i) => sum + Number(i.budget || 0), 0)
        actual = typeItems.reduce((sum, i) => sum + Number(i.actual || 0), 0)
        saldo = budget - actual
    } else if (summaryItem) {
        modalTitle = `Detail Account ${summaryItem.kode} (${summaryItem.nama || ''})`
        budget = Number(summaryItem.budget || 0)
        actual = Number(summaryItem.actual_pr || summaryItem.actual || 0)
        saldo = Number(summaryItem.saldo_pr !== undefined ? summaryItem.saldo_pr : (summaryItem.saldo || (budget - actual)))
    }

    const color = isQc ? '#2563eb' : isGnrl ? '#10b981' : isTotal ? '#8b5cf6' : (TYPE_COLORS[type] || '#378ADD')

    useEffect(() => {
        fetchDetails()
    }, [type, periode])

    async function fetchDetails() {
        setLoading(true)
        try {
            // Fetch monthly summary
            const kode = (isQc || isGnrl || isTotal || type === 'CAPEX' || type === 'OPEX') ? undefined : type
            const monthlyRes = await prPoDataApi.getMonthlySummary(periode, kode)

            if (monthlyRes.success && monthlyRes.data) {
                let mData = monthlyRes.data

                if (isQc) {
                    mData = mData.filter(m => (m.kode || '').includes('123200'))
                } else if (isGnrl) {
                    mData = mData.filter(m => (m.kode || '').includes('123000'))
                } else if (type === 'CAPEX' || type === 'OPEX') {
                    mData = mData.filter(m => m.tipe_formulir === type)
                }

                // Build monthly chart data (aggregate by month)
                const monthMap = {}
                mData.forEach(m => {
                    const idx = m.bulan
                    if (!monthMap[idx]) monthMap[idx] = 0
                    monthMap[idx] += m.total
                })

                const chartData = MONTHS.map((name, i) => ({
                    name,
                    actual: monthMap[i + 1] || 0,
                }))

                setMonthlyData(chartData)

                // Build transaction list from monthly data
                const trxList = mData.map(m => ({
                    item: `Transaksi ${m.kode}`,
                    code: m.kode,
                    bulan: m.bulan_nama,
                    nilai: m.total,
                }))
                setTransactions(trxList)
            }
        } catch (err) {
            console.error('Error fetching detail:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>

                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h2>{modalTitle}</h2>
                        <p>Actual Finance Budget: {formatRp(budget)} · Realisasi: {formatRp(actual)} · Sisa Saldo: {formatRp(saldo)}</p>
                    </div>
                    <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
                        <X size={18} />
                    </button>
                </div>

                <div className={s.tabs}>
                    <button
                        className={`${s.tab} ${activeTab === 'trx' ? s.tabActive : ''}`}
                        onClick={() => setActiveTab('trx')}
                    >
                        Transaksi
                    </button>
                    <button
                        className={`${s.tab} ${activeTab === 'bulan' ? s.tabActive : ''}`}
                        onClick={() => setActiveTab('bulan')}
                    >
                        Per bulan
                    </button>
                </div>

                {loading ? (
                    <div className={s.loadingState}>
                        <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Memuat data...
                    </div>
                ) : (
                    <>
                        {activeTab === 'trx' && (
                            transactions.length === 0 ? (
                                <div className={s.emptyState}>
                                    Belum ada transaksi
                                </div>
                            ) : (
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>Deskripsi Item Transaksi</th>
                                            <th className={s.center}>Kode</th>
                                            <th className={s.center}>Bulan</th>
                                            <th className={s.right}>Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((t, i) => (
                                            <tr key={i}>
                                                <td>
                                                    <ScrollableCell text={t.item} maxWidth={320} />
                                                </td>
                                                <td className={s.center}>
                                                    <span className={`${s.badge} ${BADGE_MAP[t.code] || ''}`}>{t.code}</span>
                                                </td>
                                                <td className={`${s.center} ${s.colorMuted}`}>{t.bulan}</td>
                                                <td className={s.right}>{formatRp(t.nilai)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'bulan' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={monthlyData} barCategoryGap="30%">
                                        <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#73726c' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#73726c' }} tickFormatter={fmtYAxis} />
                                        <Tooltip formatter={(v) => formatRp(v)} />
                                        <Bar dataKey="actual" fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                                
                                <div>
                                    <table className={s.table}>
                                        <thead>
                                            <tr>
                                                <th>Bulan</th>
                                                <th className={s.right}>Actual</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthlyData.map((m, i) => (
                                                <tr key={i}>
                                                    <td>{m.name}</td>
                                                    <td className={s.right}>{formatRp(m.actual)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
