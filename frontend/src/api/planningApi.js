import api from './api'

export const planningApi = {
  // Upload Excel Planning
  upload: (formData) =>
    api.post('/planning/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),

  // List semua PlanningHeader
  getAll: (params = {}) =>
    api.get('/planning/', { params }),

  // Detail satu header
  getById: (id) =>
    api.get(`/planning/${id}`),

  // Detail items (per bulan & item)
  getDetails: (id, params = {}) =>
    api.get(`/planning/${id}/details`, { params }),

  // Delete Planning
  delete: (id) =>
    api.delete(`/planning/${id}`),

  cancelPlanningDetail: (planningDetailId) =>
    api.post(`/planning/detail/${planningDetailId}/cancel`),

  getCancelled: (params = {}) =>
    api.get('/planning/cancelled', { params }),

  // Dedicated Out of Budget Transactions
  getOutOfBudget: (params = {}) =>
    api.get('/planning/out-of-budget', { params }),

  // Dedicated Master Data Preventive C/F
  getPreventiveCf: (params = {}) =>
    api.get('/planning/preventive-cf', { params }),

  // Download Planning Excel Report
  downloadExcel: (periode = '2026') =>
    api.get('/planning/export', {
      params: { periode },
      responseType: 'blob'
    }),

  // Export Format Resmi DATABASE WEB BUDGET (5 Sheets) - Microsoft Excel & Apple Numbers
  exportDatabaseBudget: (periode = '2026') =>
    api.get('/planning/export-database-budget', {
      params: { periode },
      responseType: 'blob'
    }),

  // Import / Sinkronisasi Format Resmi DATABASE WEB BUDGET (5 Sheets)
  importDatabaseBudget: (formData) =>
    api.post('/planning/import-database-budget', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 180000,
    }),
}
