import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { prApi } from '../api/prApi'
import { uploadHistoryApi } from '../api/uploadHistoryApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  FileSpreadsheet, 
  Info, 
  Check, 
  ShieldCheck, 
  Layers, 
  Sparkles 
} from 'lucide-react'
import styles from './PrUpload.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - 2 + i))

export default function PrUpload() {
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
          
          let targetSheet = workbook.Sheets['PR to Invoice Tracking'] || 
                            workbook.Sheets['Results'] || 
                            workbook.Sheets['Sheet1'] || 
                            workbook.Sheets[workbook.SheetNames[0]]

          const headers = XLSX.utils.sheet_to_json(targetSheet, { header: 1 })[0]
          
          if (!headers) return resolve({ valid: false, message: 'File Excel kosong atau format sheet tidak dikenali' })
          
          const normalizedHeaders = headers.map(h => 
            String(h).trim().toLowerCase().replace(/ /g, '_').replace(/-/g, '_').replace(/\(/g, '').replace(/\)/g, '').replace(/\//g, '_')
          )
          
          const hasPrDoc = normalizedHeaders.some(h => ['pr_doc_num', 'pr_docnum', 'requisition_id'].includes(h))
          const hasDesc = normalizedHeaders.some(h => ['description', 'item_description'].includes(h))
          
          if (!hasPrDoc || !hasDesc) {
            resolve({ 
              valid: false, 
              message: 'Kolom wajib tidak lengkap. Pastikan terdapat kolom PR DocNum/Requisition ID dan Item Description.' 
            })
          } else {
            resolve({ valid: true })
          }
        } catch (err) {
          resolve({ valid: false, message: 'Gagal membaca struktur file Excel' })
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
        
        if (status === 'SUCCESS' || status === 'SUCCES') {
          clearInterval(pollingRef.current)
          setUploadLoading(false)
          setResult({
            success: true,
            data: {
              total_data: res.data.total_data,
              upload_id: uploadId,
              periode: uploadPeriode
            }
          })
          toast.success('Upload dan pemrosesan PR selesai!')
        } else if (status === 'FAILED') {
          clearInterval(pollingRef.current)
          setUploadLoading(false)
          toast.error('Gagal memproses file di background')
        }
      } catch (err) {
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
      const res = await prApi.upload(formData)
      if (res.data?.data?.upload_id) {
        toast.success(res.data.message || 'File sedang diproses...')
        startPolling(res.data.data.upload_id)
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
    const toastId = toast.loading(`Menyiapkan laporan pengadaan PR ${downloadPeriode}...`)

    try {
      const response = await prApi.downloadExcel(downloadPeriode)
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Procurement_PR_Report_${downloadPeriode}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Laporan PR ${downloadPeriode} berhasil diunduh!`, { id: toastId })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Gagal mengunduh file Excel PR', { id: toastId })
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
        <h1 className={styles.title}>Kelola File PR / PO (Upload & Download)</h1>
        <p className={styles.subtitle}>
          Pusat integrasi dokumen pengadaan PR ke Invoice: Unggah batch baru atau unduh laporan pipeline komprehensif
        </p>
      </div>

      <div className={styles.grid}>
        {/* ── CARD 1: UPLOAD PR ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <UploadCloud size={20} color="var(--primary)" />
            <div>
              <h3 className={styles.cardTitle}>1. Unggah File PR / PO (Import)</h3>
              <p className={styles.cardSubtitle}>Unggah file report procurement PR, PO, GR, Invoice (.xlsx / .xls)</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className={styles.form}>
            <div>
              <label className={styles.label}>Tahun Periode Pengadaan</label>
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
                  <span>Memproses & Menjalankan Matching AI...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Unggah & Jalankan Pipeline Matching</span>
                </>
              )}
            </button>
          </form>

          {result && (
            <div className={styles.successBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Upload & Matching Selesai!</span>
              </div>
              <div style={{ marginTop: 4 }}>
                Total <strong>{result.data?.total_data}</strong> baris data PR berhasil diproses dan disinkronkan.
              </div>
              <Link to="/pr/result" className={styles.resultLink}>
                Lihat Hasil Matching <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* ── CARD 2: DOWNLOAD PR REPORT ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Download size={20} color="#10b981" />
            <div>
              <h3 className={styles.cardTitle}>2. Unduh Laporan Pengadaan (Export)</h3>
              <p className={styles.cardSubtitle}>Format rapi profesional dengan Procurement Pipeline Summary</p>
            </div>
          </div>

          <div className={styles.form}>
            <div>
              <label className={styles.label}>Pilih Periode Pengadaan yang Akan Diunduh</label>
              <select
                value={downloadPeriode}
                onChange={(e) => setDownloadPeriode(e.target.value)}
                className={styles.input}
                disabled={downloadLoading}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>Laporan PR Tahun {y}</option>
                ))}
              </select>
            </div>

            <div className={styles.featureHighlight}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                Format Dokumen Excel yang Dihasilkan:
              </div>
              <div className={styles.featureItem}>
                <Sparkles size={14} className={styles.featureIcon} />
                <span><strong>Sheet 1: Procurement KPI Summary</strong> — Rekapitulasi Tahapan Pipeline (PR Only, PO Issued, GR, Invoiced) & nilai transaksi.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>Sheet 2: PR to Invoice Tracking</strong> — 31 kolom lengkap dengan tanggal request, PO, GR legal number, packing slip, invoice, & vendor.</span>
              </div>
              <div className={styles.featureItem}>
                <ShieldCheck size={14} className={styles.featureIcon} />
                <span><strong>Anti-Duplikat (UPSERT)</strong> — File hasil unduhan dapat diperbarui dan diunggah ulang tanpa membuat baris dobel.</span>
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
                  <span>Membuat File Excel PR...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Unduh File Excel PR {downloadPeriode} (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── ROUNDTRIP ASSURANCE BANNER ── */}
      <div className={styles.fullWidthCard}>
        <div className={styles.bannerText}>
          <div className={styles.bannerTitle}>
            <ShieldCheck size={18} color="#10b981" />
            <span>Siklus Data Terpadu & Teruji (Deduplication Guarantee)</span>
          </div>
          <div className={styles.bannerSub}>
            Sistem pengunggahan PR kami menerapkan pembaruan cerdas berbasis nomor dokumen dan deskripsi barang. Dokumen yang sudah ada akan otomatis diperbarui status PO, GR, dan Invoice-nya tanpa pernah menggandakan data yang telah tersimpan.
          </div>
        </div>
      </div>
    </div>
  )
}
