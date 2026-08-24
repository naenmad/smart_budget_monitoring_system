import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { prApi } from '../api/prApi'
import { formatRp } from '../utils/format'
import { X } from 'lucide-react'

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
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()} >
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            Detail Tahapan: {stage} ({total} Data)
          </h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div style={bodyStyle}>
          {isLoading ? (
            <p>Memuat data...</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>PR Doc</th>
                  <th style={thStyle}>PO Doc</th>
                  <th style={thStyle}>GR Legal</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Total Price</th>
                  <th style={thStyle}>Supplier</th>
                </tr>
              </thead>
              <tbody>
                {prList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>Belum ada data</td>
                  </tr>
                ) : (
                  prList.map((pr, i) => (
                    <tr key={pr.id}>
                      <td style={tdStyle}>{(page - 1) * 30 + i + 1}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{pr.pr_doc_num || '-'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{pr.po_doc_num || '-'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{pr.gr_legal_number || '-'}</td>
                      <td style={tdStyle} title={pr.description}>{pr.description ? (pr.description.length > 50 ? pr.description.substring(0, 50) + '...' : pr.description) : '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatRp(pr.total_price)}</td>
                      <td style={tdStyle}>{pr.supplier_name || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={footerStyle}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={pageBtnStyle}
            >
              ‹ Prev
            </button>
            <span style={{ fontSize: '0.875rem' }}>Hal {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={pageBtnStyle}
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline styles for quick modal
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '2rem'
}

const modalContentStyle = {
  backgroundColor: '#fff',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '900px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden'
}

const headerStyle = {
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc'
}

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: '1.25rem',
  cursor: 'pointer',
  color: '#64748b'
}

const bodyStyle = {
  padding: '1.5rem',
  overflowY: 'auto',
  flex: 1
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.875rem'
}

const thStyle = {
  textAlign: 'left',
  padding: '0.75rem',
  borderBottom: '2px solid #e2e8f0',
  color: '#475569',
  fontWeight: 600,
  whiteSpace: 'nowrap'
}

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid #f1f5f9',
  color: '#334155'
}

const footerStyle = {
  padding: '1rem 1.5rem',
  borderTop: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '1rem',
  backgroundColor: '#f8fafc'
}

const pageBtnStyle = {
  padding: '0.5rem 1rem',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.875rem'
}
