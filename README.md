# CHEDEX

**Tu historia en el ajedrez, siempre contigo.** Un proyecto impulsado por **TopChess**.

Primera implementación del pasaporte ajedrecístico: interfaz responsive en español, tarjeta con diseño Chedex, modo claro/oscuro, historial manual y privacidad por secciones. Sin funciones de red social ni IA.

## Ejecutar

Requiere Node.js 24 o superior.

```sh
npm ci
cp .env.example .env
npm run dev
```

En PowerShell: `Copy-Item .env.example .env`. Abre http://127.0.0.1:3000. La demo es opcional, tiene datos de ejemplo y solo se habilita con `ENABLE_DEMO=true`, fuera de producción y con un `APP_URL` local. Sus perfiles no pueden publicarse. Sin Turso, desarrollo utiliza SQLite en `data/`, ignorado por Git. Las demos de más de 24 horas se eliminan al iniciar.

## Funciones implementadas

- Inicio público y acceso Lichess con OAuth PKCE, estado de un solo uso y cookie vinculada al navegador. Sin contraseñas propias; no se almacena el token de Lichess.
- Perfil editable: alias, avatar, tipo de usuario, biografía, club, escuela, localidad, año, Elo por modalidad, título declarado, enlaces y contacto.
- Tarjeta digital, QR real, enlace persistente, compartir y descarga PNG. El PNG utiliza únicamente la proyección pública.
- Torneos y logros: crear, editar y eliminar con diez segundos para deshacer, también tras recargar. Búsqueda por nombre sin distinguir acentos, filtros por temporada/modalidad, orden y agrupación anual. Carga por bloques de 25 registros en el historial y los perfiles públicos.
- Duplicación de torneos como borrador: conserva el contexto y propone la fecha actual; resultados, Elo, notas y fuente se introducen de nuevo. Recuerda la última modalidad por cuenta en el dispositivo.
- Estadísticas filtrables por temporada y modalidad, con acceso a los torneos correspondientes. Gráficas de Elo limitadas a 120 puntos representativos cuando hay más datos, identificadas como vista resumida.
- Vista como visitante, disponible también con el perfil privado, sin publicar ni cambiar la privacidad. Solo utiliza la proyección de campos y secciones que serían públicos; las notas personales de los registros quedan excluidas.
- Aviso propio de Chedex antes de descartar formularios, aviso del navegador al abandonar la página y errores de validación de torneos junto al campo afectado.
- Consulta pública sin cuenta, favoritos privados y apertura de perfiles mediante su enlace. Los QR pueden escanearse con la cámara del móvil.
- Perfil privado y contacto oculto por defecto. Visibilidad por secciones, invalidación del enlace, exportación JSON, cierre de sesión y eliminación transaccional de datos.
- Estados calculados por el servidor: Declarado y Con fuente. Ningún formulario permite otorgar Verificado.
- Primeros pasos guiados y campos opcionales agrupados para mantener cortos los formularios móviles.
- Landing pública con tarjeta de ejemplo interactiva, recorrido visual, explicación de privacidad y preguntas frecuentes. La portada `/` también es visible con sesión iniciada; el espacio personal utiliza rutas como `/app/tarjeta` y `/app/historial/torneos`, sin hashes.
- Administración para la identidad de Lichess **AndresLi**, validada por el servidor. El alias editable no concede permisos; el panel muestra contadores y configuración sin revelar historiales privados.

Los registros eliminados dejan de aparecer inmediatamente en el historial, las estadísticas y el perfil público. Su copia temporal permite restaurarlos durante diez segundos. Las copias caducadas se purgan al consultar la cuenta, al eliminar otro registro y al iniciar el servidor. El borrado de cuenta elimina también estas copias. La tabla `entry_trash` se crea automáticamente, sin modificar los registros existentes.

## Turso y producción

El panel `https://app.turso.tech/andres-l1` identifica una organización, no una base ni una credencial. Selecciona una base **libSQL** y configura únicamente en el servidor:

```dotenv
NODE_ENV=production
APP_URL=https://tu-dominio.example
LICHESS_CLIENT_ID=chedex-tu-dominio
TURSO_DATABASE_URL=libsql://tu-base-tu-organizacion.turso.io
TURSO_AUTH_TOKEN=valor-secreto
ENABLE_DEMO=false
```

No subas `.env`, `.dev.vars`, tokens ni certificados a GitHub. En producción se exige Turso y HTTPS. Las tablas e índices se crean al iniciar sin destruir tablas existentes. Todas las consultas usan parámetros. El alojamiento previsto es **Cloudflare Workers en chedex.app**; también se incluye Docker para un servidor Node. GitHub Pages por sí solo no ejecuta este servidor. Los tokens de sesión se guardan como hashes, caducan a los 30 días y usan cookies HttpOnly/SameSite. Las escrituras exigen origen coincidente y cabecera propia. El límite por IP de la aplicación es básico; configura límites adicionales en el alojamiento según el uso.

La cuenta de Cloudflare del proyecto es **chesssociety.team@gmail.com**. El identificador de cuenta de `wrangler.jsonc` es público. Los secretos Turso y, en el futuro, los certificados Apple se configuran por separado en el Worker. Véase [despliegue en Cloudflare](docs/cloudflare.md).

Lichess utiliza `${APP_URL}/auth/callback` como URI de retorno, sin scopes adicionales. El usuario autoriza el acceso en Lichess. `APP_URL` debe coincidir exactamente con el origen usado en el navegador. Prueba el flujo real con una cuenta autorizada antes del lanzamiento.

Referencias oficiales: [OAuth de Lichess](https://lichess.org/api#section/Authentication), [SDK libSQL para Turso](https://docs.turso.tech/sdk/ts/reference).

## Pendientes de lanzamiento

- **Apple Wallet (prioridad):** generador de pases firmados implementado y probado con certificados sintéticos. Se mantiene «Próximamente» hasta disponer de certificados Apple válidos y HTTPS. Requiere prueba de instalación real en iPhone. Las actualizaciones son manuales al volver a descargar; no se simulan actualizaciones automáticas. Véase [Apple Wallet](docs/apple-wallet.md). **Google Wallet** queda pospuesto.
- **Menores:** se bloquea la publicación sin confirmar mayoría de edad. Esta declaración no se presenta como prueba de edad. Faltan procedimiento de autorización de representantes y controles específicos.
- **Verificación oficial:** no habilitada; títulos y Elo son declarados, incluso con enlace. El futuro procedimiento autorizado deberá registrar origen y fecha de confirmación.
- **Partidas PGN:** futuras. No se inventan partidas ni resultados individuales a partir de puntuaciones de torneos.
- **Operación real:** publicado en [chedex.app](https://chedex.app), con Turso y acceso real de Lichess comprobados con `AndresLi`. Quedan por establecer copias de seguridad, recuperación y políticas de privacidad/retención. El borrado elimina datos de la base activa; configura la retención de copias en Turso. Las tarjetas descargadas por terceros no se pueden revocar, pero sus QR siempre consultan la privacidad actual del servidor.
- Los colores y diseños adicionales están previstos como una futura opción de pago. Por ahora se ofrece el diseño Chedex, sin precios, planes ni cobros habilitados.

## Validación

```sh
npm run check
npm test
```

Las pruebas cubren validación de entradas, privacidad pública, aislamiento entre cuentas, CRUD, QR, invalidación de enlaces, exportación y borrado de datos relacionados. Usan una base temporal; no acceden a Turso ni Lichess.

También comprueban PKCE, estados OAuth caducados/reutilizados, persistencia entre accesos, identidad administradora y generación de pases firmados con certificados sintéticos. Para validar el paquete de Cloudflare: `npm run deploy:check`.
