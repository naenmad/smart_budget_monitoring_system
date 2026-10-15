import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  UploadCloud,
  Database,
  FileSpreadsheet,
  Wrench,
  AlertTriangle,
  Scale,
  Gauge
} from 'lucide-react'
import PlanningList from './PlanningList'
import PlanningUpload from './PlanningUpload'
import DatabaseSpreadsheet from './DatabaseSpreadsheet'
import OutOfPlan from './OutOfPlan'
import PreventiveCfView from './PreventiveCfView'
import PriceVariance from './PriceVariance'
import Kalibrasi from './Kalibrasi'
import s from './Planning.module.css'

export default function Planning() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  // Tabs: 'list' | 'variance' | 'kalibrasi' | 'preventive' | 'oob' | 'spreadsheet' | 'upload'
  const [activeTab, setActiveTab] = useState(() => tabParam || 'list')

  const validTabs = ['list', 'variance', 'kalibrasi', 'preventive', 'oob', 'spreadsheet', 'upload']

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
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
      {/* ─── Header ─── */}
      <div className={s.header}>
        <div className={s.titleArea}>
          <h1 className={s.title}>
            <CalendarDays size={26} color="var(--primary)" />
            Master &amp; Data Planning Anggaran
          </h1>
          <p className={s.subtitle}>
            Kelola master alokasi anggaran, pantau rincian item planning per Account, monitor varians harga belanja, kalibrasi alat ukur QC, Preventive C/F &amp; Out of Budget, dan sinkronisasi file Excel.
          </p>
        </div>

        {/* ─── Sub-Nav Tabs ─── */}
        <div className={s.tabNav}>
          <button
            onClick={() => handleTabChange('list')}
            className={`${s.tabBtn} ${activeTab === 'list' ? s.tabBtnActive : ''}`}
          >
            <Database size={16} />
            <span>Data Planning</span>
          </button>

          <button
            onClick={() => handleTabChange('variance')}
            className={`${s.tabBtn} ${activeTab === 'variance' ? s.tabBtnActive : ''}`}
          >
            <Scale size={16} />
            <span>Perbandingan Harga</span>
          </button>

          <button
            onClick={() => handleTabChange('kalibrasi')}
            className={`${s.tabBtn} ${activeTab === 'kalibrasi' ? s.tabBtnActive : ''}`}
          >
            <Gauge size={16} />
            <span>Kalibrasi Alat (QC)</span>
          </button>

          <button
            onClick={() => handleTabChange('preventive')}
            className={`${s.tabBtn} ${activeTab === 'preventive' ? s.tabBtnActive : ''}`}
          >
            <Wrench size={16} />
            <span>Data Preventive C/F</span>
          </button>

          <button
            onClick={() => handleTabChange('oob')}
            className={`${s.tabBtn} ${activeTab === 'oob' ? s.tabBtnActive : ''}`}
          >
            <AlertTriangle size={16} />
            <span>Out of Plan</span>
          </button>

          <button
            onClick={() => handleTabChange('spreadsheet')}
            className={`${s.tabBtn} ${activeTab === 'spreadsheet' ? s.tabBtnActive : ''}`}
          >
            <FileSpreadsheet size={16} />
            <span>Database Spreadsheet</span>
          </button>

          <button
            onClick={() => handleTabChange('upload')}
            className={`${s.tabBtn} ${activeTab === 'upload' ? s.tabBtnActive : ''}`}
          >
            <UploadCloud size={16} />
            <span>Kelola File &amp; Upload</span>
          </button>
        </div>
      </div>

      {/* ─── Tab Content ─── */}
      <div className={s.tabContent} key={activeTab}>
        {activeTab === 'list' && <PlanningList />}
        {activeTab === 'variance' && <PriceVariance />}
        {activeTab === 'kalibrasi' && <Kalibrasi />}
        {activeTab === 'preventive' && <PreventiveCfView />}
        {activeTab === 'oob' && <OutOfPlan />}
        {activeTab === 'spreadsheet' && <DatabaseSpreadsheet />}
        {activeTab === 'upload' && <PlanningUpload />}
      </div>
    </div>
  )
}
