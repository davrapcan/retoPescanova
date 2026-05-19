# Reportes PDF — Diseño

> Pescanova Cyber Risk Cockpit · feature de exportación PDF
> Fecha: 2026-05-19
> Estado: diseño aprobado, pendiente plan de implementación

---

## 1. Objetivo

Permitir al CISO descargar reportes ejecutivos en PDF (con branding Pescanova) de las dos pestañas del cockpit:

- **MDM · Parches** con filtros opcionales por rango de fechas, tipo de parche y oficina.
- **Formación** con filtros opcionales por país y módulo.

Los PDFs se generan en el backend a partir de HTML+CSS (WeasyPrint), reutilizando los services ya existentes. El acceso se hace desde un botón compacto en el header de cada pestaña que expande un popover de filtros.

## 2. Alcance

**Dentro**:
- Dos endpoints REST que devuelven `application/pdf`.
- Plantillas Jinja2 con branding Pescanova (`@page` A4 vertical, header con logo, footer con paginación y filtros aplicados).
- Componente React `ReportButton` con popover anclado, reutilizado en ambas pestañas con configuración distinta.
- Tests de smoke y de contexto para los endpoints.

**Fuera de alcance (v1)**:
- Gráficos embebidos (heatmap, sparklines, barras): v1 muestra el dato como tabla. Se deja la puerta abierta para PNG/SVG en v2.
- Plantillas personalizables por usuario o multilenguaje.
- Caché de PDFs generados (datasets pequeños, regeneración <1s).
- Envío por email o webhook.

## 3. Arquitectura

### 3.1 Estructura backend

```
backend/app/
├── routers/
│   └── reports.py          # GET /reports/mdm.pdf, /reports/training.pdf
└── reports/
    ├── __init__.py
    ├── renderer.py         # WeasyPrint + Jinja2 environment
    ├── context.py          # ensambla dict para templates desde services existentes
    └── templates/
        ├── base.html       # layout común: @page, header, footer, bloques
        ├── styles.css      # paleta Pescanova, tipografía Inter, tablas
        ├── mdm.html        # extiende base.html
        └── training.html   # extiende base.html
```

**Principio**: los services (`mdm_service`, `training_service`) son la única fuente de datos. `reports/context.py` los invoca con los filtros del query string y entrega un dict listo para Jinja. No se duplica lógica de cálculo.

### 3.2 Endpoints

```
GET /api/v1/reports/mdm.pdf
    ?date_from=YYYY-MM-DD
    &date_to=YYYY-MM-DD
    &patch_id=PA001,PA002       (multivalor por coma)
    &office=GLE,TSV              (multivalor por coma)

GET /api/v1/reports/training.pdf
    ?location=España,Ecuador
    &module=Phishing,GDPR
```

Respuesta:
- `200` → `Content-Type: application/pdf`, body binario.
- `Content-Disposition: inline; filename="pescanova-mdm-YYYY-MM-DD.pdf"` (inline para que el navegador abra en pestaña nueva, pero filename queda para "Guardar como…").
- `503` si los datos no se han cargado todavía (mismo patrón que `_require_mdm()` actual).
- `422` si un filtro tiene formato inválido (Pydantic).

### 3.3 Flujo

```
Usuario abre popover en /mdm
   └─► ReportButton ya tiene la lista de parches y oficinas en el store
        (cargadas via /api/v1/mdm/top-patches y /by-office al montar)

Usuario selecciona filtros + clic en "Generar PDF"
   └─► window.open('/api/v1/reports/mdm.pdf?...', '_blank')

Backend
   ├─► validar query params con Pydantic
   ├─► invocar services con los filtros
   ├─► reports/context.build_mdm_context(...) → dict
   ├─► reports/renderer.render('mdm.html', context) → bytes PDF
   └─► Response(bytes, media_type='application/pdf', headers={Content-Disposition})

Navegador
   └─► abre el PDF en pestaña nueva
```

## 4. Plantillas y branding

### 4.1 base.html

- `@page` tamaño `A4`, márgenes `18mm` arriba/abajo/laterales.
- `@page` `@top-left`: logo Pescanova como cuadrado rojo `#E30613` con la "P", título "Cyber Risk Cockpit · {{ tipo }}".
- `@page` `@bottom-left`: "Emitido {{ generated_at }} · Filtros: {{ filters_summary }}".
- `@page` `@bottom-right`: "Página {{ page }} / {{ pages }}" (CSS counters).
- Bloques Jinja: `portada`, `kpis`, `banner`, `contenido`.

### 4.2 mdm.html

Hereda de `base.html`. Bloques:

| Bloque | Contenido |
|---|---|
| `portada` | Título "Informe MDM · Parches", subtítulo con rango de fechas aplicado, chips con los filtros activos (oficina, parches). |
| `kpis` | 4 KPI cards horizontales: Patching Completed / Patches Missing / Patching Inprogress / Patching Failed (número + % del total). |
| `banner` | Banner coloreado según la lógica de `mdm_service.get_banner()` (rojo/ámbar/verde). |
| `contenido` | **Tabla Top Parches**: bulletin_id, descripción, risk_score, missing, failed, total devices. Ordenada por `risk_score` desc, limit 10. **Tabla por Oficina**: nombre+código, total devices, % completed, missing, failed. Ordenada por total desc. |

### 4.3 training.html

Hereda de `base.html`. Bloques:

| Bloque | Contenido |
|---|---|
| `portada` | Título "Informe Formación", subtítulo con países / módulos filtrados. |
| `kpis` | 4 KPI cards: Usuarios totales / % Finalización / Score medio / Tiempo medio. |
| `banner` | Banner coloreado según `training_service.get_banner()`. |
| `contenido` | **Tabla por País**: nombre, nº usuarios, % finalización (con marca ⚠ si <60%), score_pct medio, tiempo medio. Ordenada por nº usuarios desc. **Tabla Outliers**: USR-XXXXX, país, tiempo total, score_pct. Top 4 con `duration > p90 AND score_pct < 30`. |

### 4.4 Estilos

`styles.css` reutiliza la paleta del cockpit (sección 2.1 de MVP_SPEC):

```css
:root {
  --brand-red: #E30613;
  --brand-blue: #005A9C;
  --ok: #16A34A;
  --warning: #F59E0B;
  --critical: #DC2626;
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --border: #E2E8F0;
}
```

Tipografía: Inter vía `@font-face` (archivos `.woff2` embebidos en `reports/static/`). Tablas con `border-collapse: collapse`, filas alternas blanco/`#F8FAFC`.

Sin `box-shadow`, sin gradientes, bordes `0.5px solid var(--border)` — consistente con el principio nº5 del MVP.

## 5. Frontend

### 5.1 Componente `ReportButton`

Ubicación: `frontend/components/ui/ReportButton.tsx`.

Props:

```ts
type ReportButtonProps = {
  kind: 'mdm' | 'training'
  filters: ReportFilterConfig   // qué campos mostrar y opciones disponibles
}
```

Comportamiento:
- Botón compacto (28×28px) con icono PDF, mismo lenguaje visual que los demás botones del header.
- Click → toggle popover anclado abajo-derecha del botón (≈280px ancho).
- Cierre: click fuera, tecla Esc, o click en "Generar PDF".
- Sin librerías de popover: implementación con `useRef` + listener global, igual estilo que el resto de UI del proyecto.

### 5.2 Filtros por kind

**MDM**:
- `DateRange` con `from` y `to` (inputs `type="date"`).
- `MultiSelect` parches (de `/api/v1/mdm/top-patches?limit=50`, label = `bulletin_id — descripción corta`).
- `MultiSelect` oficinas (de `/api/v1/mdm/by-office`, label = nombre+código).

**Formación**:
- `MultiSelect` países (de `/api/v1/training/by-country`).
- `MultiSelect` módulos (nuevo endpoint helper `/api/v1/training/modules` que ya existe o se añade si falta — verificar en implementación).

Filtros vacíos = no se aplica filtro (devuelve todo).

### 5.3 Acción

```ts
const url = new URL(`/api/v1/reports/${kind}.pdf`, apiBase)
if (dateFrom) url.searchParams.set('date_from', dateFrom)
if (dateTo) url.searchParams.set('date_to', dateTo)
if (selectedPatches.length) url.searchParams.set('patch_id', selectedPatches.join(','))
// ...
window.open(url.toString(), '_blank')
```

### 5.4 Integración en páginas

`frontend/app/mdm/page.tsx` y `frontend/app/training/page.tsx` ya tienen un header propio. Se añade `<ReportButton kind="mdm" .../>` (o `training`) al lado de los controles existentes.

## 6. Manejo de errores y estados

| Caso | Respuesta backend | UX frontend |
|---|---|---|
| Datos no cargados (`_require_*` falla) | `503` | Toast "Carga los datos antes de exportar el PDF" |
| Filtros con formato inválido | `422` con detalle Pydantic | Toast genérico "Filtros inválidos" |
| Filtros válidos pero resultado vacío | `200` con PDF cuyo bloque `contenido` muestra `EmptyState` textual: "Sin datos para los filtros aplicados" | Pestaña abre, PDF visible con estado vacío |
| Error inesperado en renderer | `500` log con traceback | Toast "Error generando el PDF, inténtalo de nuevo" |

## 7. Testing

`backend/tests/test_reports.py`:

1. **`test_mdm_report_smoke`** — carga fixture de parches, llama `/reports/mdm.pdf`, verifica `200`, `Content-Type: application/pdf`, body > 1KB.
2. **`test_training_report_smoke`** — análogo para training.
3. **`test_mdm_report_filters_passthrough`** — invoca con `patch_id=PA001`, verifica que `build_mdm_context` recibe el filtro correcto (sin renderizar PDF; mock del renderer).
4. **`test_report_503_without_data`** — sin cargar nada, verifica `503`.
5. **`test_report_empty_filter_result`** — con `location=NoExiste`, verifica `200` (PDF se genera con estado vacío).

Renderizado visual: revisión manual una vez por PR. Sin snapshot testing en v1.

## 8. Dependencias y deployment

### 8.1 Backend

`backend/pyproject.toml` añadir:

```toml
dependencies = [
    # ... existentes
    "weasyprint>=62.0",
    "jinja2>=3.1.0",
]
```

`uv` se encarga del lockfile.

### 8.2 Docker

`backend/Dockerfile` añadir antes de `pip install`:

```dockerfile
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    fonts-inter \
    && rm -rf /var/lib/apt/lists/*
```

(Verificar el package exacto de Inter; alternativa: embeber `.woff2` en `reports/static/` y referenciarlos vía `@font-face`.)

### 8.3 Documentación

Actualizar `README.md` con:
- Nota: WeasyPrint en Windows nativo requiere GTK3 runtime — se recomienda Docker para dev local.
- Ejemplo `curl http://localhost:8000/api/v1/reports/mdm.pdf -o informe.pdf`.

## 9. Criterios de aceptación

- [ ] Botón PDF visible en header de `/mdm` y `/training`.
- [ ] Click expande popover con los filtros correctos según pestaña.
- [ ] `window.open` abre pestaña nueva con el PDF.
- [ ] PDF MDM contiene: portada con filtros, 4 KPIs, banner, tabla top parches, tabla por oficina.
- [ ] PDF Formación contiene: portada con filtros, 4 KPIs, banner, tabla por país, tabla outliers.
- [ ] Header con logo Pescanova y footer con paginación se repiten en todas las páginas.
- [ ] Filtros se reflejan en los datos del PDF (verificable comparando con dashboard).
- [ ] Filtros vacíos = sin filtro = todos los datos.
- [ ] `503` si datos no cargados; toast al usuario.
- [ ] Smoke tests pasan en CI / `uv run pytest`.
- [ ] PDF se genera en <1s para el dataset actual (655 eventos MDM, 10.988 eventos training).

## 10. Decisiones pendientes para fase de plan

- Confirmar nombre exacto del paquete de fuentes Inter en Debian (o decidir embeber `.woff2`).
- Confirmar existencia o creación de `/api/v1/training/modules` para alimentar el selector de módulos.
- Revisar si conviene mover `MultiSelect` a `components/ui/` como componente reutilizable (en MVP_SPEC no existe todavía).
