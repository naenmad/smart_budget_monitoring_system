import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { AlertTriangle, Trash2, AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react'
import s from '../components/ConfirmModal.module.css'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null)
  const confirmBtnRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      let config = {}
      if (typeof options === 'string') {
        config = {
          title: 'Konfirmasi Tindakan',
          message: options,
          confirmText: 'Lanjutkan',
          cancelText: 'Batal',
          type: 'warning'
        }
      } else {
        config = {
          title: options.title || 'Konfirmasi Tindakan',
          message: options.message || '',
          confirmText: options.confirmText || 'Konfirmasi',
          cancelText: options.cancelText || 'Batal',
          type: options.type || 'warning',
          icon: options.icon || null
        }
      }

      setDialogState({
        ...config,
        resolve: (val) => {
          setDialogState(null)
          resolve(val)
        }
      })
    })
  }, [])

  // Auto-focus confirm button when modal opens
  useEffect(() => {
    if (dialogState && confirmBtnRef.current) {
      confirmBtnRef.current.focus()
    }
  }, [dialogState])

  // ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && dialogState) {
        dialogState.resolve(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogState])

  const renderIcon = () => {
    if (!dialogState) return null
    const type = dialogState.type

    if (dialogState.icon === 'trash' || (type === 'danger' && !dialogState.icon)) {
      return (
        <div className={`${s.iconWrapper} ${s.iconDanger}`}>
          <Trash2 size={22} />
        </div>
      )
    }

    if (type === 'danger') {
      return (
        <div className={`${s.iconWrapper} ${s.iconDanger}`}>
          <AlertTriangle size={22} />
        </div>
      )
    }

    if (type === 'warning') {
      return (
        <div className={`${s.iconWrapper} ${s.iconWarning}`}>
          <AlertCircle size={22} />
        </div>
      )
    }

    return (
      <div className={`${s.iconWrapper} ${s.iconInfo}`}>
        <HelpCircle size={22} />
      </div>
    )
  }

  const getConfirmBtnClass = () => {
    if (!dialogState) return s.btnPrimary
    switch (dialogState.type) {
      case 'danger':
        return s.btnDanger
      case 'warning':
        return s.btnWarning
      default:
        return s.btnPrimary
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <div className={s.backdrop} onClick={() => dialogState.resolve(false)}>
          <div
            className={s.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={s.header}>
              {renderIcon()}
              <div className={s.titleArea}>
                <h3 className={s.title}>{dialogState.title}</h3>
                {dialogState.message && (
                  <p className={s.message}>{dialogState.message}</p>
                )}
              </div>
            </div>

            <div className={s.actions}>
              <button
                type="button"
                className={s.btnCancel}
                onClick={() => dialogState.resolve(false)}
              >
                {dialogState.cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`${s.btnConfirm} ${getConfirmBtnClass()}`}
                onClick={() => dialogState.resolve(true)}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
