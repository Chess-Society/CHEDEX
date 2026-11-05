# Equipo y producción

El propietario gestiona los roles en **Usuarios** y los encargos en **Equipo**, desde `/admin`. Puede preparar el acceso mediante el ID exacto de Lichess, asignar proyectos y retirar permisos con **Sin acceso**. Los miembros entran con su propia cuenta de Lichess; no se comparten credenciales.

- **Propietario:** conserva administración, asignaciones y aprobación final.
- **Editora de vídeo:** consulta producción en proyectos asignados, actualiza sus tareas, comenta y añade versiones mediante enlaces HTTPS.
- **Diseñadora:** consulta producción en proyectos asignados, actualiza sus tareas, comenta y entrega versiones de diseño mediante enlaces HTTPS.
- **Colaborador:** consulta producción en proyectos asignados, actualiza sus tareas y comenta.

## Uso

1. En **Equipo**, selecciona un proyecto existente. También puedes abrir producción desde el detalle de un proyecto.
2. Marca las personas responsables y prepara objetivo, formato, duración, destino, fecha y materiales. Guarda el encargo.
3. Añade tareas con una cuenta responsable y su fecha.
4. La editora encuentra sus encargos en **Mi trabajo** y los materiales en **Mis proyectos**. Cada versión se añade al proyecto con su enlace y notas.
5. Revisa las versiones, deja correcciones vinculadas a cada entrega y marca **Cambios solicitados**, **Aprobado** o **Entregado**. Los comentarios pueden indicar el minuto del vídeo.

El espacio de producción es interno. No se publica automáticamente ni se comparte con el cliente. Sus campos se preparan expresamente: no copia perfiles, notas privadas, citas o conversaciones del seguimiento del cliente. Los vídeos permanecen en sus enlaces de origen; Chedex no sube ni almacena archivos de vídeo. La persona que comparte un enlace debe dar acceso a sus destinatarios en el servicio de origen.

## Implementación y límites

- `server/team-api.js` comprueba rol y asignación en cada solicitud; el servidor limita las acciones por rol. `public/team-workspace.js` reutiliza los controles y estilos del panel.
- `chedex_v2_team` guarda roles por ID, con revisiones para evitar sobrescrituras. La configuración inicial solicitada se incorpora al inicializar el almacén, sin requerir que la editora ya tenga perfil; un acceso desactivado no se reactiva al reiniciar.
- Asignaciones y producción se guardan en el contenido del proyecto, bajo `teamMembers` y `production`, usando su revisión existente. Las tareas del seguimiento del cliente siguen separadas de las tareas de producción.
- Desasignar un proyecto o desactivar un rol impide nuevas consultas y cambios. No puede retirar información que ya se haya visto o copiado ni revocar enlaces de servicios externos.
- Los proyectos archivados son de consulta. Máximos: 30 miembros, 20 materiales, 100 tareas, 100 versiones y 300 comentarios por proyecto. Los listados de proyectos son paginables.
- La supresión local de una cuenta desactiva su rol de equipo, conservando el registro desactivado para evitar que la configuración inicial restaure su acceso.

Validación del 2026-11-03: pruebas automatizadas de identidad, separación de datos, asignaciones, tareas propias, aprobación final, versiones, revisiones concurrentes, revocación, enlaces, fechas, origen y archivo. Revisión visual pendiente por indisponibilidad del acceso del navegador al entorno local. Publicado en https://chedex.app el 2026-11-03, versión Worker `776e70ec-1c49-4146-aed9-37054a77bbe9`. Comprobados web, panel, catálogo, disponibilidad de la base de datos, coincidencia de los seis archivos JS/CSS publicados y rechazo anónimo de las rutas del equipo. No se ha verificado visualmente una sesión real de la editora.


## Mejoras publicadas el 2026-11-04

**Usuarios** diferencia cuentas registradas, equipo, personas con solicitudes y personas sin solicitudes. Los accesos preparados antes de un primer inicio se identifican y cuentan aparte. El propietario conserva su rol; los demás solo reciben acceso al espacio de producción de los proyectos asignados. Quitar un rol de equipo conserva el espacio personal del usuario.

Desde una persona del equipo, **Asignar trabajo** abre la selección del proyecto. **Delegar encargo** guarda responsable, título, instrucciones y fecha, incorpora a la persona al proyecto y crea su tarea en una sola revisión. Los ajustes de equipo, materiales y formato permanecen disponibles por separado.

Editora y diseñadora disponen de Mi trabajo (pendientes y todos), Mis proyectos y Entregas; dentro de un proyecto, Encargo, Mis tareas, Entregas y Comentarios. El botón de entregar desde una tarea preselecciona ese encargo. Las versiones identifican vídeo, diseño u otro material; entregar mueve la tarea a Para revisar. La revisión del propietario afecta al estado de la tarea únicamente si corresponde a su última versión. Una versión anterior no aprueba un trabajo posterior.

La migración añade una especialidad a los permisos existentes sin reconstruir la tabla ni restablecer roles. Se conserva la revisión de permisos y la desactivación sigue bloqueando el acceso. El almacenamiento interno de la especialidad no se muestra en la interfaz.

Validación del 2026-11-04: 82 pruebas correctas, sintaxis y paquete Worker. Recorrido visual local con cuentas ficticias: cambiar rol a diseñadora, delegar, recibir un encargo y entregar una versión en vista móvil. No se cambiaron roles ni datos de producción.

Publicación autorizada el 2026-11-04 en https://chedex.app, versión Worker `60d799bc-0cb2-4c10-8de9-fdef73b8ce79`. Nueve recursos publicados coinciden con el checkout; disponibilidad y base de datos correctas, API de usuarios y equipo rechazan accesos anónimos. Sin cambios manuales de roles ni datos reales de prueba.
