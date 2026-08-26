import toast from 'react-hot-toast'

import { useState, useEffect } from 'react'
import { mappingApi } from '../api/mappingApi'
import { Search, CheckCheck, AlertTriangle, X, Check, Loader2, Database, Calendar } from 'lucide-react'
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)  // reset ke halaman 1 tiap kali keyword berubah
      setSelectedIds([]) // reset selection
      fetchData()
    }, 400)  // debounce 400ms, biar nggak request tiap ketikan huruf
    return () => clearTimeout(timer)
  }, [keyword])

  useEffect(() => { fetchData() }, [page])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await mappingApi.getPending({ page, per_page: 20, keyword })
      setItems(res.data?.data || [])
      setTotalPages(res.data?.pages || 1)
      setSelectedIds([]) // clear selection when data changes
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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
        setItems(prev => prev.filter(p => p.id !== prId))
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
        setItems(prev => prev.filter(p => p.id !== prId))
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

  async function handleBulkAction(actionType) {
    if (selectedIds.length === 0) return
    if (!confirm(`Konfirmasi batch ${actionType === 'approve' ? 'Persetujuan' : 'OOP'} untuk ${selectedIds.length} item?`)) return

    setIsBulkProcessing(true)
    try {
      const mappings = []
      
      for (const prId of selectedIds) {
        const pr = items.find(i => i.id === prId)
        if (!pr) continue

        if (actionType === 'oop') {
          mappings.push({ pr_id: prId, is_oop: true })
        } else if (actionType === 'approve') {
          const topCandidate = pr.fuzzy_candidates?.[0]
          if (topCandidate) {
            mappings.push({
              pr_id: prId,
              planning_detail_id: topCandidate.planning_detail_id,
              rank_no: topCandidate.rank_no
            })
          }
        }
      }

      if (mappings.length === 0) {
        toast.error('Tidak ada item valid untuk diproses')
        setIsBulkProcessing(false)
        return
      }

      const res = await mappingApi.bulkConfirm(mappings)
      if (res.data?.success) {
        toast.success(res.data.message)
        setItems(prev => prev.filter(p => !selectedIds.includes(p.id)))
        setSelectedIds([])
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses bulk action')
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
      // rank_no dikirim null karena dipilih di luar Top-5 rekomendasi sistem,
      // bukan salah satu kandidat fuzzy yang disarankan
      const payload = { planning_detail_id: planningDetailId, rank_no: null }
      const res = await mappingApi.confirmMapping(searchModalPr.id, payload)
      if (res.data?.success) {
        setItems(prev => prev.filter(p => p.id !== searchModalPr.id))
        closeSearchModal()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfirmasi')
    } finally {
      setProcessingId(null)
    }
  }

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
              Semua item sudah di-mapping! Tidak ada antrian review.
            </div>
          )}

          {items.length > 0 && (
            <div className={styles.selectAllWrapper}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === items.length && items.length > 0}
                  onChange={handleSelectAll}
                />
                Pilih Semua di Halaman Ini
              </label>
            </div>
          )}

          {items.map(pr => {
            const isNoCandidate = pr.fuzzy_candidates?.length === 0
            const hasPerfectCandidate = pr.fuzzy_candidates?.some(c => c.confidence_score >= 0.999)
            return (
              <div
                key={pr.id}
                className={`card ${styles.card} ${isNoCandidate ? styles.cardNoCandidate : ''} ${selectedIds.includes(pr.id) ? styles.cardSelected : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <input 
                      type="checkbox" 
                      className={styles.rowCheckbox}
                      checked={selectedIds.includes(pr.id)}
                      onChange={() => handleSelectItem(pr.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div 
                    className={styles.cardHeaderMain}
                    onClick={() => openSearchModal(pr)}
                    style={{ cursor: 'pointer', flex: 1 }}
                    title="Klik untuk Cari Manual"
                  >
                    <div>
                      <div className={styles.cardDescription}>{pr.description}</div>
                    <div className={styles.cardMeta}>
                      <span><strong className={styles.cardMetaLabel}>PR:</strong> {pr.pr_doc_num || '-'}</span>
                      <span><strong className={styles.cardMetaLabel}>Harga:</strong> {fmt(pr.total_price)}</span>
                      <span><strong className={styles.cardMetaLabel}>Kategori:</strong> {pr.kategori_kode || '-'}</span>
                      {pr.fuzzy_candidates?.[0]?.pr_code && (
                        <span>
                          <strong className={styles.cardMetaLabel}>Kode PR:</strong>{' '}
                          <code className={styles.cardMetaCode}>{pr.fuzzy_candidates[0].pr_code}</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`badge ${styles.statusBadge}`}>{pr.status_ai}</div>
                </div>
              </div>

                <div className={styles.candidateBox}>
                  <div className={styles.candidateBoxHeader}>
                    <div className={`section-label ${styles.sectionLabel}`}>Top Kandidat (Fuzzy Match)</div>
                    <div className={styles.actionGroup}>
                      <button
                        className={`btn-secondary ${styles.btnSearchManual}`}
                        onClick={() => openSearchModal(pr)}
                      >
                        <Search size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                        Cari Manual
                      </button>
                      {!hasPerfectCandidate && (
                        <button
                          className={`btn-primary ${styles.btnOop}`}
                          onClick={() => handleConfirmOop(pr.id)}
                          disabled={processingId === pr.id}
                        >
                          {processingId === pr.id ? 'Memproses...' : 'Tandai OOP (Out of Plan)'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isNoCandidate ? (
                    <p className={styles.noCandidateText}>
                      <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: '#e85d3a' }} />
                      Tidak ditemukan kandidat planning di periode ini.
                    </p>
                  ) : (
                    <div className={styles.candidateList}>
                      {pr.fuzzy_candidates?.map((c) => (
                        <div key={c.log_id} className={styles.candidateRow}>
                          <div className={styles.candidateLeft}>
                            <span className={styles.candidateRank}>#{c.rank_no}</span>
                            <div>
                              <div className={styles.candidateItemName}>{c.planning_item}</div>
                              <div className={styles.candidateAmount}>Amount: {fmt(c.planning_amount)}</div>
                            </div>
                          </div>
                          <div className={styles.candidateRight}>
                            {c.code_mismatch && (
                              <div className={styles.mismatchBadge}>
                                <div className={styles.mismatchLabel}>
                                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                  BEDA KODE
                                </div>
                                <div className={styles.mismatchDetail}>
                                  PR: <strong>{c.pr_code}</strong> → Kandidat: <strong>{c.candidate_code}</strong>
                                </div>
                              </div>
                            )}
                            <div className={styles.scoreBox}>
                              <div className={`${styles.scoreValue} ${scoreClass(c.confidence_score)}`}>
                                {Math.round((c.confidence_score || 0) * 100)}%
                              </div>
                              <div className={styles.scoreLabel}>Score</div>
                            </div>
                            <button
                              className={`btn-primary ${styles.btnConfirm}`}
                              onClick={() => handleConfirm(pr.id, c)}
                              disabled={processingId === pr.id}
                            >
                              {processingId === pr.id ? 'Memproses...' : 'Pilih Ini'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Prev
          </button>
          <span className={styles.pageInfo}>Hal {page} / {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </button>
        </div>
      )}

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
                  <p className={styles.modalSubtitle}>Pilih item master planning tahunan yang sesuai dengan PR</p>
                </div>
              </div>
              <button className={styles.modalClose} onClick={closeSearchModal} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className={styles.targetPrCard}>
              <div className={styles.targetPrHeader}>
                <span className={styles.targetPrLabel}>Target PR yang Di-review:</span>
                <span className={styles.targetPrDoc}>{searchModalPr.pr_doc_num || '-'}</span>
              </div>
              <div className={styles.targetPrDesc}>{searchModalPr.description}</div>
              <div className={styles.targetPrMeta}>
                <span><strong>Nominal:</strong> {fmt(searchModalPr.total_price)}</span>
                <span><strong>Kategori:</strong> {searchModalPr.kategori_kode || '-'}</span>
              </div>
            </div>

            <div className={styles.modalSearchWrapper}>
              <Search className={styles.modalSearchIcon} size={16} />
              <input
                type="text"
                autoFocus
                placeholder="Ketik kata kunci nama item planning (contoh: Cutting, Oli, Pipe)..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className={styles.modalSearchInput}
              />
              {searchTerm && (
                <button
                  type="button"
                  className={styles.modalSearchClear}
                  onClick={() => handleSearch('')}
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchLoading ? (
              <div className={styles.modalLoadingState}>
                <Loader2 size={20} className="animate-spin" />
                <span>Mencari item planning...</span>
              </div>
            ) : (
              <div className={styles.modalResultList}>
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <div key={item.id} className={styles.modalResultRow}>
                      <div className={styles.modalResultInfo}>
                        <div className={styles.modalResultItemName}>{item.item}</div>
                        <div className={styles.modalResultMetaRow}>
                          <span className={styles.modalBadgeMonth}>
                            <Calendar size={12} style={{ display: 'inline', marginRight: 3, verticalAlign: 'middle' }} />
                            {item.month || '-'}
                          </span>
                          {item.kategori_kode && (
                            <span className={styles.modalBadgeCategory}>
                              {item.kategori_kode}
                            </span>
                          )}
                          <span className={styles.modalResultAmount}>
                            Pagu: {fmt(item.planning_amount)}
                          </span>
                          {item.remarks && (
                            <span className={styles.modalResultRemarks} title={item.remarks}>
                              • {item.remarks}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className={`btn-primary ${styles.modalPickBtn}`}
                        onClick={() => handlePickFromSearch(item.id)}
                        disabled={processingId === searchModalPr.id}
                      >
                        <Check size={14} />
                        {processingId === searchModalPr.id ? 'Memproses...' : 'Pilih Item Ini'}
                      </button>
                    </div>
                  ))
                ) : searchTerm.length >= 2 ? (
                  <div className={styles.modalNoResultState}>
                    <AlertTriangle size={24} className={styles.modalNoResultIcon} />
                    <p className={styles.modalNoResultTitle}>Item planning tidak ditemukan</p>
                    <p className={styles.modalNoResultSub}>
                      Tidak ada data planning yang cocok dengan kata kunci "{searchTerm}". Pastikan ejaan benar atau coba kata kunci lain.
                    </p>
                  </div>
                ) : (
                  <div className={styles.modalGuideState}>
                    <Search size={24} className={styles.modalGuideIcon} />
                    <p className={styles.modalGuideTitle}>Mulai Pencarian Item Planning</p>
                    <p className={styles.modalGuideSub}>
                      Ketik minimal 2 karakter pada kotak pencarian di atas untuk melihat daftar rekomendasi item planning.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
