import React, { useState, useMemo } from 'react'
import s from './FormTable.module.css'
import { formatRp } from '../utils/format'
import { AlertTriangle } from 'lucide-react'

const GL_METADATA = {
    '50032902-123200': { shortName: 'Supplies Expenses (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290100-123200': { shortName: 'Marketing Expenses (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290500-123200': { shortName: 'Transportation Local (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290500-123000': { shortName: 'Transportation Local (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
    '50032802-123200': { shortName: 'Repair & Maint Plant (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290100-123000': { shortName: 'Marketing Expenses (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
    '60290300-123200': { shortName: 'Supplies Office/Other (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290600-123000': { shortName: 'Transportation Oversea (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
    '60290600-123200': { shortName: 'Transportation Oversea (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '60290800-123200': { shortName: 'Stationary G/A (QC)', cc: 'Quality - QC', ccName: 'Quality Control', type: 'OPEX' },
    '50032902-123000': { shortName: 'Supplies Expenses (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
    '60290800-123000': { shortName: 'Stationary G/A (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
    '60291100-123000': { shortName: 'Uniform Expense (GNRL)', cc: 'Quality - General', ccName: 'Quality General', type: 'OPEX' },
}

export default function FormTable({ data = {}, onRowClick }) {
    // Default to Quality - QC (123200) since QC is the primary focal point
    const [activeCc, setActiveCc] = useState('123200')

    // Normalize data into array of category rows
    const allRows = useMemo(() => {
        let rows = []
        if (Array.isArray(data)) {
            rows = [...data]
        } else if (typeof data === 'object' && data !== null) {
            rows = Object.keys(data).map(k => ({
                kode: k,
                ...data[k]
            }))
        }

        // Filter out E-6 (Entertainment module has its own page) and OOP
        rows = rows.filter(r => r.kode !== 'E-6' && r.kode !== 'OOP')

        // Attach cost center metadata
        return rows.map(r => {
            const meta = GL_METADATA[r.kode] || {}
            let ccCode = 'OTHER'
            if (r.kode.includes('-')) {
                ccCode = r.kode.split('-')[1].trim()
            }
            return {
                ...r,
                ccCode,
                ccName: ccCode === '123200' ? 'Quality Control' : ccCode === '123000' ? 'Quality General' : meta.ccName || 'Other',
                shortName: meta.shortName || r.nama || r.kode,
                ccLabel: meta.cc || (ccCode === '123200' ? 'Quality - QC' : ccCode === '123000' ? 'Quality - General' : ccCode),
                displayType: (r.tipe_formulir === 'CAPEX' || meta.type === 'CAPEX') ? 'Investasi' : 'Operasional'
            }
        })
    }, [data])

    // Counts for tabs
    const counts = useMemo(() => {
        const qcList = allRows.filter(r => r.ccCode === '123200')
        const gnrlList = allRows.filter(r => r.ccCode === '123000')
        return {
            qc: qcList.length,
            gnrl: gnrlList.length,
            all: allRows.length,
        }
    }, [allRows])

    // Filter rows based on active tab
    const filteredRows = useMemo(() => {
        let list = allRows
        if (activeCc !== 'ALL') {
            list = allRows.filter(r => r.ccCode === activeCc)
        }
        // Sort: Budgeted first (highest budget), then actuals
        return [...list].sort((a, b) => {
            const bA = Number(a.budget || 0)
            const bB = Number(b.budget || 0)
            if (bA !== bB) return bB - bA
            const actA = Number(a.actual_pr || a.actual || 0)
            const actB = Number(b.actual_pr || b.actual || 0)
            return actB - actA
        })
    }, [allRows, activeCc])

    // Subtotal metrics for the active view
    const metrics = useMemo(() => {
        const budget = filteredRows.reduce((s, r) => s + Number(r.budget || 0), 0)
        const actualPr = filteredRows.reduce((s, r) => s + Number(r.actual_pr || r.actual || 0), 0)
        const actualGr = filteredRows.reduce((s, r) => s + Number(r.actual_gr || 0), 0)
        const saldoPr = filteredRows.reduce((s, r) => s + Number(r.saldo_pr !== undefined ? r.saldo_pr : (Number(r.budget || 0) - Number(r.actual_pr || r.actual || 0))), 0)
        const pctPr = budget > 0 ? Math.round((actualPr / budget) * 100) : 0
        const pctGr = budget > 0 ? Math.round((actualGr / budget) * 100) : 0
        return { budget, actualPr, actualGr, saldoPr, pctPr, pctGr }
    }, [filteredRows])

    // Grouping helper for 'ALL' mode
    const groups = useMemo(() => {
        if (activeCc !== 'ALL') {
            return [{ title: activeCc === '123200' ? 'Quality - QC (123200)' : 'Quality - General (123000)', rows: filteredRows }]
        }
        const qc = filteredRows.filter(r => r.ccCode === '123200')
        const gnrl = filteredRows.filter(r => r.ccCode === '123000')
        const others = filteredRows.filter(r => r.ccCode !== '123200' && r.ccCode !== '123000')
        const res = []
        if (qc.length > 0) res.push({ title: 'Cost Center 123200 — Quality - QC', ccBadge: 'Quality - QC', rows: qc })
        if (gnrl.length > 0) res.push({ title: 'Cost Center 123000 — Quality - General', ccBadge: 'Quality - General', rows: gnrl })
        if (others.length > 0) res.push({ title: 'Cost Center Lainnya', ccBadge: 'OTHER', rows: others })
        return res
    }, [filteredRows, activeCc])

    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.headerLeft}>
                    <div className={s.headerTitle}>
                        Per Akun & Cost Center
                    </div>
                    <div className={s.hint}>
                        Klik baris untuk melihat rincian riil per bulan
                    </div>
                </div>

                <div className={s.headerRight}>
                    <button
                        className={s.headerDetailBtn}
                        onClick={(e) => { e.stopPropagation(); onRowClick?.('ALL'); }}
                    >
                        Lihat Semua Detail Bulanan
                    </button>
                </div>
            </div>

            {/* Cost Center Switcher Tabs */}
            <div className={s.ccTabBar}>
                <button
                    type="button"
                    className={`${s.ccTab} ${activeCc === '123200' ? s.ccTabActiveQc : ''}`}
                    onClick={() => setActiveCc('123200')}
                >
                    <span className={s.dotQc} />
                    <span className={s.ccTabName}>Quality - QC (123200)</span>
                    <span className={s.ccBadgeCount}>{counts.qc} Account</span>
                </button>

                <button
                    type="button"
                    className={`${s.ccTab} ${activeCc === '123000' ? s.ccTabActiveGnrl : ''}`}
                    onClick={() => setActiveCc('123000')}
                >
                    <span className={s.dotGnrl} />
                    <span className={s.ccTabName}>Quality - General (123000)</span>
                    <span className={s.ccBadgeCount}>{counts.gnrl} Account</span>
                </button>

                <button
                    type="button"
                    className={`${s.ccTab} ${activeCc === 'ALL' ? s.ccTabActiveAll : ''}`}
                    onClick={() => setActiveCc('ALL')}
                >
                    <span className={s.ccTabName}>Semua Cost Center</span>
                    <span className={s.ccBadgeCount}>{counts.all} Account</span>
                </button>
            </div>

            {/* Quick KPI Strip for Selected Cost Center */}
            <div className={s.kpiStrip}>
                <div className={s.kpiItem}>
                    <span className={s.kpiLabel}>Actual Finance Budget</span>
                    <span className={s.kpiVal}>{formatRp(metrics.budget)}</span>
                </div>
                <div className={s.kpiItem}>
                    <span className={s.kpiLabel}>Plan PR</span>
                    <span className={`${s.kpiVal} ${s.blueVal}`}>
                        {formatRp(metrics.actualPr)} <span className={s.pctSub}>({metrics.pctPr}%)</span>
                    </span>
                </div>
                <div className={s.kpiItem}>
                    <span className={s.kpiLabel}>Actual (Recieve)</span>
                    <span className={`${s.kpiVal} ${s.greenVal}`}>
                        {formatRp(metrics.actualGr)} <span className={s.pctSub}>({metrics.pctGr}%)</span>
                    </span>
                </div>
                <div className={s.kpiItem}>
                    <span className={s.kpiLabel}>Sisa Saldo PR</span>
                    <span className={`${s.kpiVal} ${metrics.saldoPr < 0 ? s.redVal : s.greenVal}`}>
                        {formatRp(metrics.saldoPr)}
                    </span>
                </div>
            </div>

            {/* Table Area */}
            <div className={s.tableContainer}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Account & Cost Center</th>
                            <th>Nama Account / Deskripsi</th>
                            <th>Actual Finance Budget</th>
                            <th>Planned PR</th>
                            <th>Actual</th>
                            <th>Sisa Saldo</th>
                            <th>% Pakai PR</th>
                            <th>% Recieve</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Tidak ada data anggaran untuk kategori ini.
                                </td>
                            </tr>
                        ) : (
                            groups.map((group, gIdx) => (
                                <React.Fragment key={group.title || gIdx}>
                                    {activeCc === 'ALL' && (
                                        <tr className={s.groupHeaderRow}>
                                            <td colSpan={8}>
                                                <div className={s.groupHeaderContent}>
                                                    <span className={s.groupTitle}>{group.title}</span>
                                                    <span className={s.groupCount}>{group.rows.length} Account</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {group.rows.map(d => {
                                        const budget = Number(d.budget || 0)
                                        const actualPr = Number(d.actual_pr || d.actual || 0)
                                        const actualGr = Number(d.actual_gr || 0)
                                        const saldoPr = Number(d.saldo_pr !== undefined ? d.saldo_pr : (d.saldo || (budget - actualPr)))
                                        const pctPr = budget > 0 ? (d.persen_pr !== undefined ? d.persen_pr : Math.round((actualPr / budget) * 100)) : (actualPr > 0 ? 100 : 0)
                                        const pctGr = budget > 0 ? (d.persen_gr !== undefined ? d.persen_gr : Math.round((actualGr / budget) * 100)) : (actualGr > 0 ? 100 : 0)
                                        const isOver = (budget > 0 && pctPr > 100) || (budget === 0 && actualPr > 0) || saldoPr < 0
                                        const isWarning = !isOver && pctPr >= 80

                                        return (
                                            <tr
                                                key={d.kode}
                                                className={`${s.row} ${isOver ? s.overRow : isWarning ? s.warnRow : ''}`}
                                                onClick={() => onRowClick?.(d.kode)}
                                            >
                                                <td>
                                                    <div className={s.formBadgeArea}>
                                                        <span className={`${s.badge} ${s.gl}`}>{d.kode}</span>
                                                        {isOver && <span className={s.overTag}>{budget === 0 ? 'Unbudgeted' : 'Over'}</span>}
                                                        {isWarning && <span className={s.warningTag}>≥80%</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={s.nameArea}>
                                                        <span className={s.formName}>{d.shortName}</span>
                                                        <span className={`${s.ccBadge} ${d.ccCode === '123200' ? s.ccQc : s.ccGnrl}`}>
                                                            {d.ccLabel}
                                                        </span>
                                                        <span className={`${s.typeLabel} ${d.displayType === 'Investasi' ? s.capex : s.opex}`}>
                                                            {d.displayType}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={s.numCell}>{formatRp(budget)}</td>
                                                <td className={`${s.numCell} ${s.prCell}`}>{formatRp(actualPr)}</td>
                                                <td className={`${s.numCell} ${s.grCell}`}>{formatRp(actualGr)}</td>
                                                <td className={`${s.numCell} ${saldoPr < 0 ? s.danger : isWarning ? s.warning : s.success}`}>
                                                    {formatRp(saldoPr)}
                                                </td>
                                                <td>
                                                    <div className={s.progWrap}>
                                                        <div className={s.progBg}>
                                                            <div
                                                                className={s.progBar}
                                                                style={{
                                                                    width: `${Math.min(pctPr, 100)}%`,
                                                                    background: isOver ? '#dc2626' : isWarning ? '#f59e0b' : '#2563eb',
                                                                }}
                                                            />
                                                        </div>
                                                        <span className={`${s.progLabel} ${isOver ? s.over : isWarning ? s.warningLabel : s.normal}`}>
                                                            {pctPr}%{isOver && <AlertTriangle size={11} style={{ display: 'inline', marginLeft: 2 }} />}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={s.grBadge}>
                                                        {pctGr}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}