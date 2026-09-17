import { FileSearch, RotateCcw } from 'lucide-react'
import styles from './EmptyState.module.css'

export default function EmptyState({
  title = 'Tidak ada data ditemukan',
  description = 'Tidak ada data yang cocok dengan kriteria filter atau pencarian Anda.',
  actionLabel = 'Reset Filter',
  onAction,
  icon: Icon = FileSearch
}) {
  return (
    <div className={styles.emptyContainer}>
      <div className={styles.iconCircle}>
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <h4 className={styles.title}>{title}</h4>
      <p className={styles.description}>{description}</p>
      {onAction && (
        <button type="button" className={styles.actionBtn} onClick={onAction}>
          <RotateCcw size={13} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
