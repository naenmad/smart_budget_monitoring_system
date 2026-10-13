import { useState, useEffect } from 'react'
import s from './DetailModal.module.css'
import tableStyles from './MonthlyItemDetailModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { formatRp } from '../utils/format'
import { X, Loader2 } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

export default function AllMonthlyDetailModal({ periode, onClose }) {
    const [monthlyData, setMonthlyData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAllMonthly()
    }, [periode])

    async function fetchAllMonthly() {
        setLoading(true)
        try {
            const res = await prPoDataApi.getMonthlySummary(periode)
            if (res.success && res.data) {
                // Group by kode & aggregate monthly totals
                const groups = {}
                res.data.forEach(item => {
                    if (!groups[item.kode]) {
                        groups[item.kode] = {
                            kode: item.kode,
                            nama: item.nama,
                            tipe: item.tipe_formulir,
                            months: Array(12).fill(0),
                            total: 0
                        }
                    }
                    const mIdx = item.bulan - 1
                    if (mIdx >= 0 && mIdx < 12) {
                        groups[item.kode].months[mIdx] += item.total
                        groups[item.kode].total += item.total
                    }
                })

                setMonthlyData(Object.values(groups))
            }
        } catch (err) {
            console.error('Error fetching all monthly data:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={`${s.modal} ${tableStyles.largeModal}`} onClick={e => e.stopPropagation()}>
                
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h2>Detail Budget Semua Account (Per Bulan)</h2>
                        <p>Periode {periode}</p>
                    </div>
                    <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className={s.loadingState}>
                        <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        Memuat data...
                    </div>
                ) : (
                    <div className={tableStyles.tableContainer}>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Deskripsi Akun</th>
                                    <th>Tipe</th>
                                    {MONTHS.map(m => (
                                        <th key={m} className={s.right}>{m}</th>
                                    ))}
                                    <th className={s.right}>Total Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{row.kode}</td>
                                        <td>{row.nama}</td>
                                        <td>
                                            <span className={`${s.badge} ${row.tipe === 'CAPEX' ? s.badgeCap : s.badgeE1}`}>
                                                {row.tipe}
                                            </span>
                                        </td>
                                        {row.months.map((amt, mIdx) => (
                                            <td key={mIdx} className={s.right} style={{ color: amt > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                {amt > 0 ? formatRp(amt) : '-'}
                                            </td>
                                        ))}
                                        <td className={s.right} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                            {formatRp(row.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
