import { useState, useRef, useEffect } from 'react'
import s from './ScrollableCell.module.css'

export default function ScrollableCell({ 
  text, 
  maxWidth = 360, 
  minWidth = 200, 
  className = '' 
}) {
  const containerRef = useRef(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const animTimeoutRef = useRef(null)
  const animFrameRef = useRef(null)

  if (!text) return <span>-</span>

  const handleMouseEnter = () => {
    if (isExpanded) return
    const el = containerRef.current
    if (!el) return

    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return

    // Small delay before starting auto-scroll
    animTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return

      let startTime = null
      const duration = Math.max(3000, maxScroll * 25) // Speed proportional to text length

      const scrollStep = (timestamp) => {
        if (!startTime) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Smooth ease-in-out curve
        const ease = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        if (containerRef.current) {
          containerRef.current.scrollLeft = ease * maxScroll
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(scrollStep)
        } else {
          // Pause at end, then scroll back
          animTimeoutRef.current = setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
            }
          }, 1200)
        }
      }

      animFrameRef.current = requestAnimationFrame(scrollStep)
    }, 350)
  }

  const handleMouseLeave = () => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    if (containerRef.current && !isExpanded) {
      containerRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  return (
    <div 
      className={`${s.cellWrapper} ${className}`}
      style={{ maxWidth: isExpanded ? '100%' : maxWidth, minWidth }}
      title={`${text} (Klik untuk ${isExpanded ? 'meringkas' : 'membuka seluruh teks'})`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsExpanded(prev => !prev)}
    >
      <div 
        ref={containerRef}
        className={`${s.scrollContainer} ${isExpanded ? s.expanded : ''}`}
      >
        <span className={s.textContent}>{text}</span>
      </div>
      {isExpanded && (
        <span className={s.expandBadge}>Tutup [x]</span>
      )}
    </div>
  )
}
