# Pescanova Cyber Risk Cockpit — Especificación MVP

> **Reto Pescanova · Hackathon mayo 2026**
> Equipo OSIX Tech · documento de especificación para implementación con Claude Code / Codex
> Versión 2.2 · 19/05/2026 — exclusión total de eventos `Removed` (en hoja A) y de los usuarios sin eventos válidos (en hoja B)

---

## 0. Resumen ejecutivo

Construir un **cuadro de mando web** con dos pestañas que permita al CISO y al comité de seguridad de Pescanova entender en menos de 30 segundos el estado de ciberseguridad de la compañía, priorizando lo más grave.

- **Pestaña 1 (MDM · Parches)**: estado de despliegue de parches en endpoints. Fuente: ManageEngine Endpoint Central.
- **Pestaña 2 (Formación)**: efectividad de la formación en seguridad. Fuente: plataforma LMS de concienciación.

**Ingesta**: carga manual de CSV/XLSX en el MVP. Arquitectura preparada para consumir API en el futuro sin tocar el frontend.

**Stack**: Next.js 15 (App Router) + TypeScript + Tailwind + ECharts. Backend FastAPI + Pandas. Despliegue local con Docker Compose.

---

## 1. Principios de diseño no negociables

1. **Regla de los 5 segundos**: al abrir cada pestaña, el usuario debe saber en 5 segundos (a) si hay algo crítico, (b) cuánto, (c) dónde.
2. **Una pantalla por pestaña**: sin scroll vertical largo en 1920×1080 ni 1440×900.
3. **Color con significado fijo**: verde = OK, ámbar = warning, rojo crítico = failed. El rojo de marca Pescanova se reserva al logo.
4. **Branding Pescanova**: logo arriba-izquierda, rojo `#E30613` y azul `#005A9C` como acentos corporativos.
5. **Flat design**: sin gradientes, sin sombras, sin bordes gruesos.
6. **Cada visualización titula con una pregunta**: "¿Cuántos equipos están al día?" en lugar de "Equipos por estado".
7. **Tooltips en todas las visualizaciones** sin saturar la vista por defecto.
8. **Estados vacíos diseñados**: si un filtro deja la vista sin datos, mostrar ilustración + sugerencia.
9. **Cada visual del dashboard tiene una forma distinta**: no repetir scatters/burbujas en la misma pantalla.

---

## 2. Sistema de diseño

### 2.1 Paleta

| Token | Hex | Uso |
|---|---|---|
| `--brand-red` | `#E30613` | Logo, acento de marca |
| `--brand-blue` | `#005A9C` | Tab activa, headers, datos neutros |
| `--ok` | `#16A34A` | Completed, Installed, OK |
| `--warning` | `#F59E0B` | Missing, In Progress, alerta media |
| `--critical` | `#DC2626` | Failed, riesgo alto |
| `--bg-page` | `#F8FAFC` | Fondo de la app |
| `--bg-card` | `#FFFFFF` | Cards y paneles |
| `--text-primary` | `#0F172A` | Texto principal |
| `--text-secondary` | `#64748B` | Texto secundario, labels |
| `--text-tertiary` | `#94A3B8` | Hints, axis labels |
| `--border` | `#E2E8F0` | Bordes de cards |

### 2.2 Tipografía

- **Familia**: Inter (Google Fonts). Pesos 400, 500, 600.
- **Escala**:
  - KPI grandes: 26–28px / 500
  - Títulos de card: 11–13px / 500
  - Labels: 9–11px uppercase letterspacing 0.5px
  - Texto en visuales: 8–10px
  - Banner de riesgo: 11–14px / 500
- **Sentence case** salvo labels pequeños.

### 2.3 Espaciado y bordes

- Border radius: `6–8px` componentes pequeños, `8–12px` cards principales.
- Padding interno de cards: `10–14px`.
- Gap entre cards: `6–8px`.
- Bordes: `0.5px solid var(--border)`.
- Sin `box-shadow`.

### 2.4 Componentes reutilizables

Implementar como componentes React en `/components/ui/`:

- `KPICard` (label uppercase + número grande + delta opcional + borde lateral/superior de color + sparkline opcional)
- `RiskBanner` (icono + título + descripción, color según severity)
- `Card` (wrapper con padding y border consistentes)
- `StatusBadge` (pill pequeño con color semántico)
- `LegendDots` (puntos de color + labels para leyendas)
- `DashboardHeader` (logo + título de pestaña + tabs)
- `EmptyState` (icono + título + descripción)

---

## 3. Modelo de datos

### 3.1 Esquema lógico

#### Tabla `mdm_events` (de MDM hoja 1)
| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `computer_name` | string | Computer Name | |
| `os` | string | Operating System | guardar para filtro futuro (todo Windows 11 ahora) |
| `patch_id` | int | Patch ID | |
| `patch_description` | string | Patch Description | |
| `deployment_status` | enum | Deployment Status | `Installed`/`Delay in Deployment`/`Reboot Pending`/`Failed` |
| `deployed_at` | datetime | Deployed Date | |
| `remarks` | string | Remarks | sólo tooltip |

#### Tabla `mdm_devices` (de MDM hoja 2)
| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `computer_name` | string (PK) | Computer Name | |
| `remote_office_raw` | string | Remote Office | cifrado |
| `remote_office_decoded` | string | derivado | descifrar (sección 3.3) |
| `remote_office_code` | string | derivado | extraer código entre paréntesis |
| `missing_patches` | int | Missing Patches | |
| `installed_patches` | int | Installed Patches | |
| `failed_patches` | int | Failed Patches | |
| `patching_status` | enum | Deployment Status | `Patching Completed`/`Patches Missing`/`Patching Inprogress`/`Patching Failed` |
| `last_contact_at` | datetime | Last Contact Time | |
| `last_deployment_at` | datetime | Last Deployment Time | |

#### Tabla `mdm_patches` (de MDM hoja 3)
| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `patch_id` | int (PK) | Patch ID | |
| `bulletin_id` | string | Bulletin ID | |
| `description` | string | Patch Description | |
| `missing_systems` | int | Missing Systems | |
| `installed_systems` | int | Installed Systems | |
| `failed_systems` | int | Failed Systems | |
| `risk_score` | int | derivado | `missing + failed*2` |

#### Tabla `training_events` (de Formación hoja A)

**Filtro de ingesta obligatorio**: las filas con `Module Status = "Removed"` se eliminan en la carga del XLSX. Pasan de 11.578 a 10.988 eventos. Estas filas no aparecen nunca en ninguna agregación, métrica, banner, tooltip ni filtro del dashboard.

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `user_id` | string | Email Address | `USR-XXXXX` pseudonimizado |
| `module_event_score` | int | Overall User Score | sólo algunos eventos lo tienen, 0–1000 |
| `started_at` | datetime | Module Attempt Start Date | |
| `completed_at` | datetime | Module Attempt Completed Date | |
| `duration_min` | int | Module Attempt Duration (min) | |
| `module_name` | string | Module Name (User Display) | |
| `location_raw` | string | Location | |
| `location` | string | derivado | normalizado (sección 3.4) |

#### Tabla `training_users` (de Formación hoja B)

**Filtro de ingesta obligatorio**: tras cargar `training_events` (con `Removed` ya filtrados), excluir de `training_users` cualquier usuario cuyo `user_id` no aparezca en `training_events`. Estos son los 122 usuarios que tenían ÚNICAMENTE eventos `Removed` y por tanto ya no tienen actividad válida. Pasan de 1.352 a **1.230 usuarios**.

| Campo | Tipo | Origen | Notas |
|---|---|---|---|
| `user_id` | string (PK) | Email Address | |
| `modules_completed` | int | Modules Completion | |
| `modules_assigned` | int | Modules Assigned | |
| `overall_score_raw` | int | Overall User Score | NULL → tratar como 0 |
| `score_pct` | float | derivado | sección 3.5 |
| `total_duration_min` | int | Total Duration (min) | |
| `module_attempts` | int | Module Attempts | |
| `last_completion_at` | datetime | Module Completion Date | |
| `location_raw` | string | Location | |
| `location` | string | derivado | normalizado |
| `completion_rate` | float | derivado | `modules_completed / modules_assigned` |

### 3.2 Transformaciones obligatorias

1. **Score por usuario** → `score_pct = min((overall_score_raw / (1000 * modules_completed)) * 100, 100)`. Si `modules_completed == 0` → 0. Si `overall_score_raw is None` → tratar como 0 (decisión confirmada: penaliza al país).
2. **Tasa de finalización**: `completion_rate = modules_completed / modules_assigned`.
3. **Friction Score por celda módulo×país**: sección 5.
4. **Risk Score por parche**: `missing_systems + failed_systems * 2`.

### 3.3 Descifrado de Remote Office

Los valores `Remote Office` están cifrados con un **César shift -4** sobre alfabeto castellano con ñ.

Ejemplos esperados tras implementar:
- `VS Iwteñe - Gletipe (GLE) c Fimveqev` → `VG España - Chapela (GLE) y ...`
- `VS Iwteñe - Tsvvmñs (TSV)` → `VG España - Porriño (TSV)`
- `VS Iwteñe - Evximbs (EVX)` → `VG España - Arteixo (EVX)`
- `VS Iwteñe - Bszi (BSZ)` → `VG España - Boiro (BSZ)`

**Implementación**: función `decode_caesar(text, shift=-4)` que rote letras manteniendo mayúsculas/minúsculas y respete espacios, paréntesis, guiones. El alfabeto incluye `ñ/Ñ`.

**Validación**: tras descifrar, comprobar que el código entre paréntesis (`GLE`, `EVX`, etc.) sigue siendo legible. Si el resultado no contiene caracteres ASCII legibles para el >80% de las filas, probar `shift ∈ {-3, -5, +4, +3, +5}` y elegir el que maximice palabras españolas reconocibles ("España", "Galicia", nombres de ciudad).

### 3.4 Normalización de Location

| Valor raw | Valor normalizado |
|---|---|
| `Francia`, `France` | `Francia` |
| (vacío) | `Sin asignar` (descartar en visualizaciones agregadas, mostrar contador aparte en banner) |
| Resto | tal cual |

Mapa `country_iso` para abreviar en heatmaps:
`España→ES, Ecuador→EC, Nicaragua→NI, Argentina→AR, Francia→FR, Grecia→GR, Guatemala→GT, Portugal→PT, Namibia→NA, Sudáfrica→ZA, Mozambique→MZ, Angola→AO, Italia→IT, Irlanda→IE, Perú→PE, Estados Unidos→US`.

### 3.5 Cálculo de Score (definitivo)

**Score por usuario:**

```python
def user_score_pct(overall_score_raw, modules_completed):
    """
    El score es acumulativo: hasta 1000 puntos por módulo completado.
    score_pct representa el % medio de calidad por módulo completado.
    """
    if overall_score_raw is None:
        overall_score_raw = 0  # Decisión: usuarios sin score → penalizan al país
    if modules_completed is None or modules_completed == 0:
        return 0.0
    pct = (overall_score_raw / (1000.0 * modules_completed)) * 100.0
    return min(pct, 100.0)  # Clampear: ~11 outliers tienen score_pct > 100 (bonus/streak)
```

**Datos reales observados** (1116 usuarios con score):
- min: 0%, max: 100% (clampeado, valor crudo 155%), media: 21%, mediana: 12.5%
- Distribución muy sesgada a la izquierda: 60% de usuarios en rango 0–20%.

**Score por país:**

```python
country_score_pct = mean(user_score_pct over usuarios del país)
country_completion = mean(completion_rate over usuarios del país)
```

**En el frontend**: mostrar el valor crudo en tooltips (`8.325 pts en 21 módulos = 39%`) y el `score_pct` clampeado en cards/visuales.

---

## 4. Especificación de las pestañas

### 4.1 Pestaña MDM · Parches

**Pregunta que responde**: *¿Dónde estoy más expuesto y qué tengo que parchear primero?*

**Layout (de arriba a abajo, una sola pantalla):**

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo Pescanova · "Cyber Risk Cockpit · MDM" · Tabs  │
├─────────────────────────────────────────────────────────────┤
│ Risk Banner (rojo) — "X equipos críticos sin parchear"      │
├─────────────────────────────────────────────────────────────┤
│ KPI Cards × 4: Completed | Missing | In Progress | Failed   │  ← CORE 1
├─────────────────────────────────────┬───────────────────────┤
│ Ranking Remote Office               │ Top Parches Críticos  │
│ (stacked horizontal bar) ← CORE 4   │ (lista ordenada) CORE2│
├─────────────────────────────────────┴───────────────────────┤
│ Evolución temporal de despliegues (stacked bar por día)     │  ← CORE 3
└─────────────────────────────────────────────────────────────┘
```

**Visualizaciones (las 4 CORE obligatorias del reto):**

**CORE 1 · Estado global de despliegue por activo** *(KPI cards)*
- Fuente: `mdm_devices.patching_status` agregado.
- 4 cards: Patching Completed / Patches Missing / Patching Inprogress / Patching Failed.
- Cada card: label uppercase, número grande, porcentaje del total, borde superior coloreado.
- Click en card → filtra el resto de visuales por ese estado.

**CORE 2 · Top parches con más sistemas pendientes/fallidos**
- Fuente: `mdm_patches` ordenado por `risk_score` desc.
- Lista de los 5 parches con mayor `missing + failed*2`.
- Cada fila: `bulletin_id`, descripción corta, barra de progreso normalizada (% sobre devices totales), número afectados.
- Color de la barra: rojo si `failed > 0`, ámbar si solo missing.

**CORE 3 · Evolución temporal de despliegues**
- Fuente: `mdm_events` agrupado por día y `deployment_status`.
- Stacked bar chart, eje X = fechas (11–18 mayo 2026), eje Y = nº de eventos.
- 4 colores apilados por estado, leyenda arriba a la derecha.

**CORE 4 · Ranking por Remote Office**
- Fuente: `mdm_devices` agrupado por `remote_office_decoded` y `patching_status`.
- Stacked horizontal bar, una fila por oficina.
- Cada fila: nombre oficina + código entre paréntesis, barra 100% segmentada, count total a la derecha.
- Ordenado por count total desc.

**Risk Banner (valor añadido):**
- Lógica:
  - Si `failed > 0`: banner rojo "X equipos con parches fallidos · concentrado en [oficina top]".
  - Si `missing > 10%` del total: banner ámbar "Y% del parque sin parchear".
  - Si todo OK: banner verde "Todo el parque al día".

### 4.2 Pestaña Formación · Propuesta A "Pregunta-respuesta"

**Pregunta que responde**: *¿Dónde la formación no está calando y a quién hay que atender?*

**Filosofía del layout**: cada visual tiene forma radicalmente distinta para evitar redundancia visual. Jerarquía: heatmap protagonista, resto apoyo.

```
┌───────────────────────────────────────────────────────────────┐
│ Header · Tabs                                                 │
├───────────────────────────────────────────────────────────────┤
│ Risk Banner (ámbar)                                           │
├───────────────────────────────────────────────────────────────┤
│ 4 KPI cards mini (Usuarios | Finalización | Score | Tiempo)   │
├──────────────────────────────────┬────────────────────────────┤
│ Países: doble barra apilada      │ Tendencia: 3 sparklines    │
│ (% finalización + score) ← C1    │ (fin / score / tiempo) ← C2│
├──────────────────────────────────┴────────────────────────────┤
│ Heatmap Friction (módulo × país) — TODO EL ANCHO ← CORE 3     │
├──────────────────────────────────┬────────────────────────────┤
│ Distribución usuarios (histo)    │ Lista outliers (top 4)     │
│ ← parte de CORE 4                │ ← parte de CORE 4          │
└──────────────────────────────────┴────────────────────────────┘
```

**Visualizaciones:**

**CORE 1 · Matriz finalización vs rendimiento por país — doble barra apilada**
- Fuente: `training_users` agrupado por `location`.
- Una fila por país, ordenado por nº usuarios desc.
- Cada fila contiene:
  - Nombre del país + nº usuarios
  - **Barra superior (gruesa, 7px)**: % de finalización media → color verde si ≥75%, ámbar 50–75%, rojo <50%.
  - **Barra inferior (fina, 4px)**: score_pct medio → color azul corporativo con opacidad según valor.
  - Etiqueta a la derecha: `XX% · score YY`
  - Si país por debajo de umbrales: icono ⚠ junto al nombre.
- Leyenda inferior compacta.

**CORE 2 · Evolución temporal — 3 sparklines apiladas**
- Fuente: `training_users.last_completion_at` agrupado por mes (últimos 6).
- Tres sparklines independientes, una debajo de otra:
  - **Finalización** (verde): % mes a mes + delta inicio/fin a la derecha.
  - **Score medio** (ámbar): score_pct mes a mes + delta.
  - **Tiempo medio** (azul): tiempo medio mes a mes + delta.
- Cada sparkline ocupa ~20px de alto. Dot final destacado.
- Etiquetas de mes solo abajo del último sparkline.

**CORE 3 · Mapa de calor de fricción (módulo × país)** — protagonista a todo el ancho
- Fuente: `training_events` agregado.
- Eje Y: módulos (ordenados por friction global desc, top 6–8).
- Eje X: países (ordenados por volumen total desc, ISO de 2 letras).
- **Color de celda**: Friction Score (0–100, verde→ámbar→rojo).
- **Opacidad de celda**: proporcional al volumen de usuarios (celdas con `n<5` al 40% opacidad).
- **Tooltip al hover**: friction score, duración media, % incomplete, nº usuarios.
- **Click en celda**: abre panel inferior con detalle expandido (en MVP basta con destacar la celda y mostrar los 4 números a la derecha).
- Leyendas dobles abajo: gradiente color (friction) + gradiente opacidad (volumen).

**CORE 4 · Dispersión eficiencia-esfuerzo — histograma + lista de outliers**

Repensado: en lugar de un scatter con 1.230 puntos (saturado), dos componentes complementarios:

- **Histograma de distribución (izquierda)**:
  - Eje X: bins de `score_pct` (0–10, 10–20, ... 90–100).
  - Eje Y: nº de usuarios por bin.
  - Barras coloreadas según semaforo: rojas (<20%), ámbar (20–40%), verdes (>40%).
  - Pie del card: "X usuarios en zona crítica · ver lista →"

- **Lista de outliers (derecha)**:
  - Top 4 usuarios con `(total_duration_min > p90) AND (score_pct < 30)` — "mucho tiempo, poco resultado".
  - Cada fila: `USR-XXXXX · País · Tiempo · Score`.
  - Fila roja si en zona crítica, ámbar si solo uno de los criterios.

**Risk Banner:**
- Si ≥1 país con `country_score_pct < 15%` Y `nº usuarios > 20`: banner ámbar "X países por debajo del umbral · módulo [mayor friction] con más fricción".
- Si tasa global de finalización < 70%: banner rojo.
- Si `completion_rate global < 50%`: banner rojo (regla más estricta).
- Si todo OK: banner verde.

**KPI cards mini (4 en línea):**
- **Usuarios**: count total + "17 países · 23 módulos".
- **Finalización**: % medio global + delta ↑/↓ vs mes anterior.
- **Score medio**: `score_pct` medio + nota "obj 80%".
- **Tiempo medio**: minutos medios por usuario + delta.

---

## 5. Fórmula de Friction Score (definitiva, sin score de usuario y sin Removed)

**Pre-condición**: los eventos `Removed` se han eliminado en la ingesta (sección 3.1). En este cálculo solo entran asignaciones reales del usuario.

Para cada combinación módulo×país:

```python
def friction_score(eventos_modulo_pais, p95_duration_global):
    """
    Friction = fricción operativa pura.
    Dos señales: cuánto cuesta hacer el módulo y cuántos no lo terminan.
    """
    n_assigned = len(eventos_modulo_pais)
    if n_assigned == 0:
        return None  # celda vacía → no se pinta en el heatmap

    avg_duration = mean(duration_min for e in eventos)
    duration_norm = min(avg_duration / p95_duration_global, 1.0)

    n_completed = sum(1 for e in eventos if e.completed_at is not None)
    incomplete_rate = (n_assigned - n_completed) / n_assigned

    friction = 100 * (
        0.55 * duration_norm    +  # cuánto cuesta hacerlo
        0.45 * incomplete_rate     # cuántos no lo acaban
    )
    return round(friction, 1)
```

**Notas:**
- `p95_duration_global = 13 min` (calculado sobre el dataset filtrado, 10.988 eventos). Acota outliers — el máximo observado es 120 min y no debe dominar la escala.
- Si `n_users < 5` en una celda: marcar como "muestra insuficiente" y bajar opacidad al 40%.
- Pesos `[0.55, 0.45]` configurables vía variable de entorno.

**Justificación**: el tiempo es la señal más directa de fricción (si tardas mucho es porque el contenido no entra). El % de no completados es la otra señal fuerte: gente que se le asignó el módulo y no llegó a finalizarlo. Ambas señales son objetivas y vienen directamente del comportamiento real del usuario.

**Umbrales recalibrados con datos reales:**
- Friction módulo: **rojo > 60**, ámbar **30–60**, verde **< 30**.
- Score país: **rojo < 15%**, ámbar **15–25%**, verde **> 25%** (basados en mediana real 12,5%).
- Finalización país: **rojo < 60%**, ámbar **60–80%**, verde **> 80%**.

---

## 6. Arquitectura técnica

### 6.1 Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | 15.x |
| Estilos | Tailwind CSS | 3.4 |
| Gráficos | Apache ECharts (`echarts-for-react`) | 5.5 |
| Estado cliente | Zustand | 4.x |
| Backend | FastAPI (Python) | 0.110+ |
| Procesado | Pandas + openpyxl | latest |
| Validación | Pydantic v2 | latest |
| Orquestación | Docker Compose | |

**Por qué ECharts**: soporta nativamente heatmaps complejos (color + opacidad), sparklines, stacked bars, histogramas. Recharts se queda corto en heatmap con doble dimensión.

### 6.2 Estructura de carpetas

```
pescanova-cockpit/
├── docker-compose.yml
├── README.md
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # redirige a /mdm
│   │   ├── mdm/page.tsx
│   │   ├── training/page.tsx
│   │   ├── upload/page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── KPICard.tsx
│   │   │   ├── KPICardSparkline.tsx
│   │   │   ├── RiskBanner.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── LegendDots.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── charts/
│   │   │   ├── StackedHorizontalBar.tsx     # MDM core4
│   │   │   ├── StackedTemporalBar.tsx       # MDM core3
│   │   │   ├── TopPatchesList.tsx           # MDM core2
│   │   │   ├── CountryDoubleBar.tsx         # Training core1
│   │   │   ├── TripleSparkline.tsx          # Training core2
│   │   │   ├── FrictionHeatmap.tsx          # Training core3
│   │   │   ├── ScoreHistogram.tsx           # Training core4 (izda)
│   │   │   └── OutliersList.tsx             # Training core4 (dcha)
│   │   └── layout/
│   │       ├── DashboardLayout.tsx
│   │       └── Tabs.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── theme.ts
│   │   └── format.ts
│   └── hooks/
│       ├── useMDM.ts
│       └── useTraining.ts
└── backend/
    ├── pyproject.toml
    ├── Dockerfile
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── routers/
    │   │   ├── mdm.py
    │   │   ├── training.py
    │   │   └── ingest.py
    │   ├── services/
    │   │   ├── mdm_service.py
    │   │   ├── training_service.py
    │   │   └── friction.py
    │   ├── transforms/
    │   │   ├── caesar.py
    │   │   ├── normalize.py
    │   │   └── loaders.py
    │   ├── models/
    │   │   ├── mdm.py
    │   │   └── training.py
    │   └── storage/
    │       ├── datasource.py     # interfaz abstracta
    │       └── memory.py         # cache en memoria
    └── data/
        └── .gitkeep
```

### 6.3 Endpoints REST

Prefijo `/api/v1/`. Respuestas JSON con `data` + `meta` opcional.

```
POST   /api/v1/ingest/mdm
POST   /api/v1/ingest/training
GET    /api/v1/ingest/status

# MDM
GET    /api/v1/mdm/kpis
GET    /api/v1/mdm/by-office
GET    /api/v1/mdm/top-patches?limit=5
GET    /api/v1/mdm/timeline
GET    /api/v1/mdm/banner

# Training
GET    /api/v1/training/kpis
GET    /api/v1/training/by-country       # para CountryDoubleBar
GET    /api/v1/training/timeline         # para TripleSparkline
GET    /api/v1/training/friction         # matriz módulo×país
GET    /api/v1/training/distribution     # histograma score_pct
GET    /api/v1/training/outliers?limit=4 # lista usuarios problemáticos
GET    /api/v1/training/banner
```

**Filtros como query params** (todos opcionales):
- `date_from`, `date_to`: rango temporal ISO 8601.
- `location`: filtro país (multi-valor con coma).
- `office`: filtro oficina (multi-valor con coma).

### 6.4 Patrón DataSource abstracto

```python
# backend/app/storage/datasource.py
from abc import ABC, abstractmethod
import pandas as pd

class DataSource(ABC):
    @abstractmethod
    def load_mdm_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_devices(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_mdm_patches(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_events(self) -> pd.DataFrame: ...
    @abstractmethod
    def load_training_users(self) -> pd.DataFrame: ...

class FileDataSource(DataSource):
    """Lee de XLSX/CSV cacheados desde el upload."""
    ...

class APIDataSource(DataSource):
    """Stub V2: leerá de la API real de ManageEngine y LMS."""
    ...
```

Toda la lógica de transformación recibe `DataSource` por inyección de dependencias. Los services no saben si los datos vienen de Excel o API.

### 6.5 Cache en memoria + persistencia parquet (MVP)

Sin base de datos. Tras upload, DataFrames cacheados en `app.state.data`. Para persistencia trivial: guardar como `parquet` en `backend/data/` tras cada upload y recargar al arrancar. Esfuerzo: 30 min.

### 6.6 Validación con Pydantic

Cada upload pasa por validación. Si falla:
- 422 con detalle del error por fila.
- Frontend muestra qué columnas faltan/tienen tipo incorrecto.

---

## 7. Plan de implementación por fases

Pensado para equipo de 2–3 personas en 24–48h.

### Fase 0 · Setup (1h)
- Inicializar repo git.
- Scaffolding Next.js + Tailwind + ECharts en `frontend/`.
- Scaffolding FastAPI + Pandas en `backend/`.
- Docker Compose con hot reload.
- Landing con logo Pescanova y tabs a `/mdm` y `/training`.

**Demo-able**: web vacía con header y navegación.

### Fase 1 · Ingesta y limpieza (2–3h)
- `POST /api/v1/ingest/mdm` lee XLSX, descifra oficinas, cachea.
- `POST /api/v1/ingest/training` normaliza locations, calcula `score_pct` y `completion_rate`.
- Página `/upload` con drag-and-drop.
- Logs claros.

**Demo-able**: subir los XLSX y ver "656 events, 433 devices, 12 patches" / "1.230 usuarios, 10.988 eventos (590 Removed filtrados, 122 usuarios excluidos)".

### Fase 2 · Pestaña MDM completa (4–5h)
- 5 endpoints MDM.
- Componentes: `StackedHorizontalBar`, `StackedTemporalBar`, `TopPatchesList`, `KPICard`, `RiskBanner`.
- Página `/mdm` con layout completo.

**Demo-able**: MDM funcionando con datos reales.

### Fase 3 · Pestaña Formación completa (5–6h)
- 6 endpoints training.
- Componentes: `CountryDoubleBar`, `TripleSparkline`, `FrictionHeatmap`, `ScoreHistogram`, `OutliersList`, `KPICardSparkline`.
- Cálculo de Friction Score en `services/friction.py` con tests unitarios.

**Demo-able**: las dos pestañas completas.

### Fase 4 · Polish (2–3h)
- Filtro global (date range + país) persistente en zustand.
- Estados vacíos.
- Animación fade-in escalonada.
- Modo claro/oscuro (toggle en header).
- Botón "Export PDF" por pestaña con `html2pdf.js`.
- Loading states en cards.

**Demo-able**: producto completo y pulido.

### Fase 5 · Valor añadido (si queda tiempo)
Ver sección 8.

---

## 8. Funcionalidades de valor añadido (post-MVP)

Las 4 que se decidieron, en orden recomendado:

### 8.1 Cross-correlation oficinas mal parcheadas + baja formación
- Tercera pestaña "Análisis de riesgo".
- Heatmap o scatter: eje X = % parches missing por oficina, eje Y = score formativo de usuarios en esa oficina.
- Como `training.location` es país y MDM tiene oficinas, mapear oficinas Galicia → "España".
- **Esfuerzo**: 3h.

### 8.2 Score de riesgo unificado
- Número único "Cyber Risk Score" 0–100 en header.
- Fórmula:
  ```
  patch_risk    = 100 * (missing + failed*2) / (total_devices * max_patches_per_device)
  training_risk = 100 - avg_completion_rate * avg_score_pct
  global_risk   = 0.6 * patch_risk + 0.4 * training_risk
  ```
- Visual: número grande con sparkline o gauge pequeño.
- **Esfuerzo**: 2h.

### 8.3 Alertas/umbrales configurables + recomendaciones
- Panel `/settings` para definir umbrales (% missing crítico, score mínimo, etc.).
- Cada banner incluye recomendación accionable ("Refuerza el módulo Phishing avanzado en Nicaragua").
- **Esfuerzo**: 4h.

### 8.4 Capa de IA · explicación en lenguaje natural
- Botón "🪄 Explícame" en cada card.
- Backend: `POST /api/v1/ai/explain` recibe `{ visual_id, data_snapshot }`, llama a Claude Sonnet vía Anthropic API, devuelve texto.
- Frontend: modal con respuesta + botón "Pregunta de seguimiento".
- **Importante**: plantillas de prompt con datos estructurados, no inyectar dataset completo. Limitar a 3–4 frases.
- **Esfuerzo**: 4–5h.

### 8.5 Otras ideas (si sobra tiempo)
- Drill-down: click en oficina → vista con detalle de equipos.
- Export Excel por visual.
- Diff entre periodos (semana actual vs anterior con flechas).
- Modo presentación: vista pantalla completa con slideshow automático.
- Webhook a Slack/Teams en umbrales críticos.

---

## 9. Estados, edge cases y validaciones

### 9.1 Estados de carga
- Skeleton mientras `fetch` pending. Skeleton respeta dimensiones para evitar layout shift.

### 9.2 Datos vacíos
- Tras filtros sin resultados: `EmptyState` con icono + "Sin datos para los filtros actuales".

### 9.3 Datos malos
- Score crudo > 9.999 → log warning, mantener.
- Score crudo < 0 → log warning, tratar como 0.
- `score_pct > 100` → clampear a 100 (caso normal, ~11 usuarios).
- Fechas futuras → log warning, no descartar.
- `duration < 0` → descartar fila.
- Strings → strip.
- Locations no mapeadas → "Otros".

### 9.4 Tamaño de datos
- MDM hoja 1: 656 filas → trivial.
- Training hoja A: 11.578 filas → memoria sin problemas.

### 9.5 Performance
- Recalcular Friction en cada request es aceptable (<100ms para 11k filas).
- En V2 con millones de filas: pre-calcular y cachear.

---

## 10. Demo y pitch (3 minutos)

1. **0:00–0:30** — Abrir `/mdm`. "En 5 segundos veis 61 equipos críticos. Banner rojo arriba."
2. **0:30–1:30** — Pasar a `/training`. "La doble barra por país nos dice que Nicaragua y Argentina están en rojo. El heatmap nos dice que Phishing avanzado es el problema. La lista de outliers nos da los 4 nombres a los que llamar."
3. **1:30–2:30** — Mostrar cross-correlation (si llega): "Estas oficinas están mal en parches **y** en formación. Doble riesgo." Botón IA: "Le pregunto a Claude que me lo resuma."
4. **2:30–3:00** — Cierre: "Una pantalla, lo grave arriba, accionable abajo. Arquitectura preparada para sustituir CSV por API de ManageEngine sin tocar el frontend."

**Lo que NO hacer**: no abrir DevTools, no demostrar el upload, no más de un navegador abierto, no leer en voz alta lo que ya está en pantalla.

---

## 11. Criterios de aceptación del MVP

- [ ] Tras la ingesta de Formación hay **exactamente 10.988 eventos y 1.230 usuarios** (filtros de `Removed` aplicados correctamente).
- [ ] Las dos pestañas cargan en <2s con los datos del XLSX.
- [ ] Las 8 visualizaciones CORE renderizan sin errores.
- [ ] Las oficinas aparecen descifradas y legibles.
- [ ] El friction score se calcula correctamente (verificar caso a mano).
- [ ] El `score_pct` se clampea correctamente (verificar con USR-00879 → 100%).
- [ ] Tooltips funcionan en todas las visualizaciones.
- [ ] Branding Pescanova evidente desde el header.
- [ ] Banner de riesgo cambia según datos (rojo/ámbar/verde).
- [ ] Subir XLSX nuevo actualiza los dashboards.
- [ ] Navegación entre pestañas mantiene estado.
- [ ] Sin errores en consola del navegador.
- [ ] Layout no se rompe en 1366×768.

---

## 12. Apéndice · Datos de referencia

### 12.1 Conteos reales del dataset

**MDM**:
- 655 eventos (1 semana, 11–18 mayo 2026).
- 433 equipos en 10 oficinas (NPVA, Windows 11).
- 12 parches únicos.
- Eventos: 586 Installed, 58 Delay, 8 Failed, 3 Reboot Pending.
- Devices: 360 Completed, 55 Missing, 12 In Progress, 6 Failed.

**Formación** (tras filtros de ingesta):
- **1.230 usuarios** en 17 países (eran 1.352, se excluyen 122 sin eventos válidos).
- **10.988 eventos** en 23 módulos (eran 11.578, se filtran 590 `Removed`).
- Top ubicaciones: España (370), Ecuador (311), Nicaragua (165), Francia (81).
- `score_pct`: media 20,8%, mediana 12,5%. Distribución sesgada a la izquierda (60% en bin 0–20%).
- `duration_min`: mediana 3min, p90 9min, p95 13min, p99 34min, max 120min.

### 12.2 Mapping de oficinas descifradas (a verificar tras implementar)

| Raw (cifrado) | Decoded (estimado, César -4) |
|---|---|
| `VS Iwteñe - Gletipe (GLE) c Fimveqev` | `VG España - Chapela (GLE) y ...` |
| `VS Iwteñe - Tsvvmñs (TSV)` | `VG España - Porriño (TSV)` |
| `VS Iwteñe - Evximbs (EVX)` | `VG España - Arteixo (EVX)` |
| `VS Iwteñe - Bszi (BSZ)` | `VG España - Boiro (BSZ)` |
| `VS Iwteñe - Gexevvsne (GEX) c Epkiqiwí` | `VG España - Carballo (GEX) y ...` |

Validar con `pytest` que el descifrado produce strings ASCII legibles. Si no, ajustar shift.

---

**Fin de la especificación.**

> Priorizar las 8 visualizaciones CORE sobre todo lo demás. El valor añadido es opcional. La estética y el branding son no negociables.
