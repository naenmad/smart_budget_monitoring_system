import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { planningApi } from '../api/planningApi'
import s from './PlanningList.module.css'
import { formatRp } from '../utils/format'
import { Calendar, X, ChevronUp, ChevronDown, ArrowUpDown, Search } from 'lucide-react'
import TablePagination from '../components/common/TablePagination'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Badge status upload header (ACTIVE, FAILED, dsb.)
function StatusHeaderBadge({ status }) {
  const cls = {
    ACTIVE: s.statusActive,
    SUCCES: s.statusSuccess,
    UPLOADING: s.statusUploading,
    FAILED: s.statusFailed,
  }[status] || s.statusDefault
  return <span className={cls}>{status}</span>
}

// Badge status_realisasi per baris planning_detail
function RealisasiBadge({ status }) {
  const cfg = {
    OPEN: { cls: s.badgeOpen, label: 'OPEN' },
    PROSES: { cls: s.badgeProses, label: 'PROSES' },
    CLOSED: { cls: s.badgeClosed, label: 'CLOSED' },
    CANCELLED: { cls: s.badgeCancelled, label: 'CANCELLED' },
  }[status] || { cls: s.badgeOpen, label: 'OPEN' }
  return <span className={cfg.cls}>{cfg.label}</span>
}

export default function PlanningList() {
  const confirm = useConfirm()
  const queryClient = useQueryClient()

  const [periode, setPeriode] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [details, setDetails] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPerPage, setDetailPerPage] = useState(20)
  const [detailSortOrder, setDetailSortOrder] = useState('asc')

  // Fetch Headers Query
  const { data: headersData, isLoading: loading } = useQuery({
    queryKey: ['planningHeaders', periode],
    queryFn: async () => {
      const params = {}
      if (periode) params.periode = periode
      const res = await planningApi.getAll(params)
      return res.data?.data || []
    }
  })

  const headers = headersData || []

  // Saat filter bulan berubah: clear cache & re-fetch panel yang sedang terbuka
  useEffect(() => {
    setDetails({})
    if (expanded !== null) fetchDetails(expanded)
  }, [filterMonth])

  async function fetchDetails(id) {
    setDetailLoading(true)
    try {
      const params = {}
      if (filterMonth) params.month = filterMonth
      const res = await planningApi.getDetails(id, params)
      setDetails(prev => ({ ...prev, [id]: res.data?.data || [] }))
    } catch { }
    finally { setDetailLoading(false) }
  }

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    setDetailPage(1)
    fetchDetails(id)
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Hapus Planning',
      message: 'Apakah Anda yakin ingin menghapus Planning ini? Semua PR yang mengacu pada Planning ini akan dikembalikan ke status WAITING dan budget monitoring-nya direset.',
      confirmText: 'Hapus Planning',
      cancelText: 'Batal',
      type: 'danger'
    })
    if (!ok) return
    try {
      const res = await planningApi.delete(id)
      if (res.data?.success) {
        toast.success('Planning berhasil dihapus')
        queryClient.invalidateQueries({ queryKey: ['planningHeaders'] })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus planning')
    }
  }
  async function handleCancelDetail(headerId, detailId) {
    const ok = await confirm({
      title: 'Batalkan Item Planning',
      message: 'Batalkan item Planning ini?',
      confirmText: 'Batalkan Item',
      cancelText: 'Batal',
      type: 'warning'
    })
    if (!ok) return
    try {
      const res = await planningApi.cancelPlanningDetail(detailId)
      if (res.data?.success) {
        toast.success('Item Planning berhasil dibatalkan')
        fetchDetails(headerId)  // refresh panel yang lagi terbuka
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan item Planning')
    }
  }

  return (
    <div className={s.page}>
      {/* ── Top bar ── */}
      <div className={s.topBar}>
        <h2>Planning List</h2>
        <div className={s.controls}>
          <input
            placeholder="Cari item, kode, nama..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.input}
            style={{ width: 220 }}
          />
          <input
            placeholder="Filter Periode (cth: 2026)"
            value={periode}
            onChange={e => setPeriode(e.target.value)}
            className={s.input}
            style={{ width: 180 }}
          />
          <select
            value={filterMonth}
            onChange={e => { setFilterMonth(e.target.value); setDetailPage(1); }}
            className={s.input}
            style={{ width: 150 }}
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={detailSortOrder}
            onChange={e => { setDetailSortOrder(e.target.value); setDetailPage(1); }}
            className={s.input}
            title="Urutan Bulan"
          >
            <option value="asc">Bulan: Awal → Akhir (Jan-Dec)</option>
            <option value="desc">Bulan: Akhir → Awal (Dec-Jan)</option>
          </select>
          {(search || periode || filterMonth) && (
            <button
              onClick={() => {
                setSearch('')
                setPeriode('')
                setFilterMonth('')
                setDetailPage(1)
              }}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className={s.contentWrapper}>
        {/* ── Filter chip ── */}
        {filterMonth && (
          <div className={s.filterChip}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} />
              <span>Filter aktif: bulan <strong>{filterMonth}</strong></span>
            </span>
            <button onClick={() => setFilterMonth('')} className={s.filterChipClear} aria-label="Hapus filter">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Card list ── */}
        {loading ? <p>Memuat...</p> : (
          <div className={s.list}>
            {headers.length === 0 && (
              <p style={{ color: '#888', textAlign: 'center' }}>Belum ada data planning</p>
            )}

            {headers.map(h => (
              <div key={h.id} className={s.card}>
                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(h.id)}
                  className={`${s.cardHeader} ${expanded === h.id ? s.expanded : ''}`}
                >
                  <div className={s.cardHeaderLeft}>
                    <span className={s.cardId}>#{h.id}</span>
                    <span className={s.cardPeriode}>Periode: <strong>{h.periode}</strong></span>
                    <span className={s.cardFilename}>{h.filename}</span>
                  </div>
                  <div className={s.cardActions}>
                    <StatusHeaderBadge status={h.status} />
                    <button
                      onClick={e => handleDelete(e, h.id)}
                      className={s.deleteBtn}
                      title="Hapus Planning"
                    >
                      Hapus
                    </button>
                    <span className={s.chevron}>
                      {expanded === h.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </div>
                </div>

                {/* Detail Panel */}
                {expanded === h.id && (
                  <div className={s.detailPanel}>
                    {detailLoading && !details[h.id] ? <p>Memuat detail...</p> : (
                      <>
                        {filterMonth && (
                          <p className={s.detailNote}>
                            Menampilkan detail bulan <strong>{filterMonth}</strong> — {(details[h.id] || []).length} item ditemukan
                          </p>
                        )}
                        <div className={s.tableWrapper}>
                          <table className={s.table}>
                            <thead>
                              <tr>
                                {['Bulan', 'Kategori', 'Item', 'Planning Amount', 'Remarks', 'Status Realisasi', 'Aksi'].map(c => (
                                  <th key={c}>{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const rawList = (details[h.id] || []).filter(d => {
                                  if (!search) return true
                                  const q = search.toLowerCase()
                                  return (
                                    (d.item || '').toLowerCase().includes(q) ||
                                    (d.kategori_kode || '').toLowerCase().includes(q) ||
                                    (d.kategori_nama || '').toLowerCase().includes(q) ||
                                    (d.kategori_tipe_formulir || '').toLowerCase().includes(q)
                                  )
                                })

                                const sortedList = [...rawList].sort((a, b) => {
                                  const idxA = MONTHS.indexOf(a.month)
                                  const idxB = MONTHS.indexOf(b.month)
                                  if (detailSortOrder === 'desc') return idxB - idxA
                                  return idxA - idxB
                                })

                                const totalDetails = sortedList.length
                                const totalDetailPages = Math.ceil(totalDetails / detailPerPage) || 1
                                const paginatedList = sortedList.slice(
                                  (detailPage - 1) * detailPerPage,
                                  detailPage * detailPerPage
                                )

                                if (sortedList.length === 0) {
                                  return (
                                    <tr className={s.emptyRow}>
                                      <td colSpan={7}>
                                        Tidak ada detail{filterMonth ? ` untuk bulan ${filterMonth}` : ''}{search ? ' yang cocok dengan pencarian' : ''}
                                      </td>
                                    </tr>
                                  )
                                }

                                return paginatedList.map(d => (
                                  <tr key={d.id}>
                                    <td>{d.month}</td>
                                    <td className={s.muted}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ 
                                          background: d.kategori_tipe_formulir === 'CAPEX' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)', 
                                          color: d.kategori_tipe_formulir === 'CAPEX' ? 'var(--primary)' : 'var(--success)', 
                                          borderRadius: 4, 
                                          padding: '2px 6px', 
                                          fontSize: '11px', 
                                          fontWeight: 700 
                                        }}>
                                          {d.kategori_kode || d.kategori_id || '-'}
                                        </span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>{d.kategori_nama || ''}</span>
                                      </div>
                                    </td>
                                    <td>{d.item}</td>
                                    <td className={s.right}>
                                      {formatRp(d.planning_amount)}
                                    </td>
                                    <td className={s.muted}>{d.remarks || '-'}</td>
                                    <td>
                                      <RealisasiBadge status={d.status_realisasi} />
                                    </td>
                                    <td>
                                      {d.status_realisasi === 'OPEN' && (
                                        <button
                                          onClick={() => handleCancelDetail(h.id, d.id)}
                                          className={s.deleteBtn}
                                          title="Batalkan item Planning"
                                        >
                                          Batalkan
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Standardized Table Pagination for Details */}
                        {(() => {
                          const rawList = (details[h.id] || []).filter(d => {
                            if (!search) return true
                            const q = search.toLowerCase()
                            return (
                              (d.item || '').toLowerCase().includes(q) ||
                              (d.kategori_kode || '').toLowerCase().includes(q) ||
                              (d.kategori_nama || '').toLowerCase().includes(q) ||
                              (d.kategori_tipe_formulir || '').toLowerCase().includes(q)
                            )
                          })
                          const totalDetails = rawList.length
                          const totalDetailPages = Math.ceil(totalDetails / detailPerPage) || 1

                          if (totalDetails === 0) return null
                          return (
                            <TablePagination
                              page={detailPage}
                              totalPages={totalDetailPages}
                              total={totalDetails}
                              perPage={detailPerPage}
                              onPageChange={setDetailPage}
                              onPerPageChange={(newSize) => {
                                setDetailPerPage(newSize)
                                setDetailPage(1)
                              }}
                              itemName="item planning"
                              loading={detailLoading}
                            />
                          )
                        })()}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
