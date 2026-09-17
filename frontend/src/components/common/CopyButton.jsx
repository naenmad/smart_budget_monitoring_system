import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './CopyButton.module.css'

export default function CopyButton({ text, label = 'Nomor PR', size = 13 }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e.stopPropagation()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(`${label} berhasil disalin!`, { id: `copy-${text}`, duration: 2000 })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin ke clipboard')
    }
  }

  return (
    <button
      type="button"
      className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
      onClick={handleCopy}
      title={copied ? 'Tersalin!' : `Salin ${label}`}
      aria-label={`Salin ${label}`}
    >
      {copied ? <Check size={size} strokeWidth={2.5} /> : <Copy size={size} />}
    </button>
  )
}
