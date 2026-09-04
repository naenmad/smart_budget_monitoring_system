import api from './api'

export const budgetApi = {
  /**
   * Get budget summary for dashboard
   * @param {string} [periode]
   */
  getSummary(periode) {
    return api.get('/budgets/summary', { params: { periode } })
      .then(res => res.data)
  },

  /**
   * Get all budgets, optionally filtered by periode
   * @param {string} [periode]
   */
  getAll(periode) {
    return api.get('/budgets', { params: { periode } })
      .then(res => res.data)
  },

  /**
   * Get budget by ID
   * @param {number} id
   */
  getById(id) {
    return api.get(`/budgets/${id}`)
      .then(res => res.data)
  },

  /**
   * Create a new budget
   * @param {{ kategori_id: number, periode: string, nominal: number, created_by?: number }} data
   */
  create(data) {
    return api.post('/budgets', data)
      .then(res => res.data)
  },

  /**
   * Update budget
   * @param {number} id
   * @param {Object} data
   */
  update(id, data) {
    return api.put(`/budgets/${id}`, data)
      .then(res => res.data)
  },

  /**
   * Delete budget
   * @param {number} id
   */
  delete(id) {
    return api.delete(`/budgets/${id}`)
      .then(res => res.data)
  },

  deleteByPeriode(periode) {
    return api.delete(`/budgets/periode/${periode}`)
      .then(res => res.data)
  },

  /**
   * Get detail planned items and PR transactions for a specific month
   * @param {string} periode
   * @param {string} month
   */
  getMonthlyItems(periode, month) {
    return api.get('/budgets/monthly_items', { params: { periode, month } })
      .then(res => res.data)
  },
}
