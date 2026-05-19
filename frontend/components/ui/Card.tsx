'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface CardProps {
  title?: string
  extra?: React.ReactNode
  className?: string
  expandable?: boolean
  children: React.ReactNode
  onClick?: () => void
}

function ExpandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Card({
  title,
  extra,
  className = '',
  expandable = true,
  children,
  onClick,
}: CardProps) {
  const clickable = !!onClick
  const canExpand = expandable && !clickable
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [expanded])

  return (
    <>
      <div
        className={`relative bg-white rounded-lg flex flex-col ${clickable ? 'card-clickable' : ''} ${canExpand ? 'group transition-shadow' : ''} ${className}`}
        style={{
          border: '0.5px solid var(--border)',
          padding: '12px',
          cursor: clickable ? 'pointer' : canExpand ? 'zoom-in' : 'default',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        }}
        onClick={
          clickable
            ? onClick
            : canExpand
            ? (e) => {
                if ((e.target as HTMLElement).closest('[data-no-expand]')) return
                setExpanded(true)
              }
            : undefined
        }
        role={clickable || canExpand ? 'button' : undefined}
        tabIndex={clickable || canExpand ? 0 : undefined}
        aria-label={canExpand && title ? `Ampliar ${title}` : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick!()
                }
              }
            : canExpand
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpanded(true)
                }
              }
            : undefined
        }
        onMouseEnter={
          canExpand
            ? (e) => { ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(15,23,42,0.08)' }
            : undefined
        }
        onMouseLeave={
          canExpand
            ? (e) => { ;(e.currentTarget as HTMLElement).style.boxShadow = '' }
            : undefined
        }
      >
        {(title || extra || canExpand || clickable) && (
          <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
            {title && (
              <p
                className="uppercase font-medium"
                style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
              >
                {title}
              </p>
            )}
            <div className="flex items-center gap-2 ml-auto" data-no-expand>
              {extra}
              {clickable && (
                <span style={{ fontSize: '11px', color: 'var(--brand-blue)', textTransform: 'none', letterSpacing: 0 }}>
                  Ver detalle →
                </span>
              )}
              {canExpand && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                  aria-label={title ? `Ampliar ${title}` : 'Ampliar'}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors opacity-70 hover:opacity-100"
                  style={{ color: 'var(--text-secondary)', background: 'rgba(148, 163, 184, 0.12)' }}
                >
                  <ExpandIcon size={15} />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0">{children}</div>
      </div>

      {expanded && typeof window !== 'undefined' &&
        createPortal(
          <div
            data-testid="card-expanded-overlay"
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(4px)',
              animation: 'cardFadeIn 120ms ease-out',
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title ?? 'Expanded card'}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-xl flex flex-col"
              style={{
                border: '0.5px solid var(--border)',
                boxShadow: '0 24px 60px rgba(15,23,42,0.35)',
                padding: '24px 28px',
                width: 'min(92vw, 1200px)',
                height: 'min(86vh, 780px)',
                animation: 'cardPop 160ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <button
                onClick={() => setExpanded(false)}
                aria-label="Cerrar"
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                style={{ color: 'var(--text-tertiary)', fontSize: '22px', lineHeight: 1 }}
              >
                ×
              </button>
              {(title || extra) && (
                <div className="flex items-center justify-between shrink-0 mb-4 pr-12 gap-3">
                  {title && (
                    <p
                      className="uppercase font-medium"
                      style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '0.6px' }}
                    >
                      {title}
                    </p>
                  )}
                  {extra && <div className="ml-auto">{extra}</div>}
                </div>
              )}
              <div className="flex-1 min-h-0">{children}</div>
            </div>
            <style jsx>{`
              @keyframes cardFadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes cardPop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
            `}</style>
          </div>,
          document.body,
        )}
    </>
  )
}
