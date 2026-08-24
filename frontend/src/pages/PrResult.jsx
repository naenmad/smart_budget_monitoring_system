import { useState, useEffect } from 'react'
import { prApi } from '../api/prApi'
import { kategoriApi } from '../api/kategoriApi'
import { useAuth } from '../context/AuthContext'
import { XCircle, AlertTriangle } from 'lucide-react'
import styles from './PrResult.module.css'

const STATUS_CONFIG = {
  PLANNING: { bg: '#dcfce7', color: '#166534', label: 'PLANNING' },
  OVER_PLAN: { bg: '#fef9c3', color: '#854d0e', label: 'OVER BUDGET' },
  OOP: { bg: '#fee2e2', color: '#991b1b', label: 'OOP' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'DIBATALKAN' },
}

export default function PrResult() {
  const { user } = useAuth()
  const [prList, setPrList] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [kategoris, setKategoris] = useState([])

  // Filters
  const [filterKategori, setFilterKategori] = useState('')
  const [searchItem, setSearchItem] = useState('')
  const [filterStatus, setFilterStatus] = useState('DONE')

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState(null)   // PR object yang akan dibatalkan
  const [alasan, setAlasan] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    kategoriApi.getAll().then(d => setKategoris(d.data || [])).catch(() => { })
  }, [])

  useEffect(() => { fetchData() }, [page, filterKategori, searchItem, filterStatus])

  async function fetchData() {
    setLoading(true)
    try {
      const params = { page, per_page: 50 }
      if (filterStatus) params.filter_status = filterStatus
      if (filterKategori) params.kategori_id = filterKategori
      if (searchItem) params.search = searchItem

      const res = await prApi.getAll(params)
      const d = res.data
      setPrList(d.data || [])
      setTotal(d.total || 0)
      setTotalPages(d.pages || 1)
    } catch { }
    finally { setLoading(false) }
  }

  function fmt(n) {
    if (n == null || n === undefined) return '-'
    return Number(n).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
  }

  function StatusBadge({ pr }) {
    if (pr.status_ai === 'CANCELLED') {
      const cfg = STATUS_CONFIG.CANCELLED
      return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
    }
    if (pr.perlu_review) {
      return <span className={styles.badgeReview}>PERLU REVIEW</span>
    }
    const key = pr.budget_status === 'ON_PLAN' ? 'PLANNING' : (pr.budget_status || pr.status_ai)
    const cfg = STATUS_CONFIG[key] || { bg: '#f1f5f9', color: '#64748b', label: key }
    return <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
  }

  function openCancelModal(pr) {
    setCancelTarget(pr)
    setAlasan('')
    setCancelError('')
  }

  function closeCancelModal() {
    setCancelTarget(null)
    setAlasan('')
    setCancelError('')
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    if (!alasan.trim()) { setCancelError('Alasan pembatalan wajib diisi'); return }
    setCancelling(true)
    setCancelError('')
    try {
      const res = await prApi.cancelPr(cancelTarget.id, user?.id, alasan.trim())
      if (res.data?.success) {
        closeCancelModal()
        fetchData()
      } else {
        setCancelError(res.data?.message || 'Gagal membatalkan PR')
      }
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Gagal membatalkan PR')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Result Matching</h2>
      <p className={styles.subtitle}>
        Hasil klasifikasi PR: <strong>PLANNING</strong> / <strong>OVER BUDGET</strong> / <strong>OOP</strong>
      </p>

      {/* Filters */}
      <div className={styles.filters}>
        <input
          placeholder="Cari PR, deskripsi, komentar..."
          value={searchItem}
          onChange={e => { setSearchItem(e.target.value); setPage(1) }}
          className={styles.input}
        />
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className={styles.input}>
          <option value="">Semua Status</option>
          <option value="DONE">Selesai / Approved</option>
          <option value="PENDING">Perlu Review (Pending)</option>
          <option value="ON_PLAN">Planning</option>
          <option value="OVER_PLAN">Over Budget</option>
          <option value="OOP">Out of Plan</option>
          <option value="CANCELLED">Dibatalkan</option>
        </select>
        <select value={filterKategori} onChange={e => { setFilterKategori(e.target.value); setPage(1) }} className={styles.input}>
          <option value="">Semua Kategori</option>
          {kategoris.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
        </select>
        <span className={styles.totalLabel}>
          Total: <strong>{total}</strong>
        </span>
      </div>

      {/* Table */}
      {loading ? <p>Memuat...</p> : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  {['#', 'PR Doc', 'Description', 'Kategori', 'Supplier', 'Total Price', 'Metode', 'Status', 'Aksi'].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prList.length === 0 && (
                  <tr><td colSpan={9} className={styles.emptyState}>
                    Belum ada hasil matching. Upload PR terlebih dahulu.
                  </td></tr>
                )}
                {prList.map((pr, i) => (
                  <tr key={pr.id} className={`${styles.tr} ${pr.status_ai === 'CANCELLED' ? styles.trCancelled : ''}`}>
                    <td className={styles.td}>{(page - 1) * 50 + i + 1}</td>
                    <td className={`${styles.td} ${styles.tdCode}`}>
                      {pr.pr_doc_num || '-'}
                    </td>
                    <td className={`${styles.td} ${styles.tdDesc}`} title={pr.description}>
                      {pr.description || '-'}
                    </td>
                    <td className={styles.td}>{pr.kategori_kode || pr.kategori_id || '-'}</td>
                    <td className={styles.td}>{pr.supplier_name || '-'}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>{fmt(pr.total_price)}</td>
                    <td className={`${styles.td} ${styles.tdMethod}`}>{pr.metode_klasifikasi || '-'}</td>
                    <td className={styles.td}>
                      <StatusBadge pr={pr} />
                    </td>
                    <td className={styles.td}>
                      {pr.status_ai !== 'CANCELLED' &&
                        !['PARTIAL_RECEIVED', 'GOODS_RECEIVED', 'COMPLETED'].includes(pr.procurement_status) && (
                          <button
                            className={styles.btnCancel}
                            onClick={() => openCancelModal(pr)}
                            title="Batalkan PR ini"
                          >
                            Batalkan
                          </button>
                        )}
                      {pr.status_ai === 'CANCELLED' && (
                        <span className={styles.cancelledNote} title={pr.alasan_pembatalan}>
                          <XCircle size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                          Dibatalkan
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={styles.pgBtn}>Prev</button>
            <span className={styles.pgLabel}>Hal {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={styles.pgBtn}>Next</button>
          </div>
        </>
      )}

      {/* ── Modal Konfirmasi Pembatalan PR ── */}
      {cancelTarget && (
        <div className={styles.overlay} onClick={closeCancelModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              <AlertTriangle size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#e85d3a' }} />
              Batalkan PR
            </h3>
            <p className={styles.modalDesc}>
              Anda akan membatalkan PR berikut:
            </p>
            <div className={styles.modalPrInfo}>
              <strong>{cancelTarget.pr_doc_num}</strong><br />
              <span>{cancelTarget.description}</span>
            </div>
            <p className={styles.modalWarning}>
              Tindakan ini tidak dapat diurungkan. PR yang dibatalkan akan dilepaskan dari Planning Detail dan tidak akan mempengaruhi perhitungan budget.
            </p>
            <label className={styles.modalLabel}>Alasan Pembatalan *</label>
            <textarea
              className={styles.modalTextarea}
              rows={3}
              placeholder="Contoh: Kebutuhan tidak relevan, sudah ada item sejenis di plan lain..."
              value={alasan}
              onChange={e => { setAlasan(e.target.value); setCancelError('') }}
            />
            {cancelError && <p className={styles.modalError}>{cancelError}</p>}
            <div className={styles.modalActions}>
              <button
                className={styles.btnCancelConfirm}
                onClick={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Memproses...' : 'Ya, Batalkan PR'}
              </button>
              <button className={styles.btnModalClose} onClick={closeCancelModal} disabled={cancelling}>
                Tidak, Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
