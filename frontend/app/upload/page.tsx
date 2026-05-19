'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { api } from '@/lib/api'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface Zone {
  state: UploadState
  message: string
  rows?: Record<string, number>
}

const IDLE: Zone = { state: 'idle', message: '' }

interface DropzoneProps {
  label: string
  hint: string
  accentColor: string
  zone: Zone
  onUpload: (file: File) => void
  onReset: () => void
}

function Dropzone({ label, hint, accentColor, zone, onUpload, onReset }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onUpload(file)
    },
    [onUpload],
  )

  const borderColor =
    dragging
      ? accentColor
      : zone.state === 'success'
        ? 'var(--ok)'
        : zone.state === 'error'
          ? 'var(--critical)'
          : 'var(--border)'

  const bgColor =
    dragging
      ? `${accentColor}12`
      : zone.state === 'success'
        ? '#f0fdf4'
        : zone.state === 'error'
          ? '#fef2f2'
          : 'var(--bg-page)'

  return (
    <div style={{ flex: 1 }}>
      <Card title={label}>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {hint}
        </p>

        <div
          role="button"
          tabIndex={0}
          aria-label={`Zona de carga: ${label}`}
          onClick={() => zone.state !== 'uploading' && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && zone.state !== 'uploading' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `1.5px dashed ${borderColor}`,
            borderRadius: '8px',
            padding: '32px 16px',
            textAlign: 'center',
            cursor: zone.state === 'uploading' ? 'wait' : 'pointer',
            backgroundColor: bgColor,
            transition: 'border-color 0.15s ease, background-color 0.15s ease',
            outline: 'none',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />

          {zone.state === 'idle' && (
            <>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                Arrastra el XLSX aquí
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                o haz clic para seleccionar
              </p>
            </>
          )}

          {zone.state === 'uploading' && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Procesando...</p>
          )}

          {zone.state === 'success' && (
            <>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ok)' }}>
                ✓ Cargado correctamente
              </p>
              {zone.rows && (
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {Object.entries(zone.rows)
                    .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
                    .join(' · ')}
                </p>
              )}
            </>
          )}

          {zone.state === 'error' && (
            <>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--critical)' }}>
                Error al cargar
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--critical)',
                  marginTop: '6px',
                  wordBreak: 'break-word',
                }}
              >
                {zone.message}
              </p>
            </>
          )}
        </div>

        {(zone.state === 'success' || zone.state === 'error') && (
          <button
            onClick={onReset}
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 0',
              textDecoration: 'underline',
            }}
          >
            Volver a subir
          </button>
        )}
      </Card>
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const [mdm, setMdm] = useState<Zone>(IDLE)
  const [training, setTraining] = useState<Zone>(IDLE)

  const handleUpload = useCallback(
    (setter: (z: Zone) => void, uploader: (f: File) => Promise<unknown>) =>
      async (file: File) => {
        setter({ state: 'uploading', message: '' })
        try {
          const body = await uploader(file)
          const b = body as { data?: Record<string, number>; detail?: string }
          if (b.detail) {
            setter({ state: 'error', message: b.detail })
          } else {
            setter({ state: 'success', message: '', rows: b.data })
          }
        } catch {
          setter({ state: 'error', message: 'No se pudo conectar al servidor' })
        }
      },
    [],
  )

  const uploadMdm = useCallback(handleUpload(setMdm, api.ingest.mdm), [handleUpload])
  const uploadTraining = useCallback(handleUpload(setTraining, api.ingest.training), [handleUpload])

  const bothLoaded = mdm.state === 'success' && training.state === 'success'

  return (
    <div style={{ maxWidth: '860px', margin: '32px auto', padding: '0 8px' }}>
      <h1
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}
      >
        Carga de datos fuente
      </h1>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Carga los dos archivos para activar el dashboard. Cada zona valida el esquema de su fichero
        y rechaza el archivo equivocado con un mensaje de error.
      </p>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <Dropzone
          label="MDM — Parches y dispositivos"
          hint="MDM_DATA.xlsx · 3 hojas: Events, Devices, Patches"
          accentColor="var(--brand-blue)"
          zone={mdm}
          onUpload={uploadMdm}
          onReset={() => setMdm(IDLE)}
        />
        <Dropzone
          label="Formación y concienciación"
          hint="Formación_y_concienciación.xlsx · 2 hojas: Events, Users"
          accentColor="var(--brand-red)"
          zone={training}
          onUpload={uploadTraining}
          onReset={() => setTraining(IDLE)}
        />
      </div>

      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled={!bothLoaded}
          onClick={() => router.push('/')}
          style={{
            padding: '8px 22px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            cursor: bothLoaded ? 'pointer' : 'not-allowed',
            backgroundColor: bothLoaded ? 'var(--brand-blue)' : 'var(--border)',
            color: bothLoaded ? '#ffffff' : 'var(--text-tertiary)',
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
        >
          Ir al dashboard →
        </button>
      </div>
    </div>
  )
}
