# Pescanova Cyber Risk Cockpit

> Cuadro de mando de ciberseguridad para Nueva Pescanova.
> Reto del Hackathon de Innovación Abierta · mayo 2026.
> Equipo OSIX Tech.

## Qué es

Dashboard web con dos pestañas que dan al CISO de Pescanova visibilidad inmediata sobre:

- **MDM · Parches**: estado de despliegue de parches en endpoints (ManageEngine).
- **Formación**: efectividad de la formación en concienciación de ciberseguridad.

Diseñado para responder en menos de 30 segundos qué arde y dónde.

## Arquitectura

- **Frontend**: Next.js 15 + TypeScript + Tailwind + ECharts
- **Backend**: FastAPI + Pandas (ingesta y transformación)
- **Despliegue**: Docker Compose

Arquitectura abstracta de DataSource para sustituir CSV/XLSX por API real de ManageEngine sin tocar el frontend.

## Estructura del repo

```
pescanova-cockpit/
├── MVP_SPEC.md             ← Especificación completa, leer primero
├── CLAUDE_CODE_PROMPTS.md  ← Prompts para Claude Code
├── docker-compose.yml
├── frontend/               ← Next.js
├── backend/                ← FastAPI
└── data/                   ← XLSX/CSV de entrada
```

## Cómo empezar

1. Lee `MVP_SPEC.md` completo.
2. Coloca los XLSX de origen en `data/`:
   - `data/MDM_DATA.xlsx`
   - `data/Formación_y_concienciación.xlsx`
3. `docker compose up --build`
4. Abre `http://localhost:3000`
5. Sube los XLSX desde `/upload`
6. Navega a `/mdm` y `/training`

## Implementación con Claude Code / Codex

Usa los prompts de `CLAUDE_CODE_PROMPTS.md`. Sigue el plan de fases de la sección 7 del spec.

## Branding

- Rojo Pescanova: `#E30613` (solo logo y acentos de marca)
- Azul corporativo: `#005A9C`
- Sistema semáforo independiente: verde `#16A34A` / ámbar `#F59E0B` / rojo crítico `#DC2626`
- Tipografía: Inter

## Equipo

OSIX Tech Development S.L · info@osix.tech
