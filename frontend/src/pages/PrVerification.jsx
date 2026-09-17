import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckSquare, Layers, Network, GitMerge } from 'lucide-react'
import MappingReview from './MappingReview'
import PrResult from './PrResult'
import MappingGraph from './MappingGraph'
import s from './PrVerification.module.css'

export default function PrVerification() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Tabs: 'review' | 'result' | 'graph'
  const [activeTab, setActiveTab] = useState(() => tabParam || 'review')

  useEffect(() => {
    if (tabParam && ['review', 'result', 'graph'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('tab', tabKey)
      return next
    }, { replace: true })
  }

  return (
    <div className={s.container}>
      {/* ── Page Header ── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <GitMerge size={26} color="var(--primary)" />
            Verifikasi & Hasil Matching PR
          </h1>
          <p className={s.subtitle}>
            Pusat validasi purchase requisition terhadap alokasi planning: konfirmasi antrean review, pantau hasil matching, dan visualisasi relasi.
          </p>
        </div>

        {/* ── Sub-Nav Tabs ── */}
        <div className={s.tabNav}>
          <button
            onClick={() => handleTabChange('review')}
            className={`${s.tabBtn} ${activeTab === 'review' ? s.tabBtnActive : ''}`}
            title="Antrean item PR yang perlu konfirmasi/mapping manual"
          >
            <CheckSquare size={16} />
            <span>Perlu Tindakan (Review)</span>
          </button>

          <button
            onClick={() => handleTabChange('result')}
            className={`${s.tabBtn} ${activeTab === 'result' ? s.tabBtnActive : ''}`}
            title="Daftar item PR yang sudah berstatus terverifikasi / selesai"
          >
            <Layers size={16} />
            <span>Hasil Terverifikasi</span>
          </button>

          <button
            onClick={() => handleTabChange('graph')}
            className={`${s.tabBtn} ${activeTab === 'graph' ? s.tabBtnActive : ''}`}
            title="Visualisasi graf keterhubungan PR dengan master planning"
          >
            <Network size={16} />
            <span>Graf Keterhubungan</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className={s.tabContent} key={activeTab}>
        {activeTab === 'review' && <MappingReview />}
        {activeTab === 'result' && <PrResult />}
        {activeTab === 'graph' && <MappingGraph />}
      </div>
    </div>
  )
}
