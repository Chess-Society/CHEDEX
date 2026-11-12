# Panel informativo del cliente (`/cuenta`) · diseño corto

Fecha: 2026-11-12. Estado: pendiente de aprobación. Tamaño: cambio mediano (un apartado nuevo en la ficha de `/admin`, un dato nuevo en cada consulta y una nueva composición del inicio de `/cuenta`).

## Intención

`/cuenta` pasa a ser el lugar donde la persona cliente ve todo lo que Chedex le comunica: en qué fase está, qué le toca hacer, qué documentos le hemos enviado y las novedades. Referencia: la claridad de un panel como escala.io, con la identidad de Chedex. Decisión del titular (2026-11-12): los documentos se comparten **solo mediante enlaces**; no se suben ni se guardan archivos en Chedex por ahora.

## Objetivos

- Inicio de `/cuenta` con cuatro bloques: recorrido, «Lo que toca ahora», «Documentos» y «Novedades de Chedex».
- En la ficha de `/admin`, un apartado «Compartir con la persona» para añadir pasos, documentos (título y enlace) y novedades, y para marcar o retirar lo compartido.
- Todo lo compartido es visible solo para la persona propietaria de la consulta; el servidor filtra lo interno.

## No objetivos y antiobjetivos

- No hay subida ni almacenamiento de archivos, ni respuestas del cliente dentro de Chedex (la conversación sigue por correo), ni avisos por correo ni marcas de «leído».
- No se reactiva el espacio de producción del equipo ni el código antiguo de tareas y mensajes: la interfaz es nueva.
- Antiobjetivos: exponer notas internas, aceptar enlaces peligrosos (`javascript:`, `data:`), o prometer lo que no se ha acordado.

## Diseño

**Datos (sin tablas nuevas).** Cada consulta guarda en su contenido:
- `tasks` (ya existe): los pasos. La persona ve los que no son internos. Estado «Completado» = hecho.
- `updates` (ya existe): las novedades compartidas, de más reciente a más antigua.
- `documents` (nuevo): `{ id, title, url, note, createdAt }`. Máximo 30 por consulta. Todos son visibles para la persona.

**API (cambios aditivos en `PUT /api/admin/projects/:id`).** Nueva acción `document` con `op: 'add' | 'remove'`. Validación: título obligatorio (hasta 120), nota opcional (hasta 300), enlace `https://` válido de hasta 500 caracteres, sin usuario ni contraseña en la URL. Cada alta añade un evento compartido al historial («Documento compartido: …»). `clientProject` devuelve `documents`. Las acciones `task` y `update` existentes se reutilizan con `internal: false`.

**Admin (ficha de consulta).** Sección «Compartir con la persona» con tres formularios cortos (paso, documento, novedad) y las listas de lo ya compartido con «Retirar» para documentos y «Marcar hecho» para pasos.

**Cliente (`/cuenta`, Inicio).** Recorrido de seis pasos (ya existe) → «Lo que toca ahora» (pasos pendientes con fecha) → «Documentos» (título, nota, dominio del enlace y fecha; se abren en pestaña nueva con `rel="noopener noreferrer"`) → «Novedades de Chedex» (últimas cinco) → línea de tiempo existente. Estados vacíos claros. Con varias consultas, el bloque corresponde a la consulta principal y cada tarjeta de «Mis consultas» muestra cuántos pasos y documentos tiene.

**Pruebas.** Servidor: alta y retirada de documentos, rechazo de enlaces no https o con credenciales, límite de 30, filtrado en `clientProject`, permisos (otra cuenta no ve ni modifica). Interfaz: funciones puras con escape de HTML y estados vacíos. Revisión en navegador con datos ficticios en escritorio y 390 px.

## Decisiones mías (a revisar)

- Nombres de los bloques y el límite de 30 documentos.
- Sin «no leído»: no hay seguimiento de visitas.
- Todo lo compartido es público para la persona; las notas internas siguen fuera.
- Se publica tras comprobarlo, como en las rondas anteriores, y no se tocan consultas reales.
