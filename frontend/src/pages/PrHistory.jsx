import toast from 'react-hot-toast'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { prApi } from '../api/prApi'
import { prPoDataApi } from '../api/prPoDataApi'
import { uploadHistoryApi } from '../api/uploadHistoryApi'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Play, Trash2, Loader2 } from 'lucide-react'
import styles from './PrHistory.module.css'

export default function PrHistory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(30)
  const [filterStatus, setFilterStatus] = useState('')
  const [trackingStage, setTrackingStage] = useState('')
  const [uploadId, setUploadId] = useState('')
  const [search, setSearch] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const CURRENT_YEAR = String(new Date().getFullYear())

  // Fetch Data Query
  const { data: listData, isLoading: loading, refetch } = useQuery({
    queryKey: ['prHistory', page, perPage, filterStatus, trackingStage, uploadId, search],
    queryFn: async () => {
      const params = { page, per_page: perPage }
      if (filterStatus) params.status_ai = filterStatus
      if (trackingStage) params.tracking_stage = trackingStage
      if (uploadId) params.upload_id = parseInt(uploadId)
      if (search) params.search = search
      const res = await prApi.getAll(params)
      return res.data
    }
  })

  // Fetch Summary Query (only if uploadId exists)
  const { data: summaryData } = useQuery({
    queryKey: ['prSummary', uploadId],
    queryFn: async () => {
      if (!uploadId) return null
      const res = await prApi.getSummary(parseInt(uploadId))
      return res.data
    },
    enabled: !!uploadId
  })

  const prList = listData?.data || []
  const total = listData?.total || 0
  const totalPages = listData?.pages || 1
  const summary = summaryData || null

  const handleProcessPipeline = async () => {
    if (!confirm(`Jalankan proses pipeline untuk semua data WAITING di periode ${CURRENT_YEAR}?`)) return
    setIsProcessing(true)
    try {
      const res = await prApi.processPipeline(CURRENT_YEAR)
      toast.success(res.data?.message || 'Proses pipeline selesai')
      queryClient.invalidateQueries({ queryKey: ['prHistory'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menjalankan pipeline')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRetryMapping = async () => {
    if (!confirm(`Jalankan ulang HANYA mapping untuk semua data NEED_MAPPING di periode ${CURRENT_YEAR}?`)) return
    setIsProcessing(true)
    try {
      const res = await prApi.retryMapping(CURRENT_YEAR)
      toast.success(res.data?.message || 'Retry mapping selesai')
      queryClient.invalidateQueries({ queryKey: ['prHistory'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal retry mapping')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePr = async (id) => {
    if (!confirm('Hapus data PR ini?')) return
    try {
      await prPoDataApi.delete(id)
      queryClient.invalidateQueries({ queryKey: ['prHistory'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus PR')
    }
  }

  const handleDeleteUpload = async () => {
    if (!uploadId) return
    if (!confirm(`Hapus SELURUH data PR dari Upload ID ${uploadId}? Tindakan ini tidak dapat dibatalkan.`)) return
    setIsProcessing(true)
    try {
      await uploadHistoryApi.delete(uploadId)
      toast.success('Upload History dan seluruh PR didalamnya berhasil dihapus.')
      setUploadId('')
      setPage(1)
      queryClient.invalidateQueries({ queryKey: ['prHistory'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus Upload History')
    } finally {
      setIsProcessing(false)
    }
  }

  const statusColor = (s) => ({
    WAITING:    { bg: '#f1f5f9', color: '#64748b' },
    PROCESSING: { bg: '#fef9c3', color: '#854d0e' },
    DONE:       { bg: '#dcfce7', color: '#166534' },
    FAILED:     { bg: '#fee2e2', color: '#991b1b' },
  }[s] || { bg: '#f1f5f9', color: '#64748b' })

  const stageColor = (s) => ({
    PR: { bg: '#e0f2fe', color: '#0369a1' },
    PO: { bg: '#fef08a', color: '#854d0e' },
    GR: { bg: '#dcfce7', color: '#166534' },
    UNKNOWN: { bg: '#f1f5f9', color: '#64748b' }
  }[s] || { bg: '#f1f5f9', color: '#64748b' })

  const badge = (val, map) => {
    const { bg, color } = map(val || 'UNKNOWN')
    return <span style={{ background: bg, color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{val || 'UNKNOWN'}</span>
  }

  function fmt(n) {
    if (!n) return '-'
    return Number(n).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>PR History</h2>
        <div className={styles.headerActions}>
          <button 
            onClick={handleRetryMapping} 
            disabled={isProcessing}
            className={styles.btnRetry}
          >
            {isProcessing ? (
              <>
                <Loader2 size={13} className="animate-spin" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Retry Mapping
              </>
            )}
          </button>
          <button 
            onClick={handleProcessPipeline} 
            disabled={isProcessing}
            className={styles.btnPipeline}
          >
            {isProcessing ? (
              <>
                <Loader2 size={13} className="animate-spin" style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Memproses...
              </>
            ) : (
              <>
                <Play size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Jalankan Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          placeholder="Cari PR / Deskripsi..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className={styles.input}
          style={{ minWidth: 200 }}
        />
        <input
          placeholder="Upload ID"
          value={uploadId}
          onChange={e => { setUploadId(e.target.value); setPage(1) }}
          className={styles.input}
        />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className={styles.input}>
          <option value="">Semua Status</option>
          <option value="WAITING">WAITING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="DONE">DONE</option>
          <option value="FAILED">FAILED</option>
        </select>
        <select value={trackingStage} onChange={e => { setTrackingStage(e.target.value); setPage(1) }} className={styles.input}>
          <option value="">Semua Tahapan</option>
          <option value="PR">PR</option>
          <option value="PO">PO</option>
          <option value="GR">GR</option>
        </select>
        {uploadId && user?.role === 'admin' && (
          <button 
            onClick={handleDeleteUpload} 
            disabled={isProcessing}
            className={styles.btnDeleteUpload}
          >
            <Trash2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Hapus Upload Ini
          </button>
        )}
        <span className={styles.totalLabel}>Total: <strong>{total}</strong></span>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className={styles.summaryContainer}>
          {Object.entries(summary.summary || {}).map(([k, v]) => (
            <div key={k} className={styles.summaryCard}>
              <div className={styles.summaryValue}>{v}</div>
              <div className={styles.summaryLabel}>{k}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? <p>Memuat...</p> : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  {['#', 'Upload ID', 'PR Doc', 'Description', 'Supplier', 'Total Price', 'Tahapan', 'Status AI', 'Request Date', 'Aksi'].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prList.length === 0 && (
                  <tr><td colSpan={10} className={styles.emptyState}>Belum ada data</td></tr>
                )}
                {prList.map((pr, i) => (
                  <tr key={pr.id} className={styles.tr}>
                    <td className={styles.td}>{(page - 1) * perPage + i + 1}</td>
                    <td className={styles.td}>{pr.upload_id}</td>
                    <td className={`${styles.td} ${styles.tdCode}`}>{pr.pr_doc_num || '-'}</td>
                    <td className={`${styles.td} ${styles.tdDesc}`} title={pr.description}>{pr.description || '-'}</td>
                    <td className={styles.td}>{pr.supplier_name || '-'}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>{fmt(pr.total_price)}</td>
                    <td className={styles.td}>{badge(pr.tracking_stage, stageColor)}</td>
                    <td className={styles.td}>{badge(pr.status_ai, statusColor)}</td>
                    <td className={styles.td}>{pr.request_date || '-'}</td>
                    <td className={styles.td}>
                      {user?.role === 'admin' && (
                        <button 
                          onClick={() => handleDeletePr(pr.id)}
                          className={styles.btnDeletePr}
                          title="Hapus PR"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.perPageWrap}>
              <span className={styles.perPageLabel}>Tampilkan:</span>
              <select
                className={styles.perPageSelect}
                value={perPage}
                onChange={e => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
              >
                <option value={10}>10 item</option>
                <option value={25}>25 item</option>
                <option value={30}>30 item</option>
                <option value={50}>50 item</option>
                <option value={100}>100 item</option>
              </select>
              <span className={styles.totalInfo}>dari {total} data</span>
            </div>

            <div className={styles.pgActions}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={styles.pgBtn}>‹ Prev</button>
              <span className={styles.pgLabel}>Hal {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={styles.pgBtn}>Next ›</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
