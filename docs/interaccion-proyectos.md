# Solicitudes y proyectos: interacción privada

Actualizado: 2026-11-04. Publicado con autorización en https://chedex.app. Versión Worker: `116ebf4f-133e-42a1-ac18-31ea3135a88d`.

- En móvil o con puntero táctil, los formularios utilizan el selector nativo del dispositivo; en escritorio conservan el control visual Chedex. Las opciones siguen enviándose mediante el mismo campo del formulario.
- Envíos y guardados muestran progreso en el formulario y una notificación visible. Durante la operación se bloquean nuevos envíos; los errores mantienen lo escrito.
- Administración muestra primero la lista. Abrir una solicitud lleva a su detalle; **Volver a solicitudes** cierra esa vista. En móvil se muestra lista o detalle para evitar una pantalla interminable.
- **Solicitud y cita**, **Conversación** y **Tareas** ordenan el trabajo. El alcance y los ajustes quedan en un desplegable separado de la decisión sobre la solicitud.
- En Conversación, **Enviar al usuario** está seleccionado inicialmente. **Solo el equipo** guarda una nota interna, con un botón y una confirmación distintos. Las notas anteriores conservan su visibilidad.
- Tanto la persona propietaria como el administrador pueden archivar y restaurar un proyecto. Archivar lo retira del seguimiento activo y conserva su historial; no es una eliminación definitiva. Desde **Archivados** se puede abrir y restaurar.
- El servidor valida identidad, propiedad, revisión y origen en la acción `archive` de `PUT /api/projects/:id` (y su equivalente administrativo). Rechaza el archivo si hay una cita activa: primero debe cancelarse. No permite al usuario modificar decisiones, tareas o datos de otros proyectos.

Comprobaciones del 2026-11-04: 79 pruebas correctas, sintaxis de 52 módulos y paquete Worker preparados. Recorrido completo en navegador a 390 px con cuentas ficticias y SQLite en memoria: enviar solicitud, recibirla en administración, cambiar decisión, responder al usuario, consultar respuesta, archivar y restaurar. No se usaron datos de producción ni se verificó un teléfono físico.

Fuentes: `public/selects.js`, `public/interaction-ui.js`, `public/account.js`, `public/admin-workspace.js`, `public/workspace.css`, `server/workspace-api.js`.

Tras la publicación del 2026-11-04 se compararon nueve recursos remotos con el checkout: pantallas de cuenta y administración y sus módulos/estilos. Disponibilidad de la base de datos y rechazo anónimo de las API privadas comprobados. No se crearon datos ficticios en producción.


## Eliminación de archivados publicada el 2026-11-04

El propietario de una cuenta o el administrador pueden eliminar definitivamente un proyecto archivado. La confirmación explica el alcance y exige escribir el nombre exacto. No se ofrece eliminación para un proyecto activo; el servidor comprueba identidad, propietario, origen, revisión, título y ausencia de una cita activa.

Un disparador de SQLite elimina las citas y la reseña vinculadas en la misma transacción que el proyecto (incluidos mensajes, tareas y producción dentro de su contenido). Si un paso falla, se revierte el conjunto. Los horarios reutilizables y otros proyectos se conservan. Esta acción no borra las copias de seguridad externas existentes y no tiene restauración desde la interfaz.

Comprobados mediante pruebas: rechazo a otras cuentas, nombre incorrecto, revisión obsoleta y origen inválido; eliminación asociada y reversión completa ante un fallo. En la revisión visual se verificaron el bloqueo por nombre incorrecto, la habilitación al escribir el nombre y la cancelación; no se ejecutó un borrado de datos reales.

Publicación autorizada el 2026-11-04, versión Worker `60d799bc-0cb2-4c10-8de9-fdef73b8ce79`. Recursos publicados comprobados, base de datos disponible y acceso anónimo a las API administrativas rechazado. No se eliminaron proyectos reales para comprobar la publicación.
