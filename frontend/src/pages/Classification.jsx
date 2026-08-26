import { useState, useEffect, useCallback, useRef } from 'react'
import s from './Classification.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { kategoriApi } from '../api/kategoriApi'
import { useAuth } from '../context/AuthContext'
import ReviewModal from '../components/ReviewModal'
import { AlertTriangle, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const BADGE_CLS = {
  'E-1': s.badgeE1, 'E-9': s.badgeE9,
  'I-1': s.badgeI1, 'CAPEX': s.badgeCap,
}

const METHOD_CLS = {
  'RULE_BASE': s.methodRule,
  'REGEX': s.methodRule,
  'SVM': s.methodSvm,
  'MANUAL': s.methodRule,
}

const METHOD_LABEL = {
  'RULE_BASE': 'Rule Base',
  'REGEX': 'Regex',
  'SVM': 'SVM Model',
  'MANUAL': 'Manual',
}

const STATUS_DOT = {
  approved: s.dotApproved,
  pending: s.dotPending,
  rejected: s.dotRejected,
}

const STATUS_LABEL = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
}

const fmt = (n) =>
  n >= 1_000_000_000 ? `Rp ${(n / 1_000_000_000).toFixed(1)} M`
    : n >= 1_000_000 ? `Rp ${(n / 1_000_000).toFixed(1)} Jt`
      : n >= 1_000 ? `Rp ${(n / 1_000).toFixed(0)} Rb`
        : `Rp ${n}`

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getConfLevel(c) {
  if (c >= 0.85) return 'High'
  if (c >= 0.7) return 'Mid'
  return 'Low'
}

function getStatus(record) {
  if (record.perlu_review) return 'pending'
  if (record.kategori_kode) return 'approved'
  return 'pending'
}

const confFillCls = { High: s.confHigh, Mid: s.confMid, Low: s.confLow }

const CODES = ['ALL', 'E-1', 'E-9', 'I-1', 'CAPEX', 'UNKNOWN']
const METHODS = ['ALL', 'RULE_BASE', 'REGEX', 'SVM', 'MANUAL']

// ── Component ────────────────────────────────────────────────
export default function Classification() {
  const [search, setSearch] = useState('')
  const [codeFilter, setCodeFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [reviewRecord, setReviewRecord] = useState(null)

  // API data
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [serverTotal, setServerTotal] = useState(0)
  const [serverTotalPages, setServerTotalPages] = useState(1)

  // Summary metrics from dedicated API call (always from full dataset)
  const [summaryMetrics, setSummaryMetrics] = useState({
    total: 0, totalValue: 0, ruleCount: 0, svmCount: 0, unknownCount: 0
  })

  // Debounce search ref
  const searchTimer = useRef(null)

  useEffect(() => {
    fetchCategories()
    fetchSummaryMetrics()
  }, [])

  // Re-fetch when any filter, page, or perPage changes
  useEffect(() => {
    fetchData()
  }, [codeFilter, methodFilter, page, perPage])

  // Debounce search input
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchData()
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  async function fetchCategories() {
    try {
      const res = await kategoriApi.getAll()
      if (res.success) setCategories(res.data)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  // Fetch summary from full dataset (no filters) for the metric cards at top
  async function fetchSummaryMetrics() {
    try {
      const res = await prPoDataApi.getAll({ status_ai: 'DONE', per_page: 1, page: 1 })
      if (res.success) {
        setSummaryMetrics(prev => ({ ...prev, total: res.total || 0 }))
      }
    } catch (err) { /* silent */ }
  }

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const params = {
        status_ai: 'DONE',
        per_page: perPage,
        page,
      }
      if (search.trim()) params.search = search.trim()
      if (codeFilter !== 'ALL') params.kategori_kode = codeFilter
      if (methodFilter !== 'ALL') params.metode = methodFilter

      const res = await prPoDataApi.getAll(params)

      if (res.success) {
        setData(res.data || [])
        setServerTotal(res.total || 0)
        setServerTotalPages(res.total_pages || 1)
      } else {
        setError(res.message || 'Gagal memuat data')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data klasifikasi')
    } finally {
      setLoading(false)
    }
  }

  function handleCodeFilter(code) {
    setCodeFilter(prev => prev === code ? 'ALL' : code)
    setPage(1)
  }

  function handleMethodFilter(m) {
    setMethodFilter(prev => prev === m ? 'ALL' : m)
    setPage(1)
  }

  if (error) {
    return (
      <div className={s.page}>
        <div className={s.header}>
          <h1>Hasil Klasifikasi</h1>
          <p>Riwayat hasil prediksi budget code dari file PR/PO</p>
        </div>
        <div style={{ textAlign: 'center', padding: 60, color: '#e85d3a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-secondary" style={{ marginTop: 12 }} onClick={fetchData}>
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1>Hasil Klasifikasi</h1>
        <p>Riwayat hasil prediksi budget code dari file PR/PO</p>
      </div>

      <div className={s.metricStrip}>
        <div className={s.metricBox}>
          <div className={s.metricLabel}>Total item</div>
          <div className={s.metricValue}>{serverTotal}</div>
        </div>
        <div className={s.metricBox}>
          <div className={s.metricLabel}>Halaman</div>
          <div className={s.metricValue}>{page} / {serverTotalPages}</div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <div className={s.searchWrap}>
            <span className={s.searchIcon}>
              <Search size={14} />
            </span>
            <input
              className={s.searchInput}
              placeholder="Cari PR DocNum, deskripsi..."
              value={search}
              onChange={e => { setSearch(e.target.value) }}
            />
          </div>

          {CODES.map(code => (
            <button
              key={code}
              className={`${s.filterBtn} ${codeFilter === code && code !== 'ALL' ? s.filterActive : ''}`}
              onClick={() => handleCodeFilter(code)}
            >
              {code === 'ALL' ? 'Semua kode' : code}
            </button>
          ))}
        </div>
        <div className={s.toolbarRight}>
          {METHODS.filter(m => m !== 'ALL').map(m => (
            <button
              key={m}
              className={`${s.filterBtn} ${methodFilter === m ? s.filterActive : ''}`}
              onClick={() => handleMethodFilter(m)}
            >
              {METHOD_LABEL[m] || m}
            </button>
          ))}
        </div>
      </div>

      <div className={s.tableCard}>
        <div className={s.tableHeader}>
          <span className={s.tableTitle}>DATA KLASIFIKASI</span>
          <span className={s.tableCount}>{serverTotal} item</span>
        </div>

        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>PR DocNum</th>
                <th>Deskripsi</th>
                <th>Komentar</th>
                <th className={s.cellRight}>Total</th>
                <th className={s.cellCenter}>Kode</th>
                <th className={s.cellCenter}>Method</th>
                <th>Confidence</th>
                <th className={s.cellCenter}>Status</th>
                <th>Tanggal</th>
                {user?.role === 'admin' && <th className={s.cellCenter}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#73726c' }}>
                    <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#73726c' }}>Tidak ada data ditemukan</td></tr>
              ) : data.map((r, i) => {
                const total = r.total_price || ((r.unit_price || 0) * (r.qty || 1))
                const confidence = r.perlu_review ? 0 : (r.confidence_score || 0)
                const level = getConfLevel(confidence)
                const status = getStatus(r)
                const budgetCode = r.perlu_review ? 'UNKNOWN' : (r.kategori_kode || 'UNKNOWN')
                const method = r.metode_klasifikasi || '—'

                return (
                  <tr key={r.id || i}>
                    <td style={{ color: '#73726c' }}>{(page - 1) * perPage + i + 1}</td>
                    <td className={s.cellMono}>{r.pr_doc_num || '—'}</td>
                    <td className={s.cellTruncate} title={r.description}>{r.description || '—'}</td>
                    <td className={s.cellTruncate} title={r.comment_text}>{r.comment_text || '—'}</td>
                    <td className={s.cellRight}>{fmt(total)}</td>
                    <td className={s.cellCenter}>
                      <span className={`${s.badge} ${BADGE_CLS[budgetCode] || s.badgeUnk}`}>
                        {budgetCode}
                      </span>
                    </td>
                    <td className={s.cellCenter}>
                      <span className={`${s.methodTag} ${METHOD_CLS[method] || ''}`}>
                        {METHOD_LABEL[method] || method}
                      </span>
                    </td>
                    <td>
                      <div className={s.confBar}>
                        <div className={s.confTrack}>
                          <div
                            className={`${s.confFill} ${confFillCls[level]}`}
                            style={{ width: `${Math.round(confidence * 100)}%` }}
                          />
                        </div>
                        <span className={s.confText}>{confidence > 0 ? `${Math.round(confidence * 100)}%` : '—'}</span>
                      </div>
                    </td>
                    <td className={s.cellCenter}>
                      <span className={s.statusDot}>
                        <span className={`${s.dot} ${STATUS_DOT[status]}`} />
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className={s.dateText}>{fmtDate(r.created_at)}</td>
                    {user?.role === 'admin' && (
                      <td className={s.cellCenter}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setReviewRecord(r)}
                        >
                          {status === 'pending' ? 'Review' : 'Koreksi'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={s.pagination}>
          <div className={s.perPageWrap}>
            <span className={s.perPageLabel}>Tampilkan:</span>
            <select
              className={s.perPageSelect}
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
            >
              <option value={10}>10 item</option>
              <option value={25}>25 item</option>
              <option value={50}>50 item</option>
              <option value={100}>100 item</option>
            </select>
            <span className={s.totalInfo}>dari {serverTotal} data</span>
          </div>

          <div className={s.paginationRow}>
            <button
              className={s.pageBtn}
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={13} style={{ display: 'inline', marginRight: 2, verticalAlign: 'middle' }} />
              Prev
            </button>
            {Array.from({ length: Math.min(serverTotalPages, 7) }, (_, i) => (
              <button
                key={i + 1}
                className={`${s.pageBtn} ${page === i + 1 ? s.pageBtnActive : ''}`}
                onClick={() => setPage(i + 1)}
                disabled={loading}
              >
                {i + 1}
              </button>
            ))}
            {serverTotalPages > 7 && <span style={{ padding: '0 8px', color: 'var(--text-muted)' }}>... {serverTotalPages}</span>}
            <button
              className={s.pageBtn}
              disabled={page >= serverTotalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight size={13} style={{ display: 'inline', marginLeft: 2, verticalAlign: 'middle' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewRecord && (
        <ReviewModal
          record={reviewRecord}
          categories={categories}
          onClose={() => setReviewRecord(null)}
          onSuccess={(updatedRecord) => {
            setReviewRecord(null)
            // Refresh data dari server setelah review berhasil
            fetchData()
          }}
        />
      )}
    </div>
  )
}
