import { useState, useEffect, useMemo } from 'react'
import { budgetApi } from '../api/budgetApi'
import { formatRp } from '../utils/format'
import { X, Calendar, Search, Loader2, PackageCheck, FileText, AlertTriangle, AlertCircle } from 'lucide-react'
import s from './MonthlyItemDetailModal.module.css'

export default function MonthlyItemDetailModal({ periode = '2026', month = 'Jan', onClose }) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('planned') // 'planned' | 'pr' | 'over' | 'oop'
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

  const allPlanned = data?.planned_items || []
  const allPr = data?.pr_items || []

  // Pre-filter Over Budget and OOP items
  const overItems = useMemo(() => {
    return allPr.filter(p =>
      p.budget_status === 'OVER_PLAN' ||
      (p.status_detail || '').toLowerCase().includes('over') ||
      (Number(p.total_price || 0) > Number(p.planning_pagu || 0) && Number(p.planning_pagu || 0) > 0)
    )
  }, [allPr])

  const oopItems = useMemo(() => {
    return allPr.filter(p =>
      p.budget_status === 'OOP' ||
      (p.planning_item || '').toUpperCase().includes('OOP') ||
      (p.planning_item || '').toLowerCase().includes('out of plan')
    )
  }, [allPr])

  const oopTotalNominal = useMemo(() => {
    return oopItems.reduce((acc, it) => acc + Number(it.total_price || 0), 0)
  }, [oopItems])

  // Filter based on active tab and search query
  const displayList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    if (activeTab === 'planned') {
      if (!q) return allPlanned
      return allPlanned.filter(item =>
        (item.item || '').toLowerCase().includes(q) ||
        (item.kategori_kode || '').toLowerCase().includes(q) ||
        (item.remarks || '').toLowerCase().includes(q) ||
        (item.sub_kategori || '').toLowerCase().includes(q)
      )
    }

    let source = allPr
    if (activeTab === 'over') source = overItems
    if (activeTab === 'oop') source = oopItems

    if (!q) return source
    return source.filter(item =>
      (item.pr_doc_num || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.kategori_kode || '').toLowerCase().includes(q) ||
      (item.planning_item || '').toLowerCase().includes(q) ||
      (item.status_detail || '').toLowerCase().includes(q)
    )
  }, [activeTab, searchQuery, allPlanned, allPr, overItems, oopItems])

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
                Rincian Master Plan, Transaksi PR, Over Budget, dan Pengeluaran Out of Plan bulan {month}
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
            <span className={s.chipLabel}>Planned Budget</span>
            <span className={`${s.chipValue} ${s.chipPlanned}`}>{formatRp(summary.total_planned)}</span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Planned PR</span>
            <span className={`${s.chipValue} ${s.chipPr}`}>{formatRp(summary.total_pr)}</span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Out of Plan (OOP)</span>
            <span className={`${s.chipValue}`} style={{ color: oopItems.length > 0 ? '#d97706' : 'var(--text-muted)' }}>
              {formatRp(oopTotalNominal)} ({oopItems.length} trx)
            </span>
          </div>
          <div className={s.summaryChip}>
            <span className={s.chipLabel}>Budget PR</span>
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
              Plan ({allPlanned.length})
            </button>
            <button
              className={`${s.tabBtn} ${activeTab === 'pr' ? s.tabBtnActive : ''}`}
              onClick={() => setActiveTab('pr')}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
              Semua PR ({allPr.length})
            </button>
            <button
              className={`${s.tabBtn} ${activeTab === 'over' ? s.tabBtnActive : ''}`}
              onClick={() => setActiveTab('over')}
              style={activeTab === 'over' ? { color: '#dc2626' } : {}}
            >
              <AlertTriangle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: '#dc2626' }} />
              Over Budget ({overItems.length})
            </button>
            <button
              className={`${s.tabBtn} ${activeTab === 'oop' ? s.tabBtnActive : ''}`}
              onClick={() => setActiveTab('oop')}
              style={activeTab === 'oop' ? { color: '#d97706' } : {}}
            >
              <AlertCircle size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: '#d97706' }} />
              Out of Plan ({oopItems.length})
            </button>
          </div>

          <div className={s.searchBox}>
            <Search size={14} className={s.searchIcon} />
            <input
              type="text"
              placeholder={
                activeTab === 'planned'
                  ? "Cari nama barang atau kategori..."
                  : "Cari no PR, deskripsi, atau PIC..."
              }
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
                  <th style={{ textAlign: 'right' }}>Budget</th>
                  <th style={{ textAlign: 'right' }}>Terpakai PR</th>
                  <th style={{ textAlign: 'right' }}>Budget</th>
                  <th style={{ textAlign: 'center' }}>Jml PR</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={s.emptyState}>
                      {searchQuery ? `Tidak ada item yang cocok dengan "${searchQuery}"` : 'Tidak ada item perencanaan pada bulan ini.'}
                    </td>
                  </tr>
                ) : (
                  displayList.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <strong>{item.item}</strong>
                        {item.sub_kategori && item.sub_kategori !== '-' && (
                          <span className={s.badgeSubKat}>{item.sub_kategori}</span>
                        )}
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
                  <th>Sumber & Dokumen</th>
                  <th>Deskripsi Transaksi</th>
                  <th>Account & CC</th>
                  <th>Pencocokan Planning</th>
                  <th style={{ textAlign: 'right' }}>Nominal</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Ref PO / GR</th>
                </tr>
              </thead>
              <tbody>
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={s.emptyState}>
                      {activeTab === 'over'
                        ? 'Tidak ada transaksi Over Budget pada bulan ini. Semua pengeluaran sesuai pagu!'
                        : activeTab === 'oop'
                        ? 'Tidak ada transaksi Out of Plan (OOP) pada bulan ini.'
                        : searchQuery
                        ? `Tidak ada transaksi yang cocok dengan "${searchQuery}"`
                        : 'Tidak ada transaksi actual pada bulan ini.'}
                    </td>
                  </tr>
                ) : (
                  displayList.map((pr, idx) => (
                    <tr key={pr.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className={s.badgeSource}>{pr.source || 'PR'}</span>
                          <strong style={{ fontFamily: 'monospace', fontSize: 11 }}>{pr.pr_doc_num}</strong>
                        </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 500 }}>{pr.planning_item}</span>
                          {pr.beda_bulan && (
                            <span className={s.badgeBedaBulan} title="Transaksi terjadi di bulan berbeda dari planning">
                              Beda Bulan
                            </span>
                          )}
                        </div>
                        {pr.status_detail && pr.status_detail !== '-' && (
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                            {pr.status_detail}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: pr.budget_status === 'OOP' ? '#d97706' : pr.budget_status === 'OVER_PLAN' ? '#dc2626' : 'inherit' }}>
                        {formatRp(pr.total_price)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`${s.badgeStatus} ${pr.budget_status === 'ON_PLAN' ? s.statusClosed : pr.budget_status === 'OOP' ? s.statusOver : pr.budget_status === 'OVER_PLAN' ? s.statusOver : s.statusProses}`}>
                          {pr.budget_status === 'OOP' ? 'Out of Plan' : pr.budget_status === 'OVER_PLAN' ? 'Over Budget' : pr.budget_status}
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
