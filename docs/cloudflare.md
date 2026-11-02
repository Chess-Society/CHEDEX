# Publicar Chedex en chedex.app

La web y el servidor se despliegan como **Cloudflare Worker con archivos estáticos**. Turso mantiene los datos. GitHub conserva el código. GitHub Pages no ejecuta las rutas de autenticación, privacidad ni firma de pases y no sirve como alojamiento único para esta aplicación.

`wrangler.jsonc` configura `https://chedex.app`, el dominio personalizado, `AndresLi` como administrador de Lichess y la demo desactivada. No contiene credenciales. El arranque del servidor usa la compatibilidad oficial de Node HTTP de Cloudflare; la base remota usa el cliente web de libSQL. No se incluye SQLite en el Worker.

## Primer despliegue

1. Autoriza Wrangler con la cuenta de Cloudflare propietaria de `chedex.app`. Comprueba la cuenta con `npx wrangler whoami` antes de publicar. Si existe una web o ruta en ese dominio, revisa el conflicto antes de sustituirla.
2. Ejecuta `npm ci`, `npm run check`, `npm test` y `npm run deploy:check`.
3. Configura los secretos **del Worker**, no variables públicas ni archivos del repositorio:

```sh
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
```

Los comandos solicitan cada valor sin incluirlo en los argumentos. También pueden añadirse desde Workers & Pages → chedex → Settings → Variables and Secrets en Cloudflare. Deben existir antes de servir usuarios; la aplicación devolverá 503 si no puede conectar.

4. Ejecuta `npm run deploy`. El dominio personalizado proporciona HTTPS. La cuenta debe tener acceso a la zona `chedex.app` y permisos para Workers y dominios.
5. Comprueba `/healthz`, la portada, `/api/config` y el acceso público denegado a perfiles privados. Después prueba el acceso de Lichess en un navegador con la cuenta real autorizada.

## Acceso con Lichess

El identificador de cliente es `chedex.app` y el retorno es `https://chedex.app/auth/callback`. Lichess admite clientes públicos con PKCE y no requiere un secreto OAuth adicional. `AndresLi` es la identidad administradora; los demás usuarios entran con sus propias cuentas.

El panel de administración muestra únicamente contadores y estado de configuración. No revela historiales privados, tokens ni certificados y no concede verificaciones oficiales.

## Pruebas locales

`npm run dev` ejecuta Node local y lee `.env`. Para comprobar el entorno de Cloudflare, `npx wrangler dev` lee `.dev.vars`, también ignorado por Git. No copies secretos a `wrangler.jsonc`. La URL configurada en producción sigue siendo `https://chedex.app`, aunque Wrangler sirva una vista local; no completes el acceso real desde esa vista hasta publicar el dominio.

## Operación

- La aplicación no activa registros de observabilidad en Cloudflare, para evitar conservar códigos OAuth en URLs de retorno.
- Configura copias de seguridad/recuperación de Turso y política de retención antes del lanzamiento público.
- Revisa el uso y los límites de Cloudflare y Turso. No se ha contratado ningún plan de pago.
- Los pases Apple necesitan sus secretos por separado; véase [Apple Wallet](apple-wallet.md).

Referencias: [Node HTTP en Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/), [dominios personalizados](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [secretos](https://developers.cloudflare.com/workers/configuration/secrets/).
