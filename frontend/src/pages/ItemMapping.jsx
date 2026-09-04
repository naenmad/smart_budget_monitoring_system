import toast from 'react-hot-toast'

import { useState, useEffect } from 'react'
import { itemMappingApi } from '../api/itemMappingApi'
import { kategoriApi } from '../api/kategoriApi'
import { Lightbulb, Plus, Edit2, Trash2, Check, X, Search } from 'lucide-react'
import styles from './ItemMapping.module.css'

export default function ItemMapping() {
  const [mappings, setMappings] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState({ keyword: '', planning_item: '', kategori_id: '', priority: 1, is_active: true })
  const [suggestions, setSuggestions] = useState([])
  const [appliedKeyword, setAppliedKeyword] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchAll() }, [])
  useEffect(() => {
    kategoriApi.getAll().then(d => setKategoris(d.data || [])).catch(() => { })
  }, [])
  useEffect(() => {
    itemMappingApi.getSuggestions()
      .then(res => setSuggestions(res.data?.data || []))
      .catch(() => { })
  }, [])

  function applySuggestion(s) {
    setAppliedKeyword(s.description)
    setForm({ keyword: s.description, planning_item: s.planning_item, kategori_id: '', priority: 1, is_active: true })
    setEditData(null)
    setShowForm(true)
  }

  function dismissSuggestion(s) {
    setSuggestions(prev => prev.filter(x => x.description !== s.description))
    itemMappingApi.create({
      keyword: s.description,
      planning_item: s.planning_item,
      kategori_id: null,
      priority: 1,
      is_active: false
    }).catch(() => {
      toast.error('Gagal menyimpan dismiss — saran akan muncul lagi setelah refresh')
    })
  }

  async function fetchAll() {
    setLoading(true)
    try {
      const res = await itemMappingApi.getAll()
      setMappings(res.data?.data || [])
    } catch { setError('Gagal memuat data') }
    finally { setLoading(false) }
  }

  function closeForm() {
    setShowForm(false)
    setAppliedKeyword(null)
  }

  function openCreate() { setForm({ keyword: '', planning_item: '', kategori_id: '', priority: 1, is_active: true }); setEditData(null); setShowForm(true) }
  function openEdit(m) { setForm({ keyword: m.keyword, planning_item: m.planning_item, kategori_id: m.kategori_id || '', priority: m.priority, is_active: m.is_active }); setEditData(m); setShowForm(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editData) {
        await itemMappingApi.update(editData.id, form)
        toast.success('Mapping berhasil diupdate')
      } else {
        await itemMappingApi.create(form)
        toast.success('Mapping berhasil dibuat')
        if (appliedKeyword) {
          setSuggestions(prev => prev.filter(s => s.description !== appliedKeyword))
        }
      }
      closeForm()
      fetchAll()
    } catch { toast.error('Gagal menyimpan mapping') }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus mapping ini?')) return
    try { await itemMappingApi.delete(id); fetchAll() }
    catch { toast.error('Gagal menghapus') }
  }

  const statusBadge = (active) => (
    <span className={active ? styles.badgeActive : styles.badgeInactive}>
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )

  const filteredMappings = mappings.filter(m => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const kat = kategoris.find(k => k.id === m.kategori_id)
    const katText = kat ? `${kat.kode} ${kat.nama}`.toLowerCase() : ''
    return (
      (m.keyword || '').toLowerCase().includes(q) ||
      (m.planning_item || '').toLowerCase().includes(q) ||
      katText.includes(q)
    )
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Item Mapping Keyword</h1>
          <p className={styles.subtitle}>Kelola aturan pencocokan kata kunci PR ke nama item planning anggaran</p>
        </div>
        <button onClick={openCreate} className={styles.btnPrimary}>
          <Plus size={16} />
          <span>Tambah Mapping</span>
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {suggestions.length > 0 && (
        <div className={styles.suggestionPanel}>
          <h3 className={styles.suggestionTitle}>
            <Lightbulb size={16} style={{ color: '#d97706' }} />
            <span>Saran Rule dari Histori Realisasi ({suggestions.length})</span>
          </h3>
          <div className={styles.suggestionList}>
            {suggestions.map((s, i) => (
              <div key={i} className={styles.suggestionRow}>
                <div>
                  <span className={styles.sugKeyword}>"{s.description}"</span>
                  <span className={styles.sugArrow}> → </span>
                  <strong className={styles.sugItem}>{s.planning_item}</strong>
                  <span className={styles.sugCount}> ({s.jumlah_kemunculan}x dipilih)</span>
                </div>
                <div className={styles.suggestionActions}>
                  <button onClick={() => applySuggestion(s)} className={styles.btnPrimarySm}>
                    <Check size={13} />
                    <span>Jadikan Rule</span>
                  </button>
                  <button onClick={() => dismissSuggestion(s)} className={styles.btnCancelSm}>
                    <X size={13} />
                    <span>Abaikan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{editData ? 'Edit' : 'Tambah'} Item Mapping</h3>
            <form onSubmit={handleSubmit} className={styles.formGroup}>
              <div>
                <label className={styles.label}>Keyword PR *</label>
                <input className={styles.input} placeholder="Kata kunci pada PR" value={form.keyword} onChange={e => setForm({ ...form, keyword: e.target.value })} required />
              </div>

              <div>
                <label className={styles.label}>Planning Item Target *</label>
                <input className={styles.input} placeholder="Nama item pada Budget Planning" value={form.planning_item} onChange={e => setForm({ ...form, planning_item: e.target.value })} required />
              </div>

              <div>
                <label className={styles.label}>Kategori Form</label>
                <select className={styles.select} value={form.kategori_id} onChange={e => setForm({ ...form, kategori_id: e.target.value })}>
                  <option value="">-- Semua Kategori --</option>
                  {kategoris.map(k => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                </select>
              </div>

              <div>
                <label className={styles.label}>Priority Order</label>
                <input type="number" className={styles.input} value={form.priority} min={1} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })} />
              </div>

              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span>Aktifkan Rule Mapping Ini</span>
              </label>

              <div className={styles.actionRow}>
                <button type="button" onClick={closeForm} className={styles.btnCancel}>Batal</button>
                <button type="submit" className={styles.btnSubmit}>Simpan Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Cari rule berdasarkan keyword PR, planning target, atau kategori..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => setSearchQuery('')}
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className={styles.countBadge}>
          Menampilkan <strong>{filteredMappings.length}</strong> dari <strong>{mappings.length}</strong> aturan
        </div>
      </div>

      {/* Table */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.loading}>Memuat data mapping...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  {['#', 'Keyword', 'Planning Item Target', 'Kategori', 'Priority', 'Status', 'Aksi'].map(h => (
                    <th key={h} className={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMappings.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>
                      {searchQuery ? `Tidak ada aturan yang cocok dengan "${searchQuery}"` : 'Belum ada data rule mapping'}
                    </td>
                  </tr>
                )}
                {filteredMappings.map((m, i) => {
                  const kat = kategoris.find(k => k.id === m.kategori_id)
                  return (
                    <tr key={m.id} className={styles.tr}>
                      <td className={styles.td} style={{ width: 40 }}>{i + 1}</td>
                      <td className={styles.td}><strong>{m.keyword}</strong></td>
                      <td className={styles.td}>{m.planning_item}</td>
                      <td className={styles.td}>
                        {kat ? (
                          <span className={styles.categoryBadge} title={kat.nama}>
                            {kat.kode}
                          </span>
                        ) : '-'}
                      </td>
                      <td className={styles.td}>{m.priority}</td>
                      <td className={styles.td}>{statusBadge(m.is_active)}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(m)} className={styles.btnEdit} title="Edit Mapping">
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDelete(m.id)} className={styles.btnDelete} title="Hapus Mapping">
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
