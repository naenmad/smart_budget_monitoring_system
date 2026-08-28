import s from './FormTable.module.css'
import { formatRp } from '../utils/format'
import { AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'

const FORMS = [
    { code: 'E-1', name: 'Biaya Pemeliharaan & Perbaikan', type: 'OPEX', color: '#2563eb', cls: 'e1' },
    { code: 'E-9', name: 'Biaya Non-Produksi / Tooling', type: 'OPEX', color: '#16a34a', cls: 'e9' },
    { code: 'I-1', name: 'Alat & Peralatan Tetap / Inventory', type: 'CAPEX', color: '#7c3aed', cls: 'i1' },
]

export default function FormTable({ data = {}, onRowClick }) {
    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.headerTitle}>
                    Monitoring Realisasi per Formulir Anggaran <span className={s.hint}>— klik baris untuk rincian bulanan</span>
                </div>
                <button
                    className={s.headerDetailBtn}
                    onClick={(e) => { e.stopPropagation(); onRowClick?.('ALL'); }}
                >
                    Lihat Semua Detail
                </button>
            </div>

            <div className={s.tableContainer}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Kode Form</th>
                            <th>Kategori & Tipe</th>
                            <th>Pagu Anggaran</th>
                            <th>Komitmen PR</th>
                            <th>Realisasi GR</th>
                            <th>Sisa Saldo PR</th>
                            <th>% Pakai PR</th>
                            <th>% Selesai GR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {FORMS.map(f => {
                            const d = Array.isArray(data)
                                ? (data.find(x => x.kode === f.code) || { budget: 0, actual_pr: 0, actual_gr: 0, saldo_pr: 0, saldo_gr: 0, persen_pr: 0, persen_gr: 0 })
                                : (data[f.code] || { budget: 0, actual_pr: 0, actual_gr: 0, saldo_pr: 0, saldo_gr: 0, persen_pr: 0, persen_gr: 0 })

                            const budget = Number(d.budget || 0)
                            const actualPr = Number(d.actual_pr || d.actual || 0)
                            const actualGr = Number(d.actual_gr || 0)
                            const saldoPr = Number(d.saldo_pr !== undefined ? d.saldo_pr : (d.saldo || (budget - actualPr)))
                            const pctPr = budget > 0 ? (d.persen_pr || Math.round((actualPr / budget) * 100)) : 0
                            const pctGr = budget > 0 ? (d.persen_gr || Math.round((actualGr / budget) * 100)) : 0
                            const isOver = pctPr > 100 || saldoPr < 0
                            const isWarning = !isOver && pctPr >= 80

                            return (
                                <tr
                                    key={f.code}
                                    className={`${s.row} ${isOver ? s.overRow : isWarning ? s.warnRow : ''}`}
                                    onClick={() => onRowClick?.(f.code)}
                                >
                                    <td>
                                        <div className={s.formBadgeArea}>
                                            <span className={`${s.badge} ${s[f.cls]}`}>{f.code}</span>
                                            {isOver && <span className={s.overTag}>Over</span>}
                                            {isWarning && <span className={s.warningTag}>≥80%</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={s.nameArea}>
                                            <span className={s.formName}>{d.nama || f.name}</span>
                                            <span className={`${s.typeLabel} ${f.type === 'CAPEX' ? s.capex : s.opex}`}>{f.type}</span>
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
                    </tbody>
                </table>
            </div>
        </div>
    )
}