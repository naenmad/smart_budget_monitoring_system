import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import s from './BudgetChart.module.css'
import { formatRp } from '../utils/format'

const COLORS = {
    budget: '#94a3b8',
    actual: '#2563eb',
    saldo: '#16a34a',
}

const fmtYAxis = (v) => {
    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}M`
    if (v >= 1000000) return `${(v / 1000000).toFixed(0)}jt`
    if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`
    return `${v}`
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className={s.tooltip}>
                <div className={s.tooltipLabel}>{label}</div>
                {payload.map(p => (
                    <div key={p.name} style={{ color: p.fill, fontSize: '12px', marginTop: 2 }}>
                        <span style={{ fontWeight: 600 }}>{p.name}:</span> {formatRp(p.value)}
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export default function BudgetChart({ title, data = [] }) {
    const legends = [
        { label: 'Budget', color: COLORS.budget },
        { label: 'Actual', color: COLORS.actual },
        { label: 'Saldo', color: COLORS.saldo },
    ]

    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.title}>{title}</div>
                <div className={s.legend}>
                    {legends.map(({ label, color }) => (
                        <div key={label} className={s.legendItem}>
                            <div
                                className={s.legendColorBox}
                                style={{ background: color }}
                            />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={s.chartArea}>
                {data.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        Tidak ada data budget untuk ditampilkan
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={data} barCategoryGap="25%" barGap={4}>
                            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                tickFormatter={fmtYAxis}
                                width={65}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="budget" name="Budget" fill={COLORS.budget} radius={[4, 4, 0, 0]} maxBarSize={36} />
                            <Bar dataKey="actual" name="Actual" fill={COLORS.actual} radius={[4, 4, 0, 0]} maxBarSize={36} />
                            <Bar dataKey="saldo" name="Saldo" fill={COLORS.saldo} radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}