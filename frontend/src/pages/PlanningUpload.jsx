import { useState, useRef } from 'react'
import { planningApi } from '../api/planningApi'
import { formatRp } from '../utils/format'
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Table,
  BookOpen,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import styles from './PlanningUpload.module.css'

export default function PlanningUpload({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [periode, setPeriode] = useState('2026')
  const [downloadPeriode, setDownloadPeriode] = useState('2026')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [showSop, setShowSop] = useState(true)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = (selectedFile) => {
    setError(null)
    setSuccessData(null)

    // Validasi ekstensi
    const validExts = ['.xlsx', '.xls', '.xlsm']
    const hasValidExt = validExts.some(ext => selectedFile.name.toLowerCase().endsWith(ext))
    if (!hasValidExt) {
      setError('Hanya file Excel (.xlsx, .xls, .xlsm) yang didukung.')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Silakan pilih file terlebih dahulu.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccessData(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('periode', periode)

    try {
      const response = await planningApi.upload(formData)
      if (response.data && response.data.success) {
        setSuccessData(response.data.data)
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (onUploaded) onUploaded()
      } else {
        setError(response.data?.message || 'Gagal memproses file.')
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Terjadi kesalahan saat mengunggah file.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (type) => {
    setDownloadLoading(true)
    try {
      if (type === 'template') {
        const response = await planningApi.downloadTemplate()
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'template_planning_budget.xlsx')
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else if (type === 'database') {
        const response = await planningApi.exportDatabaseBudget(downloadPeriode)
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `DATABASE_WEB_BUDGET_${downloadPeriode}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Download error:', err)
      setError('Gagal mengunduh file. Pastikan data tersedia.')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Table size={24} color="var(--primary)" />
          <span>Database &amp; Kelola File Planning</span>
        </h1>
        <p className={styles.subtitle}>
          Pusat integrasi Master Database Budget Quality: Unduh format resmi 5 sheets (Microsoft Excel &amp; Apple Numbers), atau unggah pembaruan anggaran.
        </p>
      </div>

      {/* SOP Standarisasi Planning & Procurement Banner */}
      <section className={styles.sopBanner}>
        <div className={styles.sopHeader} onClick={() => setShowSop(prev => !prev)}>
          <div className={styles.sopTitleGroup}>
            <BookOpen size={18} color="var(--primary)" />
            <h2 className={styles.sopTitle}>Standarisasi Penginputan Planning &amp; Procurement Quality</h2>
            <span className={styles.sopBadge}>SOP Resmi</span>
          </div>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {showSop ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showSop && (
          <div className={styles.sopGrid}>
            <div className={styles.sopItem}>
              <div className={styles.sopItemHeader}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Format Penamaan Item</span>
              </div>
              <p className={styles.sopItemText}>
                Wajib mengikuti standar: <code>MERK + NAMA ITEM + SPEC</code>.<br />
                Contoh: <em>MITUTOYO DIAL GAUGE 0.01MM</em>
              </p>
            </div>

            <div className={styles.sopItem}>
              <div className={styles.sopItemHeader}>
                <TrendingUp size={16} color="#2563eb" />
                <span>Cost Unit Seragam (+30%)</span>
              </div>
              <p className={styles.sopItemText}>
                Unit cost dinaikkan <strong>30% seragam</strong> untuk antisipasi kenaikan harga vendor (~10%), PPN (10%), dan tempo bayar agar tidak overbudget.
              </p>
            </div>

            <div className={styles.sopItem}>
              <div className={styles.sopItemHeader}>
                <Clock size={16} color="#f59e0b" />
                <span>Lead Time &amp; Pantau POD</span>
              </div>
              <p className={styles.sopItemText}>
                Minimal pengajuan PR <strong>2 minggu sebelum bulan eksekusi</strong>. Wajib koordinasi aktif dengan POD/Purchasing untuk memantau kedatangan barang.
              </p>
            </div>

            <div className={styles.sopItem}>
              <div className={styles.sopItemHeader}>
                <Layers size={16} color="#8b5cf6" />
                <span>Cost Center &amp; Trial Balance</span>
              </div>
              <p className={styles.sopItemText}>
                <code>123200</code> (Quality QC) &amp; <code>123000</code> (Quality General).<br />
                Formula: <code>Kode Akun + Cost Center = Kode Trial Balance</code>. PR 2026 s/d Nov (Des closing).
              </p>
            </div>
          </div>
        )}
      </section>

      <div className={styles.mainGrid}>
        {/* Kolom Kiri: Form Upload */}
        <div className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <UploadCloud size={18} color="var(--primary)" />
                <span>Unggah File Planning</span>
              </div>
              <p className={styles.cardSubtitle}>
                Dukung format Template Resmi (3 baris header) dan Master Database Budget 5-sheet.
              </p>
            </div>

            <form onSubmit={handleUpload}>
              {/* Dropzone Area */}
              <div
                className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .xlsm"
                  style={{ display: 'none' }}
                />

                {file ? (
                  <div className={styles.fileSelected}>
                    <div className={styles.fileIconWrapper}>
                      <FileSpreadsheet size={32} color="#16a34a" />
                    </div>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024).toFixed(1)} KB &bull; Siap diunggah
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeFileBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      Ganti File
                    </button>
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <div className={styles.promptIconWrapper}>
                      <UploadCloud size={32} color="var(--primary)" />
                    </div>
                    <div className={styles.promptText}>
                      <strong>Tarik &amp; lepas file Excel di sini</strong>, atau <span className={styles.browseLink}>pilih dari komputer</span>
                    </div>
                    <div className={styles.promptHelp}>
                      Format didukung: .xlsx, .xls, .xlsm (Maks. 20MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Form Controls */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="periodeInput" className={styles.label}>
                    <Calendar size={14} />
                    <span>Tahun Periode Target:</span>
                  </label>
                  <input
                    id="periodeInput"
                    type="number"
                    min="2020"
                    max="2099"
                    value={periode}
                    onChange={(e) => setPeriode(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <small className={styles.hintText}>
                    Akan menimpa/memperbarui data planning aktif pada periode ini.
                  </small>
                </div>
              </div>

              {error && (
                <div className={styles.alertDanger}>
                  <AlertTriangle size={18} className={styles.alertIcon} />
                  <div>
                    <strong>Gagal Mengunggah:</strong>
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {successData && (
                <div className={styles.alertSuccess}>
                  <FileCheck size={20} className={styles.alertIcon} />
                  <div>
                    <strong>Unggah Berhasil!</strong>
                    <div style={{ marginTop: '4px', fontSize: '13px' }}>
                      {successData.total_rows !== undefined ? (
                        <>Berhasil memproses <strong>{successData.total_rows}</strong> baris item planning untuk periode <strong>{successData.periode}</strong>.</>
                      ) : (
                        <>{successData.message || 'File berhasil diunggah dan diverifikasi.'}</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.cardFooter}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={!file || loading}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner}></span>
                      <span>Sedang Memproses Excel...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={16} />
                      <span>Unggah &amp; Perbarui Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Download Hub */}
        <div className={styles.rightCol}>
          {/* Card 1: Official 5-Sheet Database Export */}
          <div className={`${styles.card} ${styles.cardHighlight}`}>
            <div className={styles.badgeHighlight}>
              <Sparkles size={12} />
              <span>Format Resmi Komprehensif</span>
            </div>

            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Database size={18} color="#059669" />
                <span>Unduh Master Database Budget (5 Sheets)</span>
              </div>
              <p className={styles.cardSubtitle}>
                Buku kerja lengkap dengan rumus otomatis, format tabel border penuh, dan validasi sel kompatibel Apple Numbers.
              </p>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 14 }}>
              <label htmlFor="downloadPeriodeSelect" className={styles.label}>
                <Calendar size={14} />
                <span>Pilih Periode:</span>
              </label>
              <select
                id="downloadPeriodeSelect"
                value={downloadPeriode}
                onChange={(e) => setDownloadPeriode(e.target.value)}
                className={styles.input}
              >
                <option value="2026">Tahun Anggaran 2026</option>
                <option value="2025">Tahun Anggaran 2025</option>
                <option value="2024">Tahun Anggaran 2024</option>
              </select>
            </div>

            <div className={styles.featureHighlight}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                Struktur Workbook Resmi (5 Sheets):
              </div>
              <div className={styles.featureItem}>
                <Sparkles size={14} className={styles.featureIcon} />
                <span><strong>1. Summary:</strong> Perbandingan bulanan, Actual GL vs FA, Reversal, &amp; Rekap Transaksi.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>2. Plan vs Actual (Kode):</strong> 13 Account resmi x 12 bulan (Jan-Des), status &amp; selisih.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>3. Plan vs Actual (Item):</strong> 349 baris rincian item planning, Qty, Actual, PIC, &amp; status.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>4. Out of Budget:</strong> 36 transaksi tidak terencana lengkap dengan perbandingan Get Report.</span>
              </div>
              <div className={styles.featureItem}>
                <Layers size={14} className={styles.featureIcon} />
                <span><strong>5. Preventive CF:</strong> Alokasi bulanan Preventive C/F &amp; 70 rincian item vs Actual GL.</span>
              </div>
              <div className={styles.featureItem}>
                <ShieldCheck size={14} className={styles.featureIcon} />
                <span><strong>Two-Way Compatible:</strong> Mendukung <em>Microsoft Excel</em> &amp; <em>Apple Numbers</em>, siap diedit &amp; diimpor kembali.</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.btnSuccess}
              onClick={() => handleDownload('database')}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <>
                  <span className={styles.spinner}></span>
                  <span>Menyiapkan Workbook Excel...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download DATABASE WEB BUDGET ({downloadPeriode})</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Simple Template */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <FileSpreadsheet size={18} color="var(--text-main)" />
                <span>Template Unggah Sederhana</span>
              </div>
              <p className={styles.cardSubtitle}>
                Format spreadsheet ringkas untuk impor rencana anggaran awal (3 baris header).
              </p>
            </div>

            <div className={styles.featureHighlight} style={{ background: 'var(--bg-subtle)' }}>
              <div className={styles.featureItem}>
                <CheckCircle2 size={14} color="var(--success)" />
                <span>Header Baris 1: Judul Formulir (E.1, E.9, I.1, CAPEX)</span>
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={14} color="var(--success)" />
                <span>Header Baris 2: Kode Akun &amp; Cost Center (misal: 123200, 123000)</span>
              </div>
              <div className={styles.featureItem}>
                <CheckCircle2 size={14} color="var(--success)" />
                <span>Header Baris 3: Kolom Data (Item, Qty, Total, Bulan)</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => handleDownload('template')}
              disabled={downloadLoading}
            >
              <Download size={15} />
              <span>Unduh Template Ringkas (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
