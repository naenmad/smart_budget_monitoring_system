import { useState, useEffect, useMemo, useCallback } from 'react'
import { AlertTriangle, Search, RefreshCw, Loader2, TrendingUp, BarChart2, Calendar, Tag } from 'lucide-react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './OutOfPlan.module.css'

const ACCOUNT_NAMES = {
  '50032902': 'SUPPLIES EXPENSES',
  '60290100': 'MARKETING EXPENSES',
  '60290600': 'TRANSPORTATION OVERSEA',
}

const ACCOUNT_COLORS = {
  '50032902': '#2563eb',
  '60290100': '#16a34a',
  '60290600': '#7c3aed',
}

const MONTH_NAMES = {
  1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 6: 'Jun',
  7: 'Jul', 8: 'Agu', 9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des',
}

const COST_CENTER_COLORS = {
  '123200': { bg: 'rgba(37,99,235,0.1)', color: '#2563eb' },
  '123000': { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
}

function getCcStyle(cc) {
  return COST_CENTER_COLORS[cc] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' }
}

export default function OutOfPlan() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState({
    total_nominal: 0,
    total_count: 0,
    monthly_stats: {},
    account_stats: {},
    data: [],
  })
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [selectedAccount, setSelectedAccount] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getOutOfBudget({ periode })
      if (res.data) {
        setRawData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch OOP data:', err)
    } finally {
      setLoading(false)
    }
  }, [periode])

  useEffect(() => {
    fetchData()
    setSelectedMonth(0)
    setSelectedAccount('ALL')
    setSearch('')
  }, [fetchData])

  const allRows = rawData.data || []

  const activeMonths = useMemo(() => {
    const monthSet = new Set(allRows.map((r) => r.bulan).filter(Boolean))
    return Array.from(monthSet).sort((a, b) => a - b)
  }, [allRows])

  const filteredRows = useMemo(() => {
    let rows = allRows
    if (selectedMonth !== 0) rows = rows.filter((r) => r.bulan === selectedMonth)
    if (selectedAccount !== 'ALL') rows = rows.filter((r) => r.gl_account === selectedAccount)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.description || '').toLowerCase().includes(q) ||
          (r.pr_doc_num || '').toLowerCase().includes(q) ||
          (r.catatan_perbandingan || '').toLowerCase().includes(q) ||
          (r.pic || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [allRows, selectedMonth, selectedAccount, search])

  const filteredTotal = useMemo(
    () => filteredRows.reduce((sum, r) => sum + (r.total_price || 0), 0),
    [filteredRows]
  )

  const topMonth = useMemo(() => {
    const stats = rawData.monthly_stats || {}
    const entries = Object.entries(stats)
    if (!entries.length) return null
    const [monthNum, val] = entries.sort((a, b) => b[1] - a[1])[0]
    return { name: MONTH_NAMES[parseInt(monthNum)] || monthNum, value: val }
  }, [rawData.monthly_stats])

  const accountStatsEntries = useMemo(
    () => Object.entries(rawData.account_stats || {}),
    [rawData.account_stats]
  )

  const accountSubtitle = useMemo(() => {
    return accountStatsEntries
      .map(([code]) => {
        const name = ACCOUNT_NAMES[code] || code
        return name.split(' ')[0]
      })
      .join(', ')
  }, [accountStatsEntries])

  return (
    <div className={s.page}>
      {/* ── Page Header ── */}
      <div className={s.pageHeader}>
        <div className={s.headerLeft}>
          <h1 className={s.pageTitle}>
            <AlertTriangle size={22} color="#dc2626" />
            Out of Plan (OOP)
          </h1>
          <p className={s.pageSubtitle}>
            Transaksi pengadaan yang tidak tercantum dalam Master Planning awal tahun
          </p>
        </div>
        <div className={s.headerRight}>
          <label className={s.periodeLabel}>Periode</label>
          <select
            className={s.periodeSelect}
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <button
            type="button"
            className={s.refreshBtn}
            onClick={fetchData}
            disabled={loading}
            title="Refresh data"
          >
            <RefreshCw size={14} className={loading ? s.spinning : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className={s.kpiRow}>
        <div className={`${s.kpiCard} ${s.kpiDanger}`}>
          <div className={s.kpiIcon}><TrendingUp size={18} /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>Total Nilai OOP</span>
            <span className={s.kpiValue}>{formatRp(rawData.total_nominal)}</span>
            <span className={s.kpiSub}>Biaya tidak terencana {periode}</span>
          </div>
        </div>
        <div className={`${s.kpiCard} ${s.kpiOrange}`}>
          <div className={s.kpiIcon}><BarChart2 size={18} /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>Jumlah Transaksi</span>
            <span className={s.kpiValue}>{rawData.total_count} Transaksi</span>
            <span className={s.kpiSub}>Tidak ada item Planning yang cocok</span>
          </div>
        </div>
        <div className={`${s.kpiCard} ${s.kpiBlue}`}>
          <div className={s.kpiIcon}><Calendar size={18} /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>Bulan Terbanyak</span>
            <span className={s.kpiValue}>{topMonth ? topMonth.name : '—'}</span>
            <span className={s.kpiSub}>Nominal OOP tertinggi</span>
          </div>
        </div>
        <div className={`${s.kpiCard} ${s.kpiPurple}`}>
          <div className={s.kpiIcon}><Tag size={18} /></div>
          <div className={s.kpiBody}>
            <span className={s.kpiLabel}>Akun Terdampak</span>
            <span className={s.kpiValue}>{accountStatsEntries.length} Account</span>
            <span className={s.kpiSub}>{accountSubtitle || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Per-Account Breakdown ── */}
      {accountStatsEntries.length > 0 && (
        <div className={s.accountGrid}>
          {accountStatsEntries.map(([code, nominal]) => {
            const pct = rawData.total_nominal > 0 ? (nominal / rawData.total_nominal) * 100 : 0
            const color = ACCOUNT_COLORS[code] || '#64748b'
            const isActive = selectedAccount === code
            return (
              <button
                key={code}
                type="button"
                className={`${s.accountCard} ${isActive ? s.accountCardActive : ''}`}
                style={{ borderLeftColor: color }}
                onClick={() => setSelectedAccount(isActive ? 'ALL' : code)}
              >
                <div className={s.accountCardTop}>
                  <span className={s.accountCode} style={{ color }}>{code}</span>
                  <span className={s.accountNominal}>{formatRp(nominal)}</span>
                </div>
                <div className={s.accountName}>{ACCOUNT_NAMES[code] || code}</div>
                <div className={s.progressBar}>
                  <div className={s.progressFill} style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className={s.accountPct}>{pct.toFixed(1)}% dari total</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          {/* Month Pills */}
          <div className={s.monthPills}>
            <button
              type="button"
              className={`${s.pill} ${selectedMonth === 0 ? s.pillActive : ''}`}
              onClick={() => setSelectedMonth(0)}
            >
              ALL
            </button>
            {activeMonths.map((m) => (
              <button
                key={m}
                type="button"
                className={`${s.pill} ${selectedMonth === m ? s.pillActive : ''}`}
                onClick={() => setSelectedMonth(m)}
              >
                {MONTH_NAMES[m] || m}
              </button>
            ))}
          </div>

          {/* Account dropdown */}
          <select
            className={s.selectInput}
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
          >
            <option value="ALL">Semua Akun</option>
            {accountStatsEntries.map(([code]) => (
              <option key={code} value={code}>{code} — {ACCOUNT_NAMES[code] || code}</option>
            ))}
          </select>
        </div>

        <div className={s.toolbarRight}>
          <div className={s.searchBox}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              className={s.searchInput}
              placeholder="Cari item, PIC, keterangan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          {loading ? (
            <div className={s.emptyState}>
              <Loader2 size={24} className={s.spinning} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
              <div>Memuat data OOP...</div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={s.emptyState}>
              <AlertTriangle size={28} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
              <div>Tidak ada transaksi Out of Plan untuk filter yang dipilih.</div>
            </div>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: 38, textAlign: 'center' }}>#</th>
                  <th style={{ width: 60 }}>Bulan</th>
                  <th style={{ width: 95 }}>Account</th>
                  <th style={{ width: 95 }}>Cost Center</th>
                  <th style={{ width: 85 }}>Tanggal</th>
                  <th style={{ minWidth: 260, maxWidth: 360 }}>Item / Uraian</th>
                  <th style={{ width: 120 }}>PIC</th>
                  <th style={{ textAlign: 'right', width: 125 }}>Nominal</th>
                  <th style={{ width: 130 }}>No PR / PO</th>
                  <th style={{ width: 120 }}>GR</th>
                  <th style={{ minWidth: 200, maxWidth: 280 }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const ccStyle = getCcStyle(r.cost_center)
                  const keterangan = r.catatan_perbandingan || '—'
                  const keteranganShort = keterangan.length > 60 ? keterangan.slice(0, 60) + '…' : keterangan
                  return (
                    <tr key={r.pr_doc_num || idx}>
                      <td className={s.rowNum}>{idx + 1}</td>
                      <td>
                        <span className={s.monthBadge}>
                          {MONTH_NAMES[r.bulan] || r.bulan || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={s.accountCodeCell}>{r.gl_account || '—'}</span>
                      </td>
                      <td>
                        {r.cost_center ? (
                          <span
                            className={s.ccBadge}
                            style={{ background: ccStyle.bg, color: ccStyle.color }}
                          >
                            {r.cost_center}
                          </span>
                        ) : '—'}
                      </td>
                      <td className={s.dateCell}>
                        {r.request_date
                          ? new Date(r.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </td>
                      <td className={s.descCell}>
                        <div className={s.descText}>{r.description || '—'}</div>
                      </td>
                      <td className={s.picCell} title={r.pic || r.pengaju || '—'}>
                        <div className={s.picText}>{r.pic || r.pengaju || '—'}</div>
                      </td>
                      <td className={s.priceCell}>{formatRp(r.total_price)}</td>
                      <td className={s.monoCell}>
                        {r.pr_doc_num && <span>{r.pr_doc_num}</span>}
                        {r.pr_doc_num && r.po_doc_num && <br />}
                        {r.po_doc_num && <span style={{ color: '#64748b' }}>{r.po_doc_num}</span>}
                        {!r.pr_doc_num && !r.po_doc_num && '—'}
                      </td>
                      <td className={s.monoCell}>{r.gr_legal_number || '—'}</td>
                      <td className={s.noteCell}>
                        <div className={s.noteText} title={r.catatan_perbandingan || ''}>
                          {r.catatan_perbandingan || '—'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer Strip ── */}
        <div className={s.tableFooter}>
          <span>
            Menampilkan <strong>{filteredRows.length}</strong> transaksi
            {(selectedMonth !== 0 || selectedAccount !== 'ALL' || search.trim()) && (
              <> dari <strong>{allRows.length}</strong> total</>
            )}
          </span>
          <span>
            Total Nilai:{' '}
            <strong className={s.footerTotal}>{formatRp(filteredTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
