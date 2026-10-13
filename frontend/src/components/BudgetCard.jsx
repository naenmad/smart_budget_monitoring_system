import s from './BudgetCard.module.css'
import { formatRp } from '../utils/format'
import { ArrowRight, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'

export default function BudgetCard({
    type = 'CAPEX',
    title = 'Capital Expenditure',
    badgeLabel,
    budget = 0,
    actualPr = 0,
    actualGr = 0,
    saldoPr = 0,
    saldoGr = 0,
    persenPr = 0,
    persenGr = 0,
    onClick
}) {
    const variant = type.toLowerCase()
    const pctPr = budget > 0 ? (persenPr || Math.round((actualPr / budget) * 100)) : 0
    const pctGr = budget > 0 ? (persenGr || Math.round((actualGr / budget) * 100)) : 0
    const isOverPr = pctPr > 100
    const displayType = badgeLabel || type

    return (
        <div className={`${s.card} ${s[variant]}`} onClick={onClick}>
            <div className={s.header}>
                <div className={s.titleArea}>
                    <span className={`${s.badge} ${s[variant]}`}>{displayType}</span>
                    <span className={s.subTitle}>{title}</span>
                </div>

                {/* Sisa Budget at Top Right with Vibrant Highlight */}
                <div className={s.headerRight}>
                    <div className={`${s.sisaSaldoBadge} ${saldoPr < 0 ? s.sisaSaldoDanger : s.sisaSaldoSafe}`} title="Committed Remaining Budget (PR)">
                        <div className={s.sisaSaldoHeader}>
                            {saldoPr < 0 ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                            <span className={s.sisaSaldoLabel}>Sisa Budget</span>
                        </div>
                        <span className={s.sisaSaldoVal}>{formatRp(saldoPr)}</span>
                    </div>
                    <span className={`${s.detailLink} ${s[variant]}`}>
                        Detail <ArrowRight size={12} />
                    </span>
                </div>
            </div>

            {/* Total Budget Row */}
            <div className={s.budgetRow}>
                <span className={s.budgetLabel}>Actual Finance Budget ({displayType})</span>
                <span className={`${s.budgetValue} ${s[variant]}`}>{formatRp(budget)}</span>
            </div>

            {/* Dual Usage Blocks: PR vs GR */}
            <div className={s.metricsGrid}>
                {/* 1. Committed Procurement (PR) */}
                <div className={`${s.metricBlock} ${s.pr}`}>
                    <div className={s.metricLabel}>
                        <FileText size={13} style={{ color: '#2563eb' }} />
                        <span>Planned PR (Committed)</span>
                    </div>
                    <div className={`${s.metricVal} ${s[variant]}`}>{formatRp(actualPr)}</div>
                    <div className={s.metricSub}>
                        Sisa Budget: <strong className={`${s.metricBudget} ${saldoPr < 0 ? s.dangerText : s[variant]}`}>{formatRp(saldoPr)}</strong>
                    </div>

                    <div className={s.progBg}>
                        <div
                            className={`${s.progBar} ${isOverPr ? s.over : s.pr}`}
                            style={{ width: `${Math.min(pctPr, 100)}%` }}
                        />
                    </div>
                    <div className={s.usageRow}>
                        <span className={s.usageText}>PR Usage</span>
                        <span style={{ color: isOverPr ? 'var(--danger)' : '#2563eb' }}>
                            {pctPr}% {isOverPr && <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                        </span>
                    </div>
                </div>

                {/* 2. Physical Receipt (GR / Recieve) */}
                <div className={`${s.metricBlock} ${s.gr}`}>
                    <div className={s.metricLabel}>
                        <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                        <span>Actual (Recieved)</span>
                    </div>
                    <div className={`${s.metricVal} ${s[variant]}`}>{formatRp(actualGr)}</div>
                    <div className={s.metricSub}>
                        Sisa Budget: <strong className={`${s.metricBudget} ${s[variant]}`}>{formatRp(saldoGr)}</strong>
                    </div>

                    <div className={s.progBg}>
                        <div
                            className={`${s.progBar} ${s.gr}`}
                            style={{ width: `${Math.min(pctGr, 100)}%` }}
                        />
                    </div>
                    <div className={s.usageRow}>
                        <span className={s.usageText}>Recieve Completed</span>
                        <span style={{ color: '#10b981' }}>
                            {pctGr}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
