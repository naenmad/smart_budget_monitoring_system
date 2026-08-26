import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts'
import s from './MonthlyPipelineChart.module.css'

const COLORS = {
    on_plan: '#10B981',
    under_plan: '#3B82F6',
    over_plan: '#F59E0B',
    out_of_plan: '#EF4444',
    need_mapping: '#8B5CF6'
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className={s.tooltip}>
                <div className={s.tooltipLabel}>{label}</div>
                {payload.map(p => {
                    if (p.value === 0) return null;
                    return (
                        <div key={p.dataKey} style={{ color: p.fill }}>
                            {p.name}: {p.value} PR
                        </div>
                    );
                })}
            </div>
        )
    }
    return null
}

export default function MonthlyPipelineChart({ title, data = [] }) {
    const legends = [
        { label: 'On Plan', color: COLORS.on_plan },
        { label: 'Under Plan', color: COLORS.under_plan },
        { label: 'Over Budget', color: COLORS.over_plan },
        { label: 'Out of Plan', color: COLORS.out_of_plan },
        { label: 'Need Mapping', color: COLORS.need_mapping },
    ]

    return (
        <div className={s.wrapper}>
            <div className={s.header}>
                <div className={s.title}>{title}</div>
                <div className={s.legend}>
                    {legends.map(({ label, color }) => (
                        <div key={label} className={s.legendItem}>
                            <div className={s.legendColorBox} style={{ background: color }} />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={s.chartArea}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barCategoryGap="20%">
                        <CartesianGrid vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={30} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="on_plan" name="On Plan" stackId="a" fill={COLORS.on_plan} />
                        <Bar dataKey="under_plan" name="Under Plan" stackId="a" fill={COLORS.under_plan} />
                        <Bar dataKey="over_plan" name="Over Budget" stackId="a" fill={COLORS.over_plan} />
                        <Bar dataKey="out_of_plan" name="Out of Plan" stackId="a" fill={COLORS.out_of_plan} />
                        <Bar dataKey="need_mapping" name="Need Mapping" stackId="a" fill={COLORS.need_mapping} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className={s.tableContainer}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>Bulan</th>
                            <th>Total PR</th>
                            <th>On Plan</th>
                            <th>Under Plan</th>
                            <th>Over Budget</th>
                            <th>Out of Plan</th>
                            <th>Need Mapping</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => (
                            <tr key={row.month}>
                                <td><strong>{row.month}</strong></td>
                                <td>{row.total_pr}</td>
                                <td style={{color: row.on_plan > 0 ? COLORS.on_plan : 'var(--text-subtle)'}}>{row.on_plan}</td>
                                <td style={{color: row.under_plan > 0 ? COLORS.under_plan : 'var(--text-subtle)'}}>{row.under_plan}</td>
                                <td style={{color: row.over_plan > 0 ? COLORS.over_plan : 'var(--text-subtle)'}}>{row.over_plan}</td>
                                <td style={{color: row.out_of_plan > 0 ? COLORS.out_of_plan : 'var(--text-subtle)'}}>{row.out_of_plan}</td>
                                <td style={{color: row.need_mapping > 0 ? COLORS.need_mapping : 'var(--text-subtle)'}}>{row.need_mapping}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center', color: 'var(--text-muted)'}}>Belum ada data</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
