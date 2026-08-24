import { useState, useRef } from 'react'
import { planningApi } from '../api/planningApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { UploadCloud, CheckCircle2, Loader2, FileSpreadsheet, Info, Check } from 'lucide-react'
import styles from './PlanningUpload.module.css'

export default function PlanningUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [periode, setPeriode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const pollingRef = useRef(null)

  function validateExcelHeaders(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0]
          
          if (!headers) return resolve({ valid: false, message: 'File Excel kosong' })
          
          const normalizedHeaders = headers.map(h => String(h).trim().toLowerCase().replace(/ /g, '_').replace(/-/g, '_'))
          const required = ['month', 'form', 'item', 'planning_amount', 'remarks']
          const missing = required.filter(r => !normalizedHeaders.includes(r))
          
          if (missing.length > 0) {
            resolve({ valid: false, message: `Kolom wajib tidak ditemukan: ${missing.join(', ')}` })
          } else {
            resolve({ valid: true })
          }
        } catch (err) {
          resolve({ valid: false, message: 'Gagal membaca file Excel' })
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  function startPolling(planningHeaderId) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    
    pollingRef.current = setInterval(async () => {
      try {
        const res = await planningApi.getById(planningHeaderId)
        const status = res.data?.data?.status
        
        if (status === 'SUCCES') { // The backend spells it SUCCES
          clearInterval(pollingRef.current)
          setLoading(false)
          setResult({
            success: true,
            message: "File berhasil diupload dan diproses",
            data: {
              planning_header_id: planningHeaderId,
            }
          })
          toast.success('Upload dan pemrosesan Planning selesai!')
        } else if (status === 'FAILED') {
          clearInterval(pollingRef.current)
          setLoading(false)
          toast.error('Gagal memproses file di background')
        }
      } catch (err) {
        clearInterval(pollingRef.current)
        setLoading(false)
        toast.error('Gagal mengecek status upload')
      }
    }, 2000)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      toast.error('Pilih file terlebih dahulu')
      return
    }
    if (!periode) {
      toast.error('Periode wajib diisi')
      return
    }

    const validation = await validateExcelHeaders(file)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('periode', periode)
    formData.append('user_id', user?.id || 1)

    setLoading(true)
    setResult(null)

    try {
      const res = await planningApi.upload(formData)
      if (res.data?.data?.planning_header_id) {
        toast.success(res.data.message || 'File sedang diproses...')
        startPolling(res.data.data.planning_header_id)
      } else {
        setResult(res.data)
        setLoading(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload gagal')
      setLoading(false)
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!loading) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (loading) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      const ext = droppedFile.name.split('.').pop().toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile)
      } else {
        toast.error('Format file harus berupa file Excel (.xlsx atau .xls)')
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Upload Planning Anggaran</h1>
        <p className={styles.subtitle}>Unggah data planning budget tahunan untuk monitoring realisasi</p>
      </div>

      <div className={styles.grid}>
        {/* Kolom Kiri: Form Upload */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label className={styles.label}>Tahun Periode *</label>
              <input
                className={styles.input}
                placeholder="Contoh: 2025"
                value={periode}
                onChange={e => setPeriode(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className={styles.label}>File Excel Planning *</label>
              <div 
                className={`${styles.dropzone} ${file ? styles.dropzoneActive : ''} ${isDragging ? styles.dropzoneDragging : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xls,.xlsx"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  disabled={loading}
                />
                
                {file ? (
                  <div className={styles.filePreview}>
                    <FileSpreadsheet size={32} color="#16a34a" />
                    <div>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB • Klik atau drag file lain untuk mengganti</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropzonePlaceholder}>
                    <UploadCloud size={32} className={styles.uploadIcon} />
                    <div className={styles.dropzoneTitle}>
                      {isDragging ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk memilih file Excel'}
                    </div>
                    <div className={styles.dropzoneSub}>Mendukung format .xlsx dan .xls</div>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.btnPrimary}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Mengupload di Background...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload Planning</span>
                </>
              )}
            </button>
          </form>

          {result?.success && !loading && (
            <div className={styles.successBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <strong>{result.message}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#166534' }}>
                Planning Header ID: <strong>#{result.data?.planning_header_id}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Panduan Format */}
        <div className={styles.guideCard}>
          <div className={styles.guideHeader}>
            <Info size={16} color="#0284c7" />
            <span>Ketentuan Format Excel</span>
          </div>

          <p className={styles.guideDesc}>
            Pastikan file Excel yang diunggah memiliki sheet pertama dengan kolom-kolom berikut:
          </p>

          <ul className={styles.guideList}>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>month</code> : Bulan (Jan, Feb, Mar, dll.)</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>form</code> : Kode Form (E-1, E-9, I-1)</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>item</code> : Nama atau deskripsi item planning</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>planning_amount</code> : Nilai nominal anggaran (angka)</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>remarks</code> : Keterangan atau catatan tambahan</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
