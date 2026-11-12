# Paneles de trabajo · plan 1: estructura común y `/admin`

> Para quien ejecute: usar superpowers:executing-plans. Los pasos usan casillas.

**Objetivo:** que `/admin` sea una herramienta de trabajo diario (cola «Hoy», embudo, llamadas, fase 2) con la identidad visual de Chedex.
**Arquitectura:** módulo puro `public/dash-data.js` con las agregaciones (sin DOM, con pruebas); estructura y vistas nuevas en módulos `public/dash-*.js`; estilos en `public/dash.css`; API actual reutilizada con tres campos de lectura aditivos en el listado de administración.
**Tecnología:** módulos ES nativos, `node --test`, SQLite/libSQL.
**Spec:** `docs/superpowers/specs/2026-11-12-paneles-dashboard-design.md`

## Restricciones globales

- Sin tablas, dependencias ni paso de compilación nuevos. Sin finanzas. Sin tema claro.
- No se modifican `workspace-ui.js` ni `appointments-ui.js` (los usa `/cuenta` hasta el plan 2).
- No se pierde ninguna función de la lista de paridad del spec. Los datos internos no llegan al cliente.
- Textos en español. Estilo Chedex: fondo oscuro, acento naranja `#f18b42`, DM Sans, botones con relieve; respeto a movimiento reducido y teclado.
- No hay commit ni publicación sin petición expresa.

## Review Focus

- Cero consultas, cero llamadas y cero candidatos → estados vacíos con texto útil, sin errores.
- Consulta sin `updates` (`lastMessageBy` nulo) → no cuenta como «sin responder».
- Nombre de usuario con distinta capitalización en `lastMessageBy` y propietario → compara sin distinguir mayúsculas.
- Consulta archivada → no aparece en Hoy, embudo ni fase 2.
- Periodo «Hoy» en el cambio de día y zona horaria → se calcula con la fecha local del navegador.

---

### Task 1: Campos de lectura para Hoy

**Files:** modificar `server/workspace-api.js:~107`; test en `test/workspace.test.js`.
**Interfaces:** Produces: en `GET /api/admin/projects`, cada fila añade `createdAt: number|null`, `lastMessageBy: string|null`, `lastMessageAt: number|null`. La ruta de cliente `GET /api/projects` no los devuelve.

- [ ] Test: con un proyecto con dos mensajes (cliente y equipo), la lista admin devuelve `lastMessageBy` del último y `createdAt`; la lista de cliente no contiene esas claves; un proyecto sin mensajes devuelve `null`.
- [ ] `node --test test/workspace.test.js` debe fallar.
- [ ] Añadir `json_extract(p.content,'$.createdAt')`, `json_extract(p.content,'$.updates[#-1].author')` y `json_extract(p.content,'$.updates[#-1].createdAt')` al SELECT y devolverlos solo si `isAdminRoute`.
- [ ] `node --test` completo en verde.

### Task 2: Agregaciones de Hoy

**Files:** crear `public/dash-data.js`, `test/dash-data.test.js`.
**Interfaces:** Produces (todas puras, `now` y `period` inyectables):
- `phaseOfNeed(need): 'consultoria'|'marca-personal'|'otra'`
- `needsReply(project): boolean` (no archivado, y solicitud pendiente de revisión o último mensaje del propietario)
- `replyQueue(projects, now): Array<project & {ageDays:number}>` ordenada de más antigua a más reciente
- `funnel(projects, period, now): { rows:[{phase,count}], aside:{confirm:number, declined:number} }` con `period` en `'today'|'7d'|'30d'`
- `newRequests(projects, period, now): { current:number, previous:number }`
- `phase2Candidates(projects, now): Array<project>` (fase 1, completada, no archivada, sin consulta de fase 2 del mismo `ownerId`, sin mensaje «Siguiente fase:»; recibe `proposed: Set<string>` de ids ya propuestos)
- `PHASE2_PREFIX = 'Siguiente fase:'`

- [ ] Tests con los casos del Review Focus y los de cada función (vacío, archivados, mayúsculas, límites de periodo).
- [ ] Ejecutar `node --test test/dash-data.test.js`; debe fallar.
- [ ] Implementar. `phaseOfNeed` usa `serviceNeeds`/`phaseOf`: las tres modalidades de La Chulapa son `marca-personal`; Orientación inicial y Colaboración de marca, `otra`; el resto, `consultoria`.
- [ ] Todas las pruebas en verde.

### Task 3: Estructura común y vista Hoy

**Files:** crear `public/dash.css`, `public/dash-shell.js`, `public/dash-today.js`; modificar `public/admin.html`, `public/admin.js` (carga y menú).
**Interfaces:** Produces: `initShell(root, { items, role }): { setView(id), setCount(id, n) }`; `renderToday(container, { projects, slots, appointments, period }, handlers)` con `handlers.openProject(id)` y `handlers.proposePhase2(id)`.

- [ ] Menú del propietario: Hoy, Consultas, Llamadas, Clientes, Reseñas, Servicios, Equipo, con contadores en «Hoy» (cola), «Consultas» y «Reseñas»; las personas del equipo con rol limitado ven solo «Mi trabajo».
- [ ] Hoy: bloques «Necesitan tu respuesta», «Llamadas», embudo con filtro Hoy / 7 días / 30 días y comparación de solicitudes nuevas, y «Listos para la fase 2»; «Proponer fase 2» publica el mensaje compartido (`POST` de mensaje existente) con `PHASE2_PREFIX`.
- [ ] Estados vacíos, carga y error en cada bloque. Accesible por teclado; a 390 px una sola columna.
- [ ] Revisión en navegador con cuenta ficticia local a escritorio y móvil.

### Task 4: Consultas, Llamadas y Clientes

**Files:** crear `public/dash-projects.js`, `public/dash-calls.js`, `public/dash-clients.js`.

- [ ] Consultas: tablero por estados y lista, filtros por fase, modalidad y estado, búsqueda y ficha lateral con solicitud y cita, conversación, tareas, ajustes, archivo y eliminación; mismas reglas de revisión y confirmación que hoy.
- [ ] Llamadas: horarios, reservas y enlace externo.
- [ ] Clientes: cuentas con sus consultas y perfil visible solo al administrador.
- [ ] Las pruebas actuales de espacio de trabajo y citas siguen en verde.

### Task 5: Reseñas, Servicios, Equipo y Mi trabajo

**Files:** crear `public/dash-reviews.js`, `public/dash-services.js`, `public/dash-team.js`.

- [ ] Reseñas y moderación; Servicios con selector de fase (`phase`) y agrupación; Equipo y roles; «Mi trabajo» con el espacio de producción actual en la nueva estructura.
- [ ] `npm run check` y `npm test` en verde; sustituir los archivos antiguos de `/admin` solo cuando cada función quede cubierta.

### Task 6: Cierre

- [ ] Recorrido completo en navegador (escritorio y 390 px), lista de paridad marcada, README y notas de Obsidian actualizados. No commit ni publicación.
