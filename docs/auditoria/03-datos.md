# Bloque 03 · Información, almacenamiento y conservación

> Diagnóstico del estado inicial. Las correcciones posteriores y su estado se mantienen en [el índice](00-indice.md); las comprobaciones actuales, en [el bloque 05](05-validacion.md). Las referencias de línea siguientes corresponden al código previo a la corrección.

## Qué se recoge y cómo se recupera

| Bloque de datos | Recogida | Almacenamiento | Recuperación y acceso |
| --- | --- | --- | --- |
| Catálogo | Formulario del administrador | `chedex_v2_catalog`, contenido JSON y revisión | API pública filtra no publicados y precios ocultos; administrador recibe edición completa |
| Autorización temporal | Estado y verificador generados por el servidor | `chedex_v2_oauth` | Uso único, estado con hash, diez minutos de validez |
| Sesión | ID y nombre verificados con Lichess | `chedex_v2_sessions` | Cookie aleatoria; consulta por hash y fecha de expiración |
| Perfil | Biografía, objetivos, correo y hasta cinco enlaces opcionales | `chedex_v2_users` | Titular en `/api/account`; administrador mediante lista de personas |
| Proyectos | Solicitud del usuario o alta por administrador | `chedex_v2_projects`, propietario, revisión, contenido JSON | Listado y detalle por propietario; administración recibe todos los campos |
| Tareas, mensajes e historial | Formularios y eventos de seguimiento | Dentro del JSON del proyecto | Filtrado de elementos internos en `clientProject`; véase AUD-03 |
| Reseñas | Valoración, texto y petición explícita de publicación | `chedex_v2_reviews` | Público solo con estado aprobado; propietario y moderación tienen acceso adicional |
| Límites de frecuencia | Contadores de intentos y escrituras | `chedex_v2_limits` | Consulta interna; no se devuelve al cliente |
| Preferencia del aviso | Pulsación de «Entendido» | `localStorage`, clave `chedex_cookie_notice` | Solo en ese navegador, con expiración lógica de 180 días |
| Contacto público | Nombre, correo, motivo y disponibilidad | El formulario prepara un `mailto:` | No se guarda por esa vía en la base; el correo enviado queda fuera de esta auditoría |

El token de acceso a Lichess se usa para verificar la cuenta y no se persiste por el código revisado. El verificador PKCE sí permanece temporalmente en la tabla OAuth. La clave de limitación de inicio usa un hash de IP y ventana temporal; no debe tratarse como prueba de anonimización.

## Dónde vive cada cosa

- **Local:** `data/chedex-v2.db`, SQLite, excluido de Git. El servidor local ignora las credenciales remotas para seleccionar la base.
- **Publicado:** adaptador Turso por HTTPS y credenciales del entorno. No se consultó la base real ni se verificaron ubicación, permisos o copia de seguridad.
- **Navegador:** cookies técnicas y preferencia del aviso. Los borradores de formularios y datos descargados permanecen también en memoria de la página durante su uso; no se identificó persistencia de perfiles/proyectos en `localStorage`.
- **Repositorio:** catálogo inicial, rutas, identidad legal y textos. Las páginas legales generadas incluyen datos de identificación destinados a publicación según el comentario existente; esta auditoría no revalida esa autorización y no reproduce esos datos.

## AUD-07 · Media · Ciclo de vida operativo sin definir

**Ubicación:** `server/api.js:112`; esquema de `server/store.js`; README y documentación de despliegue.

La sesión expirada deja de autenticar inmediatamente por la condición de fecha de la consulta. Su borrado físico, al igual que el de estados OAuth y contadores vencidos, solo se activa al comenzar otro inicio de sesión. Caducidad de acceso y eliminación física son cosas distintas.

No se encontró una tarea de limpieza independiente ni un procedimiento documentado y comprobado para exportar o suprimir una cuenta y sus datos relacionados. La política pública admite solicitudes por correo: no disponer de un botón de borrado no demuestra por sí solo un incumplimiento. Lo que falta aquí es evidencia del proceso operativo y de sus verificaciones.

Tampoco se encontró un procedimiento del proyecto para copia de seguridad y restauración. Pueden existir mecanismos del proveedor fuera del repositorio: quedan sin verificar.

**Corrección propuesta:**

1. Separar limpieza periódica de caducados del inicio de sesión y verificar que no elimina registros vigentes.
2. Documentar qué información se conserva, con qué criterio y cómo se atienden solicitudes verificadas; confirmar requisitos aplicables antes de ejecutar borrados reales.
3. Diseñar exportación y eliminación coherentes de usuario, sesiones, proyectos, reseñas y contadores; las tablas actuales no tienen claves foráneas que hagan esa limpieza automáticamente.
4. Definir copias, acceso a ellas y una prueba de restauración con datos ficticios.

## Recuperación eficiente

La cuenta consulta primero identidad/perfil, luego el índice de sus proyectos y finalmente el detalle seleccionado. El panel descarga simultáneamente índices de proyectos, personas con perfiles y reseñas, y después un detalle. No hay búsqueda documental, semántica ni memoria de IA.

Los listados de proyectos hacen `SELECT p.*` y analizan el JSON completo para después devolver pocos campos. A medida que crecen tareas e historial, esto aumenta transferencia desde Turso, trabajo y memoria del servidor. Conviene combinar una futura paginación con campos de índice o proyecciones que eviten cargar cada detalle completo.

No se emite una conclusión de cumplimiento legal: no se verificaron contratos, transferencias, procedimientos externos ni tratamiento del correo.
