import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { planningApi } from '../api/planningApi'
import s from './PlanningList.module.css'
import { formatRp } from '../utils/format'
import { Calendar, X, ChevronUp, ChevronDown } from 'lucide-react'

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
  const queryClient = useQueryClient()

  const [periode, setPeriode] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [details, setDetails] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

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
    fetchDetails(id)
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm(
      'Apakah Anda yakin ingin menghapus Planning ini?\n' +
      'Semua PR yang mengacu pada Planning ini akan dikembalikan ke status WAITING dan budget monitoring-nya direset.'
    )) return
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
    if (!confirm('Batalkan item Planning ini?')) return
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
            onChange={e => setFilterMonth(e.target.value)}
            className={s.input}
            style={{ width: 150 }}
          >
            <option value="">Semua Bulan</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
                              {(details[h.id] || [])
                                .filter(d => {
                                  if (!search) return true;
                                  const q = search.toLowerCase();
                                  return (
                                    (d.item || '').toLowerCase().includes(q) ||
                                    (d.kategori_kode || '').toLowerCase().includes(q) ||
                                    (d.kategori_nama || '').toLowerCase().includes(q) ||
                                    (d.kategori_tipe_formulir || '').toLowerCase().includes(q)
                                  );
                                })
                                .length === 0
                                ? (
                                  <tr className={s.emptyRow}>
                                    <td colSpan={7}>
                                      Tidak ada detail{filterMonth ? ` untuk bulan ${filterMonth}` : ''}{search ? ' yang cocok dengan pencarian' : ''}
                                    </td>
                                  </tr>
                                )
                                : (details[h.id] || [])
                                  .filter(d => {
                                    if (!search) return true;
                                    const q = search.toLowerCase();
                                    return (
                                      (d.item || '').toLowerCase().includes(q) ||
                                      (d.kategori_kode || '').toLowerCase().includes(q) ||
                                      (d.kategori_nama || '').toLowerCase().includes(q) ||
                                      (d.kategori_tipe_formulir || '').toLowerCase().includes(q)
                                    );
                                  })
                                  .map(d => (
                                    <tr key={d.id}>
                                      <td>{d.month}</td>
                                      <td className={s.muted}>
                                        <strong>{d.kategori_kode || d.kategori_id || '-'}</strong>
                                        {d.kategori_nama && <div>{d.kategori_nama}</div>}
                                        {d.kategori_tipe_formulir && <div style={{ fontSize: '0.8em', color: '#888' }}>({d.kategori_tipe_formulir})</div>}
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
                              }
                            </tbody>
                          </table>
                        </div>
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
