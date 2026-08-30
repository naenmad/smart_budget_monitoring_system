import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { prApi } from '../api/prApi'
import { mappingApi } from '../api/mappingApi'
import { kategoriApi } from '../api/kategoriApi'
import { useAuth } from '../context/AuthContext'
import { 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  Search, 
  Check, 
  Loader2, 
  X, 
  Database, 
  RotateCcw, 
  CheckCircle2, 
  Sliders
} from 'lucide-react'
import styles from './PrResult.module.css'

const STATUS_CONFIG = {
  PLANNING: { bg: '#dcfce7', color: '#166534', label: 'PLANNING' },
  ON_PLAN: { bg: '#dcfce7', color: '#166534', label: 'PLANNING' },
  OVER_PLAN: { bg: '#fef9c3', color: '#854d0e', label: 'OVER BUDGET' },
  OOP: { bg: '#fee2e2', color: '#991b1b', label: 'OOP' },
  NEED_MAPPING: { bg: '#fef3c7', color: '#92400e', label: 'PERLU REVIEW' },
  CANCELLED: { bg: '#f1f5f9', color: '#64748b', label: 'DIBATALKAN' },
}

export default function PrResult() {
  const { user } = useAuth()
  const [prList, setPrList] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [kategoris, setKategoris] = useState([])

  // Filters
  const [filterKategori, setFilterKategori] = useState('')
  const [searchItem, setSearchItem] = useState('')
  const [filterStatus, setFilterStatus] = useState('DONE')

  // Edit status modal state
  const [editTarget, setEditTarget] = useState(null)
  const [statusType, setStatusType] = useState('PLANNING')
  const [selectedPlanDetail, setSelectedPlanDetail] = useState(null)
  const [planSearchTerm, setPlanSearchTerm] = useState('')
  const [planSearchResults, setPlanSearchResults] = useState([])
  const [planSearchLoading, setPlanSearchLoading] = useState(false)
  const [editAlasan, setEditAlasan] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [editError, setEditError] = useState('')

  // Cancel modal state (quick cancel)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [alasan, setAlasan] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    kategoriApi.getAll().then(d => setKategoris(d.data || [])).catch(() => { })
  }, [])

  useEffect(() => { 
    fetchData() 
  }, [page, perPage, filterKategori, searchItem, filterStatus])

  async function fetchData() {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (filterStatus) params.filter_status = filterStatus
      if (filterKategori) params.kategori_id = filterKategori
      if (searchItem) params.search = searchItem

      const res = await prApi.getAll(params)
      const d = res.data
      setPrList(d.data || [])
      setTotal(d.total || 0)
      setTotalPages(d.pages || 1)
    } catch (err) {
      console.error(err)
    } finally { 
      setLoading(false) 
    }
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

  // ── Open Edit Status Modal ──
  function openEditModal(pr) {
    setEditTarget(pr)
    setEditError('')
    setPlanSearchTerm('')
    setPlanSearchResults([])
    setEditAlasan(pr.alasan_pembatalan || '')

    if (pr.status_ai === 'CANCELLED') {
      setStatusType('RESTORE')
      setSelectedPlanDetail(null)
    } else if (pr.budget_status === 'OOP') {
      setStatusType('OOP')
      setSelectedPlanDetail(null)
    } else if (pr.perlu_review || pr.status_ai === 'NEED_MAPPING') {
      setStatusType('NEED_MAPPING')
      setSelectedPlanDetail(null)
    } else {
      setStatusType('PLANNING')
      if (pr.planning_detail_id) {
        setSelectedPlanDetail({
          id: pr.planning_detail_id,
          item: pr.planning_item || pr.planning_detail?.item || 'Item Anggaran Terpilih',
          month: pr.planning_detail?.month || '',
          planning_amount: pr.planning_detail?.planning_amount || 0,
          remarks: pr.planning_detail?.remarks || ''
        })
      } else {
        setSelectedPlanDetail(null)
      }
    }
  }

  function closeEditModal() {
    setEditTarget(null)
    setEditError('')
    setSelectedPlanDetail(null)
    setPlanSearchTerm('')
    setPlanSearchResults([])
  }

  async function handleSearchPlanning(term) {
    setPlanSearchTerm(term)
    if (term.length < 2) {
      setPlanSearchResults([])
      return
    }
    setPlanSearchLoading(true)
    try {
      const res = await mappingApi.searchPlanningDetail(editTarget.id, term)
      setPlanSearchResults(res.data?.data || [])
    } catch (err) {
      console.error('Gagal cari planning:', err)
    } finally {
      setPlanSearchLoading(false)
    }
  }

  async function handleSaveStatus() {
    if (!editTarget) return
    setEditError('')

    if (statusType === 'PLANNING' && !selectedPlanDetail?.id) {
      setEditError('Pilih salah satu item Planning terlebih dahulu.')
      return
    }

    if (statusType === 'CANCELLED' && !editAlasan.trim()) {
      setEditError('Alasan pembatalan wajib diisi.')
      return
    }

    setSavingStatus(true)
    try {
      const payload = {
        user_id: user?.id || 1,
        status_type: statusType,
        planning_detail_id: statusType === 'PLANNING' ? selectedPlanDetail.id : null,
        alasan: statusType === 'CANCELLED' ? editAlasan.trim() : null
      }

      const res = await prApi.editStatus(editTarget.id, payload)
      if (res.data?.success) {
        toast.success(res.data.message || 'Status PR berhasil diperbarui!')
        closeEditModal()
        fetchData()
      } else {
        setEditError(res.data?.message || 'Gagal memperbarui status')
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Gagal memperbarui status PR')
    } finally {
      setSavingStatus(false)
    }
  }

  // ── Quick Cancel Modal handlers ──
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
        toast.success('PR berhasil dibatalkan')
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
        Hasil klasifikasi dan monitoring anggaran PR: <strong>PLANNING</strong> / <strong>OVER BUDGET</strong> / <strong>OOP</strong>
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
                    <td className={styles.td}>{(page - 1) * perPage + i + 1}</td>
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
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.btnEditStatus}
                          onClick={() => openEditModal(pr)}
                          title="Koreksi / Edit Status PR ini"
                        >
                          <Edit3 size={12} /> Edit Status
                        </button>

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
                      </div>
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

      {/* ── Modal Edit / Koreksi Status PR ── */}
      {editTarget && (
        <div className={styles.overlay} onClick={closeEditModal}>
          <div className={`${styles.modal} ${styles.modalLarge}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeaderRow}>
              <h3 className={styles.modalTitle}>
                <Sliders size={18} color="var(--primary)" />
                Koreksi & Edit Status PR
              </h3>
              <button className={styles.modalCloseBtn} onClick={closeEditModal} title="Tutup Modal">
                <X size={18} />
              </button>
            </div>

            <p className={styles.modalDesc}>
              Perbarui status penyerapan anggaran atau hubungkan PR ke item planning yang benar.
            </p>

            {/* Target PR Summary Info */}
            <div className={styles.modalPrInfo}>
              <div className={styles.modalPrHeaderLine}>
                <span className={styles.modalPrDoc}>{editTarget.pr_doc_num || '-'}</span>
                <StatusBadge pr={editTarget} />
              </div>
              <div style={{ fontWeight: 600 }}>{editTarget.description}</div>
              <div className={styles.modalPrMeta}>
                <span>Kategori: <strong>{editTarget.kategori_kode || 'Tanpa Kategori'}</strong></span>
                <span>Total: <strong>{fmt(editTarget.total_price)}</strong></span>
                {editTarget.supplier_name && <span>Vendor: {editTarget.supplier_name}</span>}
              </div>
            </div>

            <label className={styles.modalLabel}>Pilih Status Baru:</label>

            {/* Status Option Cards */}
            <div className={styles.statusOptionGrid}>
              {/* Option 1: PLANNING */}
              <div 
                className={`${styles.statusCard} ${statusType === 'PLANNING' ? styles.statusCardActive : ''}`}
                onClick={() => setStatusType('PLANNING')}
              >
                <input 
                  type="radio" 
                  name="statusOption" 
                  checked={statusType === 'PLANNING'} 
                  onChange={() => setStatusType('PLANNING')}
                  className={styles.statusRadio} 
                />
                <div className={styles.statusCardContent}>
                  <div className={styles.statusCardTitleRow}>
                    <span className={styles.statusCardTitle}>Planning (Sesuai Rencana Anggaran)</span>
                    <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>PLANNING</span>
                  </div>
                  <div className={styles.statusCardDesc}>
                    Tautkan pengadaan ini ke salah satu item di Master Planning Budget tahunan.
                  </div>
                </div>
              </div>

              {/* Option 2: OOP */}
              <div 
                className={`${styles.statusCard} ${statusType === 'OOP' ? styles.statusCardActive : ''}`}
                onClick={() => setStatusType('OOP')}
              >
                <input 
                  type="radio" 
                  name="statusOption" 
                  checked={statusType === 'OOP'} 
                  onChange={() => setStatusType('OOP')}
                  className={styles.statusRadio} 
                />
                <div className={styles.statusCardContent}>
                  <div className={styles.statusCardTitleRow}>
                    <span className={styles.statusCardTitle}>OOP (Out of Plan / Belanja Tambahan)</span>
                    <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>OOP</span>
                  </div>
                  <div className={styles.statusCardDesc}>
                    Pengadaan darurat atau tidak tercatat pada rencana anggaran awal departemen.
                  </div>
                </div>
              </div>

              {/* Option 3: NEED_MAPPING */}
              <div 
                className={`${styles.statusCard} ${statusType === 'NEED_MAPPING' ? styles.statusCardActive : ''}`}
                onClick={() => setStatusType('NEED_MAPPING')}
              >
                <input 
                  type="radio" 
                  name="statusOption" 
                  checked={statusType === 'NEED_MAPPING'} 
                  onChange={() => setStatusType('NEED_MAPPING')}
                  className={styles.statusRadio} 
                />
                <div className={styles.statusCardContent}>
                  <div className={styles.statusCardTitleRow}>
                    <span className={styles.statusCardTitle}>Kembalikan ke Review Mapping</span>
                    <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>NEED REVIEW</span>
                  </div>
                  <div className={styles.statusCardDesc}>
                    Kirim kembali item ke antrean Review Mapping agar dapat dicocokkan ulang oleh AI.
                  </div>
                </div>
              </div>

              {/* Option 4: RESTORE (If cancelled) or CANCELLED */}
              {editTarget.status_ai === 'CANCELLED' ? (
                <div 
                  className={`${styles.statusCard} ${statusType === 'RESTORE' ? styles.statusCardActive : ''}`}
                  onClick={() => setStatusType('RESTORE')}
                >
                  <input 
                    type="radio" 
                    name="statusOption" 
                    checked={statusType === 'RESTORE'} 
                    onChange={() => setStatusType('RESTORE')}
                    className={styles.statusRadio} 
                  />
                  <div className={styles.statusCardContent}>
                    <div className={styles.statusCardTitleRow}>
                      <span className={styles.statusCardTitle}>Pulihkan / Aktifkan Kembali PR</span>
                      <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>RESTORE</span>
                    </div>
                    <div className={styles.statusCardDesc}>
                      Batalkan status pembatalan dan aktifkan kembali pengadaan ke dalam sistem.
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className={`${styles.statusCard} ${statusType === 'CANCELLED' ? styles.statusCardActive : ''}`}
                  onClick={() => setStatusType('CANCELLED')}
                >
                  <input 
                    type="radio" 
                    name="statusOption" 
                    checked={statusType === 'CANCELLED'} 
                    onChange={() => setStatusType('CANCELLED')}
                    className={styles.statusRadio} 
                  />
                  <div className={styles.statusCardContent}>
                    <div className={styles.statusCardTitleRow}>
                      <span className={styles.statusCardTitle}>Batalkan PR</span>
                      <span style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>CANCELLED</span>
                    </div>
                    <div className={styles.statusCardDesc}>
                      Batalkan pengadaan dan lepaskan dari seluruh alokasi anggaran.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Planning Item Picker (Displayed when PLANNING is selected) */}
            {statusType === 'PLANNING' && (
              <div className={styles.planningPickerSection}>
                <label className={styles.modalLabel}>Item Planning Terpilih:</label>
                {selectedPlanDetail ? (
                  <div className={styles.selectedPlanningCard}>
                    <div className={styles.selectedPlanningInfo}>
                      <span className={styles.selectedPlanningName}>{selectedPlanDetail.item}</span>
                      <span className={styles.selectedPlanningMeta}>
                        Bulan: {selectedPlanDetail.month || '-'} &middot; Pagu: {fmt(selectedPlanDetail.planning_amount)}
                        {selectedPlanDetail.remarks ? ` · ${selectedPlanDetail.remarks}` : ''}
                      </span>
                    </div>
                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                      <Check size={14} /> Terpilih
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize: 12.5, color: '#e11d48', margin: '0 0 10px' }}>
                    Belum ada item planning yang dipilih. Cari dan pilih dari database di bawah.
                  </p>
                )}

                <div className={styles.planningSearchWrap}>
                  <input
                    type="text"
                    placeholder="Cari nama item anggaran atau remarks (min. 2 huruf)..."
                    value={planSearchTerm}
                    onChange={e => handleSearchPlanning(e.target.value)}
                    className={styles.planningSearchInput}
                  />
                  <Search size={14} className={styles.planningSearchIcon} />
                </div>

                {planSearchLoading && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Loader2 size={13} className="animate-spin" /> Mencari di master budget...
                  </div>
                )}

                {!planSearchLoading && planSearchResults.length > 0 && (
                  <div className={styles.planningResultList}>
                    {planSearchResults.map(item => (
                      <div key={item.id} className={styles.planningResultItem}>
                        <div>
                          <span className={styles.planningResultName}>{item.item}</span>
                          <span className={styles.planningResultMeta}>
                            {item.month} &middot; {fmt(item.planning_amount)} &middot; {item.kategori_kode || ''}
                            {item.remarks ? ` · ${item.remarks}` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.btnPickPlanning}
                          onClick={() => {
                            setSelectedPlanDetail(item)
                            setPlanSearchResults([])
                            setPlanSearchTerm('')
                          }}
                        >
                          Pilih
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cancellation Reason (Displayed when CANCELLED is selected) */}
            {statusType === 'CANCELLED' && (
              <div style={{ marginBottom: 14 }}>
                <label className={styles.modalLabel}>Alasan Pembatalan *</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  placeholder="Masukkan alasan pembatalan PR..."
                  value={editAlasan}
                  onChange={e => setEditAlasan(e.target.value)}
                />
              </div>
            )}

            {editError && <p className={styles.modalError}>{editError}</p>}

            <div className={styles.modalActions}>
              <button 
                className={styles.btnSubmit}
                onClick={handleSaveStatus}
                disabled={savingStatus}
              >
                {savingStatus ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    Simpan Perubahan
                  </>
                )}
              </button>
              <button 
                className={styles.btnModalClose} 
                onClick={closeEditModal}
                disabled={savingStatus}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Pembatalan PR Cepat ── */}
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

