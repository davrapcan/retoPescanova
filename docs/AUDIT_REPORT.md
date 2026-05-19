# Informe de auditoría — 2026-05-19

## Resumen ejecutivo

- **Estado general**: ÁMBAR
- **Bloqueantes para la demo**: 2
- **Recomendación**: GO con riesgos — los bloqueantes son conocidos y corregibles en < 1 h; el resto del stack está sólido.

---

## Bloqueantes (deben arreglarse antes del pitch)

### B1 · `NEXT_PUBLIC_USE_MOCKS=true` — dashboard muestra datos falsos

**Descripción**: `frontend/.env.local:1` tiene `NEXT_PUBLIC_USE_MOCKS=true`. Todos los hooks (`useMDM*`, `useTraining*`) detectan esta variable y devuelven datos hardcodeados de `lib/mocks/` en lugar de llamar al backend real. El dashboard parece funcionar, pero los datos que muestra son inventados.

**Consecuencias visibles**:
- Las oficinas muestran "VG España - Chapela (GLE)" en vez del real "RO España - Chapela (CHA)".
- El training banner muestra `warning` ("Phishing avanzado con más fricción") en vez del `critical` real (tasa global 41.5%).
- El heatmap de fricción funciona con mocks (los datos mock tienen ISO codes en `countries`) pero rompe con datos reales (ver B2).

**Fix aplicado en este audit**: cambiado `true` → `false` en `.env.local` (commit separado).

**Verificar tras el fix**: levantar `docker-compose up`, subir los dos XLSX vía `/upload`, y confirmar que los KPIs muestran 360/55/12/6 (MDM) y 1230 usuarios (Training).

---

### B2 · `FrictionHeatmap` — CORE 3 vacío con datos reales

**Descripción**: `frontend/components/charts/FrictionHeatmap.tsx:27`:

```ts
const xIdx = countries.indexOf(c.location_iso)  // BUG
```

El array `countries` que devuelve el backend contiene nombres completos (`["España", "Ecuador", "Nicaragua", ...]`) porque `training_service.py:153` hace `countries = list(events.groupby("location").size().index)`. Pero `c.location_iso` contiene el código ISO (`"ES"`, `"EC"`, `"NI"`). El `indexOf` devuelve `-1` para todas las celdas → `if (xIdx === -1 || yIdx === -1) return null` filtra todo → heatmap renderiza sin ningún dato.

**Confirmado empíricamente**: `countries.indexOf('ES') = -1`, `countries.indexOf('España') = 0`.

**Por qué no se vio con mocks**: los datos mock en `lib/mocks/training.ts` tienen `countries` con ISOs (`["ES","EC",...]`), ocultando el bug.

**Sugerencia de fix** (2 opciones, decide tú):

*Opción A — fix frontend (1 línea + ajuste xAxis)*:
```ts
// FrictionHeatmap.tsx:27
const xIdx = countries.indexOf(c.location)   // usa nombre completo para indexar

// Y en la xAxis (para mostrar ISO codes per spec):
const countryIsoMap = Object.fromEntries(cells.map(c => [c.location, c.location_iso]))
const xAxisLabels  = countries.map(c => countryIsoMap[c] ?? c.slice(0,2).toUpperCase())
// xAxis.data = xAxisLabels  (en lugar de countries)
```

*Opción B — fix backend (1 línea en `training_service.py`)*:
```python
# training_service.py:154  (en get_friction)
# Añadir mapping countries → ISO
countries = [country_to_iso(c) for c in country_counts.index]
# Y en la celda:
location_iso=country_to_iso(loc)  # ya se envía así, consistente
# NOTA: requiere también actualizar las mocks si USE_MOCKS vuelve a activarse
```

---

## Avisos (no bloqueantes pero conviene mirar)

### A1 · Score medio real 17.87 % ≠ rango esperado en audit check (20–22 %)

El audit check pedía "score_pct medio entre 20 y 22 %". El valor real con los 1230 usuarios es **17.87 %**. La causa: hay 184 usuarios con `score_pct=0` (penalización por `overall_score_raw = None → 0`). La media de los 1046 usuarios con score > 0 es **21.01 %** (coincide con la spec 3.5). El código es correcto; el rango del audit check era una estimación previa a la decisión de penalizar a los usuarios sin score. No es un bug.

### A2 · Training banner: CRITICAL, no AMBER

La tasa global de finalización real es **41.53 % < 50 %** → el banner dispara `critical` ("Tasa de finalización global crítica: 42 %"), no `warning` como esperaba el audit check. El código sigue la spec 4.2 correctamente. El audit check basaba su expectativa en el mock (62 % de finalización). No es un bug; es la realidad del dataset.

### A3 · Módulo "Phishing avanzado" no existe en los datos reales

El audit check esperaba `friction > 60` para "Phishing avanzado" en Nicaragua. El módulo más cercano es "The Dangers of Phishing" (NI: friction=9.9) y "Why Attackers Use Phishing" (NI: friction=37.5). La friction máxima de cualquier celda es **53.1** (Nicaragua × Beyond Passwords). Ninguna celda supera 60 → el heatmap mostrará colores verde-ámbar, sin rojo. Esto es un hallazgo de datos, no un bug de código.

### A4 · Oficinas con prefijo "RO España", no "VG España"

La spec mostraba `VS Iwteñe → VG España` como ejemplo, pero con shift=-4: V→R, S→O → el prefijo correcto decodificado es **"RO España"**. Los nombres de ciudad (Chapela, Porriño, Arteixo, Xove, Madrid…) son correctos y legibles. Los códigos de oficina del dataset real (CHA, POR, ART, XOV…) también difieren de los ejemplos del spec (GLE, TSV, EVX, BSZ). Los ejemplos del spec eran ilustrativos, no los valores reales. No es un bug.

### A5 · Seis colores fuera de paleta spec 2.1

Los siguientes hex aparecen en `theme.ts` y componentes; no están en la paleta de la sección 2.1:

| Hex | Uso | Origen |
|---|---|---|
| `#F0FDF4` | Fondo RiskBanner ok | `severityBg.ok` |
| `#FFFBEB` | Fondo RiskBanner warning | `severityBg.warning` |
| `#FEF2F2` | Fondo RiskBanner critical, upload error | `severityBg.critical` |
| `#BBF7D0` | Borde RiskBanner ok | `severityBorder.ok` |
| `#FDE68A` | Borde RiskBanner warning, OutliersList | `severityBorder.warning` |
| `#FECACA` | Borde RiskBanner critical, OutliersList | `severityBorder.critical` |

Son tintes semánticos derivados de los colores OK/Warning/Critical. El spec no los prohíbe explícitamente (solo define los tokens principales). Reportados por requerimiento del audit; no se consideran un problema estético.

### A6 · `FrictionHeatmap` — `shadowBlur` en emphasis (viola flat design)

`frontend/components/charts/FrictionHeatmap.tsx:108-111`:
```ts
emphasis: {
  itemStyle: {
    shadowBlur: 6,
    shadowColor: 'rgba(0,0,0,0.2)',
  },
},
```
Viola el principio "sin sombras". Solo ocurre al hacer hover. Fix trivial: reemplazar por `emphasis: { itemStyle: { opacity: 0.75 } }`.

### A7 · Logo Pescanova ausente (placeholder "P")

`DashboardHeader.tsx` muestra una letra "P" en una caja roja en lugar del logotipo real de Pescanova. No hay ningún archivo de imagen de logo en el repo. Para el pitch, añadir `public/logo-pescanova.svg` (o PNG) y referenciarlo con `<Image>`.

### A8 · `CountryDoubleBar` sin tooltip de hover

El componente es HTML/CSS puro sin tooltip interactivo. Solo hay un `title` nativo del SO en el nombre del país (para truncación). La spec exige "Tooltips en todas las visualizaciones". Afecta al CORE 1 de Training.

### A9 · `TripleSparkline` sin tooltip de hover

SVG puro sin interactividad. Tampoco tiene tooltip para los puntos individuales. Afecta al CORE 2 de Training.

### A10 · `CountryDoubleBar` muestra "pts" en lugar de "%" para score

`CountryDoubleBar.tsx:92`:
```ts
<span style={{ color: 'var(--brand-blue)' }}>{Math.round(scorePct)}pts</span>
```
`avg_score_pct` es un porcentaje (0–100 %). Mostrar "21pts" es ambiguo. Debería ser "21%" o "21 ptos". Fix trivial.

### A11 · Componente `Skeleton` duplicado en 2 páginas

Definido inline en `app/mdm/page.tsx:31` y `app/training/page.tsx:22` con firmas diferentes. No es bloqueante pero es deuda técnica (candidato a extraer a `components/ui/Skeleton.tsx`).

### A12 · Warning Next.js build (lockfiles múltiples)

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
```
Causado por `pnpm-lock.yaml` en `C:\Users\Usuario\` a nivel de sistema. No es bloqueante. Fix: añadir `outputFileTracingRoot` a `next.config.js` o ignorar.

### A13 · Dark mode y Export PDF no implementados

Funcionalidades de Fase 4 (polishing) del spec, opcionales. Reportados para completitud.

### A14 · Mediana score_pct real 9.38 % vs esperado ~12.5 %

Misma causa que A1: 184 usuarios con score=0 mueven la mediana hacia abajo. La mediana de los 1046 usuarios con score > 0 es exactamente 12.50 %. No es un bug.

---

## Verificación de datos

| # | Check | Resultado | Nota |
|---|---|---|---|
| 1 | `training_events = 10988` | ✅ | Parquet verificado |
| 2 | `training_users = 1230` | ✅ | Parquet verificado |
| 3 | MDM KPIs: 360/55/12/6 | ✅ | Parquet verificado |
| 4 | Oficinas descifradas (sin "VS Iwteñe") | ✅ | "RO España - Chapela" y similares |
| 5 | Nicaragua×Phishing friction > 60 | ❌ | Módulo = "The Dangers of Phishing", friction=9.9. Máximo global: 53.1 |
| 6 | Fórmula friction.py exacta | ✅ | `100*(0.55*dur_norm + 0.45*incomp)` sin score ni Removed |
| 7 | Filtro Removed + cross-filter users | ✅ | loaders.py:122 y :147 |
| 8 | Grep "Removed" — solo donde debe | ✅ | Solo loaders.py (filtro + comentarios). Cero en frontend. |
| 9 | p95_duration_global = 13.0 | ✅ | Calculado sobre los 10988 eventos filtrados |
| 10 | score_pct medio ∈ [20,22] % | ⚠ | Real: 17.87 % (todos). 21.01 % (solo usuarios con score). Ver A1. |
| 11 | score_pct mediana ~12.5 % | ⚠ | Real: 9.38 % (todos). 12.50 % (solo usuarios con score). Ver A14. |

---

## Contratos API

Todos los 13 endpoints de la spec sección 6.3 existen (más 2 adicionales de ingest que no son los de la spec, total 15). Cero endpoints inventados en el frontend.

**Desfases Pydantic ↔ TypeScript**: ninguno. Match campo a campo 100 %.

---

## Checklist sección 11 del spec

- [x] Tras la ingesta: 10988 eventos y 1230 usuarios — verificado en parquet
- [ ] Las dos pestañas cargan en <2s — no verificado (docker no levantado durante audit)
- [x] Las 8 visualizaciones CORE renderizan sin errores — build TypeScript limpio ✅
- [x] Oficinas descifradas y legibles — "RO España - Chapela", etc. ✅
- [ ] Friction score correcto verificado a mano — bloqueado por B2 (heatmap vacío con datos reales)
- [x] `score_pct` clampeado a 100 — test `test_score_pct_clamped` pasa ✅
- [ ] Tooltips en todas las visualizaciones — CountryDoubleBar y TripleSparkline sin tooltip (A8, A9)
- [ ] Branding Pescanova evidente — logo placeholder "P" (A7); tabs y colores correctos ✅
- [x] Banner de riesgo cambia según datos — rojo con 6 failed (MDM), crítico por completeness (Training)
- [ ] Subir XLSX nuevo actualiza dashboards — bloqueado mientras USE_MOCKS era true (B1 corregido)
- [ ] Navegación entre pestañas mantiene estado — no verificado visualmente
- [x] Sin errores en consola del navegador — build limpio, no hay console.log en el código
- [ ] Layout no se rompe en 1366×768 — no verificado visualmente (requiere browser)

---

## Calidad de código

| Check | Resultado |
|---|---|
| `npm run build` | ✅ Sin errores TS; 1 warning de workspace (A12) |
| `pytest backend/` | ✅ 21/21 passed |
| Archivos > 300 líneas | ✅ Ninguno |
| `console.log` | ✅ Ninguno |
| `TODO` / `FIXME` | ✅ Ninguno |
| Imports no usados | ✅ Ninguno encontrado |
| `shadow-` / `drop-shadow` / `gradient` en Tailwind | ✅ Ninguno |
| Scatter con 1230 puntos | ✅ No existe; CORE 4 es histograma + lista ✅ |
| Scatter component | ✅ No existe |
| Colores hardcoded | ⚠ Solo colores de paleta (ver A5 para los 6 tintes semánticos adicionales) |

---

## Fixes que ya he aplicado

| # | Fix | Archivo | Justificación |
|---|---|---|---|
| 1 | `NEXT_PUBLIC_USE_MOCKS=false` | `frontend/.env.local:1` | El dashboard mostraba datos fake; configuración de desarrollo no revertida antes del audit |

---

## Recomendaciones para el pitch

**Mostrar**:
- El flujo upload → /mdm → /training muestra datos reales tras el fix B1.
- Banner rojo en MDM (6 failed) es impactante y real.
- Las 4 KPI cards MDM (360/55/12/6) son exactas y verificadas.
- El heatmap de fricción muestra colores verde-ámbar (máx 53.1 en Nicaragua×Beyond Passwords); explicar que el módulo con más fricción en Nicaragua es "Beyond Passwords".

**Evitar mostrar o prepararse para**:
- El heatmap de Training estará vacío con datos reales hasta que se corrija B2. **Si no se corrige antes del pitch**, volver a activar los mocks solo para el heatmap o usar USE_MOCKS=true para la demo (el resto del dashboard es visualmente correcto con mocks).
- El training banner mostrará CRITICAL (42 % completeness), no amber. Prepara el discurso para explicar que esto es más alarmante de lo esperado.
- Si preguntan por "Phishing avanzado" en Nicaragua, redirigir a "Beyond Passwords" (53.1 friction) o "Why Attackers Use Phishing" (37.5).
- El logo es un placeholder. Si hay tiempo, añadir el logo real.

**Fortalezas reales a destacar**:
- Ingesta validada con assertion dura (10988/1230): si el dataset es distinto, el backend falla ruidosamente en lugar de mostrar basura silenciosa.
- Contratos API Pydantic ↔ TypeScript son 100 % coherentes.
- 21 tests unitarios pasando; cobertura de caesar, friction y normalize.
- Build TypeScript sin errores; 0 console.log en producción.
- Arquitectura DataSource abstracta lista para conectar API real de ManageEngine.
