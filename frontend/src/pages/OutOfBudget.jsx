import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Calendar,
  CreditCard,
  Building2,
  Loader2
} from 'lucide-react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './OutOfBudget.module.css'

export default function OutOfBudget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    total_nominal: 0,
    total_count: 0,
    monthly_stats: {},
    account_stats: {},
    data: []
  })
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [selectedAccount, setSelectedAccount] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getOutOfBudget({
        bulan: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        gl_account: selectedAccount !== 'ALL' ? selectedAccount : undefined,
        search: search.trim() || undefined
      })
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch out of budget items:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedAccount, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const rows = data.data || []

  // Month list
  const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26']

  // Distinct accounts
  const accounts = useMemo(() => {
    const set = new Set()
    rows.forEach((r) => {
      if (r.gl_account) set.add(r.gl_account)
    })
    return Array.from(set)
  }, [rows])

  return (
    <div className={s.container}>
      {/* ── Top Summary Metrics ── */}
      <div className={s.metricGrid}>
        <div className={`${s.metricCard} ${s.danger}`}>
          <span className={s.metricLabel}>Total Out of Budget Spend</span>
          <span className={s.metricValue}>{formatRp(data.total_nominal)}</span>
          <span className={s.metricSub}>Biaya tidak terencana di Master Planning (Jan - Agu 2026)</span>
        </div>

        <div className={`${s.metricCard} ${s.warning}`}>
          <span className={s.metricLabel}>Jumlah Transaksi OOP</span>
          <span className={s.metricValue}>{data.total_count} Transaksi</span>
          <span className={s.metricSub}>Item terbeli tanpa alokasi planning awal</span>
        </div>

        <div className={`${s.metricCard} ${s.info}`}>
          <span className={s.metricLabel}>Bulan Terbanyak</span>
          <span className={s.metricValue}>
            {Object.keys(data.monthly_stats || {}).length > 0
              ? Object.entries(data.monthly_stats).sort((a, b) => b[1] - a[1])[0]?.[0]
              : '-'}
          </span>
          <span className={s.metricSub}>Nominal OOP bulanan tertinggi</span>
        </div>

        <div className={`${s.metricCard} ${s.purple}`}>
          <span className={s.metricLabel}>Akun Terdampak</span>
          <span className={s.metricValue}>
            {Object.keys(data.account_stats || {}).length} Account
          </span>
          <span className={s.metricSub}>50032902 (Supplies) & 60290600 (Oversea)</span>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.filterGroup}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua Bulan (Jan - Agu)</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua Account</option>
            {accounts.map((acc) => (
              <option key={acc} value={acc}>{acc}</option>
            ))}
          </select>

          <div className={s.searchBox}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Cari item, no PO/PR, catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className={s.actionBtn}
            title="Muat ulang"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className={s.tableCard}>
        <div className={s.tableWrapper}>
          {loading ? (
            <div className={s.emptyState}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
              <div>Memuat data transaksi Out of Budget...</div>
            </div>
          ) : rows.length === 0 ? (
            <div className={s.emptyState}>
              Tidak ada data transaksi Out of Budget untuk filter ini.
            </div>
          ) : (
            <table className={s.gridTable}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th>Bulan</th>
                  <th>Kode Account</th>
                  <th>Account</th>
                  <th>Source</th>
                  <th>Tanggal GL</th>
                  <th>Item / Uraian Transaksi</th>
                  <th style={{ textAlign: 'right' }}>Harga (GL)</th>
                  <th>No PR / PO</th>
                  <th>No GR</th>
                  <th>Keterangan / Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td className={s.rowNumTd}>{idx + 1}</td>
                    <td><span className={s.oopBadge}>{r.bulan || '-'}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{r.gl_account || '-'}</td>
                    <td>{r.kategori?.nama || (r.gl_account?.includes('50032902') ? 'SUPPLIES EXPENSES' : r.gl_account?.includes('60290600') ? 'TRANSPORTATION EXPENSE - OVERSEA' : 'EXPENSES')}</td>
                    <td><span className={s.sourceBadge}>{r.source || 'PR'}</span></td>
                    <td>{r.request_date ? new Date(r.request_date).toLocaleDateString('id-ID') : '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.description || r.item_name}</td>
                    <td className={s.priceTd}>{formatRp(r.total_price)}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{r.pr_doc_num || r.po_doc_num || '-'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{r.gr_legal_number || '-'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.comment_text || r.status_detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={s.tableFooter}>
          <span>Menampilkan <strong>{rows.length}</strong> transaksi Out of Budget</span>
          <span>Total Nilai: <strong style={{ color: '#dc2626', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{formatRp(data.total_nominal)}</strong></span>
        </div>
      </div>
    </div>
  )
}
