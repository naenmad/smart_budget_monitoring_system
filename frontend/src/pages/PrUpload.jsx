import { useState, useRef } from 'react'
import { prApi } from '../api/prApi'
import { uploadHistoryApi } from '../api/uploadHistoryApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { UploadCloud, CheckCircle2, ArrowRight, Loader2, FileSpreadsheet, Info, Check } from 'lucide-react'
import styles from './PrUpload.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - 2 + i))

export default function PrUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [periode, setPeriode] = useState(String(CURRENT_YEAR))
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
          const required = ['pr_doc_num', 'description', 'request_date']
          const missing = required.filter(r => !normalizedHeaders.includes(r) && !normalizedHeaders.includes('pr_docnum'))
          
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

  function startPolling(uploadId) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    
    pollingRef.current = setInterval(async () => {
      try {
        const res = await uploadHistoryApi.getById(uploadId)
        const status = res.data?.status
        
        if (status === 'SUCCESS') {
          clearInterval(pollingRef.current)
          setLoading(false)
          setResult({
            success: true,
            data: {
              total_data: res.data.total_data,
              upload_id: uploadId,
              periode
            }
          })
          toast.success('Upload dan pemrosesan PR selesai!')
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
      const res = await prApi.upload(formData)
      if (res.data?.data?.upload_id) {
        toast.success(res.data.message || 'File sedang diproses...')
        startPolling(res.data.data.upload_id)
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
        <h1 className={styles.title}>Upload Purchase Requisition (PR)</h1>
        <p className={styles.subtitle}>Unggah file PR untuk pencocokan otomatis dengan item budget planning</p>
      </div>

      <div className={styles.grid}>
        {/* Kolom Kiri: Form Upload */}
        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div>
              <label className={styles.label}>Tahun Periode *</label>
              <select
                className={styles.input}
                value={periode}
                onChange={e => setPeriode(e.target.value)}
                required
                disabled={loading}
              >
                {YEAR_OPTIONS.map(yr => (
                  <option key={yr} value={yr}>
                    Tahun {yr} {yr === String(CURRENT_YEAR) ? '(Tahun Berjalan)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>File Excel PR *</label>
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
                      {isDragging ? 'Lepaskan file PR di sini' : 'Drag & Drop atau Klik untuk memilih file Excel PR'}
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
                  <span>Memproses di Background...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload PR</span>
                </>
              )}
            </button>
          </form>

          {result?.success && !loading && (
            <div className={styles.successBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <strong>Berhasil Diproses!</strong>
              </div>
              <div style={{ fontSize: '12.5px', color: '#166534', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>Total PR diproses: <strong>{result.data?.total_data}</strong> baris</div>
                <div>Upload ID: <strong>#{result.data?.upload_id}</strong></div>
                <div>Periode: <strong>{result.data?.periode}</strong></div>
              </div>
              <div style={{ marginTop: 12 }}>
                <a href="/pr/result" className={styles.resultLink}>
                  <span>Lihat Result Matching</span>
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Panduan Format */}
        <div className={styles.guideCard}>
          <div className={styles.guideHeader}>
            <Info size={16} color="#0284c7" />
            <span>Ketentuan Format Excel PR</span>
          </div>

          <p className={styles.guideDesc}>
            Format Excel PR harus mencantumkan kolom-kolom utama berikut:
          </p>

          <ul className={styles.guideList}>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>pr_doc_num</code> : Nomor Dokumen PR</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>description</code> : Deskripsi nama barang/jasa</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>request_date</code> : Tanggal pengajuan PR</span>
            </li>
            <li>
              <Check size={14} className={styles.checkIcon} />
              <span><code>total_price</code> : Total nominal harga PR</span>
            </li>
          </ul>

          <div className={styles.optionalNote}>
            <strong>Kolom Opsional:</strong> <code>po_doc_num</code>, <code>supplier_name</code>, <code>qty</code>, <code>uom</code>, <code>unit_price</code>
          </div>
        </div>
      </div>
    </div>
  )
}
