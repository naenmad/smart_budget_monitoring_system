import { useState, useEffect } from 'react'
import s from './PrStatusModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { mappingApi } from '../api/mappingApi'
import { formatRp } from '../utils/format'
import { FileText, X, Loader2, Undo2 } from 'lucide-react'

export default function PrStatusModal({ status, onClose }) {
    const [prList, setPrList] = useState([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState(null)

    const isOopView = status === 'OOP'
    const isCancelledPrView = status === 'CANCELLED_PR'

    useEffect(() => {
        fetchData()
    }, [status])

    async function fetchData() {
        setLoading(true)
        try {
            // CANCELLED_PR pakai filter status_ai, bukan budget_status
            const params = isCancelledPrView
                ? { per_page: 100, status_ai: 'CANCELLED' }
                : { per_page: 50, budget_status: status }
            const res = await prPoDataApi.getAll(params)
            if (res.success) {
                setPrList(res.data || [])
            }
        } catch (err) {
            console.error('Error fetching PR status list:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleUndo(prId) {
        if (!confirm('Batalkan status OOP item ini dan kembalikan ke antrian Review Mapping?')) return

        setProcessingId(prId)
        try {
            const res = await mappingApi.undoMapping(prId)
            if (res.data?.success) {
                setPrList(prev => prev.filter(p => p.id !== prId))
            } else {
                alert(res.data?.message || 'Gagal membatalkan status OOP')
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal membatalkan status OOP')
        } finally {
            setProcessingId(null)
        }
    }

    const title = {
        ON_PLAN: 'ON PLAN (Dalam Budget)',
        OVER_PLAN: 'OVER BUDGET (Melebihi Budget)',
        UNDER_PLAN: 'UNDER PLAN (Dibawah Budget)',
        OOP: 'OOP (Out of Plan)',
        CANCELLED_PR: 'PR Dibatalkan Langsung',
    }[status] || status

    const handleExportPDF = async () => {
        try {
            // Dynamic import: load jsPDF only when user clicks export PDF
            const [{ jsPDF }, { default: autoTable }] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const doc = new jsPDF()

            doc.setFontSize(16)
            doc.text(`Laporan PR/PO - ${title}`, 14, 20)

            doc.setFontSize(10)
            doc.text(`Total Data: ${prList.length}`, 14, 28)

            const tableColumn = ["PR Doc", "Description", "Supplier", "Nilai", "Kategori"]
            const tableRows = []

            prList.forEach(pr => {
                const prData = [
                    pr.pr_doc_num || '-',
                    pr.description || '-',
                    pr.supplier_name || '-',
                    formatRp(pr.total_price),
                    pr.kategori_kode || '-'
                ]
                tableRows.push(prData)
            })

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 32,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [30, 41, 59] }
            })

            doc.save(`Laporan_${status}_${new Date().getTime()}.pdf`)
        } catch (err) {
            console.error('Error exporting PDF:', err)
        }
    }

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={e => e.stopPropagation()}>
                <div className={s.header}>
                    <div className={s.headerLeft}>
                        <h2>Detail {title}</h2>
                        <p>Daftar PR/PO dengan status {status}</p>
                    </div>
                    <div className={s.headerActions}>
                        {prList.length > 0 && (
                            <button
                                onClick={handleExportPDF}
                                className={s.exportBtn}
                            >
                                <FileText size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                                Export PDF
                            </button>
                        )}
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
                    ) : prList.length === 0 ? (
                        <div className={s.emptyState}>
                            Belum ada data
                        </div>
                    ) : (
                        <div className={s.tableContainer}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th>PR Doc</th>
                                        <th>Description</th>
                                        <th className={s.center}>Supplier</th>
                                        <th className={s.right}>Nilai</th>
                                        <th className={s.center}>Kategori</th>
                                        {isOopView && <th className={s.center}>Aksi</th>}
                                        {isCancelledPrView && <th>Alasan Pembatalan</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {prList.map((pr, i) => (
                                        <tr key={pr.id}>
                                            <td className={s.monospace}>{pr.pr_doc_num || '-'}</td>
                                            <td className={s.truncate}>{pr.description || '-'}</td>
                                            <td className={s.center}>{pr.supplier_name || '-'}</td>
                                            <td className={s.right}>{formatRp(pr.total_price)}</td>
                                            <td className={s.center}>{pr.kategori_kode || '-'}</td>
                                            {isOopView && (
                                                <td className={s.center}>
                                                    <button
                                                        className={s.undoBtn}
                                                        onClick={() => handleUndo(pr.id)}
                                                        disabled={processingId === pr.id}
                                                    >
                                                        {processingId === pr.id ? (
                                                            '...'
                                                        ) : (
                                                            <>
                                                                <Undo2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                                                Batalkan
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            )}
                                            {isCancelledPrView && (
                                                <td style={{ fontSize: 12, color: '#64748b', maxWidth: 220, wordBreak: 'break-word' }}>
                                                    {pr.alasan_pembatalan || '-'}
                                                </td>
                                            )}
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