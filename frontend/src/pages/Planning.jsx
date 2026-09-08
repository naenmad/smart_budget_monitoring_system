import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, UploadCloud, Database } from 'lucide-react'
import PlanningList from './PlanningList'
import PlanningUpload from './PlanningUpload'
import s from './Planning.module.css'

export default function Planning() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  // Tabs: 'list' (Data Planning) | 'upload' (Kelola & Upload File)
  const [activeTab, setActiveTab] = useState(() => tabParam || 'list')

  useEffect(() => {
    if (tabParam && ['list', 'upload'].includes(tabParam)) {
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
      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <CalendarDays size={26} color="var(--primary)" />
            Master & Data Planning Anggaran
          </h1>
          <p className={s.subtitle}>
            Kelola master alokasi anggaran, pantau rincian item planning per form (E-1, E-9, I-1), dan sinkronisasi file Excel.
          </p>
        </div>

        {/* ── Sub-Nav Tabs ── */}
        <div className={s.tabNav}>
          <button
            onClick={() => handleTabChange('list')}
            className={`${s.tabBtn} ${activeTab === 'list' ? s.tabBtnActive : ''}`}
          >
            <Database size={16} />
            <span>Data Planning</span>
          </button>

          <button
            onClick={() => handleTabChange('upload')}
            className={`${s.tabBtn} ${activeTab === 'upload' ? s.tabBtnActive : ''}`}
          >
            <UploadCloud size={16} />
            <span>Kelola File & Upload</span>
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className={s.tabContent}>
        {activeTab === 'list' && <PlanningList />}
        {activeTab === 'upload' && <PlanningUpload />}
      </div>
    </div>
  )
}
