import { useState, useEffect } from 'react'
import s from './DetailModal.module.css' // We can reuse styles from DetailModal
import tableStyles from './AllMonthlyDetailModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { formatRp } from '../utils/format'
import { X, Loader2 } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']

export default function AllMonthlyDetailModal({ periode, onClose }) {
    const [loading, setLoading] = useState(true)
    const [monthlyData, setMonthlyData] = useState([])
    const [kodes, setKodes] = useState([])

    useEffect(() => {
        fetchDetails()
    }, [periode])

    async function fetchDetails() {
        setLoading(true)
        try {
            // Fetch ALL monthly summary for this period
            const res = await prPoDataApi.getMonthlySummary(periode)

            if (res.success && res.data) {
                // Determine unique kodes and their types
                const uniqueKodes = [...new Set(res.data.map(m => m.kode))]
                setKodes(uniqueKodes)

                // Build data structure by month
                // { 1: { CAPEX: 0, OPEX: 0, 'E-1': 0, ... }, 2: { ... } }
                const mapByMonth = {}
                for (let i = 1; i <= 12; i++) {
                    mapByMonth[i] = { CAPEX: 0, OPEX: 0 }
                    uniqueKodes.forEach(k => { mapByMonth[i][k] = 0 })
                }

                res.data.forEach(m => {
                    const idx = m.bulan
                    const k = m.kode
                    const type = m.tipe_formulir
                    const val = m.total
                    if (mapByMonth[idx]) {
                        mapByMonth[idx][k] += val
                        if (type === 'CAPEX') mapByMonth[idx].CAPEX += val
                        if (type === 'OPEX') mapByMonth[idx].OPEX += val
                    }
                })

                setMonthlyData(mapByMonth)
            }
        } catch (err) {
            console.error('Error fetching detail:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={`${s.modal} ${tableStyles.largeModal}`} onClick={e => e.stopPropagation()}>
                
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h2>Detail Budget Semua Form (Per Bulan)</h2>
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
                    <div className={tableStyles.tableWrap}>
                        <table className={tableStyles.table}>
                            <thead>
                                <tr>
                                    <th className={tableStyles.stickyCol}>Bulan</th>
                                    <th className={tableStyles.typeHeader}>CAPEX</th>
                                    <th className={tableStyles.typeHeader}>OPEX</th>
                                    {kodes.map(k => (
                                        <th key={k}>{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MONTHS.map((name, i) => {
                                    const mData = monthlyData[i + 1]
                                    return (
                                        <tr key={name}>
                                            <td className={tableStyles.stickyCol}>{name}</td>
                                            <td className={tableStyles.typeCell}>{formatRp(mData?.CAPEX || 0)}</td>
                                            <td className={tableStyles.typeCell}>{formatRp(mData?.OPEX || 0)}</td>
                                            {kodes.map(k => (
                                                <td key={k}>{formatRp(mData?.[k] || 0)}</td>
                                            ))}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
