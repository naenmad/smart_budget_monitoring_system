import { useState, useEffect } from 'react'
import s from './PrStatusModal.module.css' // reuse styling yang sudah ada, konsisten visual
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import { X, Loader2 } from 'lucide-react'

export default function CancelledPlanningModal({ periode, onClose }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [periode])

    async function fetchData() {
        setLoading(true)
        try {
            const res = await planningApi.getCancelled({ periode, per_page: 50 })
            if (res.data?.success) {
                setItems(res.data.data || [])
            }
        } catch (err) {
            console.error('Error fetching cancelled planning list:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h2>Item Planning Dibatalkan</h2>
                        <p>Daftar budget yang sudah dibatalkan (tidak masuk hitungan remaining budget)</p>
                    </div>
                    <div className={s.headerActions}>
                        <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className={s.content}>
                    {loading ? (
                        <div className={s.loadingState}>
                            <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                            Memuat data...
                        </div>
                    ) : items.length === 0 ? (
                        <div className={s.emptyState}>Belum ada item yang dibatalkan</div>
                    ) : (
                        <div className={s.tableContainer}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th>Bulan</th>
                                        <th>Item</th>
                                        <th className={s.center}>Kategori</th>
                                        <th className={s.right}>Planning Amount</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((d) => (
                                        <tr key={d.id}>
                                            <td>{d.month}</td>
                                            <td className={s.truncate}>{d.item}</td>
                                            <td className={s.center}>{d.kategori_kode || d.kategori_id || '-'}</td>
                                            <td className={s.right}>{formatRp(d.planning_amount)}</td>
                                            <td className={s.truncate}>{d.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}