import * as XLSX from 'xlsx'

/**
 * Export JSON array of objects to Excel (.xlsx) file
 * @param {Array<Object>} rows - Array of flat data objects
 * @param {string} filename - Target filename (without extension)
 * @param {string} sheetName - Worksheet title
 */
export function exportJsonToExcel(rows, filename = 'Data_Export', sheetName = 'Data') {
  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada data untuk diexport')
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  
  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => {
    const maxValLen = Math.max(
      key.length,
      ...rows.map(r => String(r[key] || '').length)
    )
    return { wch: Math.min(Math.max(maxValLen + 2, 10), 60) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  
  const today = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`)
}
