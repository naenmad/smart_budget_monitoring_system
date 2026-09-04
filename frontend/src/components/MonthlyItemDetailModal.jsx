import { useState, useEffect } from 'react'
import { budgetApi } from '../api/budgetApi'
import { formatRp } from '../utils/format'
import { X, Calendar, Search, Loader2, PackageCheck, FileText, CheckCircle2, Clock } from 'lucide-react'
import s from './MonthlyItemDetailModal.module.css'

export default function MonthlyItemDetailModal({ periode = '2026', month = 'Jan', onClose }) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('planned') // 'planned' | 'pr'
  const [data, setData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchItems()
  }, [periode, month])

  async function fetchItems() {
    setLoading(true)
    try {
      const res = await budgetApi.getMonthlyItems(periode, month)
      if (res?.success) {
        setData(res)
      }
    } catch (err) {
      console.error('Gagal mengambil rincian bulanan:', err)
    } finally {
      setLoading(false)
    }
  }

  const plannedList = (data?.planned_items || []).filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      (item.item || '').toLowerCase().includes(q) ||
      (item.kategori_kode || '').toLowerCase().includes(q) ||
      (item.remarks || '').toLowerCase().includes(q)
    )
  })

  const prList = (data?.pr_items || []).filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      (item.pr_doc_num || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.kategori_kode || '').toLowerCase().includes(q) ||
      (item.planning_item || '').toLowerCase().includes(q)
    )
  })

  const summary = data?.summary || { total_planned: 0, total_pr: 0, total_gr: 0, saldo_pr: 0 }
  const isOver = summary.saldo_pr < 0

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.headerTitleWrap}>
            <div className={s.headerIcon}>
              <Calendar size={20} />
            </div>
            <div>
              <h2 className={s.title}>Detail Penggunaan Budget — Bulan {month} ({periode})</h2>
              <p className={s.subtitle}>
                Rincian item perencanaan anggaran resmi dan transaksi Purchase Requisition pada bulan {month}
              </p>
            </div>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Tutup modal">
            <X size={20} />
          </button>
        </div>

        {/* Summary Chips */}
        <div className={s.summaryRow}>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Anggaran Planned</span>
            <span className={`${s.chipValue} ${s.chipPlanned}`}>{formatRp(summary.total_planned)}</span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Komitmen PR</span>
            <span className={`${s.chipValue} ${s.chipPr}`}>{formatRp(summary.total_pr)}</span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Realisasi GR</span>
            <span className={`${s.chipValue} ${s.chipGr}`}>{formatRp(summary.total_gr)}</span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Sisa Saldo PR</span>
            <span className={`${s.chipValue} ${isOver ? s.chipSaldoOver : s.chipSaldoSafe}`}>
              {formatRp(summary.saldo_pr)}
            </span>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className={s.subHeader}>
          <div className={s.tabGroup}>
            <button
              className={`${s.tabBtn} ${activeTab === 'planned' ? s.tabBtnActive : ''}`}
              onClick={() => setActiveTab('planned')}
            >
              <PackageCheck size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Item Perencanaan ({data?.planned_items?.length || 0})
            </button>
            <button
              className={`${s.tabBtn} ${activeTab === 'pr' ? s.tabBtnActive : ''}`}
              onClick={() => setActiveTab('pr')}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Transaksi PR ({data?.pr_items?.length || 0})
            </button>
          </div>

          <div className={s.searchBox}>
            <Search size={14} className={s.searchIcon} />
            <input
              type="text"
              placeholder={activeTab === 'planned' ? "Cari nama barang atau kategori..." : "Cari no PR, deskripsi barang..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className={s.body}>
          {loading ? (
            <div className={s.loadingState}>
              <Loader2 size={24} className="animate-spin" />
              <span>Memuat data barang bulan {month}...</span>
            </div>
          ) : activeTab === 'planned' ? (
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Nama Barang / Item Planning</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: 'right' }}>Pagu Anggaran</th>
                  <th style={{ textAlign: 'right' }}>Terpakai PR</th>
                  <th style={{ textAlign: 'right' }}>Sisa Saldo</th>
                  <th style={{ textAlign: 'center' }}>Jml PR</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {plannedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={s.emptyState}>
                      {searchQuery ? `Tidak ada item yang cocok dengan "${searchQuery}"` : 'Tidak ada item perencanaan pada bulan ini.'}
                    </td>
                  </tr>
                ) : (
                  plannedList.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <strong>{item.item}</strong>
                        {item.remarks && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.remarks}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={s.badgeCategory}>{item.kategori_kode}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRp(item.planning_amount)}</td>
                      <td style={{ textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{formatRp(item.consumed_amount)}</td>
                      <td style={{ textAlign: 'right', color: item.remaining_amount < 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                        {formatRp(item.remaining_amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.pr_count > 0 ? (
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{item.pr_count}</span>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${s.badgeStatus} ${item.status_realisasi === 'CLOSED' ? s.statusClosed : item.status_realisasi === 'PROSES' ? s.statusProses : s.statusOpen}`}>
                          {item.status_realisasi}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>No. PR</th>
                  <th>Deskripsi Barang PR</th>
                  <th>Kategori</th>
                  <th>Tautan Item Planning</th>
                  <th style={{ textAlign: 'right' }}>Nominal PR</th>
                  <th style={{ textAlign: 'center' }}>Status Budget</th>
                  <th>No. PO / GR</th>
                </tr>
              </thead>
              <tbody>
                {prList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={s.emptyState}>
                      {searchQuery ? `Tidak ada PR yang cocok dengan "${searchQuery}"` : 'Tidak ada transaksi PR pada bulan ini.'}
                    </td>
                  </tr>
                ) : (
                  prList.map((pr, idx) => (
                    <tr key={pr.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: 12 }}>{pr.pr_doc_num}</strong>
                      </td>
                      <td>
                        <div>{pr.description}</div>
                        {pr.qty && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {pr.qty} {pr.uom} {pr.unit_price ? `@ ${formatRp(pr.unit_price)}` : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={s.badgeCategory}>{pr.kategori_kode}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{pr.planning_item}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatRp(pr.total_price)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${s.badgeStatus} ${pr.budget_status === 'ON_PLAN' ? s.statusClosed : pr.budget_status === 'OVER_PLAN' ? s.statusOver : s.statusProses}`}>
                          {pr.budget_status}
                        </span>
                      </td>
                      <td style={{ fontSize: 11.5 }}>
                        <div>PO: {pr.po_doc_num !== '-' ? <strong style={{ fontFamily: 'monospace' }}>{pr.po_doc_num}</strong> : '-'}</div>
                        <div>GR: {pr.gr_legal_number !== '-' ? <span style={{ color: '#16a34a', fontWeight: 600, fontFamily: 'monospace' }}>{pr.gr_legal_number}</span> : '-'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
