import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import s from './ExcelViewer.module.css'
import { FileSpreadsheet, Search, Table, Layers, ArrowLeft, ArrowRight } from 'lucide-react'

export default function ExcelViewer({ file, fileData, filename = 'Workbook.xlsx' }) {
  const [workbook, setWorkbook] = useState(null)
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    if (!file && !fileData) {
      setWorkbook(null)
      setSheetNames([])
      setActiveSheet('')
      return
    }

    const loadWorkbook = async () => {
      try {
        let data = fileData
        if (file instanceof File || file instanceof Blob) {
          data = await file.arrayBuffer()
        }
        if (data) {
          const wb = XLSX.read(data, { type: 'array', cellDates: true })
          setWorkbook(wb)
          setSheetNames(wb.SheetNames || [])
          if (wb.SheetNames?.length > 0) {
            setActiveSheet(wb.SheetNames[0])
          }
        }
      } catch (err) {
        console.error('Error parsing Excel workbook for preview:', err)
      }
    }

    loadWorkbook()
  }, [file, fileData])

  // Parse active sheet rows & headers
  const { headers, rows } = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) {
      return { headers: [], rows: [] }
    }

    const ws = workbook.Sheets[activeSheet]
    // Get JSON as 2D array of rows
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (data.length === 0) return { headers: [], rows: [] }

    // Find first non-empty row as header
    let headerRowIdx = 0
    while (headerRowIdx < data.length && (!data[headerRowIdx] || data[headerRowIdx].every(c => c === ''))) {
      headerRowIdx++
    }

    if (headerRowIdx >= data.length) return { headers: [], rows: [] }

    const rawHeaders = data[headerRowIdx].map((h, i) => (h !== undefined && h !== '' ? String(h) : `Kolom ${i + 1}`))
    const rawRows = data.slice(headerRowIdx + 1).filter(r => r && r.some(c => c !== ''))

    return { headers: rawHeaders, rows: rawRows }
  }, [workbook, activeSheet])

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase()
    return rows.filter(r => r.some(c => String(c || '').toLowerCase().includes(term)))
  }, [rows, searchTerm])

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, page])

  const formatCellValue = (val) => {
    if (val === null || val === undefined || val === '') return '-'
    if (typeof val === 'number') {
      if (Math.abs(val) >= 1000) {
        return Number(val).toLocaleString('id-ID')
      }
      return val
    }
    if (val instanceof Date) {
      return val.toLocaleDateString('id-ID')
    }
    return String(val)
  }

  if (!workbook) return null

  return (
    <div className={s.container}>
      {/* Header Bar */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <FileSpreadsheet size={22} className={s.excelIcon} />
          <div>
            <div className={s.fileTitle}>Preview Lembar Kerja Excel: {filename}</div>
            <div className={s.fileMeta}>
              {sheetNames.length} Sheet &middot; Sheet aktif: <strong>{activeSheet}</strong> ({filteredRows.length} baris data)
            </div>
          </div>
        </div>
        <div className={s.headerRight}>
          <div className={s.searchBox}>
            <Search size={13} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Cari sel di sheet ini..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              className={s.searchInput}
            />
          </div>
        </div>
      </div>

      {/* Sheet Tabs */}
      {sheetNames.length > 1 && (
        <div className={s.sheetTabsBar}>
          {sheetNames.map(name => (
            <button
              key={name}
              className={`${s.sheetTab} ${activeSheet === name ? s.sheetTabActive : ''}`}
              onClick={() => { setActiveSheet(name); setPage(1); setSearchTerm('') }}
            >
              <Table size={13} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid Table */}
      <div className={s.tableWrapper}>
        {filteredRows.length === 0 ? (
          <div className={s.emptyState}>
            Tidak ada baris data yang ditemukan di sheet ini.
          </div>
        ) : (
          <table className={s.gridTable}>
            <thead>
              <tr>
                <th className={s.rowNumberTh}>#</th>
                {headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td className={s.rowNumberTd}>{(page - 1) * pageSize + rIdx + 1}</td>
                  {headers.map((_, cIdx) => (
                    <td key={cIdx}>
                      {formatCellValue(row[cIdx])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Pagination */}
      <div className={s.footer}>
        <span>
          Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} dari {filteredRows.length} baris
        </span>
        {totalPages > 1 && (
          <div className={s.paginationBtns}>
            <button
              className={s.pageBtn}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ArrowLeft size={11} style={{ display: 'inline', marginRight: 2 }} /> Prev
            </button>
            <span style={{ fontSize: 11, alignSelf: 'center' }}>
              Halaman {page} / {totalPages}
            </span>
            <button
              className={s.pageBtn}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <ArrowRight size={11} style={{ display: 'inline', marginLeft: 2 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
