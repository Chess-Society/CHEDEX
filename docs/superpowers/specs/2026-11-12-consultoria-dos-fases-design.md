# Chedex como consultoría en dos fases · diseño

Fecha: 2026-11-12. Estado: pendiente de aprobación. Tamaño: cambio pequeño-mediano (catálogo, textos y una franja visual; sin rutas nuevas).

## Intención

Chedex pasa a presentarse como **consultoría estratégica especializada en el ajedrez**. El cliente entra por la consultoría de Chedex (precios asequibles para el sector) y, cuando el proyecto está claro, se le propone la **fase 2: marca personal con La Chulapa** (los tres paquetes actuales). El vídeo deja de ser la puerta de entrada y pasa a ser el siguiente paso.

## Objetivos

- Portada y `/servicios` cuentan el camino en dos fases.
- Cuatro servicios de consultoría de fase 1, tomados de la propuesta del titular: consultoría puntual, estratégica, desarrollo de proyectos y acompañamiento.
- Los tres paquetes de La Chulapa se conservan tal cual (contenido, precios, TopChess) y se presentan como fase 2.
- Una línea visible de lo que Chedex no hace: asesoría fiscal, contable, jurídica y laboral.
- El catálogo sigue editable desde `/admin`.

## No objetivos y antiobjetivos

- No se quitan funciones: cuenta con Lichess, solicitudes, citas, panel, Pulse, equipo, reseñas.
- No se inventan precios, casos, testimonios ni resultados. Los precios de fase 1 los pone el titular.
- No hay páginas ni rutas nuevas, ni imágenes nuevas (se reutilizan las ilustraciones SVG existentes).
- No se promete garantía de resultados ni se da asesoría legal.
- Antiobjetivo: que la fase 2 quede escondida o que la web parezca una agencia de vídeo con una consultoría añadida.

## Enfoques considerados

- **A. Una página con dos bloques** (elegida por el titular el 2026-11-12): mínimo cambio y encaja con la web actual.
- B. Dos páginas (`/servicios` y `/marca-personal`): separa mejor las marcas, pero obliga a tocar rutas, Worker, caché y pruebas, y deja casi vacía la segunda página.
- C. Añadir solo un bloque arriba: más rápido, pero mezcla las fases.

## Diseño

**Datos.** Cada servicio del catálogo recibe un campo `phase`: `consultoria` o `marca-personal`. La validación de `server/api.js` lo exige (lista cerrada). Si falta en un catálogo antiguo, se normaliza: los ids `apoyo-puntual`, `representacion` y `acompanamiento` pasan a `marca-personal`; todo lo demás, a `consultoria`.

**Servicios de fase 1** (ids nuevos para no chocar con los paquetes de La Chulapa):

| id | Título | Qué se entrega |
| --- | --- | --- |
| `consultoria-puntual` | Consultoría puntual | Diagnóstico en conversación, recomendaciones y resumen de próximos pasos |
| `consultoria-estrategica` | Consultoría estratégica | Análisis del proyecto o negocio y documento con propuestas de mejora |
| `desarrollo-proyectos` (ya existe) | Desarrollo de proyectos | Hoja de ruta, objetivos, prioridades y planificación |
| `acompanamiento-estrategico` | Acompañamiento estratégico | Reuniones periódicas, revisión de avances y ajustes de estrategia |

Los textos salen de la propuesta del titular. Los precios arrancan en «Precio a concretar» con `showPrice: false` hasta que el titular los indique.

**Catálogo ya publicado.** `server/store.js` inserta el catálogo por defecto solo si no existe (`INSERT OR IGNORE`), así que cambiar `defaultServices` no cambia producción. Se necesita una migración aditiva única al inicializar: si el catálogo guardado no tiene `phase`, se añade el campo a los servicios existentes y se agregan los servicios de fase 1 que falten, con subida de revisión. No se borra ni se reescribe lo editado a mano. No se aplica a producción sin autorización de publicación.

**Presentación.**
- Portada: titular intacto; subtítulo y `<title>` pasan a «Consultoría estratégica especializada en el ajedrez». Franja «Tu camino en dos fases» (1 Consultoría Chedex → 2 Marca personal con La Chulapa) y el catálogo agrupado en dos encabezados.
- `/servicios`: dos bloques con la misma agrupación, y una nota «Lo que no hacemos» con la lista de exclusiones y la indicación de acudir a profesionales para eso.
- La fase 2 lleva la etiqueta «Siguiente fase · con La Chulapa». Se mantiene Acompañamiento (La Chulapa) como único destacado naranja, según la decisión del 2026-11-04.
- Ilustraciones: se reutilizan las cinco existentes.

**Formularios.** `serviceNeeds` añade los motivos «Consultoría puntual», «Consultoría estratégica» y «Acompañamiento estratégico». «Desarrollo de proyectos» ya existe.

**Pruebas.** Validación de `phase`, normalización de catálogos antiguos, migración idempotente, agrupación en la renderización y que los tres paquetes de La Chulapa no cambian. Después, `npm run check` y `npm test`.

## Decisiones mías (a revisar)

- Nombres e ids de los servicios nuevos, y «Acompañamiento estratégico» frente al «Acompañamiento» de La Chulapa para evitar confusión.
- Textos de cada servicio, adaptados de la propuesta.
- Precios ocultos hasta que el titular los indique.
- No se confirma nada en Git ni se publica; la migración en producción queda pendiente de autorización.

## Para el constructor

Color, espaciados y estructura exactos de la franja y los encabezados siguen el estilo actual de `style.css` y `services.css`. Actualizar README y la nota de decisiones de Obsidian al cerrar.
