import { useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import s from './KpiBudgetUsageReport.module.css'
import { formatRp } from '../utils/format'
import { ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, Target, Layers } from 'lucide-react'
import saiLogo from '../assets/sai_logo.webp'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agus', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function KpiBudgetUsageReport({
    periode = String(new Date().getFullYear()),
    monthlyData = []
}) {
    const [themeType, setThemeType] = useState('opex') // 'opex' (Target ≤90%) | 'capex' (Target 100%)
    const [usageSource, setUsageSource] = useState('pr') // 'pr' (Planning PR) | 'gr' (Realisasi Fisik GR)

    const isOpex = themeType === 'opex'
    const targetKpi = isOpex ? 90 : 100
    const themeLabel = isOpex ? 'EXPENSES BUDGET USAGE - DEPT (OPEX)' : 'ASSET BUDGET USAGE DEPT. (CAPEX)'

    // Map the monthly data into standard 12 months array
    let totalApproved = 0
    let totalUsage = 0

    const matrix = MONTH_NAMES.map((name, idx) => {
        const key = MONTH_KEYS[idx]
        const mObj = monthlyData.find(m => m.month === key)
        const budgetItem = isOpex ? mObj?.opex : mObj?.capex

        const approved = Number(budgetItem?.plan || 0)
        const usage = Number(usageSource === 'pr' ? (budgetItem?.actual_pr || 0) : (budgetItem?.actual_gr || 0))
        const pct = approved > 0 ? Math.round((usage / approved) * 100) : (usage > 0 ? 100 : 0)
        const isRecorded = approved > 0 || usage > 0
        const isSesuai = isRecorded ? pct <= targetKpi : true

        totalApproved += approved
        totalUsage += usage

        return {
            monthName: name,
            monthKey: key,
            target: targetKpi,
            approved,
            usage,
            pct: isRecorded ? pct : 0,
            isRecorded,
            isSesuai
        }
    })

    const totalPct = totalApproved > 0 ? Math.round((totalUsage / totalApproved) * 100) : 0
    const isOverallGood = totalPct <= targetKpi

    // Chart dataset
    const chartData = matrix.map(m => ({
        name: m.monthName,
        Target: m.target,
        Actual: m.isRecorded ? m.pct : 0,
        usage: m.usage,
        approved: m.approved
    }))

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0]?.payload
            const isGood = d?.Actual <= targetKpi
            return (
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}>
                    <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-main)' }}>Bulan: {label}</strong>
                    <div style={{ color: 'var(--primary)' }}>Target KPI: {d?.Target}%</div>
                    <div style={{ color: isGood ? 'var(--success)' : 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        {isGood ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        <span>Realisasi: {d?.Actual}% ({isGood ? 'Sesuai Target' : 'Over Target'})</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: 4 }}>
                        Budget: {formatRp(d?.approved)} · Pakai: {formatRp(d?.usage)}
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className={s.wrapper}>
            {/* Header Form Resmi SAI */}
            <div className={s.kpiHeader}>
                <div className={s.companyInfo}>
                    <div className={s.logoBox}>
                        <img src={saiLogo} alt="SAI Logo" className={s.logoImg} />
                    </div>
                    <div className={s.companyText}>
                        <h2>PT. SUMMIT ADYAWINSA INDONESIA</h2>
                        <p>Laporan Hasil Pelaksanaan KPI — Periode Tahun : {periode}</p>
                    </div>
                </div>

                <div className={s.kpiControls}>
                    <button
                        className={`${s.tabBtn} ${themeType === 'opex' ? s.active : ''}`}
                        onClick={() => setThemeType('opex')}
                    >
                        OPEX (Target ≤90%)
                    </button>
                    <button
                        className={`${s.tabBtn} ${themeType === 'capex' ? s.active : ''}`}
                        onClick={() => setThemeType('capex')}
                    >
                        CAPEX (Target 100%)
                    </button>
                </div>
            </div>

            {/* Banner Tema & Mode Switcher */}
            <div className={s.themeBanner}>
                <div className={s.themeTitle}>
                    <Target size={16} />
                    <span>Tema : {themeLabel}</span>
                </div>

                <div className={s.modeToggle}>
                    <span>Basis Terpakai:</span>
                    <button
                        className={`${s.tabBtn} ${usageSource === 'pr' ? s.active : ''}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setUsageSource('pr')}
                        title="Berdasarkan pengajuan Purchase Requisition"
                    >
                        Planning PR
                    </button>
                    <button
                        className={`${s.tabBtn} ${usageSource === 'gr' ? s.active : ''}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setUsageSource('gr')}
                        title="Berdasarkan faktur penerimaan Goods Receipt"
                    >
                        Realisasi Fisik GR
                    </button>
                </div>
            </div>

            {/* Bagian 1: Grafik Perbandingan antara Target dan Aktual */}
            <div className={s.chartContainer}>
                <div className={s.chartTopBar}>
                    <span className={s.chartTitle}>Bagian 1: Grafik Perbandingan antara Target dan Aktual</span>
                    <div className={s.chartRightBadges}>
                        {isOverallGood ? (
                            <div className={s.goodBadgePill}>
                                <ArrowUp size={14} strokeWidth={3} />
                                <span>GOOD (Sesuai Target)</span>
                            </div>
                        ) : (
                            <div className={s.warningBadgePill}>
                                <ArrowDown size={14} strokeWidth={3} />
                                <span>NOT GOOD (Over Target)</span>
                            </div>
                        )}
                        <div className={s.targetBadge}>
                            Target : {isOpex ? '≤ 90%' : '100%'}
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="var(--border-color)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
                            <YAxis
                                domain={[0, 100]}
                                ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                                tickFormatter={(v) => `${v}%`}
                                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                                width={45}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={targetKpi} stroke="var(--primary)" strokeDasharray="4 4" strokeWidth={1.5} />
                            <Line
                                type="monotone"
                                dataKey="Target"
                                name="Target"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--primary)', r: 3 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Actual"
                                name="Actual"
                                stroke="var(--text-main)"
                                strokeWidth={2.5}
                                dot={{ fill: 'var(--text-main)', r: 4, stroke: 'var(--bg-card)', strokeWidth: 1.5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bagian 2: Tabel Rekapitulasi Matriks KPI Bulanan */}
            <div className={s.tableWrapper}>
                <table className={s.kpiTable}>
                    <thead>
                        <tr>
                            <th className={s.rowHeader}>Tahun {periode} - Bulan</th>
                            {matrix.map(m => (
                                <th key={m.monthName}>{m.monthName}</th>
                            ))}
                            <th>TOTAL / STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Baris 1: Target (%) */}
                        <tr className={s.targetRow}>
                            <td className={s.rowHeader}>Target ({targetKpi}%)</td>
                            {matrix.map(m => (
                                <td key={m.monthName}>{targetKpi}%</td>
                            ))}
                            <td>{targetKpi}%</td>
                        </tr>

                        {/* Baris 2: Budget Usage (IDR) */}
                        <tr className={s.usageRow}>
                            <td className={s.rowHeader}>
                                {isOpex ? 'Expenses' : 'Asset'} Budget Usage (IDR)
                            </td>
                            {matrix.map(m => (
                                <td key={m.monthName}>
                                    {m.usage > 0 ? formatRp(m.usage) : '-'}
                                </td>
                            ))}
                            <td><strong>{formatRp(totalUsage)}</strong></td>
                        </tr>

                        {/* Baris 3: Budget Approved in a month (IDR) */}
                        <tr className={s.approvedRow}>
                            <td className={s.rowHeader}>
                                {isOpex ? 'Expenses' : 'Asset'} Budget Approved in a month (IDR)
                            </td>
                            {matrix.map(m => (
                                <td key={m.monthName}>
                                    {m.approved > 0 ? formatRp(m.approved) : '-'}
                                </td>
                            ))}
                            <td><strong>{formatRp(totalApproved)}</strong></td>
                        </tr>

                        {/* Baris 4: % Budget Usage (%) */}
                        <tr className={s.pctRow}>
                            <td className={s.rowHeader}>% Budget Usage (%)</td>
                            {matrix.map(m => (
                                <td key={m.monthName} className={m.pct <= targetKpi ? s.pctGood : s.pctOver}>
                                    {m.isRecorded ? `${m.pct}%` : '-'}
                                </td>
                            ))}
                            <td className={totalPct <= targetKpi ? s.pctGood : s.pctOver}>
                                <strong>{totalPct}%</strong>
                            </td>
                        </tr>

                        {/* Baris 5: Evaluasi Target (Clean Lucide Icons) */}
                        <tr className={s.evalRow}>
                            <td className={s.rowHeader}>Evaluasi Target KPI</td>
                            {matrix.map(m => (
                                <td key={m.monthName}>
                                    {m.isRecorded ? (
                                        m.isSesuai ? (
                                            <span className={s.statusIconGood} title="Sesuai Target">
                                                <CheckCircle2 size={16} />
                                            </span>
                                        ) : (
                                            <span className={s.statusIconOver} title="Tidak Sesuai Target">
                                                <AlertTriangle size={16} />
                                            </span>
                                        )
                                    ) : (
                                        <span className={s.statusIconGood} title="Sesuai Target">
                                            <CheckCircle2 size={16} />
                                        </span>
                                    )}
                                </td>
                            ))}
                            <td>
                                {isOverallGood ? (
                                    <span className={s.statusBadgeGood}>
                                        <CheckCircle2 size={13} /> Sesuai
                                    </span>
                                ) : (
                                    <span className={s.statusBadgeOver}>
                                        <AlertTriangle size={13} /> Over
                                    </span>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Legend & Keterangan Simbol */}
            <div className={s.legendFooter}>
                <div className={s.legendItem}>
                    <CheckCircle2 size={15} color="var(--success)" />
                    <span>Sesuai target (≤ {targetKpi}%)</span>
                </div>
                <div className={s.legendItem}>
                    <AlertTriangle size={15} color="var(--danger)" />
                    <span>Tidak sesuai target (&gt; {targetKpi}%)</span>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
                    PT Summit Adyawinsa Indonesia · KPI Monitoring
                </div>
            </div>
        </div>
    )
}
