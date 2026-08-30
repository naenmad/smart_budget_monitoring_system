import api from './api'

export const prApi = {

  // Upload Excel PR + jalankan matching
  upload: (formData) =>
    api.post('/pr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),


  // List PR dengan filter
  getAll: (params = {}) =>
    api.get('/pr/', { params }),

  // Detail satu PR
  getById: (id) =>
    api.get(`/pr/${id}`),

  // Ringkasan status AI per upload
  getSummary: (uploadId) =>
    api.get(`/pr/summary/${uploadId}`),

  // Manual override kategori
  updateKategori: (id, data) =>
    api.put(`/pr/${id}/kategori`, data),

  // Pipeline Dashboard Summary
  getDashboardSummary: (periode) =>
    api.get(`/pr/dashboard_summary`, { params: { periode } }),

  // Pipeline Dashboard Summary Monthly
  getDashboardSummaryMonthly: (periode) =>
    api.get(`/pr/dashboard_summary_monthly`, { params: { periode } }),

  // Trigger Pipeline
  processPipeline: (periode) =>
    api.post(`/pr/process_pipeline`, { periode }),

  // Retry Mapping Only (Untuk NEED_MAPPING)
  retryMapping: (periode) =>
    api.post(`/pr/retry_mapping`, { periode }),

  // Batalkan PR langsung (bukan cancel Planning)
  cancelPr: (id, userId, alasan = '') =>
    api.post(`/pr/${id}/cancel`, { user_id: userId, alasan }),

  // Edit / Koreksi Status PR (PLANNING, OOP, NEED_MAPPING, CANCELLED, RESTORE)
  editStatus: (id, data) =>
    api.post(`/pr/${id}/status`, data),
}
