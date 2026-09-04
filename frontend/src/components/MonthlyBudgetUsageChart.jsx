import { useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'
import s from './MonthlyBudgetUsageChart.module.css'
import { formatRp } from '../utils/format'
import { TrendingUp } from 'lucide-react'

const COLORS = {
    plan: '#94a3b8',      // Slate gray for planned budget
    actual_pr: '#2563eb', // Indigo / Blue for PR commitment
    actual_gr: '#10b981', // Emerald green for GR received
}

const fmtYAxis = (v) => {
    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}M`
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`
    return `${v}`
}

const CustomTooltip = ({ active, payload, label, activeTab }) => {
    if (active && payload && payload.length) {
        const d = payload[0]?.payload
        const plan = d?.plan || 0
        const actual_pr = d?.actual_pr || 0
        const actual_gr = d?.actual_gr || 0
        const persen_pr = plan > 0 ? Math.round((actual_pr / plan) * 100) : 0
        const persen_gr = plan > 0 ? Math.round((actual_gr / plan) * 100) : 0

        return (
            <div className={s.tooltip}>
                <div className={s.tooltipLabel}>Bulan {label} ({activeTab.toUpperCase()})</div>
                <div className={s.tooltipRow} style={{ color: COLORS.plan }}>
                    <span>Anggaran Planned:</span>
                    <strong>{formatRp(plan)}</strong>
                </div>
                <div className={s.tooltipRow} style={{ color: COLORS.actual_pr }}>
                    <span>Planning PR:</span>
                    <strong>{formatRp(actual_pr)}</strong>
                </div>
                <div className={s.tooltipRow} style={{ color: COLORS.actual_gr }}>
                    <span>Realisasi GR:</span>
                    <strong>{formatRp(actual_gr)}</strong>
                </div>
                <div className={`${s.tooltipRow} ${s.pct}`}>
                    <span>% Pakai (PR / Plan):</span>
                    <span style={{ color: persen_pr > 100 ? '#ef4444' : persen_pr >= 80 ? '#f59e0b' : '#2563eb' }}>
                        {persen_pr}%
                    </span>
                </div>
                <div className={s.tooltipRow}>
                    <span>% Selesai (GR / Plan):</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                        {persen_gr}%
                    </span>
                </div>
            </div>
        )
    }
    return null
}

export default function MonthlyBudgetUsageChart({ title = 'Monitoring Penggunaan Budget Bulanan', monthlyData = [], onMonthClick }) {
    const [activeTab, setActiveTab] = useState('total') // 'total' | 'capex' | 'opex'

    // Format chart data based on active tab
    const chartData = monthlyData.map(m => {
        const source = m[activeTab] || { plan: 0, actual_pr: 0, actual_gr: 0, persen_pr: 0, persen_gr: 0 }
        return {
            month: m.month,
            month_num: m.month_num,
            plan: source.plan || 0,
            actual_pr: source.actual_pr || 0,
            actual_gr: source.actual_gr || 0,
            persen_pr: source.persen_pr || 0,
            persen_gr: source.persen_gr || 0,
        }
    })

    const legends = [
        { label: 'Planned Budget (Anggaran)', color: COLORS.plan },
        { label: 'Terpakai PR (Komitmen)', color: COLORS.actual_pr },
        { label: 'Realisasi GR (Barang Diterima)', color: COLORS.actual_gr },
    ]

    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.titleArea}>
                    <div className={s.title}>
                        <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                        <span>{title}</span>
                    </div>
                    <div className={s.subtitle}>
                        Perbandingan nominal anggaran planned vs Planning PR vs realisasi fisik GR per bulan
                    </div>
                </div>

                <div className={s.tabGroup}>
                    <button
                        className={`${s.tabBtn} ${activeTab === 'total' ? s.active : ''}`}
                        onClick={() => setActiveTab('total')}
                    >
                        Semua (Total)
                    </button>
                    <button
                        className={`${s.tabBtn} ${activeTab === 'capex' ? s.active : ''}`}
                        onClick={() => setActiveTab('capex')}
                    >
                        CAPEX
                    </button>
                    <button
                        className={`${s.tabBtn} ${activeTab === 'opex' ? s.active : ''}`}
                        onClick={() => setActiveTab('opex')}
                    >
                        OPEX
                    </button>
                </div>
            </div>

            <div className={s.legend}>
                {legends.map(({ label, color }) => (
                    <div key={label} className={s.legendItem}>
                        <div className={s.legendColorBox} style={{ background: color }} />
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            <div className={s.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%" barGap={3}>
                        <CartesianGrid vertical={false} stroke="var(--border-color)" strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            axisLine={{ stroke: 'var(--border-subtle)' }}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                            tickFormatter={fmtYAxis}
                            width={65}
                        />
                        <Tooltip content={<CustomTooltip activeTab={activeTab} />} />
                        <Bar dataKey="plan" name="Planned Budget" fill={COLORS.plan} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="actual_pr" name="Terpakai PR" fill={COLORS.actual_pr} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="actual_gr" name="Realisasi GR" fill={COLORS.actual_gr} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className={s.tableContainer}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Bulan</th>
                            <th>Anggaran Planned</th>
                            <th>Planning PR (Ekspektasi)</th>
                            <th>Realisasi GR (Barang Tiba)</th>
                            <th>Sisa Saldo PR</th>
                            <th>% Pakai PR</th>
                            <th>% Selesai GR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.map(row => {
                            const saldo_pr = (row.plan || 0) - (row.actual_pr || 0)
                            const isOver = row.persen_pr > 100
                            const isWarn = row.persen_pr >= 80 && !isOver

                            return (
                                <tr key={row.month}>
                                    <td>
                                        <button
                                            type="button"
                                            className={s.monthLinkBtn}
                                            onClick={() => onMonthClick?.(row.month)}
                                            title={`Klik untuk lihat rincian barang bulan ${row.month}`}
                                        >
                                            <span>{row.month}</span>
                                            <span className={s.monthLinkIcon}>↗</span>
                                        </button>
                                    </td>
                                    <td>{formatRp(row.plan)}</td>
                                    <td style={{ color: COLORS.actual_pr, fontWeight: 600 }}>{formatRp(row.actual_pr)}</td>
                                    <td style={{ color: COLORS.actual_gr, fontWeight: 600 }}>{formatRp(row.actual_gr)}</td>
                                    <td style={{ color: saldo_pr < 0 ? 'var(--danger)' : 'var(--success)' }}>
                                        {formatRp(saldo_pr)}
                                    </td>
                                    <td>
                                        <span className={`${s.badgePct} ${isOver ? s.badgeOver : isWarn ? s.badgeWarn : s.badgeSafe}`}>
                                            {row.persen_pr}%
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${s.badgePct} ${s.badgeSafe}`}>
                                            {row.persen_gr}%
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                        {chartData.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                    Belum ada data bulanan untuk periode ini
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
