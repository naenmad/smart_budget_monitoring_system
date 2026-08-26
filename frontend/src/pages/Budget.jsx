import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import s from './Budget.module.css'
import { budgetApi } from '../api/budgetApi'
import { kategoriApi } from '../api/kategoriApi'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, AlertCircle, Save, Trash2, BarChart3, Download, FileSpreadsheet, UploadCloud, Loader2 } from 'lucide-react'

const CURRENT_YEAR = String(new Date().getFullYear())
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => String(parseInt(CURRENT_YEAR, 10) - 2 + i))

const FORM_FIELDS = [
  { key: 'e1', code: 'E-1', cls: s.badgeE1 },
  { key: 'e9', code: 'E-9', cls: s.badgeE9 },
  { key: 'i1', code: 'I-1', cls: s.badgeI1 },
]

export default function Budget() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('manual')
  const [form, setForm] = useState({ periode: CURRENT_YEAR, capex: '', opex: '', e1: '', e9: '', i1: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const fileRef = useRef()

  // Data from API
  const [kategoris, setKategoris] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [katRes, budRes] = await Promise.all([
        kategoriApi.getAll(),
        budgetApi.getAll(CURRENT_YEAR),
      ])
      if (katRes.success) setKategoris(katRes.data || [])
      if (budRes.success) setBudgets(budRes.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(key, val) {
    // Hanya izinkan angka untuk input budget, biarkan periode string
    if (key !== 'periode') {
      val = val.replace(/\D/g, '')
    }
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function formatRp(val) {
    if (!val) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
  }

  function handleReset() {
    setForm({ periode: CURRENT_YEAR, capex: '', opex: '', e1: '', e9: '', i1: '' })
    setMessage({ type: '', text: '' })
  }

  async function handleDeletePeriode() {
    if (!window.confirm(`Yakin ingin menghapus seluruh budget aktif untuk periode ${form.periode}?`)) return
    
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const res = await budgetApi.deleteByPeriode(form.periode)
      if (res.success) {
        setMessage({ type: 'success', text: res.message })
        toast.success(res.message)
        await fetchData()
      } else {
        setMessage({ type: 'error', text: res.message })
        toast.error(res.message)
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Gagal menghapus budget'
      setMessage({ type: 'error', text: errMsg })
      toast.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const allFieldsToSave = [
        ...FORM_FIELDS,
        { key: 'capex', code: 'CAPEX' },
        { key: 'opex', code: 'OPEX' }
      ]

      const entries = allFieldsToSave
        .filter(f => form[f.key])
        .map(f => {
          const kategori = kategoris.find(k => k.kode === f.code)
          return {
            kategori_id: kategori?.id,
            periode: form.periode,
            nominal: parseFloat(form[f.key]),
            created_by: user?.id,
          }
        })
        .filter(e => e.kategori_id && !isNaN(e.nominal))

      if (entries.length === 0) {
        setMessage({ type: 'error', text: 'Tidak ada budget yang valid untuk disimpan' })
        setSaving(false)
        return
      }

      let successCount = 0
      let errorMessages = []

      for (const entry of entries) {
        try {
          const res = await budgetApi.create(entry)
          if (res.success) {
            successCount++
          } else {
            errorMessages.push(res.message)
          }
        } catch (err) {
          errorMessages.push(err.response?.data?.message || `Error saving budget`)
        }
      }

      if (successCount > 0) {
        setMessage({
          type: 'success',
          text: `${successCount} budget berhasil disimpan${errorMessages.length > 0 ? ` (${errorMessages.length} gagal)` : ''}`,
        })
        toast.success(`${successCount} budget berhasil disimpan!`)
        await fetchData()
        handleReset()
      } else {
        setMessage({ type: 'error', text: errorMessages.join('; ') })
        toast.error('Gagal menyimpan data budget')
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Gagal menyimpan budget'
      setMessage({ type: 'error', text: errMsg })
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const dataBuffer = new Uint8Array(evt.target.result)
        const wb = XLSX.read(dataBuffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json(ws)

        if (!rawData || rawData.length === 0) {
          setMessage({ type: 'error', text: 'File Excel kosong atau tidak terbaca' })
          toast.error('File Excel kosong')
          return
        }

        setSaving(true)
        setMessage({ type: '', text: '' })

        // Check if this is a Planning Excel by checking for 'item' and 'planning_amount'
        const firstRowKeys = Object.keys(rawData[0]).map(k => k.trim().toLowerCase().replace(/ /g, '_'))
        const isPlanningFile = firstRowKeys.includes('planning_amount') && firstRowKeys.includes('item')

        let successCount = 0
        let errorMessages = []

        if (isPlanningFile) {
          // If user uploaded a Planning file to Budget, aggregate planning_amount by form
          const aggregated = {}
          for (const row of rawData) {
            const formKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'form' || k.trim().toLowerCase() === 'kategori')
            const amountKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'planning_amount' || k.trim().toLowerCase() === 'amount')
            const formCode = formKey ? String(row[formKey]).trim().toUpperCase() : null
            const amountVal = amountKey ? parseFloat(row[amountKey]) : 0

            if (formCode && !isNaN(amountVal)) {
              aggregated[formCode] = (aggregated[formCode] || 0) + amountVal
            }
          }

          for (const [kode, totalNominal] of Object.entries(aggregated)) {
            const kategori = kategoris.find(k => k.kode.toUpperCase() === kode)
            if (kategori) {
              try {
                const res = await budgetApi.create({
                  kategori_id: kategori.id,
                  periode: form.periode,
                  nominal: totalNominal,
                  created_by: user?.id,
                })
                if (res.success) successCount++
              } catch (err) {
                errorMessages.push(`Gagal simpan kategori ${kode}`)
              }
            }
          }

          toast.success(`Berhasil mengalokasikan total budget dari file planning (${successCount} kategori)!`)
        } else {
          // Standard budget Excel format (Form, Periode, Budget)
          for (const row of rawData) {
            let kode = null
            let nominal = null
            let rowPeriode = form.periode

            for (const [k, v] of Object.entries(row)) {
              const cleanK = k.trim().toLowerCase().replace(/ /g, '_')
              if (['form', 'kode', 'kategori', 'kategori_kode'].includes(cleanK)) kode = String(v).trim().toUpperCase()
              if (['budget', 'nominal', 'amount', 'total_budget'].includes(cleanK)) nominal = v
              if (['periode', 'tahun', 'year'].includes(cleanK)) rowPeriode = String(v).trim()
            }

            const kategori = kategoris.find(k => k.kode.toUpperCase() === kode)
            if (!kategori || !nominal) {
              errorMessages.push(`Kode '${kode || 'Unknown'}' tidak valid atau nominal kosong`)
              continue
            }

            try {
              const res = await budgetApi.create({
                kategori_id: kategori.id,
                periode: String(rowPeriode),
                nominal: parseFloat(nominal),
                created_by: user?.id,
              })
              if (res.success) {
                successCount++
              } else {
                errorMessages.push(res.message)
              }
            } catch (err) {
              errorMessages.push(err.response?.data?.message || `Error saving ${kode}`)
            }
          }
        }

        if (successCount > 0) {
          const successText = `${successCount} baris data budget berhasil disimpan ke periode ${form.periode}`
          setMessage({ type: 'success', text: successText })
          toast.success(successText)
          await fetchData()
        } else {
          const errText = errorMessages.join('; ') || 'Tidak ada data budget yang cocok untuk disimpan'
          setMessage({ type: 'error', text: errText })
          toast.error(errText)
        }
      } catch (parseErr) {
        console.error('Parse error:', parseErr)
        setMessage({ type: 'error', text: 'Gagal memproses file Excel: ' + parseErr.message })
        toast.error('Gagal membaca file Excel')
      } finally {
        setSaving(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      { Form: 'E-1', Periode: form.periode || CURRENT_YEAR, Budget: 150000000 },
      { Form: 'E-9', Periode: form.periode || CURRENT_YEAR, Budget: 180000000 },
      { Form: 'I-1', Periode: form.periode || CURRENT_YEAR, Budget: 500000000 },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Budget')
    XLSX.writeFile(wb, `template_budget_${form.periode || CURRENT_YEAR}.xlsx`)
    toast.success('Template Excel berhasil diunduh!')
  }

  // Build active budget display from API data
  const activeBudgets = {}
  budgets.forEach(b => {
    const kategori = kategoris.find(k => k.id === b.kategori_id)
    if (kategori) {
      activeBudgets[kategori.kode] = formatRp(b.nominal)
    }
  })

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!saving) setIsDragging(true)
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
    if (saving) return

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      const ext = droppedFile.name.split('.').pop().toLowerCase()
      if (ext === 'xlsx' || ext === 'xls') {
        // Trigger handleFile with synthetic event
        handleFile({ target: { files: [droppedFile] } })
      } else {
        setMessage({ type: 'error', text: 'Format file harus berupa Excel (.xlsx atau .xls)' })
      }
    }
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1>Set budget tahunan</h1>
        <p>Input budget awal per form untuk periode berjalan</p>
      </div>

      {message.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {message.type === 'success' ? (
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          ) : (
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className={s.tabs}>
        <button
          className={`${s.tab} ${activeTab === 'manual' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual
        </button>
        <button
          className={`${s.tab} ${activeTab === 'upload' ? s.tabActive : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Excel
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className={s.grid}>
          <div className={s.card}>
            <div className={s.sectionLabel}>Periode & total budget</div>
            <div className={s.formGroup}>
              <div>
                <label className={s.label}>Periode Tahun</label>
                <select
                  className={s.input}
                  style={{ width: '100%', maxWidth: 200 }}
                  value={form.periode}
                  onChange={e => handleChange('periode', e.target.value)}
                >
                  {YEAR_OPTIONS.map(yr => (
                    <option key={yr} value={yr}>
                      Tahun {yr} {yr === CURRENT_YEAR ? '(Tahun Berjalan)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.twoCol}>
                <div style={{ marginBottom: 16 }}>
                  <label className={s.label}>Total CAPEX</label>
                  <input 
                    className={s.input} 
                    placeholder="Hanya angka" 
                    value={form.capex} 
                    onChange={e => handleChange('capex', e.target.value)}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: 4, fontWeight: 500 }}>
                    = {formatRp(form.capex)}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className={s.label}>Total OPEX</label>
                  <input 
                    className={s.input} 
                    placeholder="Hanya angka" 
                    value={form.opex} 
                    onChange={e => handleChange('opex', e.target.value)}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: 4, fontWeight: 500 }}>
                    = {formatRp(form.opex)}
                  </div>
                </div>
              </div>

              <div className={s.divider}>
                <div className={s.sectionLabel}>Detail per form</div>
                {FORM_FIELDS.map(f => (
                  <div key={f.key} style={{ marginBottom: 16 }}>
                    <div className={s.formRow} style={{ marginBottom: 4 }}>
                      <span className={`${s.badge} ${f.cls}`}>{f.code}</span>
                      <input
                        className={s.input}
                        placeholder={`Budget ${f.code} (Hanya angka)`}
                        value={form[f.key]}
                        onChange={e => handleChange(f.key, e.target.value)}
                      />
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#065f46', marginLeft: 84, fontWeight: 500 }}>
                      = {formatRp(form[f.key])}
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.actions}>
                <button className="btn-secondary" onClick={handleReset}>Reset</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  <Save size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {saving ? 'Menyimpan...' : 'Simpan budget'}
                </button>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div className={s.sectionLabel} style={{ marginBottom: 0 }}>Budget aktif — {form.periode}</div>
              {Object.keys(activeBudgets).length > 0 && (
                <button 
                  className="btn-danger" 
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                  onClick={handleDeletePeriode}
                  disabled={loading}
                >
                  <Trash2 size={13} />
                  <span>Hapus Semua ({form.periode})</span>
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ color: '#73726c', fontSize: 13, padding: 16 }}>Memuat...</div>
            ) : Object.keys(activeBudgets).length === 0 ? (
              <div style={{ color: '#73726c', fontSize: 13, padding: 16 }}>Belum ada budget untuk periode ini</div>
            ) : (
              <div className={s.metricGrid}>
                {Object.entries(activeBudgets).map(([code, val]) => (
                  <div key={code} className={s.metric} title={`${code}: ${val}`}>
                    <div className={s.metricHeader}>
                      <span className={`${s.badge} ${code === 'E-1' ? s.badgeE1 : code === 'E-9' ? s.badgeE9 : s.badgeI1}`}>
                        {code}
                      </span>
                      <span className={s.metricType}>
                        {code === 'I-1' ? 'CAPEX' : 'OPEX'}
                      </span>
                    </div>
                    <div className={s.metricValue}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            <div className={s.divider} style={{ marginTop: 14 }}>
              <div className={s.sectionLabel}>Riwayat perubahan</div>
              <div className={s.historyList}>
                {budgets.length === 0 ? (
                  <div style={{ color: '#73726c', fontSize: 13 }}>Belum ada riwayat</div>
                ) : (
                  budgets.map((b, i) => {
                    const kat = kategoris.find(k => k.id === b.kategori_id)
                    return (
                      <div key={i} className={s.historyItem}>
                        <span>Budget {kat?.kode || '?'} — Rp {(parseFloat(b.nominal) / 1_000_000).toFixed(0)}M</span>
                        <span>{b.created_at ? new Date(b.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className={s.grid}>
          <div className={s.card}>
            <div className={s.sectionLabel}>Upload Excel budget</div>
            
            <div style={{ marginBottom: 14 }}>
              <label className={s.label}>Target Periode Tahun *</label>
              <select
                className={s.input}
                value={form.periode}
                onChange={e => handleChange('periode', e.target.value)}
                disabled={saving}
              >
                {YEAR_OPTIONS.map(yr => (
                  <option key={yr} value={yr}>
                    Tahun {yr} {yr === CURRENT_YEAR ? '(Tahun Berjalan)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div 
              className={`${s.dropzone} ${isDragging ? s.dropzoneDragging : ''}`} 
              onClick={() => fileRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} disabled={saving} />
              
              {selectedFile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                  <FileSpreadsheet size={32} color="#16a34a" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>{selectedFile.name}</div>
                    <div style={{ fontSize: '12px', color: '#15803d' }}>{(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk ganti file</div>
                  </div>
                </div>
              ) : (
                <div className={s.dropzonePlaceholder}>
                  <UploadCloud size={32} className={s.uploadIcon} />
                  <div className={s.dropzoneTitle}>
                    {saving ? 'Memproses file...' : isDragging ? 'Lepaskan file Excel di sini' : 'Drag & Drop atau Klik untuk upload file Excel'}
                  </div>
                  <div className={s.dropzoneSub}>Mendukung format .xlsx dan .xls</div>
                </div>
              )}
            </div>
            
            <button className={`btn-secondary ${s.templateBtn}`} onClick={downloadTemplate}>
              <Download size={14} />
              <span>Download Template Excel</span>
            </button>
          </div>

          <div className={s.card}>
            <div className={s.sectionLabel}>Format yang diharapkan</div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Sistem mendukung format template sederhana maupun file Master Planning otomatis:
            </p>
            <table className={s.formatTable}>
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Periode</th>
                  <th style={{ textAlign: 'right' }}>Budget</th>
                </tr>
              </thead>
              <tbody>
                {[['E-1', form.periode, '150000000'], ['E-9', form.periode, '180000000'], ['I-1', form.periode, '500000000']].map(([formCode, per, val]) => (
                  <tr key={formCode}>
                    <td><strong>{formCode}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{per}</td>
                    <td style={{ textAlign: 'right' }}>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}