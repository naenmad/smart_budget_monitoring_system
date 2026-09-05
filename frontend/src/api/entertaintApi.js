import api from './api'

export const entertaintApi = {
  // Ambil daftar biaya entertaint dengan pagination, search, dan filter
  getAll: (params = {}) =>
    api.get('/entertaint/', { params }),

  // Ambil ringkasan KPI (Total Biaya, Lunas, Belum Lunas, Open Claim, dsb.)
  getSummary: (params = {}) =>
    api.get('/entertaint/summary', { params }),

  // Ambil detail satu catatan beserta lampiran struk
  getById: (id) =>
    api.get(`/entertaint/${id}`),

  // Catat pengeluaran baru (Mendukung FormData multipart dengan lampiran struk sekaligus)
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/entertaint/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    return api.post('/entertaint/', data)
  },

  // Perbarui catatan entertaint
  update: (id, data) =>
    api.put(`/entertaint/${id}`, data),

  // Hapus catatan entertaint beserta seluruh struknya
  delete: (id) =>
    api.delete(`/entertaint/${id}`),

  // Unggah foto struk tambahan untuk catatan yang sudah ada
  uploadReceipts: (costId, formData) =>
    api.post(`/entertaint/${costId}/receipts`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Hapus satu foto struk
  deleteReceipt: (receiptId) =>
    api.delete(`/entertaint/receipts/${receiptId}`),

  // Download laporan Excel multi-sheet
  exportExcel: async (params = {}) => {
    const response = await api.get('/entertaint/export', {
      params,
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Monitoring_Entertaint_Cost_${new Date().toISOString().slice(0, 10)}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return response
  },

  // Upload file Excel untuk batch import
  importExcel: (formData) =>
    api.post('/entertaint/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Cashflow / Buku Kas Kasbon QC
  getCashflows: (params = {}) =>
    api.get('/entertaint/cashflow', { params }),

  createCashflow: (data) =>
    api.post('/entertaint/cashflow', data),

  deleteCashflow: (id) =>
    api.delete(`/entertaint/cashflow/${id}`),

  // Recap Kasbon ke Marketing (History Closing QC - Marketing)
  getRecapMkt: (params = {}) =>
    api.get('/entertaint/recap-mkt', { params }),

  createRecapMkt: (data) =>
    api.post('/entertaint/recap-mkt', data),

  updateRecapMkt: (id, data) =>
    api.put(`/entertaint/recap-mkt/${id}`, data),

  deleteRecapMkt: (id) =>
    api.delete(`/entertaint/recap-mkt/${id}`),

  // Master Referensi (Customer PT, PIC Tugas Luar, Place of Occurrence)
  getMasters: () =>
    api.get('/entertaint/masters'),

  createMaster: (data) =>
    api.post('/entertaint/masters', data),

  deleteMaster: (id) =>
    api.delete(`/entertaint/masters/${id}`)
}
