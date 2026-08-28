import s from './BudgetCard.module.css'
import { formatRp } from '../utils/format'
import { ArrowRight, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'

export default function BudgetCard({
    type = 'CAPEX',
    title = 'Capital Expenditure',
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

    return (
        <div className={`${s.card} ${s[variant]}`} onClick={onClick}>
            <div className={s.header}>
                <div className={s.titleArea}>
                    <span className={`${s.badge} ${s[variant]}`}>{type}</span>
                    <span className={s.subTitle}>{title}</span>
                </div>
                <span className={`${s.detailLink} ${s[variant]}`}>
                    Detail <ArrowRight size={12} />
                </span>
            </div>

            {/* Plafon Anggaran */}
            <div className={s.budgetRow}>
                <span className={s.budgetLabel}>Pagu Anggaran ({type})</span>
                <span className={s.budgetValue}>{formatRp(budget)}</span>
            </div>

            {/* Dual Usage Blocks: PR vs GR */}
            <div className={s.metricsGrid}>
                {/* 1. Komitmen Pengadaan (PR) */}
                <div className={`${s.metricBlock} ${s.pr}`}>
                    <div className={s.metricLabel}>
                        <FileText size={13} style={{ color: '#2563eb' }} />
                        <span>Komitmen PR (Ekspektasi)</span>
                    </div>
                    <div className={s.metricVal}>{formatRp(actualPr)}</div>
                    <div className={s.metricSub}>
                        Saldo: <strong style={{ color: saldoPr < 0 ? 'var(--danger)' : 'var(--text-main)' }}>{formatRp(saldoPr)}</strong>
                    </div>

                    <div className={s.progBg}>
                        <div
                            className={`${s.progBar} ${isOverPr ? s.over : s.pr}`}
                            style={{ width: `${Math.min(pctPr, 100)}%` }}
                        />
                    </div>
                    <div className={s.usageRow}>
                        <span className={s.usageText}>Terpakai PR</span>
                        <span style={{ color: isOverPr ? 'var(--danger)' : '#2563eb' }}>
                            {pctPr}% {isOverPr && <AlertTriangle size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                        </span>
                    </div>
                </div>

                {/* 2. Realisasi Fisik (GR) */}
                <div className={`${s.metricBlock} ${s.gr}`}>
                    <div className={s.metricLabel}>
                        <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                        <span>Realisasi GR (Fisik Diterima)</span>
                    </div>
                    <div className={s.metricVal}>{formatRp(actualGr)}</div>
                    <div className={s.metricSub}>
                        Saldo: <strong style={{ color: 'var(--text-main)' }}>{formatRp(saldoGr)}</strong>
                    </div>

                    <div className={s.progBg}>
                        <div
                            className={`${s.progBar} ${s.gr}`}
                            style={{ width: `${Math.min(pctGr, 100)}%` }}
                        />
                    </div>
                    <div className={s.usageRow}>
                        <span className={s.usageText}>Selesai GR</span>
                        <span style={{ color: '#10b981' }}>
                            {pctGr}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}