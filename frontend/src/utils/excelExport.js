import * as XLSX from 'xlsx'

/**
 * Auto-fit column widths helper for worksheets
 */
function applyColWidths(ws, rows) {
  if (!rows || rows.length === 0) return
  const colWidths = Object.keys(rows[0] || {}).map(key => {
    const maxValLen = Math.max(
      key.length,
      ...rows.map(r => String(r[key] ?? '').length)
    )
    return { wch: Math.min(Math.max(maxValLen + 3, 10), 65) }
  })
  ws['!cols'] = colWidths
}

/**
 * Generic export JSON array of objects to Excel (.xlsx) file
 */
export function exportJsonToExcel(rows, filename = 'Data_Export', sheetName = 'Data') {
  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada data untuk diexport')
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  applyColWidths(ws, rows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const today = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${filename}_${today}.xlsx`)
}

const MONTH_NAMES = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
  7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember',
}

const ACCOUNT_NAMES = {
  '50032902': 'SUPPLIES EXPENSES',
  '60290100': 'MARKETING EXPENSES',
  '60290600': 'TRANSPORTATION OVERSEA',
}

/**
 * Dedicated Excel Export for Out of Plan (OOP)
 * Generates LAPORAN_OUT_OF_PLAN_QC_{periode}.xlsx with:
 * - Sheet 1: Detail_Transaksi_OOP
 * - Sheet 2: Ringkasan_Akun_dan_Bulan
 */
export function exportOutOfPlanExcel({ rows = [], rawData = {}, periode = '2026' }) {
  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada data Out of Plan untuk diexport')
  }

  // 1. Sheet Detail Transaksi OOP
  const detailRows = rows.map((r, idx) => ({
    'No': idx + 1,
    'Bulan': MONTH_NAMES[r.bulan] || r.bulan || '-',
    'Kode Akun GL': r.gl_account || '-',
    'Kategori Akun': ACCOUNT_NAMES[r.gl_account] || r.gl_account || '-',
    'Cost Center': r.cost_center || '-',
    'Tanggal Pengajuan': r.request_date
      ? new Date(r.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-',
    'Uraian / Deskripsi Item': r.description || '-',
    'PIC / Pengaju': r.pic || r.pengaju || '-',
    'Nominal OOP (Rp)': Number(r.total_price || 0),
    'No PR': r.pr_doc_num || '-',
    'No PO': r.po_doc_num || '-',
    'No GR': r.gr_legal_number || '-',
    'Status Tracking': r.tracking_stage || (r.gr_legal_number ? 'GR_COMPLETED' : 'PR_CREATED'),
    'Keterangan & Catatan Temuan': r.catatan_perbandingan || '-'
  }))

  const wsDetail = XLSX.utils.json_to_sheet(detailRows)
  applyColWidths(wsDetail, detailRows)

  // 2. Sheet Ringkasan per Akun & Bulan
  const totalNominal = rawData.total_nominal || detailRows.reduce((s, r) => s + r['Nominal OOP (Rp)'], 0)
  const accountEntries = Object.entries(rawData.account_stats || {})
  
  const accountSummaryRows = accountEntries.map(([code, nominal]) => {
    const pct = totalNominal > 0 ? ((nominal / totalNominal) * 100).toFixed(1) : '0'
    const txCount = rows.filter(r => r.gl_account === code).length
    return {
      'Kode GL': code,
      'Nama Kategori Akun': ACCOUNT_NAMES[code] || code,
      'Total Biaya OOP (Rp)': Number(nominal || 0),
      'Jumlah Transaksi': txCount,
      'Kontribusi (%)': `${pct}%`
    }
  })

  // Append Total Row for Summary
  accountSummaryRows.push({
    'Kode GL': 'TOTAL',
    'Nama Kategori Akun': 'Total Keseluruhan OOP',
    'Total Biaya OOP (Rp)': Number(totalNominal),
    'Jumlah Transaksi': rows.length,
    'Kontribusi (%)': '100.0%'
  })

  const wsSummary = XLSX.utils.json_to_sheet(accountSummaryRows)
  applyColWidths(wsSummary, accountSummaryRows)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Transaksi_OOP')
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Akun_OOP')

  XLSX.writeFile(wb, `LAPORAN_OUT_OF_PLAN_QC_${periode}.xlsx`)
}

/**
 * Dedicated Excel Export for Kalibrasi Alat QC
 * Generates LAPORAN_KALIBRASI_ALAT_QC_{periode}.xlsx with:
 * - Sheet 1: Realisasi_Aktual_GR
 * - Sheet 2: Master_Jadwal_Planning
 * - Sheet 3: Ringkasan_Kategori_Alat
 */
export function exportKalibrasiExcel({
  actualRows = [],
  planRows = [],
  toolTypeStats = {},
  summary = {},
  periode = '2026'
}) {
  const wb = XLSX.utils.book_new()

  // 1. Sheet Realisasi Transaksi Aktual & Dokumen GR
  const actualDataToExport = (actualRows || []).map((r, idx) => ({
    'No': idx + 1,
    'Bulan': r.bulan_name || r.bulan || '-',
    'Tanggal Request': r.request_date
      ? new Date(r.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-',
    'Tanggal Receipt (GR)': r.receipt_date
      ? new Date(r.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-',
    'Nama Alat Ukur': r.description || r.nama_alat || '-',
    'No Registrasi Alat': r.no_reg || '-',
    'Kategori Alat': r.tipe_alat || '-',
    'Biaya Kalibrasi Aktual (Rp)': Number(r.total_price || 0),
    'No PR': r.pr_doc_num || '-',
    'No PO': r.po_doc_num || '-',
    'No GR': r.gr_legal_number || '-',
    'Status GR': r.has_gr ? 'SELESAI (GR)' : 'DALAM PROSES',
    'Laboratorium Eksternal': r.supplier_name || 'Lab Kalibrasi',
    'PIC': r.pic || 'Pak Aris'
  }))

  const wsActual = XLSX.utils.json_to_sheet(actualDataToExport.length > 0 ? actualDataToExport : [{ 'Pemberitahuan': 'Tidak ada data aktual' }])
  if (actualDataToExport.length > 0) applyColWidths(wsActual, actualDataToExport)
  XLSX.utils.book_append_sheet(wb, wsActual, 'Realisasi_Aktual_GR')

  // 2. Sheet Master Jadwal Planning
  const planDataToExport = (planRows || []).map((r, idx) => ({
    'No': idx + 1,
    'Bulan Rencana': r.month || '-',
    'Bulan Realisasi': r.bulan_actual || '-',
    'Nama Alat Ukur (Plan)': r.item || r.nama_alat || '-',
    'No Registrasi': r.no_reg || '-',
    'Kategori Alat': r.tipe_alat || '-',
    'Pagu Rencana (Rp)': Number(r.planning_amount || 0),
    'Biaya Aktual (Rp)': Number(r.actual_amount || 0),
    'Selisih / Varian (Rp)': Number(r.selisih || 0),
    'Status Realisasi': r.status_detail || (r.actual_amount > 0 ? 'Terealisasi' : 'Belum Terealisasi'),
    'PIC': r.pic || 'Pak Aris',
    'Keterangan': r.remarks || '-'
  }))

  const wsPlan = XLSX.utils.json_to_sheet(planDataToExport.length > 0 ? planDataToExport : [{ 'Pemberitahuan': 'Tidak ada data rencana' }])
  if (planDataToExport.length > 0) applyColWidths(wsPlan, planDataToExport)
  XLSX.utils.book_append_sheet(wb, wsPlan, 'Master_Jadwal_Planning')

  // 3. Sheet Ringkasan Kategori Alat
  const catEntries = Object.entries(toolTypeStats || {})
  const totalActual = summary.total_actual_nominal || 1
  const catRows = catEntries.map(([cat, val]) => ({
    'Kategori Alat Ukur': cat,
    'Jumlah Instrumen Terkalibrasi': val.count || 0,
    'Total Biaya Kalibrasi (Rp)': Number(val.nominal || 0),
    'Kontribusi Biaya (%)': totalActual > 0 ? `${((val.nominal / totalActual) * 100).toFixed(1)}%` : '0%'
  }))

  if (catRows.length > 0) {
    catRows.push({
      'Kategori Alat Ukur': 'TOTAL KALIBRASI QC',
      'Jumlah Instrumen Terkalibrasi': (actualRows || []).length,
      'Total Biaya Kalibrasi (Rp)': Number(summary.total_actual_nominal || 0),
      'Kontribusi Biaya (%)': '100.0%'
    })
    const wsCat = XLSX.utils.json_to_sheet(catRows)
    applyColWidths(wsCat, catRows)
    XLSX.utils.book_append_sheet(wb, wsCat, 'Ringkasan_Kategori_Alat')
  }

  XLSX.writeFile(wb, `LAPORAN_KALIBRASI_ALAT_QC_${periode}.xlsx`)
}

/**
 * Dedicated Excel Export for Preventive C/F (Cutting Fixture)
 * Generates LAPORAN_PREVENTIVE_CF_QC_{periode}.xlsx with:
 * - Sheet 1: Daftar_Pemeliharaan_CF
 * - Sheet 2: Ringkasan_4_Kategori
 */
export function exportPreventiveCfExcel({
  items = [],
  categoryStats = [],
  summary = {},
  periode = '2026'
}) {
  if (!items || items.length === 0) {
    throw new Error('Tidak ada data Preventive C/F untuk diexport')
  }

  const wb = XLSX.utils.book_new()

  // Sheet 1: Daftar Pemeliharaan CF
  const detailRows = items.map((r, idx) => ({
    'No': idx + 1,
    'Bulan Rencana': r.bulan_list || '-',
    'Kategori Aktivitas': r.activity || '-',
    'Nama Item / Uraian': r.item || '-',
    'Spesifikasi Teknis': r.spesifikasi || '-',
    'Qty': Number(r.qty || 0),
    'Satuan': r.unit || '-',
    'Harga Satuan (Rp)': Number(r.cost || 0),
    'Pagu Rencana (Rp)': Number(r.total_list || 0),
    'Realisasi Pembayaran GL (Rp)': Number(r.actual_gl || 0),
    'Selisih / Sisa (Rp)': Number((r.total_list || 0) - (r.actual_gl || 0)),
    'Nomor Dokumen GL': r.no_dokumen_gl || '-',
    'Status Realisasi': (r.status || '').toLowerCase().includes('terealisasi') ? 'TEREALISASI' : 'PENDING'
  }))

  const wsDetail = XLSX.utils.json_to_sheet(detailRows)
  applyColWidths(wsDetail, detailRows)
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Daftar_Pemeliharaan_CF')

  // Sheet 2: Ringkasan 4 Kategori Aktivitas
  const catRows = (categoryStats || []).map(cat => ({
    'Kategori Aktivitas': cat.name || cat.meta?.label || '-',
    'Jumlah Item': cat.count || 0,
    'Pagu Rencana (Rp)': Number(cat.plan || 0),
    'Realisasi GL (Rp)': Number(cat.actual || 0),
    'Sisa Anggaran (Rp)': Number((cat.plan || 0) - (cat.actual || 0)),
    'Persentase Serapan (%)': cat.plan > 0 ? `${((cat.actual / cat.plan) * 100).toFixed(1)}%` : '0%'
  }))

  catRows.push({
    'Kategori Aktivitas': 'TOTAL PREVENTIVE C/F',
    'Jumlah Item': items.length,
    'Pagu Rencana (Rp)': Number(summary.total_plan || 0),
    'Realisasi GL (Rp)': Number(summary.total_actual || 0),
    'Sisa Anggaran (Rp)': Number(summary.sisa || 0),
    'Persentase Serapan (%)': summary.total_plan > 0
      ? `${((summary.total_actual / summary.total_plan) * 100).toFixed(1)}%`
      : '0%'
  })

  const wsCat = XLSX.utils.json_to_sheet(catRows)
  applyColWidths(wsCat, catRows)
  XLSX.utils.book_append_sheet(wb, wsCat, 'Ringkasan_4_Kategori')

  XLSX.writeFile(wb, `LAPORAN_PREVENTIVE_CF_QC_${periode}.xlsx`)
}

/**
 * Dedicated Excel Export for Price Variance (Plan vs Actual)
 */
export function exportPriceVarianceExcel({ items = [], summary = {}, periode = '2026' }) {
  if (!items || items.length === 0) {
    throw new Error('Tidak ada data Perbandingan Harga untuk diexport')
  }

  const wb = XLSX.utils.book_new()
  const rows = items.map((r, idx) => ({
    'No': idx + 1,
    'Bulan Plan': r.month || '-',
    'Bulan Actual': r.bulan_actual || '-',
    'Sub Kategori': r.sub_kategori || '-',
    'Deskripsi Item Planning': r.item || r.item_planning || '-',
    'Deskripsi Actual PO/GL': r.item_actual || '-',
    'Qty Plan': Number(r.qty ?? r.qty_plan ?? 0),
    'Qty Actual': Number(r.actual_qty ?? r.qty_actual ?? 0),
    'Harga Satuan Plan (Rp)': Number(r.unit_price_plan || 0),
    'Harga Satuan Actual (Rp)': Number(r.unit_price_actual || 0),
    'Total Pagu Plan (Rp)': Number(r.planning_amount || 0),
    'Total Biaya Actual (Rp)': Number(r.actual_amount || 0),
    'Varian Harga (Rp)': Number(r.price_variance ?? r.selisih ?? 0),
    'Status Varian': r.variance_type || r.variance_status || '-',
    'No PR / PO': r.baris_ref || r.pr_po_ref || '-',
    'No GR': r.gr_legal_number || '-',
    'PIC': r.pic || '-'
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  applyColWidths(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Perbandingan_Harga_Plan_Act')

  XLSX.writeFile(wb, `LAPORAN_PRICE_VARIANCE_QC_${periode}.xlsx`)
}
