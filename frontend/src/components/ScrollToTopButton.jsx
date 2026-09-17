import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import styles from './ScrollToTopButton.module.css'

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mainEl = document.querySelector('.app-main')
    
    const handleScroll = () => {
      const scrollPos = mainEl ? mainEl.scrollTop : window.scrollY
      setVisible(scrollPos > 240)
    }

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', handleScroll)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    const mainEl = document.querySelector('.app-main')
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      className={`${styles.scrollToTopBtn} ${visible ? styles.visible : ''}`}
      onClick={scrollToTop}
      title="Kembali ke atas"
      aria-label="Kembali ke atas"
    >
      <ArrowUp size={20} strokeWidth={2.4} />
    </button>
  )
}
