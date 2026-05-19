'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadFile, formatRelativeTime, slugify, toCsv } from '@/lib/panelExport'

interface CardProps {
  title?: string
  extra?: React.ReactNode
  className?: string
  expandable?: boolean
  /** Raw data the panel renders. Enables Inspect / Export actions in the kebab menu. */
  inspectData?: unknown
  /** Unix ms; when provided, shows a "hace Xs" indicator and enables Copy-link. */
  lastUpdated?: number | null
  /** Slug used for export filenames and panel deep-links. */
  panelId?: string
  children: React.ReactNode
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

function KebabIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.3" />
      <circle cx="8" cy="8" r="1.3" />
      <circle cx="8" cy="12.5" r="1.3" />
    </svg>
  )
}

function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function Card({
  title,
  extra,
  className = '',
  expandable = true,
  inspectData,
  lastUpdated,
  panelId,
  children,
}: CardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [inspectOpen, setInspectOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const now = useNow(15_000)

  const resolvedPanelId = panelId ?? (title ? slugify(title) : 'panel')
  const hasMenu = inspectData !== undefined || !!lastUpdated

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

  useEffect(() => {
    if (!menuOpen) return
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!inspectOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setInspectOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inspectOpen])

  function handleExportCsv() {
    setMenuOpen(false)
    if (inspectData === undefined) return
    downloadFile(`${resolvedPanelId}.csv`, toCsv(inspectData), 'text/csv')
  }

  function handleExportJson() {
    setMenuOpen(false)
    if (inspectData === undefined) return
    downloadFile(`${resolvedPanelId}.json`, JSON.stringify(inspectData, null, 2), 'application/json')
  }

  async function handleCopyLink() {
    setMenuOpen(false)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('panel', resolvedPanelId)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  const relative = lastUpdated ? formatRelativeTime(lastUpdated, now) : ''

  return (
    <>
      <div
        className={`relative bg-white rounded-lg flex flex-col group transition-shadow ${className}`}
        style={{
          border: '0.5px solid var(--border)',
          padding: '12px',
          cursor: expandable ? 'zoom-in' : 'default',
        }}
        onClick={
          expandable
            ? (e) => {
                if ((e.target as HTMLElement).closest('[data-no-expand]')) return
                setExpanded(true)
              }
            : undefined
        }
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-label={expandable && title ? `Ampliar ${title}` : undefined}
        onKeyDown={
          expandable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setExpanded(true)
                }
              }
            : undefined
        }
        onMouseEnter={
          expandable
            ? (e) => {
                ;(e.currentTarget as HTMLElement).style.boxShadow =
                  '0 6px 16px rgba(15,23,42,0.08)'
              }
            : undefined
        }
        onMouseLeave={
          expandable
            ? (e) => {
                ;(e.currentTarget as HTMLElement).style.boxShadow = ''
              }
            : undefined
        }
      >
        {(title || extra || expandable || hasMenu) && (
          <div className="flex items-center justify-between mb-2 shrink-0 gap-2">
            {title && (
              <p
                className="uppercase font-medium"
                style={{
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.5px',
                }}
              >
                {title}
              </p>
            )}
            <div className="flex items-center gap-1.5 ml-auto" data-no-expand>
              {relative && (
                <span
                  title={
                    lastUpdated
                      ? `Actualizado ${new Date(lastUpdated).toLocaleTimeString('es-ES')}`
                      : undefined
                  }
                  style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}
                >
                  {relative}
                </span>
              )}
              {extra}
              {hasMenu && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen((v) => !v)
                    }}
                    aria-label="Acciones del panel"
                    className="w-7 h-7 flex items-center justify-center rounded-md transition-colors opacity-70 hover:opacity-100"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'rgba(148, 163, 184, 0.12)',
                    }}
                  >
                    <KebabIcon size={14} />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 mt-1 bg-white rounded-md z-40"
                      style={{
                        border: '0.5px solid var(--border)',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                        minWidth: '180px',
                      }}
                    >
                      <div className="flex flex-col py-1">
                        {inspectData !== undefined && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen(false)
                                setInspectOpen(true)
                              }}
                              className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Inspect data
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportCsv()
                              }}
                              className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Export CSV
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportJson()
                              }}
                              className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              Export JSON
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyLink()
                          }}
                          className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {copied ? '✓ Copiado' : 'Copy link to panel'}
                        </button>
                        {expandable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpen(false)
                              setExpanded(true)
                            }}
                            className="text-left px-3 py-1.5 text-xs hover:bg-slate-50"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            Vista ampliada
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {expandable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded(true)
                  }}
                  aria-label={title ? `Ampliar ${title}` : 'Ampliar'}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors opacity-70 hover:opacity-100"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'rgba(148, 163, 184, 0.12)',
                  }}
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
                      style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.6px',
                      }}
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
              @keyframes cardFadeIn {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
              @keyframes cardPop {
                from { opacity: 0; transform: scale(0.94); }
                to   { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>,
          document.body,
        )}

      {inspectOpen && typeof window !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setInspectOpen(false)}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6"
            style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Inspect ${title ?? 'panel'}`}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-xl flex flex-col"
              style={{
                border: '0.5px solid var(--border)',
                boxShadow: '0 24px 60px rgba(15,23,42,0.35)',
                width: 'min(92vw, 900px)',
                height: 'min(80vh, 640px)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ borderBottom: '0.5px solid var(--border)' }}
              >
                <p
                  className="uppercase font-medium"
                  style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
                >
                  Inspect · {title ?? 'panel'}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-2 py-1 rounded text-xs font-medium hover:bg-slate-50"
                    style={{ border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-2 py-1 rounded text-xs font-medium hover:bg-slate-50"
                    style={{ border: '0.5px solid var(--border)', color: 'var(--text-primary)' }}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectOpen(false)}
                    aria-label="Cerrar"
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100"
                    style={{ color: 'var(--text-tertiary)', fontSize: '18px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <pre
                  className="text-xs font-mono whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {JSON.stringify(inspectData, null, 2)}
                </pre>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
