import { useState, useRef } from 'react'
import { planningApi } from '../api/planningApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  Loader2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Layers, 
  Sparkles
} from 'lucide-react'
import styles from './PlanningUpload.module.css'
import ExcelViewer from '../components/ExcelViewer'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - 2 + i))

export default function PlanningUpload() {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [uploadPeriode, setUploadPeriode] = useState(String(CURRENT_YEAR))
  const [downloadPeriode, setDownloadPeriode] = useState(String(CURRENT_YEAR))
  
  const [uploadLoading, setUploadLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
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
          
          // Cari sheet data utama (misal Budget Planning Detail atau sheet pertama)
          let targetSheet = workbook.Sheets['Budget Planning Detail'] || 
                            workbook.Sheets['Planning'] || 
                            workbook.Sheets['Sheet1'] || 
                            workbook.Sheets[workbook.SheetNames[0]]

          const headers = XLSX.utils.sheet_to_json(targetSheet, { header: 1 })[0]
          
          if (!headers) return resolve({ valid: false, message: 'File Excel kosong atau format sheet tidak dikenali' })
          
          const normalizedHeaders = headers.map(h => 
            String(h).trim().toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/\(/g, '').replace(/\)/g, '')
          )
          
          const hasItem = normalizedHeaders.some(h => ['item', 'item_description'].includes(h))
          const hasMonth = normalizedHeaders.includes('month')
          const hasAmount = normalizedHeaders.some(h => ['planning_amount', 'planning_amount_idr'].includes(h))
          
          if (!hasItem || !hasMonth || !hasAmount) {
            resolve({ 
              valid: false, 
              message: 'Kolom wajib tidak lengkap. Pastikan terdapat kolom Month, Form/Category, Item Description, dan Planning Amount.' 
            })
          } else {
            resolve({ valid: true })
          }
        } catch (_) {
          resolve({ valid: false, message: 'Gagal membaca struktur file Excel' })
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
        
        if (status === 'SUCCES' || status === 'SUCCESS') {
          clearInterval(pollingRef.current)
          setUploadLoading(false)
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
          setUploadLoading(false)
          toast.error('Gagal memproses file di background')
        }
      } catch (_) {
        clearInterval(pollingRef.current)
        setUploadLoading(false)
        toast.error('Gagal mengecek status upload')
      }
    }, 2000)
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) {
      toast.error('Pilih file terlebih dahulu')
      return
    }
    if (!uploadPeriode) {
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
    formData.append('periode', uploadPeriode)
    formData.append('user_id', user?.id || 1)

    setUploadLoading(true)
    setResult(null)

    try {
      const res = await planningApi.upload(formData)
      if (res.data?.data?.planning_header_id) {
        toast.success(res.data.message || 'File sedang diproses...')
        startPolling(res.data.data.planning_header_id)
      } else {
        setResult(res.data)
        setUploadLoading(false)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload gagal')
      setUploadLoading(false)
    }
  }

  async function handleDownload() {
    if (!downloadPeriode) {
      toast.error('Pilih tahun periode terlebih dahulu')
      return
    }

    setDownloadLoading(true)
    const toastId = toast.loading(`Menyiapkan file Planning Budget ${downloadPeriode}...`)

    try {
      const response = await planningApi.downloadExcel(downloadPeriode)
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Planning_Budget_${downloadPeriode}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Planning Budget ${downloadPeriode} berhasil diunduh!`, { id: toastId })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh file Excel Planning', { id: toastId })
    } finally {
      setDownloadLoading(false)
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!uploadLoading) setIsDragging(true)
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
    if (uploadLoading) return

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
        <h1 className={styles.title}>Kelola File Planning Anggaran (Upload & Download)</h1>
        <p className={styles.subtitle}>
          Pusat integrasi data master planning budget tahunan: Unggah data baru atau unduh laporan eksekutif lengkap
        </p>
      </div>

      <div className={styles.grid}>
        {/* ── CARD 1: UPLOAD PLANNING ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <UploadCloud size={20} color="var(--primary)" />
            <div>
              <h3 className={styles.cardTitle}>1. Unggah File Planning (Import)</h3>
              <p className={styles.cardSubtitle}>Unggah dokumen master alokasi anggaran tahunan (.xlsx / .xls)</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className={styles.form}>
            <div>
              <label className={styles.label}>Tahun Periode Anggaran</label>
              <select
                value={uploadPeriode}
                onChange={(e) => setUploadPeriode(e.target.value)}
                className={styles.input}
                disabled={uploadLoading}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>Tahun {y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={styles.label}>Dokumen File Excel</label>
              <div
                className={`
                  ${styles.dropzone} 
                  ${file ? styles.dropzoneActive : ''} 
                  ${isDragging ? styles.dropzoneDragging : ''}
                `}
                onClick={() => !uploadLoading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0])
                    }
                  }}
                  disabled={uploadLoading}
                />

                {file ? (
                  <div className={styles.filePreview}>
                    <FileSpreadsheet size={32} color="#166534" />
                    <div>
                      <div className={styles.fileName}>{file.name}</div>
                      <div className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB · Siap diunggah</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropzonePlaceholder}>
                    <UploadCloud size={32} className={styles.uploadIcon} />
                    <span className={styles.dropzoneTitle}>Tarik & Letakkan file Excel di sini</span>
                    <span className={styles.dropzoneSub}>atau klik untuk memilih file dari komputer</span>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={uploadLoading || !file}>
              {uploadLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses & Menyinkronkan Data...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Unggah & Simpan Planning</span>
                </>
              )}
            </button>
          </form>

          {result && (
            <div className={styles.successBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Upload Berhasil!</span>
              </div>
              <div style={{ marginTop: 4 }}>Data planning tahun {uploadPeriode} telah berhasil disinkronkan ke database.</div>
            </div>
          )}
        </div>

        {/* ── CARD 2: DOWNLOAD PLANNING ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Download size={20} color="#10b981" />
            <div>
              <h3 className={styles.cardTitle}>2. Unduh Laporan Planning (Export)</h3>
              <p className={styles.cardSubtitle}>Format rapi profesional dengan Executive Dashboard & detail realisasi</p>
            </div>
          </div>

          <div className={styles.form}>
            <div>
              <label className={styles.label}>Pilih Periode Anggaran yang Akan Diunduh</label>
              <select
                value={downloadPeriode}
                onChange={(e) => setDownloadPeriode(e.target.value)}
                className={styles.input}
                disabled={downloadLoading}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>Planning Budget Tahun {y}</option>
                ))}
              </select>
            </div>

            <div className={styles.featureHighlight}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                Format Dokumen Excel yang Dihasilkan:
              </div>
              <div className={styles.featureItem}>
                <Sparkles size={14} className={styles.featureIcon} />
                <span><strong>Sheet 1: Executive Summary</strong> — KPI Cards, Rekapitulasi Kategori, Form, User/Seksi, dan Bulan.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>Sheet 2: Budget Planning Detail</strong> — 14 kolom lengkap dengan matched PO docnum, spend, dan formula variance.</span>
              </div>
              <div className={styles.featureItem}>
                <ShieldCheck size={14} className={styles.featureIcon} />
                <span><strong>Reusable & Anti-Double</strong> — Dapat diedit dan diunggah kembali tanpa risiko duplikasi data (UPSERT).</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.btnSuccess}
              onClick={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Membuat File Excel...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Unduh File Excel Planning {downloadPeriode} (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── EMBEDDED EXCEL PREVIEW ── */}
      {file && (
        <ExcelViewer file={file} filename={file.name} />
      )}

      {/* ── ROUNDTRIP ASSURANCE BANNER ── */}
      <div className={styles.fullWidthCard}>
        <div className={styles.bannerText}>
          <div className={styles.bannerTitle}>
            <ShieldCheck size={18} color="#10b981" />
            <span>Jaminan Siklus Berkelanjutan (Reusable Roundtrip Import & Export)</span>
          </div>
          <div className={styles.bannerSub}>
            File yang Anda unduh dari sistem ini telah diformat secara presisi dan sepenuhnya didukung untuk diedit lalu diunggah kembali. Sistem menerapkan validasi pintar berbasis UPSERT sehingga baris data yang sama tidak akan bertambah dobel.
          </div>
        </div>
      </div>
    </div>
  )
}
