import api from './api'

export const mappingApi = {
  getPending: (params = {}) =>
    api.get('/mapping/pending', { params }),

  confirmMapping: (prId, data) =>
    api.post(`/mapping/${prId}/confirm`, data),

  searchPlanningDetail: (prId, keyword) =>
    api.get('/mapping/planning_detail/search', {
      params: { pr_id: prId, keyword }
    }),

  // Daftar item yang ditandai Out of Plan
  getOopList: (params = {}) =>
    api.get('/mapping/oop', { params }),

  // Batalkan konfirmasi mapping/OOP sebelumnya, kembalikan ke antrian review
  undoMapping: (prId) =>
    api.post(`/mapping/${prId}/undo_mapping`),

  bulkConfirm: (mappings) => 
    api.post('/mapping/bulk_confirm', { mappings }),

  // Pengaturan Otomatisasi Mapping
  getSettings: () =>
    api.get('/mapping/settings'),

  updateSettings: (data) =>
    api.post('/mapping/settings', data),

  autoConfirmByThreshold: () =>
    api.post('/mapping/auto_confirm_threshold'),

  // Dataset Graf Relasi Traceability Master Planning & PR Realization
  getGraphData: (params = {}) =>
    api.get('/mapping/graph', { params }),
}