'use client'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = '720px' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg flex flex-col"
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '80vh',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.25)',
        }}
      >
        <div
          className="flex items-center justify-between shrink-0"
          style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)' }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              fontSize: '20px',
              lineHeight: 1,
              color: 'var(--text-tertiary)',
              padding: '0 4px',
              cursor: 'pointer',
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '14px 18px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
