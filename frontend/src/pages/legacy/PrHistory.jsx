import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { prApi } from '../api/prApi'
import { prPoDataApi } from '../api/prPoDataApi'
import { uploadHistoryApi } from '../api/uploadHistoryApi'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Play, Trash2, Loader2, ArrowUpDown, History, Download, SlidersHorizontal } from 'lucide-react'
import TablePagination from '../components/common/TablePagination'
import TableSkeleton from '../components/common/TableSkeleton'
import CopyButton from '../components/common/CopyButton'
import EmptyState from '../components/common/EmptyState'
import { exportJsonToExcel } from '../utils/excelExport'
import styles from './PrHistory.module.css'

export default function PrHistory() {
  const confirm = useConfirm()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(30)
  const [orderDirection, setOrderDirection] = useState('desc')
  const [filterStatus, setFilterStatus] = useState('')
  const [trackingStage, setTrackingStage] = useState('')
  const [uploadId, setUploadId] = useState('')
  const [search, setSearch] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [density, setDensity] = useState(() => localStorage.getItem('sbms_table_density') || 'comfortable')
  const searchInputRef = useRef(null)
  const CURRENT_YEAR = String(new Date().getFullYear())

  const handleDensityChange = () => {
    setDensity(prev => {
      const next = prev === 'compact' ? 'comfortable' : 'compact'
      localStorage.setItem('sbms_table_density', next)
      return next
    })
  }

  const handleExportExcel = () => {
    if (!prList.length) {
      toast.error('Tidak ada data untuk diexport')
      return
    }
    const exportRows = prList.map((p, idx) => ({
      'No': (page - 1) * perPage + idx + 1,
      'No PR Doc': p.pr_doc_num || '-',
      'Deskripsi': p.description || '-',
      'Supplier': p.supplier_name || '-',
      'Total Harga (IDR)': Number(p.total_price || 0),
      'Tahapan': p.tracking_stage || '-',
      'Request Date': p.request_date || '-',
      'PO Doc': p.po_doc_num || '-',
      'GR Doc': p.gr_doc_num || '-',
      'Batch Upload': p.upload_id || '-'
    }))
    exportJsonToExcel(exportRows, 'Riwayat_PR_Tracking', 'PR History')
    toast.success(`${exportRows.length} baris riwayat PR berhasil diexport ke Excel!`)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Data Query
  const { data: listData, isLoading: loading, refetch } = useQuery({
    queryKey: ['prHistory', page, perPage, orderDirection, filterStatus, trackingStage, uploadId, search],
    queryFn: async () => {
      const params = { page, per_page: perPage, order_direction: orderDirection }
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
    const ok = await confirm({
      title: 'Jalankan Pipeline',
      message: `Jalankan proses pipeline untuk semua data WAITING di periode ${CURRENT_YEAR}?`,
      confirmText: 'Jalankan',
      cancelText: 'Batal',
      type: 'info'
    })
    if (!ok) return
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
    const ok = await confirm({
      title: 'Jalankan Ulang Mapping',
      message: `Jalankan ulang HANYA mapping untuk semua data NEED_MAPPING di periode ${CURRENT_YEAR}?`,
      confirmText: 'Jalankan',
      cancelText: 'Batal',
      type: 'info'
    })
    if (!ok) return
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
    const ok = await confirm({
      title: 'Hapus Data PR',
      message: 'Hapus data PR ini?',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      type: 'danger'
    })
    if (!ok) return
    try {
      await prPoDataApi.delete(id)
      queryClient.invalidateQueries({ queryKey: ['prHistory'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus PR')
    }
  }

  const handleDeleteUpload = async () => {
    if (!uploadId) return
    const ok = await confirm({
      title: 'Hapus Seluruh Data Upload',
      message: `Hapus SELURUH data PR dari Upload ID ${uploadId}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Seluruh Data',
      cancelText: 'Batal',
      type: 'danger'
    })
    if (!ok) return
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
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <History size={26} color="var(--primary)" />
            PR History
          </h1>
          <p className={styles.subtitle}>
            Daftar riwayat data Purchase Requisition (PR), Purchase Order (PO), dan Goods Receipt (GR)
          </p>
        </div>
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
          ref={searchInputRef}
          placeholder="Cari PR / Deskripsi... (Tekan /)"
          title="Tekan [/] untuk langsung mencari"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className={styles.input}
          style={{ minWidth: 220 }}
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
        <select value={orderDirection} onChange={e => { setOrderDirection(e.target.value); setPage(1) }} className={styles.input} title="Urutan Data">
          <option value="desc">Terbaru dahulu (Akhir → Awal)</option>
          <option value="asc">Terlama dahulu (Awal → Akhir)</option>
        </select>
        {(search || uploadId || filterStatus || trackingStage) && (
          <button
            onClick={() => {
              setSearch('')
              setUploadId('')
              setFilterStatus('')
              setTrackingStage('')
              setOrderDirection('desc')
              setPage(1)
            }}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13 }}
          >
            Reset Filter
          </button>
        )}
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Download data riwayat PR ke file Excel (.xlsx)"
          >
            <Download size={14} style={{ color: 'var(--success)' }} />
            Export Excel
          </button>
          <button
            type="button"
            onClick={handleDensityChange}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            title={`Mode tampilan baris: ${density === 'compact' ? 'Kompak' : 'Normal'} (Klik untuk beralih)`}
          >
            <SlidersHorizontal size={13} />
            {density === 'compact' ? 'Kompak' : 'Normal'}
          </button>
          <span className={styles.totalLabel}>Total: <strong>{total}</strong></span>
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <div className={styles.summaryContainer}>
          {Object.entries(summary.summary || {}).map(([k, v]) => {
            const isStage = ['PR', 'PO', 'GR'].includes(k.toUpperCase())
            const isActive = isStage ? trackingStage === k : filterStatus === k
            return (
              <div
                key={k}
                className={`${styles.summaryCard} ${isActive ? styles.summaryCardActive : ''}`}
                onClick={() => {
                  if (isStage) {
                    setTrackingStage(prev => prev === k ? '' : k)
                  } else {
                    setFilterStatus(prev => prev === k ? '' : k)
                  }
                  setPage(1)
                }}
                title={`Klik untuk memfilter: ${k}`}
              >
                <div className={styles.summaryValue}>{v}</div>
                <div className={styles.summaryLabel}>{k}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={['40px', '140px', '280px', '180px', '120px', '90px', '110px', '70px']} />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={`${styles.table} ${density === 'compact' ? 'table-compact' : ''}`}>
              <thead>
                <tr className={styles.tableHeader}>
                  {['#', 'PR Doc', 'Description', 'Supplier', 'Total Price', 'Tahapan', 'Request Date', 'Aksi'].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prList.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <EmptyState
                        title="Tidak ada riwayat PR"
                        description="Tidak ditemukan data PR yang sesuai dengan filter atau kata kunci pencarian Anda."
                        actionLabel="Reset Filter"
                        onAction={() => {
                          setSearch('')
                          setUploadId('')
                          setFilterStatus('')
                          setTrackingStage('')
                          setOrderDirection('desc')
                          setPage(1)
                        }}
                      />
                    </td>
                  </tr>
                )}
                {prList.map((pr, i) => (
                  <tr key={pr.id} className={styles.tr}>
                    <td className={styles.td}>{(page - 1) * perPage + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdCode}`} title={pr.upload_id ? `Batch Upload #${pr.upload_id}` : ''}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {pr.pr_doc_num || '-'}
                        {pr.pr_doc_num && <CopyButton text={pr.pr_doc_num} label="Nomor PR" />}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdDesc}`} title={pr.description}>{pr.description || '-'}</td>
                    <td className={styles.td}>{pr.supplier_name || '-'}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>{fmt(pr.total_price)}</td>
                    <td className={styles.td}>{badge(pr.tracking_stage, stageColor)}</td>
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

          {/* Standardized Table Pagination */}
          {total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={(newSize) => {
                setPerPage(newSize)
                setPage(1)
              }}
              itemName="data PR"
              loading={loading}
            />
          )}
        </>
      )}
    </div>
  )
}
