import { formatRp } from './format'

/**
 * Generate and download professional Excel budget report for PT Summit Adyawinsa Indonesia
 * Uses dynamic import for xlsx to avoid loading it in the initial bundle
 */
export async function exportBudgetSummaryToExcel({
  periode = new Date().getFullYear(),
  capex = { budget: 0, actual: 0, saldo: 0, persen: 0 },
  opex = { budget: 0, actual: 0, saldo: 0, persen: 0 },
  items = []
}) {
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Dynamic import: hanya load xlsx saat user klik export
  const XLSX = await import('xlsx')

  // 1. Data Ringkasan Eksekutif
  const data = [
    ['PT SUMMIT ADYAWINSA INDONESIA'],
    ['LAPORAN REALISASI BUDGET & MONITORING QC'],
    [`Tahun Anggaran: ${periode}`],
    [`Tanggal Export: ${currentDateStr}`],
    [],
    ['1. RINGKASAN CAPEX vs OPEX'],
    ['Tipe Anggaran', 'Pagu Budget (Rp)', 'Realisasi Actual (Rp)', 'Sisa Saldo (Rp)', 'Persentase Pakai', 'Status'],
    [
      'CAPEX (Capital Expenditure)',
      Number(capex.budget || 0),
      Number(capex.actual || 0),
      Number(capex.saldo || 0),
      `${capex.persen || Math.round(((capex.actual || 0) / (capex.budget || 1)) * 100)}%`,
      (capex.actual || 0) > (capex.budget || 0) ? 'OVER BUDGET' : (capex.persen >= 80 ? 'WARNING (>=80%)' : 'AMAN')
    ],
    [
      'OPEX (Operational Expenditure)',
      Number(opex.budget || 0),
      Number(opex.actual || 0),
      Number(opex.saldo || 0),
      `${opex.persen || Math.round(((opex.actual || 0) / (opex.budget || 1)) * 100)}%`,
      (opex.actual || 0) > (opex.budget || 0) ? 'OVER BUDGET' : (opex.persen >= 80 ? 'WARNING (>=80%)' : 'AMAN')
    ],
    [
      'TOTAL KESELURUHAN',
      Number((capex.budget || 0) + (opex.budget || 0)),
      Number((capex.actual || 0) + (opex.actual || 0)),
      Number((capex.saldo || 0) + (opex.saldo || 0)),
      `${Math.round((((capex.actual || 0) + (opex.actual || 0)) / (((capex.budget || 0) + (opex.budget || 0)) || 1)) * 100)}%`,
      ((capex.actual || 0) + (opex.actual || 0)) > ((capex.budget || 0) + (opex.budget || 0)) ? 'OVER BUDGET' : 'AMAN'
    ],
    [],
    ['2. RINCIAN REALISASI PER FORMULIR'],
    ['Kode Form', 'Nama Kategori', 'Tipe', 'Pagu Budget (Rp)', 'Realisasi Actual (Rp)', 'Sisa Saldo (Rp)', '% Realisasi', 'Status']
  ]

  // 2. Tambahkan Baris Data per Form (E-1, E-9, I-1, dll)
  items.forEach(item => {
    const budget = Number(item.budget || 0)
    const actual = Number(item.actual || 0)
    const saldo = Number(item.saldo || (budget - actual))
    const pct = budget > 0 ? Math.round((actual / budget) * 100) : 0
    let statusText = 'AMAN'
    if (pct > 100 || saldo < 0) statusText = 'OVER BUDGET'
    else if (pct >= 80) statusText = 'WARNING (>=80%)'

    data.push([
      item.kode || '-',
      item.nama || '-',
      item.tipe_formulir || item.type || '-',
      budget,
      actual,
      saldo,
      `${pct}%`,
      statusText
    ])
  })

  // 3. Konversi array of arrays ke Sheet XLSX
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Atur lebar kolom (column widths)
  worksheet['!cols'] = [
    { wch: 30 }, // Kolom A
    { wch: 30 }, // Kolom B
    { wch: 15 }, // Kolom C
    { wch: 22 }, // Kolom D
    { wch: 22 }, // Kolom E
    { wch: 22 }, // Kolom F
    { wch: 16 }, // Kolom G
    { wch: 20 }, // Kolom H
  ]

  // 4. Buat Workbook dan simpan
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, `Budget_${periode}`)

  const filename = `Laporan_Realisasi_Budget_SAI_${periode}.xlsx`
  XLSX.writeFile(workbook, filename)
}
