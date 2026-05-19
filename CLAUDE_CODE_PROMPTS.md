# Prompt de arranque para Claude Code

Copia este prompt y pégalo en Claude Code cuando inicies el proyecto. Coloca `MVP_SPEC.md` en la raíz del repo y los XLSX en `data/`.

---

## Prompt inicial

```
Hola Claude. Vas a implementar el proyecto Pescanova Cyber Risk Cockpit descrito en MVP_SPEC.md.

CONTEXTO:
- Hackathon de ciberseguridad de Nueva Pescanova. Equipo OSIX Tech.
- Tienes 24h para entregar el MVP. Demo ante jurado de seguridad IT.
- Datos reales en data/MDM_DATA.xlsx y data/Formación_y_concienciación.xlsx.

INSTRUCCIONES:
1. Lee MVP_SPEC.md COMPLETO antes de escribir una línea de código.
2. Sigue el plan de fases de la sección 7. No te saltes fases.
3. Tras cada fase, para y muéstrame qué tienes funcionando antes de seguir.
4. Si tienes una duda crítica (no algo de estilo), pregúntame antes de asumir.
5. NO inventes datos. Usa el dataset real desde la primera línea.

PRIORIDADES (en orden):
1. Las 8 visualizaciones CORE (4 por pestaña) funcionando con datos reales.
2. Branding Pescanova evidente (logo rojo #E30613, azul #005A9C corporativo).
3. Layout debe caber en una pantalla por pestaña (sin scroll vertical largo).
4. Descifrado César de oficinas funcionando y produciendo nombres legibles.
5. Friction Score calculado según la fórmula de la sección 5 (SIN score de usuario, SIN Removed).
6. score_pct correctamente clampeado a 100 (sección 3.5).
7. Filtrar `Module Status = "Removed"` en la ingesta de Formación. Estas filas no aparecen jamás en ninguna métrica, agregado, tooltip ni visual.
8. Tras filtrar Removed, excluir también de `training_users` los usuarios que ya no tienen ningún evento. Quedan exactamente 10.988 eventos y 1.230 usuarios.

ANTI-PATRONES (no hagas esto):
- No uses mocks ni datos sintéticos. Si no tienes datos, pídeme acceso.
- No añadas dependencias fuera del stack de sección 6.1 sin justificarlo.
- No hagas refactors profundos a mitad de fase.
- No metas Tailwind classes inline kilométricas. Crea componentes reutilizables.
- No uses colores fuera de la paleta de sección 2.1.
- No uses Title Case ni ALL CAPS excepto en labels uppercase pequeños.
- No metas el score de usuario en el Friction Score (decisión confirmada).

CUANDO TERMINES UNA FASE:
- Ejecuta los tests si hay.
- Levanta docker-compose y verifica que arranca sin errores.
- Lista los criterios de aceptación cumplidos de la sección 11.
- Espera mi luz verde antes de pasar a la siguiente fase.

EMPIEZA POR LA FASE 0. Genera la estructura base del repo y el docker-compose. No instales nada todavía, sólo los archivos de scaffolding.
```

---

## Prompts de seguimiento

### Al terminar Fase 1 (ingesta):

```
Verifica el descifrado César con datos reales:
1. Lee 5 valores raw de Remote Office del XLSX.
2. Ejecuta tu decode_caesar() con shift=-4.
3. Muéstrame los 5 resultados.

Si no son palabras españolas legibles, prueba shifts en {-3, -5, +4, +3, +5} y elige el que produzca más matches con: "España", "Galicia", "Chapela", "Porriño", "Arteixo", "Boiro", "Carballo".

Después verifica el score_pct:
1. Carga el XLSX de formación.
2. Confirma en consola que tras la ingesta tienes EXACTAMENTE 10.988 eventos y 1.230 usuarios. Si no cuadra, hay un bug en el filtro de Removed o en el cross-filtering de hoja B.
3. Para USR-00879 (debería ser score 9433 con 9 módulos), calcula score_pct.
4. Confirma que el clamp a 100 funciona (valor crudo ~105% → 100%).
5. Muéstrame la distribución por bins de 10% como hizo el análisis exploratorio.
```

### Al terminar Fase 2 (MDM):

```
Hazme un screenshot de /mdm con los datos reales cargados. Quiero ver:
- Banner de riesgo con número crítico.
- Las 4 KPI cards con valores correctos (360 / 55 / 12 / 6).
- Ranking de oficinas con nombres descifrados visibles.
- Top parches con DU-003 Meteor Lake en primera posición.
- Evolución temporal mostrando 7 días (11-17 mayo).

Verifica que:
- No hay errores en consola.
- El layout cabe en 1366x768 sin scroll.
- Los tooltips funcionan en cada visual.
```

### Al terminar Fase 3 (Training):

```
Verifica los criterios CORE del dashboard de Formación:

1. CountryDoubleBar: ¿muestra al menos 6 países con sus dos barras (finalización + score)?
2. TripleSparkline: ¿las 3 sparklines tienen labels correctos y dot final destacado?
3. FrictionHeatmap:
   - ¿Top 6-8 módulos ordenados por friction global descendente?
   - ¿Países como columnas con ISO codes?
   - ¿Color va de verde a rojo según friction 0-100?
   - ¿Opacidad refleja el volumen de usuarios?
   - ¿Tooltip muestra los 3 valores (friction, duración media, % incomplete) + nº usuarios?
4. ScoreHistogram + OutliersList: ¿la lista muestra 4 usuarios con tiempo > p90 Y score < 30?

Para validar el Friction Score:
- Verifica primero que tu pipeline eliminó las 590 filas con `Module Status = "Removed"` en ingesta.
- Coge el módulo "Phishing avanzado" en Nicaragua (sobre el dataset YA filtrado).
- Calcula a mano: `avg_duration`, `incomplete_rate = (n_assigned - n_completed) / n_assigned`.
- Aplica la fórmula `100 * (0.55·duration_norm + 0.45·incomplete_rate)` con `p95_duration_global = 13`.
- Compara con lo que muestra tu API.
```

### Al terminar Fase 4 (Polish):

```
Pasa los criterios de aceptación de la sección 11 del MVP_SPEC. 
Marca cada checkbox como [x] o [ ] y explica brevemente.

Luego: instala html2pdf.js y verifica que el botón "Export PDF" genera un PDF legible de cada pestaña.

Verifica también que el modo oscuro NO rompe el branding (logo rojo debe seguir siendo #E30613, no apagado).
```

---

## Prompts para los add-ons (sección 8 del spec)

### Cross-correlation (8.1):

```
Crea una tercera pestaña /risk-analysis.

Layout:
- Header con título "Análisis de riesgo combinado".
- Scatter principal: 
  - Eje X: % parches missing por oficina (de mdm_devices)
  - Eje Y: score_pct medio de los usuarios cuyo location mapea a la oficina
  - Tamaño punto: nº equipos en esa oficina
  - Color: rojo si ambos malos, ámbar si uno, verde si ambos OK
- Lista de "Oficinas de doble riesgo" debajo: las del cuadrante inferior-izquierda.

Mapeo location→oficina: todas las oficinas (GLE, EVX, BSZ, TSV, GEX, LUG...) → "España".

Verifica que el resultado tiene sentido: Chapela (GLE) debería aparecer con muchos equipos y missing alto.
```

### IA explicativa (8.4):

```
Implementa el botón "🪄 Explícame" en cada card.

Backend:
- Endpoint POST /api/v1/ai/explain
- Body: { visual_id: string, data_snapshot: object }
- Llama a Anthropic API con Claude Sonnet 4.6 (modelo: claude-sonnet-4-6).
- Variable env ANTHROPIC_API_KEY.

Prompt template (en español, máximo 4 frases de respuesta):
"""
Eres un analista de ciberseguridad explicando un dashboard al CISO de Pescanova.
Datos del visual {visual_id}:
{data_snapshot serializado en JSON}

En máximo 4 frases:
1. Explica qué muestran los datos.
2. Identifica el insight más importante (lo más grave o lo más positivo).
3. Sugiere UNA acción concreta.
4. Si hay buena noticia, mencínala al final.

No uses tecnicismos innecesarios. Usa lenguaje ejecutivo, no técnico.
"""

Frontend:
- Botón discreto (icono 🪄) en esquina superior derecha de cada Card.
- Click → modal con loading skeleton → respuesta de Claude.
- Botón "Pregunta de seguimiento" → input + envía nuevo prompt manteniendo contexto.

Limita data_snapshot a los top 5 elementos relevantes. NO inyectes datasets completos.
```

---

## Notas finales para el agente

- Si el descifrado César no produce resultados legibles tras probar todos los shifts, **pregunta al usuario** antes de continuar. Es probable que el cifrado sea de otro tipo.
- Si el `score_pct` da valores raros (negativos, NaN), añade logging y verifica si hay NULLs no manejados en `modules_completed`.
- Si ECharts no renderiza una visualización compleja: simplifica a la versión más básica que funcione y márcalo como TODO. No bloquear toda la fase por una visual.
- Si surge un trade-off "calidad vs velocidad", prioriza velocidad para tener algo demo-able. El polish se hace en Fase 4.
- **Commits frecuentes**: tras cada componente terminado, commit con mensaje claro. Facilita rollback si rompes algo.
