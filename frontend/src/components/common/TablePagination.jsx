import React, { useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import s from './TablePagination.module.css'

/**
 * Standardized Pagination Component
 * 
 * @param {Object} props
 * @param {number} props.page - Current page (1-based)
 * @param {number} props.totalPages - Total pages available
 * @param {number} props.total - Total number of items
 * @param {number} props.perPage - Items per page
 * @param {Function} props.onPageChange - Callback when page changes: (page) => void
 * @param {Function} [props.onPerPageChange] - Callback when perPage changes: (perPage) => void
 * @param {number[]} [props.perPageOptions] - Selectable perPage options
 * @param {string} [props.itemName] - Label for item count (e.g., 'data', 'klaim', 'PR')
 * @param {boolean} [props.loading] - Whether data is currently loading
 * @param {string} [props.className] - Additional wrapper class
 */
export default function TablePagination({
  page = 1,
  totalPages = 1,
  total = 0,
  perPage = 20,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  itemName = 'data',
  loading = false,
  className = ''
}) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safeCurrentPage = Math.min(Math.max(1, page || 1), safeTotalPages)

  // Smart page numbers generation with ellipsis
  const pageNumbers = useMemo(() => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1)
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', safeTotalPages]
    }

    if (safeCurrentPage >= safeTotalPages - 3) {
      return [
        1,
        '...',
        safeTotalPages - 4,
        safeTotalPages - 3,
        safeTotalPages - 2,
        safeTotalPages - 1,
        safeTotalPages
      ]
    }

    return [
      1,
      '...',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      '...',
      safeTotalPages
    ]
  }, [safeCurrentPage, safeTotalPages])

  const startItem = total === 0 ? 0 : (safeCurrentPage - 1) * perPage + 1
  const endItem = Math.min(safeCurrentPage * perPage, total)

  const handleFirst = () => {
    if (safeCurrentPage > 1 && !loading) {
      onPageChange?.(1)
    }
  }

  const handlePrev = () => {
    if (safeCurrentPage > 1 && !loading) {
      onPageChange?.(safeCurrentPage - 1)
    }
  }

  const handleNext = () => {
    if (safeCurrentPage < safeTotalPages && !loading) {
      onPageChange?.(safeCurrentPage + 1)
    }
  }

  const handleLast = () => {
    if (safeCurrentPage < safeTotalPages && !loading) {
      onPageChange?.(safeTotalPages)
    }
  }

  return (
    <div className={`${s.paginationWrapper} ${className}`}>
      {/* Left: Per-page dropdown & Info Summary */}
      <div className={s.leftSection}>
        {onPerPageChange && (
          <div className={s.perPageWrap}>
            <span>Tampilkan:</span>
            <select
              className={s.perPageSelect}
              value={perPage}
              disabled={loading}
              onChange={(e) => {
                const newSize = Number(e.target.value)
                onPerPageChange?.(newSize)
                onPageChange?.(1)
              }}
            >
              {perPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} baris
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={s.dataSummary}>
          Menampilkan{' '}
          <span className={s.highlightText}>
            {startItem.toLocaleString('id-ID')}–{endItem.toLocaleString('id-ID')}
          </span>{' '}
          dari <span className={s.highlightText}>{total.toLocaleString('id-ID')}</span>{' '}
          {itemName}
        </div>
      </div>

      {/* Right: Controls (<<, <, numbers, >, >>) */}
      <div className={s.rightSection}>
        {/* Skip to First Page (<<) */}
        <button
          type="button"
          className={s.navButton}
          onClick={handleFirst}
          disabled={safeCurrentPage <= 1 || loading}
          title="Ke Halaman Pertama (Awal)"
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page (<) */}
        <button
          type="button"
          className={s.navButton}
          onClick={handlePrev}
          disabled={safeCurrentPage <= 1 || loading}
          title="Halaman Sebelumnya"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        <div className={s.pageNumbersWrap}>
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className={s.ellipsis}>
                  …
                </span>
              )
            }

            const isCurrent = p === safeCurrentPage
            return (
              <button
                key={`page-${p}`}
                type="button"
                className={`${s.pageNumberBtn} ${isCurrent ? s.activePage : ''}`}
                onClick={() => !loading && onPageChange?.(p)}
                disabled={loading}
                title={`Halaman ${p}`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Next Page (>) */}
        <button
          type="button"
          className={s.navButton}
          onClick={handleNext}
          disabled={safeCurrentPage >= safeTotalPages || loading}
          title="Halaman Berikutnya"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Skip to Last Page (>>) */}
        <button
          type="button"
          className={s.navButton}
          onClick={handleLast}
          disabled={safeCurrentPage >= safeTotalPages || loading}
          title="Ke Halaman Terakhir (Ujung)"
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
