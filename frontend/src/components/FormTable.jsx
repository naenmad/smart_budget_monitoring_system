import s from './FormTable.module.css'
import { formatRp } from '../utils/format'
import { AlertTriangle } from 'lucide-react'

const FORMS = [
    { code: 'E-1', type: 'OPEX', color: '#2563eb', cls: 'e1' },
    { code: 'E-9', type: 'OPEX', color: '#16a34a', cls: 'e9' },
    { code: 'I-1', type: 'CAPEX', color: '#7c3aed', cls: 'i1' },
]

export default function FormTable({ data = {}, onRowClick }) {
    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.headerTitle}>
                    Monitoring per Form <span className={s.hint}>— klik baris untuk rincian per form</span>
                </div>
                <button
                    className={s.headerDetailBtn}
                    onClick={(e) => { e.stopPropagation(); onRowClick?.('ALL'); }}
                >
                    Detail Bulanan
                </button>
            </div>

            <div className={s.colHead}>
                <span>Form</span>
                <span>Budget</span>
                <span>Actual</span>
                <span>Saldo</span>
                <span>Pakai</span>
            </div>

            {FORMS.map(f => {
                const d = Array.isArray(data)
                    ? (data.find(x => x.kode === f.code) || { budget: 0, actual: 0, saldo: 0 })
                    : (data[f.code] || { budget: 0, actual: 0, saldo: 0 })

                const budget = Number(d.budget || 0)
                const actual = Number(d.actual || 0)
                const saldo = Number(d.saldo || (budget - actual))
                const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0
                const isOver = pct > 100 || saldo < 0

                return (
                    <div
                        key={f.code}
                        className={`${s.row} ${isOver ? s.over : ''}`}
                        onClick={() => onRowClick?.(f.code)}
                    >
                        <div className={s.formCell}>
                            <span className={`${s.badge} ${s[f.cls]}`}>{f.code}</span>
                            <span className={s.typeLabel}>{f.type}</span>
                            {isOver && <span className={s.overTag}>Over</span>}
                        </div>

                        <div className={s.numCell}>{formatRp(budget)}</div>
                        <div className={`${s.numCell} ${s.warning}`}>{formatRp(actual)}</div>
                        <div className={`${s.numCell} ${isOver ? s.danger : s.success}`}>
                            {formatRp(saldo)}
                        </div>

                        <div className={s.progWrap}>
                            <div className={s.progBg}>
                                <div
                                    className={s.progBar}
                                    style={{
                                        width: `${Math.min(pct, 100)}%`,
                                        background: isOver ? '#dc2626' : f.color,
                                    }}
                                />
                            </div>
                            <div className={`${s.progLabel} ${isOver ? s.over : s.normal}`}>
                                {pct}%{isOver && <AlertTriangle size={11} style={{ display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}