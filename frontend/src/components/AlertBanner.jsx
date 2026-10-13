import { useState } from 'react'
import { AlertTriangle, AlertCircle, X } from 'lucide-react'
import s from './AlertBanner.module.css'

export default function AlertBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([])

  const visible = alerts.filter((_, i) => !dismissed.includes(i))
  if (visible.length === 0) return null

  return (
    <div className={s.wrapper}>
      {alerts.map((alert, i) => {
        if (dismissed.includes(i)) return null

        const isDanger = alert.type === 'danger'
        const title = alert.title
        const message = alert.message || alert.desc || (typeof alert === 'string' ? alert : '')

        return (
          <div
            key={i}
            className={`${s.banner} ${isDanger ? s.danger : s.warning}`}
          >
            <span className={s.icon}>
              {isDanger ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
            </span>
            <div className={s.content}>
              {title && <span className={s.title}>{title} — </span>}
              <span className={s.desc}>{message}</span>
            </div>
            <button
              className={s.closeBtn}
              onClick={() => setDismissed(prev => [...prev, i])}
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
