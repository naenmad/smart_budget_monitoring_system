import s from './BudgetCard.module.css'
import { formatRp } from '../utils/format'
import { ArrowRight, AlertTriangle } from 'lucide-react'

export default function BudgetCard({ type, actual, budget, saldo, onClick }) {
    const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0
    const isOver = pct > 100
    const variant = type.toLowerCase()

    return (
        <div className={`${s.card} ${s[variant]}`} onClick={onClick}>
            <div className={s.header}>
                <span className={`${s.title} ${s[variant]}`}>{type}</span>
                <span className={`${s.detailLink} ${s[variant]}`}>
                    Detail <ArrowRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </span>
            </div>

            <div className={`${s.value} ${s[variant]}`}>{formatRp(actual)}</div>
            <div className={`${s.sub} ${s[variant]}`}>
                dari {formatRp(budget)} · saldo {formatRp(saldo)}
            </div>

            <div className={s.progBg}>
                <div
                    className={`${s.progBar} ${s[variant]}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                />
            </div>

            <div className={`${s.usage} ${isOver ? s.over : s[variant === 'capex' ? 'capex' : 'normal']}`}>
                {pct}% terpakai {isOver && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />}
            </div>
        </div>
    )
}