# Paneles de trabajo de Chedex (`/admin` y `/cuenta`) · diseño

Fecha: 2026-11-12. Estado: aprobado por el titular el 2026-11-12 («adelante»), con las decisiones de la revisión incluidas abajo. Tamaño: proyecto (reescritura de la interfaz de dos paneles). Dos planes de implementación, en este orden: (1) estructura común y `/admin`; (2) `/cuenta`.

## Intención

El titular trabaja a diario en `/admin` y le resulta poco útil e intuitivo: el Resumen solo cuenta proyectos y reseñas, y no dice qué hacer ahora. Se reescribe la interfaz de los dos paneles como herramientas de trabajo, con la densidad y la lógica de una herramienta como escala.io (referencia aportada en captura: menú con contadores, filtros por periodo, embudo), pero con la identidad visual de Chedex (fondo oscuro, acento naranja, DM Sans, botones con relieve). El panel de la persona cliente debe aportarle valor real: saber dónde está, qué le toca y qué viene después.

## Objetivos

- `/admin` responde cada día a «¿qué tengo que atender hoy?».
- Menú más corto y con nombres por tarea, con contadores.
- `/cuenta` muestra «tu siguiente paso» y la hoja de ruta compartida, y propone la fase 2 (marca personal con La Chulapa) cuando termina la fase 1.
- Mismo lenguaje visual en ambos paneles y en el panel de equipo con roles.
- Cero pérdida de funciones actuales (lista de paridad más abajo).

## No objetivos y antiobjetivos

- No hay finanzas ni cobros (decisión del titular, 2026-11-12). No hay analítica de visitas web, correos automáticos ni sincronización de calendario.
- No hay tablas nuevas ni cambios de privacidad: la API actual se reutiliza; solo se permiten campos de lectura aditivos en el listado de administración (ver «Decisiones tras la revisión»). Los datos internos siguen filtrándose en el servidor.
- No hay tema claro, frameworks ni dependencias nuevas: módulos ES nativos, sin paso de compilación.
- Antiobjetivos: perder una función actual, exponer notas internas o perfiles al cliente, o que el panel sea más lento de cargar o más difícil de usar por teclado y móvil.

## Enfoques considerados

- A. Reorganizar sobre lo existente: menos riesgo, pero el titular lo descartó.
- **B. Reescribir la interfaz (elegido por el titular el 2026-11-12):** componentes propios y estructura nueva, manteniendo la API y las reglas de acceso.
- C. Solo cambiar el aspecto: no resuelve la utilidad.

## Diseño

**Estructura común.** Un módulo de estructura (barra lateral con contadores, barra superior con título, filtro de periodo y acciones, zona de contenido) y una hoja de estilos de panel basada en las variables de `style.css`. En móvil, el menú pasa a una barra inferior o desplegable. Un ficha lateral (cajón) abre cualquier consulta sin salir de la lista.

**`/admin` (propietario `andresli`).** Menú: Hoy, Consultas, Llamadas, Clientes, Reseñas, Servicios, Equipo.
- *Hoy*: «Necesitan tu respuesta» (consultas con solicitud pendiente de revisión o con mensaje del cliente sin respuesta del equipo, con antigüedad); «Llamadas» de hoy y próximas; embudo Solicitud → Llamada de 15 min → Valoración → Propuesta acordada → En marcha → Completado, con filtro Hoy / 7 días / 30 días; «Listos para la fase 2» (consultas de fase 1 completadas, sin archivar, sin consulta posterior del mismo cliente en fase 2) con acción «Proponer fase 2».
- La comparación con el periodo anterior se limita a «solicitudes nuevas», que usan la fecha de creación. Las demás cifras son un estado actual, porque no se guarda historial de cambios de estado.
- *Consultas*: tablero por estados y lista, con filtros por fase, modalidad y estado, y búsqueda; la ficha lateral conserva solicitud y cita, conversación, tareas, ajustes, archivo y eliminación.
- *Llamadas*: horarios, reservas y enlace externo, como hoy.
- *Clientes*: cuentas con sus consultas y datos de perfil visibles solo al administrador, como hoy; la gestión de roles de equipo pasa a *Equipo*.
- *Servicios*: el editor actual, agrupado por fase y con un selector de fase por servicio.
- *Reseñas* y *Equipo*: las funciones actuales en la nueva estructura. Las personas del equipo con rol limitado ven solo su trabajo asignado, como hoy.

**`/cuenta` (cualquier cuenta de Lichess).** Menú: Inicio, Mis consultas, Mi perfil.
- *Inicio* («Tu siguiente paso»): fase actual de cada consulta con indicador de progreso; próxima llamada con fecha y enlace; «Lo que te toca a ti» (tareas compartidas asignadas a la persona y mensajes sin respuesta); hoja de ruta (tareas compartidas con porcentaje completado); novedades compartidas.
- Cuando una consulta de fase 1 se completa, tarjeta «Siguiente fase: marca personal con La Chulapa» con los tres paquetes y acceso a preparar una consulta con la modalidad preseleccionada. Sin promesas de resultados ni presión.
- *Mis consultas* y *Mi perfil*: las funciones actuales (preparar consulta, línea de tiempo, reserva de llamada, reseña, archivo y eliminación de archivados) con la nueva estructura.

**Lista de paridad (no se pierde):** acceso por Lichess y cierre de sesión; crear, revisar, aceptar o denegar consultas; fases de seguimiento y notas; conversación visible e interna; tareas y su visibilidad; archivo, restauración y eliminación definitiva con confirmación por nombre; horarios y citas con enlace externo; reseñas y su moderación; catálogo editable con orden, visibilidad y destacado; usuarios, roles y asignación por proyecto; avisos de cambios sin guardar; bloqueo de ediciones simultáneas por revisión; accesibilidad por teclado y selector nativo en móvil; enlace de ayuda ante fallos.

**Código.** Módulos pequeños por vista, con la lógica de agregación (cola de Hoy, embudo, candidatos a fase 2, progreso) en un módulo puro sin DOM, con pruebas. Los archivos actuales (`admin-workspace.js`, `team-workspace.js`, `account.js`, `workspace-ui.js`, `appointments-ui.js` y sus hojas de estilo) se sustituyen solo cuando la nueva vista iguala su función. Se actualizan la lista de comprobación de módulos y la caché de la aplicación instalable.

**Pruebas.** Agregaciones con casos de borde (sin consultas, antigüedad, periodos); las pruebas existentes de espacio de trabajo, equipo, citas, cuenta y rutas siguen pasando; recorrido en navegador a escritorio y 390 px con cuentas ficticias y SQLite local; `npm run check` y `npm test`.

## Decisiones tras la revisión del constructor (2026-11-12)

- **Datos de Hoy.** El listado administrativo (`GET /api/admin/projects`) devuelve hoy título, modalidad, estado, fase de seguimiento, estado de solicitud, archivado y `updatedAt`. Se añaden, solo en la ruta de administración, `createdAt`, `lastMessageBy` y `lastMessageAt` (último mensaje de la conversación, de `updates[#-1]`). Un mensaje está sin responder cuando `lastMessageBy` coincide con el nombre de usuario propietario. Es la única ampliación de API de este plan; las consultas y los permisos no cambian.
- **Embudo.** Usa la fase de seguimiento existente (`progressPhase`): Recibida, Llamada de 15 min, Valoración, Propuesta acordada, En marcha, Completado. Cuenta las consultas no archivadas creadas en el periodo elegido; «Por confirmar» y «No seguimos» se muestran aparte.
- **Proponer fase 2.** Publica un mensaje compartido en la conversación de esa consulta que empieza por «Siguiente fase:» y enlaza a los paquetes. No crea consultas ni envía correos. Una consulta con ese mensaje deja de aparecer en «Listos para la fase 2». La fase de una consulta se deduce de su modalidad: modalidades de consultoría son fase 1; Apoyo puntual, Representación y Acompañamiento son fase 2.
- **Base de trabajo.** La consultoría en dos fases está terminada en el árbol de trabajo (104 pruebas correctas el 2026-11-12) y es la base. Cualquier fallo de partida se corrige antes de empezar.
- **Sustitución.** Los archivos nuevos se crean con prefijo propio y `/admin` pasa a la nueva estructura al terminar el plan 1; `/cuenta` sigue con los módulos actuales (`workspace-ui.js`, `appointments-ui.js`) hasta el plan 2, y esos archivos compartidos no se modifican en el plan 1.
- **Menú por rol.** Mismo `/admin` y misma estructura. El propietario ve los siete apartados. Las personas del equipo con rol limitado ven solo «Mi trabajo» (el espacio de producción actual, con la nueva estructura) y sus contadores de tareas asignadas.
- **Instalable y comprobación.** El service worker solo guarda la página sin conexión; no hay lista de módulos que actualizar. `scripts/check.mjs` recorre las carpetas automáticamente. Las pruebas usan SQLite en memoria y Lichess simulado; la revisión en navegador usa una cuenta ficticia creada de ese modo con servidor local.

## Decisiones mías (a revisar)

- Nombres y orden del menú; Reseñas se mantiene como sección propia.
- Cajón lateral en vez de pantalla completa para abrir una consulta.
- «Necesitan tu respuesta» y «Listos para la fase 2» se definen como arriba; el embudo muestra estado actual, no historial.
- Hoja de ruta del cliente = tareas compartidas existentes, sin modelo nuevo.
- Se sustituye por partes (primero `/admin`, luego `/cuenta`) y no se publica sin autorización.

## Para el constructor

Disposición exacta, espaciados, iconos y microinteracciones siguen el estilo de Chedex (botones con relieve, naranja como único acento, animaciones respetando movimiento reducido). Textos en español, claros y sin jerga. No se commitea ni se publica sin petición expresa.
