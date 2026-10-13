import { useState, useEffect, useCallback } from 'react'
import {
  Wrench,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import s from './PreventiveCfView.module.css'

export default function PreventiveCfView() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    total_plan: 0,
    total_actual: 0,
    sisa: 0,
    total_count: 0,
    monthly_stats: {},
    data: []
  })
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await planningApi.getPreventiveCf({
        bulan: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        search: search.trim() || undefined
      })
      if (res.data?.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch preventive CF items:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const rows = data.data || []
  const months = ['Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26']

  return (
    <div className={s.container}>
      {/* ── Top Metric Cards ── */}
      <div className={s.metricGrid}>
        <div className={`${s.metricCard} ${s.primary}`}>
          <span className={s.metricLabel}>Total Plan Preventive C/F</span>
          <span className={s.metricValue}>{formatRp(data.total_plan)}</span>
          <span className={s.metricSub}>Rencana Anggaran List Pemeliharaan C/F (2026)</span>
        </div>

        <div className={`${s.metricCard} ${s.success}`}>
          <span className={s.metricLabel}>Total Realisasi GL</span>
          <span className={s.metricValue}>{formatRp(data.total_actual)}</span>
          <span className={s.metricSub}>Aktual pembayaran riil GL s/d Agustus 2026</span>
        </div>

        <div className={`${s.metricCard} ${s.warning}`}>
          <span className={s.metricLabel}>Sisa Anggaran List</span>
          <span className={s.metricValue} style={{ color: data.sisa < 0 ? '#dc2626' : '#10b981' }}>
            {formatRp(data.sisa)}
          </span>
          <span className={s.metricSub}>Sisa alokasi rencana vs aktual</span>
        </div>

        <div className={`${s.metricCard} ${s.purple}`}>
          <span className={s.metricLabel}>Total Item Pemeliharaan</span>
          <span className={s.metricValue}>{data.total_count} Item</span>
          <span className={s.metricSub}>Daftar aktivitas preventive & sparepart</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.filterGroup}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={s.selectInput}
          >
            <option value="ALL">Semua Bulan Rencana</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className={s.searchBox}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Cari item, spesifikasi, no dokumen..."
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
              <div>Memuat data Preventive C/F...</div>
            </div>
          ) : rows.length === 0 ? (
            <div className={s.emptyState}>
              Tidak ada data Preventive C/F untuk filter ini.
            </div>
          ) : (
            <table className={s.gridTable}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th>Bulan List</th>
                  <th>Item Pemeliharaan</th>
                  <th>Spesifikasi</th>
                  <th style={{ textAlign: 'center' }}>Qty & Satuan</th>
                  <th style={{ textAlign: 'right' }}>Cost Satuan</th>
                  <th style={{ textAlign: 'right' }}>Total List (Plan)</th>
                  <th style={{ textAlign: 'right' }}>Actual GL</th>
                  <th style={{ textAlign: 'right' }}>Selisih</th>
                  <th>Status</th>
                  <th>Bulan Aktual</th>
                  <th>No Dokumen GL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id || idx}>
                    <td className={s.rowNumTd}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.bulan_list || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.item}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.spesifikasi || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{r.qty || '-'} {r.unit || ''}</td>
                    <td className={s.numTd}>{r.cost ? formatRp(r.cost) : '-'}</td>
                    <td className={s.numTd} style={{ color: 'var(--primary)' }}>{formatRp(r.total_list)}</td>
                    <td className={s.numTd} style={{ color: '#10b981' }}>{formatRp(r.actual_gl)}</td>
                    <td className={s.numTd} style={{ color: r.selisih < 0 ? '#dc2626' : '#10b981' }}>{formatRp(r.selisih)}</td>
                    <td>
                      <span className={r.status === 'OK' ? s.statusOk : s.statusPending}>
                        {r.status || 'Pending'}
                      </span>
                    </td>
                    <td>{r.bulan_actual || '-'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{r.no_dokumen_gl || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={s.tableFooter}>
          <span>Menampilkan <strong>{rows.length}</strong> item Master Preventive C/F</span>
          <span>
            Total Plan: <strong style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono' }}>{formatRp(data.total_plan)}</strong> |
            Total Actual: <strong style={{ color: '#10b981', fontFamily: 'JetBrains Mono' }}>{formatRp(data.total_actual)}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
