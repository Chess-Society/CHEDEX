# Chedex

Web corporativa de representación, promoción y desarrollo profesional en ajedrez. Marca Chedex, con «Impulsado por TopChess» en el pie.

El catálogo de `/servicios` presenta tres modalidades abiertas: apoyo puntual, representación y acompañamiento. Los ejemplos de contactos con colegios, difusión y pequeñas colaboraciones se mantienen en el contexto de la web, sin convertirlos en paquetes de entregables cerrados. No ofrece gestión de viajes, producción de campañas ni resultados garantizados. Los precios están ocultos por defecto. El mensaje central es crecer junto a profesores, jugadores y personas del sector. No se publican casos de campaña ficticios.

La identidad visual utiliza fondo negro, superficies en gris oscuro, tipografía sans y botones claros con relieve. El símbolo C y «Impulsado por TopChess» se conservan. No se publican miembros, credenciales, testimonios ni resultados ficticios.

Cada servicio preselecciona el motivo de la reunión. Los desplegables de la web y administración comparten un selector accesible de Chedex, con teclado, foco y opciones propias. El formulario recoge formato preferido y disponibilidad opcional, y prepara una solicitud de reunión por correo; no reserva ni confirma una cita. El formulario prepara un correo para `escuelatopchess@gmail.com` mediante la aplicación de correo del visitante. No almacena candidaturas ni confirma envíos. No necesita nuevas claves o servicios. La portada utiliza un tablero en perspectiva 3D con casillas neutras, piezas SVG delineadas en naranja y movimiento suave. Incluye inclinación al mover el puntero, un control de pausa y respeto por la preferencia de reducir movimiento. Se muestra también en móvil y no carga imágenes rasterizadas ni bibliotecas de 3D. El símbolo C se mantiene en SVG/CSS. La tipografía DM Sans se aloja en el propio dominio, con su licencia OFL; las visitas no cargan Google Fonts.

## Desarrollo

Requiere Node.js 24 o superior.

```sh
npm ci
npm run dev
```

Abre http://127.0.0.1:3000. La navegación usa `/servicios` (también `/apoyo`), `/equipo`, `/colaboraciones`, `/proyectos` y `/contacto`, sin fragmentos. Las rutas admiten acceso directo, recarga e historial; los enlaces antiguos con `#` se convierten automáticamente. `/healthz` comprueba la disponibilidad del servidor.

## Validación y despliegue

```sh
npm run check
npm test
npm run deploy:check
```

Se conserva la conexión Git con el repositorio original, GitHub Actions y la configuración de Cloudflare para el Worker `chedex` y el dominio `chedex.app`. `npm run deploy` publicará en ese mismo destino.

Los archivos locales `.env` y `.dev.vars` se conservan y siguen excluidos de Git. No sobrescribirlos ni subir sus valores al repositorio. Los secretos de Cloudflare permanecen en su sitio.

## Administración

`/admin` permite editar títulos, descripciones, características, ilustraciones, botones, orden, visibilidad y destacado. El precio solo se publica si se escribe y se activa su casilla. Los guardados comprueban la revisión del catálogo para evitar sobrescribir cambios de otra ventana.

El único administrador es el ID autenticado `andresli` de Lichess; el alias no concede permisos. OAuth usa PKCE, estado de un solo uso vinculado al navegador y sesiones de ocho horas con cookies HttpOnly/SameSite. El token de Lichess no se almacena. Las escrituras requieren sesión, origen coincidente y cabecera propia.

El servidor local usa siempre SQLite en `data/chedex-v2.db`, incluso si `.env` contiene credenciales de producción. En Cloudflare se reutilizan `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Las tablas nuevas tienen el prefijo `chedex_v2_`; no se eliminan ni reutilizan las tablas de la aplicación anterior. Git conserva su historial.

Los usuarios públicos no necesitan cuenta para consultar servicios o contactar. El área `/cuenta` permite entrar con cualquier cuenta válida de Lichess, guardar un perfil privado, enviar solicitudes, consultar tareas y avances compartidos y responder al equipo. `/opiniones` publica únicamente reseñas aprobadas de servicios completados cuya experiencia ha confirmado el administrador. Una edición de reseña vuelve a revisión. El formulario de contacto sin registro sigue preparando correos como antes.

Las pruebas de autenticación usan respuestas simuladas de Lichess y SQLite en memoria. El acceso real con AndresLi se verificó en el dominio publicado el 2 de noviembre de 2026, incluyendo el retorno OAuth y la carga del panel.

## Seguimiento privado y tableros

`/admin` reúne Proyectos, Personas, Reseñas y Servicios. La cuenta autenticada `andresli` es el único administrador. Cada proyecto tiene un propietario de Lichess inmutable y se organiza en Por hablar, Acordado, En marcha, Pendiente de respuesta y Completado. Las tareas se mueven arrastrando o editando su estado; incluyen responsable y fecha orientativa opcionales. Notas y tareas nuevas son internas por defecto. Al compartirlas se hacen visibles al propietario. Los proyectos se archivan sin borrar su historial. Los usuarios deben iniciar sesión al menos una vez antes de asignarles un proyecto desde administración.

Los usuarios ven exclusivamente sus proyectos y sus tareas, mensajes e historial compartidos. La API filtra la información interna en el servidor. Los guardados de proyectos comprueban la revisión para evitar pisar avances de otra persona o pestaña. Las escrituras requieren origen coincidente, cabecera propia y sesión válida; se limita su frecuencia. No hay notificaciones por correo automáticas: se consultan las novedades al entrar o al pulsar Actualizar.

Tablas adicionales: `chedex_v2_users`, `chedex_v2_projects` e índice por propietario, `chedex_v2_reviews`. Se crean de forma aditiva al inicializar el almacenamiento. No se alteran las tablas anteriores ni las claves. El catálogo existente se conserva. Los permisos se basan en el ID verificado por Lichess; el alias debe corresponder al mismo ID y nunca otorga administración. El retorno OAuth permite `/admin` para el administrador o `/cuenta`; los usuarios normales siempre van a su espacio.

Las pruebas usan cuentas ficticias únicamente en SQLite local/en memoria. No se crean proyectos, clientes ni reseñas ficticios en producción.

## Información legal y cookies

Las rutas `/aviso-legal`, `/privacidad`, `/cookies` y `/terminos` comparten el diseño de Chedex y se generan con `npm run legal:build` desde `server/legal-content.js` y `server/legal-config.js`. La identificación del titular se mantiene en `server/legal-config.js`; revisar sus datos y la autorización correspondiente antes de cambiarla o publicar.

La web utiliza cookies técnicas de acceso, sin analítica ni publicidad. El aviso informativo y el panel se pueden abrir desde cualquier pie de página. Al pulsar Entendido se recuerda únicamente esa preferencia local durante 180 días; no es consentimiento a publicidad ni medición. Las categorías opcionales no se instalan ni se simula su existencia. Las fuentes DM Sans y su licencia OFL se sirven desde `/fonts/`. Las páginas privadas mantienen CSP limitada al mismo origen.

Los textos describen el funcionamiento actual: contacto por correo, cuenta Lichess, seguimiento privado, reseñas voluntarias moderadas y condiciones concretadas antes de cada servicio. No crean una compra o suscripción ni garantizan patrocinios. Antes de incorporar tratamientos, proveedores o pagos nuevos deben revisarse los textos y los controles correspondientes.

## Auditoría y mantenimiento

La [auditoría por bloques](docs/auditoria/00-indice.md) mantiene el diagnóstico y el estado de las correcciones. El [procedimiento de datos](docs/mantenimiento-datos.md) describe limpieza, exportación local, copias verificadas y supresión autorizada. No se ejecutan borrados de proyectos por antigüedad.

Los listados de proyectos, personas y reseñas se recuperan por páginas de 100 registros y el panel recorre las páginas. El perfil usa una revisión para rechazar guardados sobre una copia antigua. Convertir una tarea compartida en interna retira también sus eventos del historial visible; los eventos antiguos sin identificador de tarea quedan disponibles para administración.

El servidor Node rechaza destinos HTTP malformados sin terminar el proceso. `/readyz` comprueba acceso al almacenamiento; `/healthz` solo comprueba el proceso HTTP. Docker prepara un directorio de datos escribible, que debe montarse en un volumen persistente. Las respuestas comparten cabeceras de seguridad y los errores inesperados generan identificadores de incidente sin registrar datos personales. La limpieza horaria y los registros del Worker están publicados y su configuración se ha verificado. El monitor de disponibilidad se mantiene en `.github/workflows/monitor.yml`; sus fallos se reflejan en GitHub Actions.
