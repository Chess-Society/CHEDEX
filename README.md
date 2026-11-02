# CHEDEX

**Tu historia en el ajedrez, siempre contigo.** Un proyecto impulsado por **TopChess**.

Primera implementación del pasaporte ajedrecístico: interfaz responsive en español, tarjeta con tres diseños, modo claro/oscuro, historial manual y privacidad por secciones. Sin funciones de red social ni IA.

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
- Tarjeta personalizable, QR real, enlace persistente, compartir y descarga PNG. El PNG utiliza únicamente la proyección pública.
- Torneos y logros: crear, editar, eliminar, fuentes y orden cronológico. Estadísticas de puntuación, actividad por años/modalidades y evolución de Elo declarado por modalidad.
- Consulta pública sin cuenta, favoritos privados y apertura de perfiles mediante su enlace. Los QR pueden escanearse con la cámara del móvil.
- Perfil privado y contacto oculto por defecto. Visibilidad por secciones, invalidación del enlace, exportación JSON, cierre de sesión y eliminación transaccional de datos.
- Estados calculados por el servidor: Declarado y Con fuente. Ningún formulario permite otorgar Verificado.

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

No subas `.env` ni tokens a GitHub. En producción se exige Turso y HTTPS. Las tablas e índices se crean al iniciar sin destruir tablas existentes. Todas las consultas usan parámetros. Ejecuta la aplicación como proceso Node persistente tras un proxy HTTPS; no es un alojamiento de archivos estáticos. Los tokens de sesión se guardan como hashes, caducan a los 30 días y usan cookies HttpOnly/SameSite. Las escrituras exigen origen coincidente y cabecera propia. Limita peticiones en el proxy: el límite local por IP es básico y no interpreta cabeceras de proxies.

Lichess utiliza `${APP_URL}/auth/callback` como URI de retorno, sin scopes adicionales. El usuario autoriza el acceso en Lichess. `APP_URL` debe coincidir exactamente con el origen usado en el navegador. Prueba el flujo real con una cuenta autorizada antes del lanzamiento.

Referencias oficiales: [OAuth de Lichess](https://lichess.org/api#section/Authentication), [SDK libSQL para Turso](https://docs.turso.tech/sdk/ts/reference).

## Pendientes de lanzamiento

- **Apple Wallet y Google Wallet:** aparecen como pendientes. No se emiten pases simulados. Se necesitan certificados/cuenta de desarrollador Apple y cuenta emisora/credenciales Google, además de implementar firma y actualización en el servidor.
- **Menores:** se bloquea la publicación sin confirmar mayoría de edad. Esta declaración no se presenta como prueba de edad. Faltan procedimiento de autorización de representantes y controles específicos.
- **Verificación oficial:** no habilitada; títulos y Elo son declarados, incluso con enlace. El futuro procedimiento autorizado deberá registrar origen y fecha de confirmación.
- **Partidas PGN:** futuras. No se inventan partidas ni resultados individuales a partir de puntuaciones de torneos.
- **Operación real:** conectar la base de la organización, configurar dominio/alojamiento, probar OAuth real, establecer copias de seguridad, recuperación y políticas de privacidad/retención. El borrado elimina la base activa; configura la retención de copias en Turso. Las tarjetas descargadas por terceros no se pueden revocar, pero sus QR siempre consultan la privacidad actual del servidor.
- Monetización y nuevos diseños premium quedan fuera de esta versión; los tres diseños incluidos son gratuitos.

## Validación

```sh
npm run check
npm test
```

Las pruebas cubren validación de entradas, privacidad pública, aislamiento entre cuentas, CRUD, QR, invalidación de enlaces, exportación y borrado de datos relacionados. Usan una base temporal; no acceden a Turso ni Lichess.
