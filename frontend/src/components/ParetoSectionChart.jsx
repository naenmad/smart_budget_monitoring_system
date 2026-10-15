import { useState, useEffect } from 'react'
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts'
import s from './ParetoSectionChart.module.css'
import { budgetApi } from '../api/budgetApi'
import { formatRp } from '../utils/format'
import {
    BarChart2,
    Users,
    Package,
    TrendingUp,
    ShieldAlert,
    Wallet,
    Receipt,
    CheckCircle2,
    Loader2,
    Filter,
    Wrench,
    SlidersHorizontal
} from 'lucide-react'

const CATEGORIES = [
    { id: 'ALL', label: 'All Budget' },
    { id: 'OPEX', label: 'OPEX' },
    { id: 'CAPEX', label: 'CAPEX' },
    { id: 'CONSUMABLE', label: 'Consumable' },
    { id: 'CALIBRATION', label: 'Calibration' },
    { id: 'PREVENTIVE', label: 'Preventive C/F' },
]

export default function ParetoSectionChart({ periode = '2026' }) {
    const [viewMode, setViewMode] = useState('user') // 'user' | 'item' | 'activity'
    const [category, setCategory] = useState('ALL')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchPareto(category)
    }, [periode, category])

    async function fetchPareto(cat = category) {
        setLoading(true)
        setError('')
        try {
            const res = await budgetApi.getParetoAnalysis(periode, cat)
            if (res.success) {
                setData(res)
            } else {
                setError(res.message || 'Failed to fetch Pareto analysis')
            }
        } catch (err) {
            console.error('Failed to load pareto data:', err)
            setError(err.response?.data?.message || 'Error loading Pareto analysis')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <Loader2 size={24} className="animate-spin" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                <span>Loading Pareto Analysis ({periode} - {category})...</span>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--danger)' }}>
                <ShieldAlert size={24} style={{ marginBottom: 8 }} />
                <p>{error || 'No data available'}</p>
                <button className="btn-secondary" style={{ marginTop: 8 }} onClick={() => fetchPareto(category)}>
                    Retry
                </button>
            </div>
        )
    }

    const currentList = viewMode === 'user' ? (data.by_user || []) : (data.by_item || [])
    const summary = data.summary || {}
    const prevBreakdown = data.preventive_breakdown || []

    // Find 80% cutoff count
    const vitalFewCount = currentList.filter(item => item.cumulative_pct <= 80).length || 1

    // Chart dataset (limit items for chart readability)
    const chartItems = currentList.slice(0, 14).map(item => ({
        name: item.name.length > 18 ? item.name.substring(0, 16) + '...' : item.name,
        fullName: item.name,
        actual_pr: item.actual_pr,
        actual_gr: item.actual_gr,
        planning: item.planning,
        cumulative_pct: item.cumulative_pct,
        share_pct: item.share_pct,
    }))

    const fmtYAxisRp = (v) => {
        if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`
        if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`
        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
        return `${v}`
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const row = payload[0].payload
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '12px 14px',
                    borderRadius: 8,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                    fontSize: 12,
                    minWidth: 230
                }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                        {row.fullName}
                    </div>
                    {row.planning > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Planned Budget:</span>
                            <span style={{ fontWeight: 600 }}>{formatRp(row.planning)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb', marginBottom: 4 }}>
                        <span>Pembelian (Cost PR):</span>
                        <span style={{ fontWeight: 700 }}>{formatRp(row.actual_pr)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: 4 }}>
                        <span>Pengeluaran (Actual):</span>
                        <span style={{ fontWeight: 700 }}>{formatRp(row.actual_gr)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginTop: 6, paddingTop: 4, borderTop: '1px dashed var(--border-color)' }}>
                        <span>Cumulative Spend:</span>
                        <span style={{ fontWeight: 700 }}>{row.cumulative_pct}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: 11 }}>
                        <span>Contribution Share:</span>
                        <span>{row.share_pct}%</span>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className={s.wrapper}>
            {/* Header & Controls */}
            <div className={s.headerRow}>
                <div className={s.titleArea}>
                    <h3>
                        <BarChart2 size={20} color="var(--primary)" />
                        <span>Pareto Analysis (80/20 Rule) — Budget & Realization</span>
                    </h3>
                    <p>
                        Identify the vital {viewMode === 'user' ? 'users/sections' : 'items'} responsible for 80% of expenditure (Pembelian PR vs Pengeluaran GR)
                    </p>
                </div>

                <div className={s.controlGroup}>
                    <button
                        className={`${s.toggleBtn} ${viewMode === 'user' ? s.toggleBtnActive : ''}`}
                        onClick={() => setViewMode('user')}
                    >
                        <Users size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                        By Section / User
                    </button>
                    <button
                        className={`${s.toggleBtn} ${viewMode === 'item' ? s.toggleBtnActive : ''}`}
                        onClick={() => setViewMode('item')}
                    >
                        <Package size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                        By Item Breakdown
                    </button>
                    {(category === 'PREVENTIVE' || category === 'ALL') && (
                        <button
                            className={`${s.toggleBtn} ${viewMode === 'activity' ? s.toggleBtnActive : ''}`}
                            onClick={() => setViewMode('activity')}
                        >
                            <Wrench size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                            Preventive Activity
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter Chips */}
            <div className={s.categoryFilterBar}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
                    <SlidersHorizontal size={13} /> Filter Category:
                </span>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`${s.categoryChip} ${category === cat.id ? s.categoryChipActive : ''}`}
                        onClick={() => setCategory(cat.id)}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* KPI Summary Cards */}
            <div className={s.kpiGrid}>
                <div className={s.kpiCard}>
                    <span className={s.kpiLabel}><Wallet size={13} /> Total Planned Budget</span>
                    <span className={s.kpiValue}>{formatRp(summary.total_planned)}</span>
                    <span className={s.kpiSub}>Fiscal Year {periode}</span>
                </div>
                <div className={s.kpiCard}>
                    <span className={s.kpiLabel}><Receipt size={13} /> Pembelian (Total Cost PR)</span>
                    <span className={s.kpiValue} style={{ color: '#2563eb' }}>{formatRp(summary.total_actual_pr)}</span>
                    <span className={s.kpiSub}>{summary.user_count} Active Users/Sections</span>
                </div>
                <div className={s.kpiCard}>
                    <span className={s.kpiLabel}><CheckCircle2 size={13} /> Pengeluaran (Actual)</span>
                    <span className={s.kpiValue} style={{ color: '#10b981' }}>{formatRp(summary.total_actual_gr)}</span>
                    <span className={s.kpiSub}>Physically Received</span>
                </div>
                <div className={s.kpiCard}>
                    <span className={s.kpiLabel}><TrendingUp size={13} /> 80% Vital Few</span>
                    <span className={s.kpiValue} style={{ color: '#f59e0b' }}>
                        Top {vitalFewCount} {viewMode === 'user' ? 'Users' : 'Items'}
                    </span>
                    <span className={s.kpiSub}>Drive 80% of total expenditure</span>
                </div>
            </div>

            {/* If Activity View: Render Preventive Breakdown Cards */}
            {viewMode === 'activity' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className={s.activityGrid}>
                        {prevBreakdown.map((act, idx) => (
                            <div key={idx} className={s.activityCard}>
                                <div className={s.activityTitle}>
                                    <span>{act.type}</span>
                                    <span className={s.activityShare}>{act.share_pct}%</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {act.count} Purchase Requisitions
                                </div>
                                <div className={s.activityPr} title="Total PR (Pembelian)">
                                    {formatRp(act.actual_pr)}
                                </div>
                                <div className={s.activityGr} title="Total GR (Pengeluaran)">
                                    GR: {formatRp(act.actual_gr)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={s.tableCard}>
                        <div className={s.tableTitle}>
                            Preventive C/F Activities Detail (Modifikasi, Perbaikan, Tooling & Spareparts)
                        </div>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th>Activity Type</th>
                                    <th>PR Document</th>
                                    <th>Item Description</th>
                                    <th>PIC / User</th>
                                    <th className={s.right}>Pembelian (Cost PR)</th>
                                    <th className={s.right}>Pengeluaran (Actual)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prevBreakdown.map(act => (
                                    act.items.map((it, i) => (
                                        <tr key={`${act.type}-${i}`}>
                                            <td>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    background: act.type === 'Modifikasi' ? 'rgba(147, 51, 234, 0.1)' :
                                                                act.type === 'Perbaikan & Maintenance' ? 'rgba(239, 68, 68, 0.1)' :
                                                                act.type === 'Tooling & Inspection' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: act.type === 'Modifikasi' ? '#9333ea' :
                                                           act.type === 'Perbaikan & Maintenance' ? '#dc2626' :
                                                           act.type === 'Tooling & Inspection' ? '#2563eb' : '#059669'
                                                }}>
                                                    {act.type}
                                                </span>
                                            </td>
                                            <td className={s.monospace} style={{ fontSize: 12 }}>{it.pr_doc}</td>
                                            <td style={{ fontWeight: 600 }}>{it.item}</td>
                                            <td>
                                                <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 600 }}>{it.user}</span>
                                            </td>
                                            <td className={s.right} style={{ fontWeight: 700, color: '#2563eb' }}>
                                                {formatRp(it.amount)}
                                            </td>
                                            <td className={s.right} style={{ fontWeight: 600, color: '#10b981' }}>
                                                {it.gr > 0 ? (
                                                    <span title={`GR: ${it.gr_num}`}>{formatRp(it.gr)}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Pending GR</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    {/* Pareto Chart */}
                    <div className={s.chartCard}>
                        <div className={s.chartHeader}>
                            <div className={s.chartTitle}>
                                Cumulative Spend Distribution ({viewMode === 'user' ? 'Section / User' : 'Top Items'}) — {CATEGORIES.find(c => c.id === category)?.label}
                            </div>
                            <div className={s.chartLegend}>
                                <div>
                                    <span className={s.legendDot} style={{ background: '#3b82f6' }} />
                                    <span>Pembelian (Cost PR)</span>
                                </div>
                                <div>
                                    <span className={s.legendDot} style={{ background: '#10b981' }} />
                                    <span>Pengeluaran (Actual)</span>
                                </div>
                                <div>
                                    <span className={s.legendDot} style={{ background: '#f59e0b', borderRadius: '50%' }} />
                                    <span>Cumulative %</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer>
                                <ComposedChart
                                    data={chartItems}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.6} />
                                    <XAxis
                                        dataKey="name"
                                        angle={-30}
                                        textAnchor="end"
                                        interval={0}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                        height={55}
                                    />
                                    {/* Left Axis: Spend IDR */}
                                    <YAxis
                                        yAxisId="left"
                                        tickFormatter={fmtYAxisRp}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    />
                                    {/* Right Axis: Cumulative % */}
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />

                                    {/* 80% Threshold Reference Line */}
                                    <ReferenceLine
                                        yAxisId="right"
                                        y={80}
                                        stroke="#ef4444"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: '80% Pareto Cutoff',
                                            position: 'insideTopRight',
                                            fill: '#ef4444',
                                            fontSize: 11,
                                            fontWeight: 700
                                        }}
                                    />

                                    {/* Dual Bars: Cost PR (Pembelian) & Actual (Pengeluaran) */}
                                    <Bar
                                        yAxisId="left"
                                        dataKey="actual_pr"
                                        name="Pembelian (Cost PR)"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={30}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="actual_gr"
                                        name="Pengeluaran (Actual)"
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={30}
                                    />

                                    {/* Line: Cumulative Percentage */}
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="cumulative_pct"
                                        name="Cumulative %"
                                        stroke="#f59e0b"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#f59e0b' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Data Table */}
                    <div className={s.tableCard}>
                        <div className={s.tableTitle}>
                            Pareto Ranking Matrix ({viewMode === 'user' ? 'Users / Sections' : 'Item Breakdown'}) — {CATEGORIES.find(c => c.id === category)?.label}
                        </div>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: 45 }} className={s.center}>#</th>
                                    <th>{viewMode === 'user' ? 'Section / User' : 'Item Name'}</th>
                                    {viewMode === 'item' && <th className={s.center}>Form</th>}
                                    <th className={s.right}>Planned Budget</th>
                                    <th className={s.right}>Pembelian (Cost PR)</th>
                                    <th className={s.right}>Pengeluaran (Actual)</th>
                                    <th className={s.right}>Variance</th>
                                    <th className={s.right}>Share %</th>
                                    <th className={s.center}>Cumulative %</th>
                                    {viewMode === 'user' && <th className={s.center}>OOP (Unbudgeted)</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map((row, idx) => {
                                    const isVital = row.cumulative_pct <= 80
                                    return (
                                        <tr key={idx}>
                                            <td className={s.center}>
                                                <span className={`${s.rankBadge} ${idx < 3 ? s.topRank : ''}`}>
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                                    {row.name}
                                                </div>
                                                {viewMode === 'item' && row.user && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        User / PIC: {row.user}
                                                    </div>
                                                )}
                                            </td>
                                            {viewMode === 'item' && (
                                                <td className={s.center}>
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: 'var(--bg-subtle)',
                                                        border: '1px solid var(--border-color)'
                                                    }}>
                                                        {row.form}
                                                    </span>
                                                </td>
                                            )}
                                            <td className={s.right}>
                                                {row.planning > 0 ? formatRp(row.planning) : '-'}
                                            </td>
                                            <td className={s.right} style={{ fontWeight: 700, color: '#2563eb' }}>
                                                {formatRp(row.actual_pr)}
                                            </td>
                                            <td className={s.right} style={{ fontWeight: 600, color: '#10b981' }}>
                                                {row.actual_gr > 0 ? formatRp(row.actual_gr) : '-'}
                                            </td>
                                            <td className={s.right} style={{
                                                color: row.variance < 0 ? '#dc2626' : 'var(--text-main)',
                                                fontWeight: row.variance < 0 ? 700 : 500
                                            }}>
                                                {row.variance !== undefined ? (
                                                    row.variance < 0 ? `-${formatRp(Math.abs(row.variance))}` : formatRp(row.variance)
                                                ) : '-'}
                                            </td>
                                            <td className={s.right} style={{ fontWeight: 600 }}>
                                                {row.share_pct}%
                                            </td>
                                            <td className={s.center}>
                                                <span className={isVital ? s.vitalBadge : s.safeBadge}>
                                                    {row.cumulative_pct}%
                                                </span>
                                            </td>
                                            {viewMode === 'user' && (
                                                <td className={s.center}>
                                                    {row.oop_count > 0 ? (
                                                        <span className={s.oopBadge} title={`OOP Total: ${formatRp(row.oop_amount)}`}>
                                                            {row.oop_count} OOP ({formatRp(row.oop_amount)})
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>-</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
