import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { prApi } from '../api/prApi'
import { formatRp } from '../utils/format'
import { X, Loader2 } from 'lucide-react'
import s from './PrStatusModal.module.css'
import ScrollableCell from './ScrollableCell'

export default function PrTrackingModal({ stage, onClose }) {
  const [page, setPage] = useState(1)

  const { data: listData, isLoading } = useQuery({
    queryKey: ['prTracking', stage, page],
    queryFn: async () => {
      const res = await prApi.getAll({ tracking_stage: stage, page, per_page: 30 })
      return res.data
    }
  })

  const prList = listData?.data || []
  const total = listData?.total || 0
  const totalPages = listData?.pages || 1

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <div className={s.headerLeft}>
            <h2>Detail Tahapan: {stage} ({total} Data)</h2>
            <p>Daftar Purchase Requisition pada tahap {stage}</p>
          </div>
          <div className={s.headerActions}>
            <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={s.content}>
          {isLoading ? (
            <div className={s.loadingState}>
              <Loader2 size={18} className="animate-spin" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Memuat data...
            </div>
          ) : prList.length === 0 ? (
            <div className={s.emptyState}>Belum ada data</div>
          ) : (
            <div className={s.tableContainer}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PR Doc</th>
                    <th>PO Doc</th>
                    <th>GR Legal</th>
                    <th>Description</th>
                    <th className={s.right}>Total Price</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {prList.map((pr, i) => (
                    <tr key={pr.id}>
                      <td>{(page - 1) * 30 + i + 1}</td>
                      <td className={s.monospace} style={{ fontWeight: 600 }}>{pr.pr_doc_num || '-'}</td>
                      <td className={s.monospace} style={{ fontWeight: 600 }}>{pr.po_doc_num || '-'}</td>
                      <td className={s.monospace} style={{ fontWeight: 600 }}>{pr.gr_legal_number || '-'}</td>
                      <td>
                        <ScrollableCell text={pr.description} maxWidth={340} />
                      </td>
                      <td className={s.right}>{formatRp(pr.total_price)}</td>
                      <td>{pr.supplier_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-subtle)'
          }}>
            <button
              className="btn-secondary"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              ‹ Prev
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hal {page} / {totalPages}</span>
            <button
              className="btn-secondary"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
