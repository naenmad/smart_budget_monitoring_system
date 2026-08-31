import toast from 'react-hot-toast'
import { useState, useEffect, useMemo } from 'react'
import { mappingApi } from '../api/mappingApi'
import { 
  Search, 
  CheckCheck, 
  AlertTriangle, 
  X, 
  Check, 
  Loader2, 
  Database, 
  Calendar,
  Sparkles,
  Sliders,
  Bot,
  Zap,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Info
} from 'lucide-react'
import styles from './MappingReview.module.css'

export default function MappingReview() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [processingId, setProcessingId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // --- state modal search manual ---
  const [searchModalPr, setSearchModalPr] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [total, setTotal] = useState(0)
  const [threshold, setThreshold] = useState(85)
  const [autoLearning, setAutoLearning] = useState(true)
  const [, setIsSavingSettings] = useState(false)
  const [isAutoApproving, setIsAutoApproving] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)  // reset ke halaman 1 tiap kali keyword berubah
      setSelectedIds([]) // reset selection
      fetchData()
    }, 400)  // debounce 400ms
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword])

  useEffect(() => { 
    fetchData() 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await mappingApi.getSettings()
      if (res.data?.success && res.data.data) {
        setThreshold(Math.round(res.data.data.auto_mapping_threshold || 85))
        setAutoLearning(res.data.data.auto_learning ?? true)
      }
    } catch (err) {
      console.error('Gagal memuat setting mapping:', err)
    }
  }

  async function handleUpdateSettings(newThreshold, newAutoLearning) {
    const threshToSave = newThreshold !== undefined ? newThreshold : threshold
    const learnToSave = newAutoLearning !== undefined ? newAutoLearning : autoLearning

    setIsSavingSettings(true)
    try {
      await mappingApi.updateSettings({
        auto_mapping_threshold: threshToSave,
        auto_learning: learnToSave
      })
      toast.success('Pengaturan otomatisasi disimpan', { id: 'save_settings' })
    } catch (_) {
      toast.error('Gagal menyimpan pengaturan', { id: 'save_settings' })
    } finally {
      setIsSavingSettings(false)
    }
  }

  async function handleRunAutoApproval() {
    if (!confirm(`Terapkan persetujuan otomatis sekarang untuk seluruh PR yang skor AI-nya ≥ ${threshold}%?`)) return

    setIsAutoApproving(true)
    try {
      const res = await mappingApi.autoConfirmByThreshold()
      if (res.data?.success) {
        toast.success(res.data.message || 'Auto-approval selesai dijalankan!')
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menjalankan auto-approval')
    } finally {
      setIsAutoApproving(false)
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await mappingApi.getPending({ page, per_page: 20, keyword })
      const pendingItems = res.data?.data || []
      const totalCount = res.data?.total || 0
      const pagesCount = res.data?.pages || 1

      // Jika page saat ini melebihi total halaman yang tersedia (misal setelah item dihabiskan)
      if (page > pagesCount && pagesCount >= 1 && totalCount > 0) {
        setPage(pagesCount)
        return
      }

      setItems(pendingItems)
      setTotal(totalCount)
      setTotalPages(pagesCount)
      setSelectedIds([]) // clear selection when data changes
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi saat 1 item selesai di-review: hapus dari list lokal dan otomatis fetch antrian baru jika page habis
  function handleItemCompleted(prId) {
    setItems(prev => {
      const updated = prev.filter(p => p.id !== prId)
      // Jika semua item di halaman ini sudah selesai di-review, otomatis muat halaman/item selanjutnya
      if (updated.length === 0) {
        setTimeout(() => {
          fetchData()
        }, 150)
      }
      return updated
    })
    setTotal(prev => Math.max(0, prev - 1))
  }

  async function handleConfirm(prId, candidate) {
    if (!confirm(`Konfirmasi pilihan: ${candidate.planning_item}?`)) return

    setProcessingId(prId)
    try {
      const payload = {
        planning_detail_id: candidate.planning_detail_id,
        rank_no: candidate.rank_no
      }
      const res = await mappingApi.confirmMapping(prId, payload)
      if (res.data?.success) {
        handleItemCompleted(prId)
        toast.success('Mapping berhasil dikonfirmasi')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfirmasi')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleConfirmOop(prId) {
    if (!confirm(`Konfirmasi item ini sebagai OOP (Out of Plan)?`)) return

    setProcessingId(prId)
    try {
      const payload = { is_oop: true }
      const res = await mappingApi.confirmMapping(prId, payload)
      if (res.data?.success) {
        handleItemCompleted(prId)
        toast.success('Item ditandai sebagai OOP')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfirmasi OOP')
    } finally {
      setProcessingId(null)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(items.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectItem = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkAction = async (actionType) => {
    if (selectedIds.length === 0) return

    const confirmMsg = actionType === 'approve'
      ? `Setujui Top-1 kandidat AI untuk ${selectedIds.length} item terpilih?`
      : `Tandai ${selectedIds.length} item terpilih sebagai OOP (Out of Plan)?`

    if (!confirm(confirmMsg)) return

    setIsBulkProcessing(true)
    try {
      const mappingsPayload = []
      
      for (const prId of selectedIds) {
        const pr = items.find(i => i.id === prId)
        if (!pr) continue

        if (actionType === 'oop') {
          mappingsPayload.push({
            pr_po_data_id: prId,
            is_oop: true
          })
        } else {
          // Top-1 candidate
          const topCandidate = pr.fuzzy_candidates?.[0]
          if (topCandidate && topCandidate.planning_detail_id) {
            mappingsPayload.push({
              pr_po_data_id: prId,
              planning_detail_id: topCandidate.planning_detail_id,
              rank_no: topCandidate.rank_no,
              is_oop: false
            })
          } else {
            // Kalau tidak ada kandidat top-1, tandai sebagai OOP
            mappingsPayload.push({
              pr_po_data_id: prId,
              is_oop: true
            })
          }
        }
      }

      const res = await mappingApi.bulkConfirm(mappingsPayload)
      if (res.data?.success) {
        toast.success(res.data.message || 'Proses massal berhasil diselesaikan!')
        fetchData()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses aksi massal')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  function openSearchModal(pr) {
    setSearchModalPr(pr)
    setSearchTerm('')
    setSearchResults([])
  }

  function closeSearchModal() {
    setSearchModalPr(null)
  }

  async function handleSearch(term) {
    setSearchTerm(term)
    if (term.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const res = await mappingApi.searchPlanningDetail(searchModalPr.id, term)
      setSearchResults(res.data?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }

  async function handlePickFromSearch(planningDetailId) {
    setProcessingId(searchModalPr.id)
    try {
      const payload = { planning_detail_id: planningDetailId, rank_no: null }
      const res = await mappingApi.confirmMapping(searchModalPr.id, payload)
      if (res.data?.success) {
        handleItemCompleted(searchModalPr.id)
        closeSearchModal()
        toast.success('Mapping manual berhasil disimpan')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfirmasi')
    } finally {
      setProcessingId(null)
    }
  }

  // Hitung berapa banyak item di antrian saat ini yang memenuhi threshold
  const eligibleCount = useMemo(() => {
    return items.filter(item => {
      const topCand = item.fuzzy_candidates?.[0]
      if (!topCand || !topCand.confidence_score) return false
      const scorePct = topCand.confidence_score * 100
      return scorePct >= threshold && !topCand.code_mismatch
    }).length
  }, [items, threshold])

  const fmt = (n) =>
    Number(n || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  const scoreClass = (score) => {
    if (score >= 0.8) return styles.scoreHigh
    if (score >= 0.5) return styles.scoreMedium
    return styles.scoreLow
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Review Mapping & Validasi</h2>
          <p className={styles.subtitle}>
            Menunggu konfirmasi manual (Need Mapping) karena kecocokan fuzzy tidak 100%.
            {total > 0 && <span> &middot; Tersisa <strong>{total}</strong> item antrean.</span>}
          </p>
        </div>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Cari item PR berdasarkan nama barang atau nomor dokumen..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className={styles.searchBox}
          />
          {keyword && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => setKeyword('')}
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Panel Konfigurasi Otomatisasi & Threshold ── */}
      <div className={styles.autoPanel}>
        <div className={styles.autoPanelHeader}>
          <div className={styles.autoPanelHeaderLeft}>
            <div className={styles.autoPanelIconWrap}>
              <Bot size={20} />
            </div>
            <div>
              <div className={styles.autoPanelTitle}>
                Otomatisasi Mapping & Ambang Batas AI (Threshold)
                <Sparkles size={14} color="#f59e0b" />
              </div>
              <p className={styles.autoPanelSubtitle}>
                Atur batas toleransi AI agar sistem menyetujui mapping otomatis saat upload maupun pada antrian aktif.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.autoPanelToggleBtn}
            onClick={() => setIsPanelOpen(!isPanelOpen)}
          >
            <Sliders size={13} />
            {isPanelOpen ? 'Sembunyikan Pengaturan' : 'Buka Pengaturan'}
            {isPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {isPanelOpen && (
          <div className={styles.autoPanelBody}>
            {/* Slider Threshold */}
            <div className={styles.sliderCard}>
              <div className={styles.sliderHeader}>
                <span className={styles.sliderLabel}>Ambang Batas Keyakinan AI</span>
                <span className={styles.sliderValuePill}>{threshold}% Cocok</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="1"
                value={threshold}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setThreshold(val)
                }}
                onMouseUp={() => handleUpdateSettings(threshold, autoLearning)}
                onTouchEnd={() => handleUpdateSettings(threshold, autoLearning)}
                className={styles.rangeInput}
              />
              <div className={styles.sliderMarks}>
                <span>50% (Longgar)</span>
                <span>85% (Rekomendasi)</span>
                <span>100% (Ketat)</span>
              </div>
            </div>

            {/* Toggle Auto-Learning */}
            <div className={styles.learningCard}>
              <div className={styles.learningText}>
                <div className={styles.learningTitle}>
                  <BrainCircuit size={15} color="#10b981" />
                  Self-Learning AI
                </div>
                <div className={styles.learningSub}>
                  Otomatis simpan review manual menjadi aturan cerdas masa depan.
                </div>
              </div>
              <label className={styles.switchToggle}>
                <input
                  type="checkbox"
                  checked={autoLearning}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAutoLearning(checked)
                    handleUpdateSettings(threshold, checked)
                  }}
                />
                <span className={styles.switchSlider}></span>
              </label>
            </div>

            {/* Tombol Eksekusi Cepat */}
            <div className={styles.autoActionWrap}>
              <button
                type="button"
                className={styles.btnRunAuto}
                onClick={handleRunAutoApproval}
                disabled={isAutoApproving || items.length === 0}
              >
                {isAutoApproving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Memproses Auto-Approval...
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    Terapkan Auto-Approval (≥ {threshold}%)
                  </>
                )}
              </button>
              <div className={`${styles.eligiblePill} ${eligibleCount > 0 ? styles.eligiblePillActive : ''}`}>
                <Info size={12} />
                {eligibleCount > 0 
                  ? `${eligibleCount} dari ${items.length} item di halaman ini siap disetujui otomatis!`
                  : `0 item memenuhi syarat ≥ ${threshold}%`}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkActionCount}>
            <CheckCheck size={18} /> {selectedIds.length} item terpilih
          </div>
          <div className={styles.bulkActionButtons}>
            <button 
              className="btn-primary" 
              onClick={() => handleBulkAction('approve')}
              disabled={isBulkProcessing}
            >
              Setujui (Top-1) Terpilih
            </button>
            <button 
              className="btn-danger" 
              onClick={() => handleBulkAction('oop')}
              disabled={isBulkProcessing}
            >
              Tandai OOP Terpilih
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>Memuat antrian review...</div>
      ) : (
        <div className={styles.list}>
          {items.length === 0 && (
            <div className={`card ${styles.emptyState}`}>
              <CheckCheck size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle', color: '#16a34a' }} />
              {total === 0
                ? 'Semua item sudah di-mapping! Tidak ada antrian review.'
                : 'Memuat antrean item selanjutnya...'}
            </div>
          )}

          {items.length > 0 && (
            <div className={styles.tableHeaderToolbar}>
              <label className={styles.selectAllLabel}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className={styles.checkbox}
                />
                <span>Pilih Semua ({items.length} item)</span>
              </label>
            </div>
          )}

          {items.map((pr) => (
            <div 
              key={pr.id} 
              className={`card ${styles.itemCard} ${selectedIds.includes(pr.id) ? styles.itemCardSelected : ''}`}
            >
              {/* Kolom Checkbox */}
              <div className={styles.checkboxCol}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(pr.id)}
                  onChange={() => handleSelectItem(pr.id)}
                  className={styles.checkbox}
                />
              </div>

              <div className={styles.itemMainCol}>
                {/* Info PR */}
                <div className={styles.prInfo}>
                  <div className={styles.prHeader}>
                    <span className={styles.prDocNum}>{pr.pr_doc_num || '-'}</span>
                    <span className={styles.kategoriBadge}>
                      {pr.kategori?.kode || 'Tanpa Kategori'}
                    </span>
                    <span className={styles.priceBadge}>{fmt(pr.total_price)}</span>
                  </div>
                  <div className={styles.prDesc}>{pr.description}</div>
                  <div className={styles.prMeta}>
                    <span>Kuantitas: {pr.qty} {pr.uom}</span>
                    <span>Harga Satuan: {fmt(pr.unit_price)}</span>
                    {pr.supplier_name && <span>Supplier: {pr.supplier_name}</span>}
                    {pr.request_date && <span>Tgl Request: {pr.request_date}</span>}
                  </div>
                </div>

                {/* Kandidat Fuzzy Match */}
                <div className={styles.candidatesSection}>
                  <div className={styles.candidateBoxHeader}>
                    <span className={styles.candidateBoxTitle}>
                      Rekomendasi AI (Top-5 Kecocokan):
                    </span>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.btnSearchManual}
                        onClick={() => openSearchModal(pr)}
                        disabled={processingId === pr.id}
                      >
                        <Search size={13} /> Cari Item Planning Lain
                      </button>
                      <button
                        className={styles.btnOop}
                        onClick={() => handleConfirmOop(pr.id)}
                        disabled={processingId === pr.id}
                      >
                        Tandai Out of Plan (OOP)
                      </button>
                    </div>
                  </div>

                  {(!pr.fuzzy_candidates || pr.fuzzy_candidates.length === 0) && (
                    <div className={styles.noCandidates}>
                      Tidak ada kandidat rekomendasi dari sistem.
                    </div>
                  )}

                  <div className={styles.candidateList}>
                    {pr.fuzzy_candidates?.map((cand) => (
                      <div key={cand.log_id} className={styles.candidateRow}>
                        <div className={styles.candidateLeft}>
                          <span className={styles.rankBadge}>#{cand.rank_no}</span>
                          <div className={styles.candidateInfo}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className={styles.candidateName}>
                                {cand.planning_item}
                              </span>
                              {cand.price_anomaly && (
                                <span className={styles.priceAnomalyBadge} title="Nominal PR menyimpang dari pagu perencanaan">
                                  <AlertTriangle size={11} />
                                  {cand.price_status === 'WARNING_EXCEEDS_BUDGET' ? 'Pagu Terlampaui (>300%)' : 'Anomali Skala Harga'}
                                </span>
                              )}
                            </div>
                            <span className={styles.candidateMonth}>
                              {cand.month} &middot; Anggaran: {fmt(cand.planning_amount)}
                              {cand.remarks ? ` · Catatan: ${cand.remarks}` : ''}
                            </span>
                            {cand.explanation_summary && (
                              <div className={styles.aiExplainPill}>
                                <Sparkles size={11} className={styles.aiExplainIcon} />
                                <span>{cand.explanation_summary}</span>
                              </div>
                            )}
                            {cand.code_mismatch && (
                              <span className={styles.codeMismatchWarn}>
                                <AlertTriangle size={12} />
                                Beda kode: PR ({cand.pr_code}) vs Planning ({cand.candidate_code})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.candidateRight}>
                          <span className={`${styles.scoreBadge} ${scoreClass(cand.confidence_score)}`}>
                            {Math.round(cand.confidence_score * 100)}% Cocok
                          </span>
                          <button
                            className={styles.btnConfirm}
                            onClick={() => handleConfirm(pr.id, cand)}
                            disabled={processingId === pr.id}
                            title="Konfirmasi mapping ini dan latih AI secara permanen (Active Learning)"
                          >
                            {processingId === pr.id ? 'Menyimpan...' : 'Pilih & Latih AI'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            &laquo; Sebelumnya
          </button>
          <span className={styles.pageInfo}>Halaman {page} dari {totalPages}</span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Berikutnya &raquo;
          </button>
        </div>
      )}

      {/* Modal Search Manual */}
      {searchModalPr && (
        <div className={styles.modalOverlay} onClick={closeSearchModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleWrap}>
                <div className={styles.modalIconWrap}>
                  <Database size={18} />
                </div>
                <div>
                  <h3 className={styles.modalTitle}>Cari Item Planning Manual</h3>
                  <p className={styles.modalSubtitle}>
                    Pilih item yang telah dianggarkan jika rekomendasi sistem tidak sesuai
                  </p>
                </div>
              </div>
              <button className={styles.modalClose} onClick={closeSearchModal} title="Tutup Modal">
                <X size={18} />
              </button>
            </div>

            {/* Target PR Context Card */}
            <div className={styles.targetPrCard}>
              <div className={styles.targetPrHeader}>
                <span className={styles.targetPrLabel}>Target Dokumen PR:</span>
                <span className={styles.targetPrDoc}>{searchModalPr.pr_doc_num || '-'}</span>
              </div>
              <div className={styles.targetPrDesc}>{searchModalPr.description}</div>
              <div className={styles.targetPrMeta}>
                <span>Kategori: <strong>{searchModalPr.kategori?.kode || 'Tanpa Kategori'}</strong></span>
                <span>Total: <strong>{fmt(searchModalPr.total_price)}</strong></span>
                {searchModalPr.qty && <span>Qty: <strong>{searchModalPr.qty} {searchModalPr.uom}</strong></span>}
              </div>
            </div>

            {/* Search Input with Icon */}
            <div className={styles.modalSearchWrapper}>
              <Search size={16} className={styles.modalSearchIcon} />
              <input
                type="text"
                autoFocus
                placeholder="Ketik minimal 2 huruf nama barang anggaran..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.modalSearchInput}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.modalSearchClear}
                  onClick={() => { setSearchTerm(''); setSearchResults([]); }}
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results Area */}
            <div className={styles.modalResultList}>
              {searchLoading && (
                <div className={styles.modalLoadingState}>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Mencari di database planning...</span>
                </div>
              )}

              {!searchLoading && searchTerm.length >= 2 && searchResults.length === 0 && (
                <div className={styles.modalNoResultState}>
                  <AlertTriangle size={28} className={styles.modalNoResultIcon} />
                  <p className={styles.modalNoResultTitle}>Tidak ditemukan item anggaran</p>
                  <p className={styles.modalNoResultSub}>
                    Tidak ada item planning yang cocok dengan kata kunci "<strong>{searchTerm}</strong>".
                  </p>
                </div>
              )}

              {!searchLoading && searchTerm.length < 2 && searchResults.length === 0 && (
                <div className={styles.modalGuideState}>
                  <Database size={32} className={styles.modalGuideIcon} />
                  <p className={styles.modalGuideTitle}>Pencarian Database Planning</p>
                  <p className={styles.modalGuideSub}>
                    Ketik nama barang anggaran pada kolom di atas untuk mencari item realisasi.
                  </p>
                </div>
              )}

              {!searchLoading && searchResults.map((item) => (
                <div key={item.id} className={styles.modalResultRow}>
                  <div className={styles.modalResultInfo}>
                    <span className={styles.modalResultItemName}>{item.item}</span>
                    <div className={styles.modalResultMetaRow}>
                      <span className={styles.modalBadgeMonth}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {item.month || '-'}
                      </span>
                      <span className={styles.modalResultAmount}>
                        Pagu: {fmt(item.planning_amount)}
                        {item.remarks ? ` · ${item.remarks}` : ''}
                      </span>
                      {item.kategori_kode && (
                        <span className={styles.modalBadgeCategory}>
                          {item.kategori_kode}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className={`btn-primary ${styles.modalPickBtn}`}
                    onClick={() => handlePickFromSearch(item.id)}
                    disabled={processingId === searchModalPr.id}
                  >
                    {processingId === searchModalPr.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={13} />
                        Pilih Item Ini
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button className="btn-secondary" onClick={closeSearchModal}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
