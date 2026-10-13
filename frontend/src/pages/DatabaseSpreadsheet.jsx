import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Table,
  ArrowUp,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { planningApi } from '../api/planningApi'
import s from './DatabaseSpreadsheet.module.css'

export default function DatabaseSpreadsheet() {
  const [periode, setPeriode] = useState('2026')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)
  const [workbook, setWorkbook] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const tableContainerRef = useRef(null)

  // Fetch Excel binary blob from backend
  const fetchWorkbook = useCallback(async (year) => {
    setLoading(true)
    setError(null)
    try {
      const response = await planningApi.exportDatabaseBudget(year)
      const blob = response.data
      const arrayBuffer = await blob.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

      setWorkbook(wb)
      const names = wb.SheetNames || []
      setSheetNames(names)
      if (names.length > 0) {
        // Keep active sheet if exists in new workbook, otherwise default to first
        setActiveSheet((prev) => (names.includes(prev) ? prev : names[0]))
      }
      setSearchTerm('')
    } catch (err) {
      console.error('Error fetching database spreadsheet:', err)
      setError('Gagal memuat database spreadsheet. Pastikan data planning sudah diunggah.')
      toast.error('Gagal memuat file Excel Database Budget')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkbook(periode)
  }, [periode, fetchWorkbook])

  // Download raw .xlsx directly
  const handleDownloadExcel = async () => {
    setDownloading(true)
    try {
      const response = await planningApi.exportDatabaseBudget(periode)
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DATABASE_WEB_BUDGET_${periode}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Berhasil mengunduh DATABASE_WEB_BUDGET_${periode}.xlsx`)
    } catch (err) {
      console.error('Error downloading Excel file:', err)
      toast.error('Gagal mengunduh file Excel')
    } finally {
      setDownloading(false)
    }
  }

  // Scroll to top of table
  const handleScrollToTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Parse table headers and data rows from the active sheet
  const { headers, rows } = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) {
      return { headers: [], rows: [] }
    }

    const ws = workbook.Sheets[activeSheet]
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (!data || data.length === 0) return { headers: [], rows: [] }

    // Smart detection of header row
    let headerIdx = -1
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      if (!row) continue
      const filled = row.filter((c) => c !== null && String(c).trim() !== '')
      const hasKeywords = filled.some((c) => {
        const sLower = String(c).toLowerCase()
        return (
          sLower.includes('bulan') ||
          sLower.includes('kode') ||
          sLower.includes('account') ||
          sLower === 'no' ||
          sLower.includes('item') ||
          sLower.includes('planning') ||
          sLower.includes('cost center')
        )
      })
      if (filled.length >= 3 && hasKeywords) {
        headerIdx = i
        break
      }
    }

    // Fallback: row with maximum non-empty cells
    if (headerIdx === -1) {
      let maxCols = 0
      for (let i = 0; i < Math.min(8, data.length); i++) {
        const filled = (data[i] || []).filter((c) => c !== null && String(c).trim() !== '').length
        if (filled > maxCols) {
          maxCols = filled
          headerIdx = i
        }
      }
    }

    if (headerIdx === -1 || headerIdx >= data.length) {
      return { headers: [], rows: [] }
    }

    // Extract headers (remove trailing empty headers)
    const rawHeaders = data[headerIdx] || []
    let lastValidCol = rawHeaders.length - 1
    while (lastValidCol >= 0 && (rawHeaders[lastValidCol] === undefined || rawHeaders[lastValidCol] === '')) {
      lastValidCol--
    }

    const colCount = Math.max(lastValidCol + 1, 1)
    const validHeaders = []
    for (let i = 0; i < colCount; i++) {
      const val = rawHeaders[i]
      validHeaders.push(val !== undefined && val !== '' ? String(val).trim() : `Kolom ${i + 1}`)
    }

    // Extract non-empty data rows
    const dataRows = data
      .slice(headerIdx + 1)
      .filter((r) => r && r.some((c) => c !== null && String(c).trim() !== ''))
      .map((r) => {
        const rowSlice = []
        for (let i = 0; i < colCount; i++) {
          rowSlice.push(r[i] !== undefined ? r[i] : '')
        }
        return rowSlice
      })

    return { headers: validHeaders, rows: dataRows }
  }, [workbook, activeSheet])

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase().trim()
    return rows.filter((r) =>
      r.some((cell) => {
        if (cell === null || cell === undefined) return false
        return String(cell).toLowerCase().includes(term)
      })
    )
  }, [rows, searchTerm])

  // Cell renderer helper
  const renderCell = (val) => {
    if (val === null || val === undefined || val === '') {
      return <span style={{ opacity: 0.35 }}>-</span>
    }
    if (typeof val === 'number') {
      const isNegative = val < 0
      const formatted = Math.abs(val) >= 100 ? val.toLocaleString('id-ID') : String(val)
      return (
        <span className={`${s.cellNum} ${isNegative ? s.cellNeg : ''}`}>
          {isNegative ? `(${formatted})` : formatted}
        </span>
      )
    }
    if (val instanceof Date) {
      return val.toLocaleDateString('id-ID')
    }
    const str = String(val).trim()
    if (str === 'OK') {
      return <span className={s.cellTag}>OK</span>
    }
    return str
  }

  return (
    <div className={s.container}>
      {/* ── Top Toolbar ── */}
      <div className={s.toolbar}>
        <div className={s.topRow}>
          <div className={s.titleArea}>
            <FileSpreadsheet size={24} className={s.excelIcon} />
            <div>
              <div className={s.titleText}>Database Spreadsheet Excel (5 Sheets)</div>
              <div className={s.titleDesc}>
                Tampilan kisi tabel master DATABASE WEB BUDGET dengan grid cell dan navigasi sheet lengkap.
              </div>
            </div>
          </div>

          <div className={s.actionsArea}>
            {/* Periode Year Select */}
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className={s.yearSelect}
              title="Pilih Tahun Anggaran"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
            </select>

            {/* Search Input */}
            <div className={s.searchBox}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Cari sel di sheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={s.searchInput}
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchWorkbook(periode)}
              disabled={loading}
              className={s.actionBtn}
              title="Muat ulang data"
            >
              <RefreshCw size={13} className={loading ? s.spinner : ''} />
              <span>Refresh</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={downloading || loading}
              className={`${s.actionBtn} ${s.downloadBtn}`}
              title="Unduh file Excel asli"
            >
              <Download size={13} />
              <span>{downloading ? 'Mengunduh...' : 'Unduh .xlsx'}</span>
            </button>
          </div>
        </div>

        {/* ── Sheet Tabs ── */}
        {sheetNames.length > 0 && (
          <div className={s.sheetTabsBar}>
            {sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setActiveSheet(name)
                  setSearchTerm('')
                }}
                className={`${s.sheetTab} ${activeSheet === name ? s.sheetTabActive : ''}`}
              >
                <Table size={13} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Table Viewport (Continuous Spreadsheet Grid) ── */}
      <div className={s.tableContainer} ref={tableContainerRef}>
        {loading ? (
          <div className={s.loadingState}>
            <Loader2 size={28} className={s.spinner} />
            <span>Memuat lembar kerja spreadsheet Excel...</span>
          </div>
        ) : error ? (
          <div className={s.emptyState}>
            <AlertCircle size={28} color="#dc2626" />
            <span>{error}</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className={s.emptyState}>
            Tidak ada baris data yang ditemukan di sheet &quot;{activeSheet}&quot;.
          </div>
        ) : (
          <table className={s.gridTable}>
            <thead>
              <tr>
                <th className={s.rowNumberTh}>#</th>
                {headers.map((colName, cIdx) => (
                  <th key={cIdx} title={colName}>
                    {colName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, rIdx) => {
                const rowNum = rIdx + 1
                return (
                  <tr key={rIdx}>
                    <td className={s.rowNumberTd}>{rowNum}</td>
                    {headers.map((_, cIdx) => (
                      <td key={cIdx}>{renderCell(row[cIdx])}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer Bar (Spreadsheet Status Bar) ── */}
      {!loading && !error && filteredRows.length > 0 && (
        <div className={s.footerBar}>
          <div className={s.footerLeft}>
            <span>
              Sheet: <strong>{activeSheet}</strong>
              {' · '}
              Total: <strong>{filteredRows.length}</strong> baris data
              {searchTerm && rows.length !== filteredRows.length && (
                <span> (difilter dari total {rows.length} baris)</span>
              )}
            </span>
          </div>

          <div className={s.footerRight}>
            <button
              type="button"
              className={s.scrollTopBtn}
              onClick={handleScrollToTop}
              title="Gulir ke baris pertama"
            >
              <ArrowUp size={12} />
              <span>Ke Atas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
