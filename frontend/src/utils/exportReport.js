import { formatRp } from './format'

/**
 * Generate and download professional Excel budget report for PT Summit Adyawinsa Indonesia
 * Uses dynamic import for xlsx to avoid loading it in the initial bundle
 */
export async function exportBudgetSummaryToExcel({
  periode = new Date().getFullYear(),
  capex = { budget: 0, actual_pr: 0, actual_gr: 0, saldo_pr: 0, saldo_gr: 0, persen_pr: 0, persen_gr: 0 },
  opex = { budget: 0, actual_pr: 0, actual_gr: 0, saldo_pr: 0, saldo_gr: 0, persen_pr: 0, persen_gr: 0 },
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

  const capexActualPr = Number(capex.actual_pr || capex.actual || 0)
  const capexActualGr = Number(capex.actual_gr || 0)
  const capexBudget = Number(capex.budget || 0)
  const capexSaldoPr = Number(capex.saldo_pr !== undefined ? capex.saldo_pr : (capexBudget - capexActualPr))
  const capexPctPr = capexBudget > 0 ? (capex.persen_pr || Math.round((capexActualPr / capexBudget) * 100)) : 0
  const capexPctGr = capexBudget > 0 ? (capex.persen_gr || Math.round((capexActualGr / capexBudget) * 100)) : 0

  const opexActualPr = Number(opex.actual_pr || opex.actual || 0)
  const opexActualGr = Number(opex.actual_gr || 0)
  const opexBudget = Number(opex.budget || 0)
  const opexSaldoPr = Number(opex.saldo_pr !== undefined ? opex.saldo_pr : (opexBudget - opexActualPr))
  const opexPctPr = opexBudget > 0 ? (opex.persen_pr || Math.round((opexActualPr / opexBudget) * 100)) : 0
  const opexPctGr = opexBudget > 0 ? (opex.persen_gr || Math.round((opexActualGr / opexBudget) * 100)) : 0

  // 1. Data Ringkasan Eksekutif
  const data = [
    ['PT SUMMIT ADYAWINSA INDONESIA'],
    ['LAPORAN REALISASI BUDGET & MONITORING QC'],
    [`Tahun Anggaran: ${periode}`],
    [`Tanggal Export: ${currentDateStr}`],
    [],
    ['1. RINGKASAN ANGGARAN CAPEX vs OPEX (KOMITMEN PR vs REALISASI FISIK GR)'],
    ['Tipe Anggaran', 'Pagu Budget (Rp)', 'Komitmen PR (Rp)', 'Realisasi GR (Rp)', 'Sisa Saldo PR (Rp)', '% Pakai PR', '% Selesai GR', 'Status'],
    [
      'CAPEX (Capital Expenditure)',
      capexBudget,
      capexActualPr,
      capexActualGr,
      capexSaldoPr,
      `${capexPctPr}%`,
      `${capexPctGr}%`,
      capexActualPr > capexBudget ? 'OVER BUDGET' : (capexPctPr >= 80 ? 'WARNING (>=80%)' : 'AMAN')
    ],
    [
      'OPEX (Operational Expenditure)',
      opexBudget,
      opexActualPr,
      opexActualGr,
      opexSaldoPr,
      `${opexPctPr}%`,
      `${opexPctGr}%`,
      opexActualPr > opexBudget ? 'OVER BUDGET' : (opexPctPr >= 80 ? 'WARNING (>=80%)' : 'AMAN')
    ],
    [],
    ['2. RINCIAN REALISASI PER FORMULIR'],
    ['Kode Form', 'Nama Kategori', 'Tipe', 'Pagu Budget (Rp)', 'Komitmen PR (Rp)', 'Realisasi GR (Rp)', 'Sisa Saldo PR (Rp)', '% Pakai PR', '% Selesai GR', 'Status']
  ]

  // 2. Tambahkan Baris Data per Form (E-1, E-9, I-1, dll)
  items.forEach(item => {
    const budget = Number(item.budget || 0)
    const actualPr = Number(item.actual_pr || item.actual || 0)
    const actualGr = Number(item.actual_gr || 0)
    const saldoPr = Number(item.saldo_pr !== undefined ? item.saldo_pr : (budget - actualPr))
    const pctPr = budget > 0 ? (item.persen_pr || Math.round((actualPr / budget) * 100)) : 0
    const pctGr = budget > 0 ? (item.persen_gr || Math.round((actualGr / budget) * 100)) : 0

    let statusText = 'AMAN'
    if (pctPr > 100 || saldoPr < 0) statusText = 'OVER BUDGET'
    else if (pctPr >= 80) statusText = 'WARNING (>=80%)'

    data.push([
      item.kode || '-',
      item.nama || '-',
      item.tipe_formulir || item.type || '-',
      budget,
      actualPr,
      actualGr,
      saldoPr,
      `${pctPr}%`,
      `${pctGr}%`,
      statusText
    ])
  })

  // 3. Konversi array of arrays ke Sheet XLSX
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Atur lebar kolom (column widths)
  worksheet['!cols'] = [
    { wch: 30 }, // Kolom A
    { wch: 32 }, // Kolom B
    { wch: 15 }, // Kolom C
    { wch: 22 }, // Kolom D
    { wch: 22 }, // Kolom E
    { wch: 22 }, // Kolom F
    { wch: 22 }, // Kolom G
    { wch: 16 }, // Kolom H
    { wch: 16 }, // Kolom I
    { wch: 20 }, // Kolom J
  ]

  // 4. Buat Workbook dan simpan
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, `Budget_${periode}`)

  const filename = `Laporan_Realisasi_Budget_SAI_${periode}.xlsx`
  XLSX.writeFile(workbook, filename)
}
