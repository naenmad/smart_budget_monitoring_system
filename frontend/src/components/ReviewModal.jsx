import { useState } from 'react'
import s from './ReviewModal.module.css'
import { prPoDataApi } from '../api/prPoDataApi'
import { useAuth } from '../context/AuthContext'
import { X, AlertCircle, Check, Loader2 } from 'lucide-react'

export default function ReviewModal({ record, categories, onClose, onSuccess }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')
  const [selectedCat, setSelectedCat] = useState('')

  async function handleApprove() {
    setApproving(true)
    setError('')
    try {
      const res = await prPoDataApi.approve(record.id, { direview_oleh: user?.id })
      if (res.success) {
        onSuccess(res.data)
      } else {
        setError(res.message || 'Gagal menyetujui')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyetujui')
    } finally {
      setApproving(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!selectedCat) {
      setError('Pilih budget code / kategori terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const res = await prPoDataApi.review(record.id, {
        kategori_id_koreksi: parseInt(selectedCat, 10),
        direview_oleh: user?.id,
      })

      if (res.success) {
        onSuccess(res.data)
      } else {
        setError(res.message || 'Gagal menyimpan perubahan')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.header}>
          <h2>Review Manual & Koreksi Code</h2>
          <button className={s.closeBtn} onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={s.form}>
          {error && (
            <div className={s.error}>
              <AlertCircle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {error}
            </div>
          )}

          <div className={s.infoBox}>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>PR DocNum</span>
              <span className={s.infoValue}>{record.pr_doc_num || '—'}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Deskripsi</span>
              <span className={s.infoValue}>{record.description || '—'}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Komentar</span>
              <span className={s.infoValue}>{record.comment_text || '—'}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoLabel}>Saran AI</span>
              <span className={s.infoValue}>{record.kategori_kode || 'UNKNOWN'} ({record.metode_klasifikasi || '—'})</span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.label}>Pilih Budget Code yang Benar</label>
            <select
              className={s.select}
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
            >
              <option value="" disabled>-- Pilih Kode --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.kode} - {c.nama} ({c.tipe_formulir})
                </option>
              ))}
            </select>
          </div>

          <div className={s.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading || approving}>
              Batal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading || approving}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: (loading || approving) ? 0.6 : 1,
              }}
            >
              {approving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyetujui...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>ACC</span>
                </>
              )}
            </button>
            <button type="submit" className="btn-primary" disabled={loading || approving}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
