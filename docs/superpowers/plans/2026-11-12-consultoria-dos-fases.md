# Consultoría en dos fases · plan de implementación

> Para quien ejecute: usar superpowers:executing-plans. Los pasos usan casillas.

**Objetivo:** presentar Chedex como consultoría estratégica en dos fases (consultoría de Chedex, después marca personal con La Chulapa) sin quitar funciones.
**Arquitectura:** campo `phase` en cada servicio del catálogo; normalización y migración aditiva en `server/store.js`; agrupación en `public/service-cards.js`; textos estáticos en `index.html` y `services.html`.
**Tecnología:** JavaScript ES modules, `node --test`, SQLite/libSQL.
**Spec:** `docs/superpowers/specs/2026-11-12-consultoria-dos-fases-design.md`

## Restricciones globales

- Los tres paquetes de La Chulapa conservan contenido y precios (90 €, 150 € por evento, 250 € al mes). Acompañamiento (La Chulapa) sigue siendo el único destacado.
- Sin precios inventados: servicios nuevos con `showPrice: false` y `priceText: 'Precio a concretar'`.
- Sin rutas, imágenes ni dependencias nuevas; ilustraciones existentes (`support`, `school`, `career`, `content`, `travel`).
- Sin commit ni publicación sin petición expresa. Texto en español.
- `serviceNeeds` (`public/services-data.js`) y `needs` (`public/project-data.js`) deben quedar iguales.

## Review Focus

- Catálogo antiguo sin `phase` → se normaliza y no falla la validación del PUT.
- Migración ejecutada dos veces → no duplica servicios ni sube la revisión de nuevo.
- Un servicio editado o despublicado por el titular no se pisa en la migración.
- Catálogo con una sola fase publicada → no se muestra un encabezado vacío.
- Textos editables siguen escapados.

---

### Task 1: Datos, validación y migración

**Files:** modificar `public/services-data.js`, `server/api.js:~22-40`, `server/store.js:34`; test en `test/admin.test.js` y nuevo `test/catalog-phases.test.js`.

**Interfaces:**
- Produces: `servicePhases = ['consultoria','marca-personal']`; `phaseOf(service): string` (usa `service.phase` si es válido; si no, `marca-personal` para ids `apoyo-puntual|representacion|acompanamiento`, y `consultoria` para el resto); `migrateCatalog(services): { services, changed }` (añade `phase` a todos y agrega los de `defaultServices` cuyo id falte, solo si algún servicio no tenía `phase`).

- [ ] Test (`catalog-phases.test.js`): `phaseOf` para los tres ids de La Chulapa, para `desarrollo-proyectos` y para un id desconocido; `migrateCatalog` sobre el catálogo antiguo (4 servicios sin `phase`) devuelve 7 servicios, `changed === true`; segunda llamada sobre su resultado devuelve `changed === false`; un servicio con `published:false` y título editado conserva ambos valores; PUT con `phase:'otra'` responde 400.
- [ ] Ejecutar `node --test test/catalog-phases.test.js`; debe fallar.
- [ ] Implementar en `services-data.js`: `phase` en los 4 existentes y 3 nuevos (`consultoria-puntual`, `consultoria-estrategica`, `acompanamiento-estrategico`); `serviceNeeds` añade «Consultoría puntual», «Consultoría estratégica», «Acompañamiento estratégico». `desarrollo-proyectos` pasa a ser el tercero de fase 1. Orden en `defaultServices`: fase 1 primero, fase 2 después.
- [ ] Validar `phase` en `validateServices` (lista cerrada; si falta, usar `phaseOf`) y devolverlo en el objeto saneado; ajustar `publicServices` para exponerlo.
- [ ] En `initializeStore`, tras el `INSERT OR IGNORE`, leer el catálogo, aplicar `migrateCatalog` y, si `changed`, `UPDATE chedex_v2_catalog SET content=?, revision=revision+1 WHERE id=1`.
- [ ] Ejecutar `node --test`; los tests existentes de admin deben pasar (ajustar solo cuentas que dependan de 4 servicios por defecto: `publicData.services.length`).

### Task 2: Motivos de solicitud

**Files:** modificar `public/project-data.js:3,~15-22`; test en `test/account-home.test.js` si compara listas.

- [ ] Añadir las tres modalidades a `needs` y una pregunta en `requestEmail` para cada una (consultoría puntual: situación y duda concreta; estratégica: proyecto o negocio y qué quiere mejorar; acompañamiento estratégico: proyecto, objetivos y ritmo de revisión).
- [ ] Test: `needs` es igual a `serviceNeeds`; `requestEmail` con cada nueva modalidad incluye su pregunta específica y no la genérica.
- [ ] `node --test test/account-home.test.js test/contact-support.test.js`; deben pasar.

### Task 3: Vistas en dos fases

**Files:** modificar `public/service-cards.js`, `public/index.html`, `public/services.html`, estilos en `public/services.css` y `public/style.css`; test en `test/contact-support.test.js`.

**Interfaces:** `renderServices(container, services)` agrupa por `phaseOf`: encabezado «Fase 1 · Consultoría Chedex» y «Fase 2 · Marca personal con La Chulapa»; omite el encabezado de una fase sin servicios.

- [ ] Test: con los 7 servicios por defecto aparecen ambos encabezados y 7 tarjetas; con solo fase 2, un único encabezado; el HTML sigue escapando contenido editable (los tests existentes de precios siguen pasando).
- [ ] Implementar la agrupación manteniendo clases `bundle-card`, `featured` y el botón actual; etiqueta «Siguiente fase · con La Chulapa» en fase 2.
- [ ] `index.html`: subtítulo `hero-positioning` y `<title>`/metadescripción a «Consultoría estratégica especializada en el ajedrez»; descripción del héroe resumida a las dos fases; franja «Tu camino en dos fases» antes del catálogo.
- [ ] `services.html`: introducción en dos fases; bloques estáticos de fase 1 (tres tarjetas nuevas con su detalle; Desarrollo de proyectos ya existe) antes de los paquetes; los paquetes de La Chulapa pasan a «Fase 2»; nota «Lo que no hacemos» (fiscal, contable, jurídica y laboral; acudir a profesionales).
- [ ] Estilos mínimos con los tokens existentes; revisar en el navegador a 375 px y escritorio.

### Task 4: Comprobación y documentación

**Files:** `README.md`, `docs/` (nota breve), memoria de Obsidian (`02-Decisiones.md`, `03-Pendientes.md`).

- [ ] `npm run check` y `npm test` sin fallos.
- [ ] README: nueva descripción de oferta (dos fases, exclusiones, precios pendientes).
- [ ] Obsidian: decisión fechada 2026-11-12 y pendientes (precios de fase 1, migración en producción sin aplicar, `/admin`).
- [ ] Comprobar rutas y enlaces tocados; no commit ni despliegue.
