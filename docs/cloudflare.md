# Despliegue de Chedex

Se mantiene `wrangler.jsonc` con la cuenta, el Worker `chedex`, el dominio `chedex.app`, los recursos estáticos y la configuración existente.

Los secretos locales se conservan en `.env` y `.dev.vars`, ignorados por Git. Los secretos remotos de Cloudflare no se han modificado. No es necesario sustituir claves para este reinicio.

Comprueba el paquete sin publicar:

```sh
npm run check
npm run deploy:check
```

Para publicar la nueva versión en el destino existente, cuando corresponda:

```sh
npm run deploy
```

## Despliegue desde main

Desde el 2026-11-12, `main` es la rama de publicación. Cada cambio que llega a `main` ejecuta `.github/workflows/deploy.yml`: repite las comprobaciones (`check`, `animations:check`, `test` y `deploy:check`), publica el Worker con `npm run deploy` y comprueba el sitio con `scripts/monitor-production.mjs`. Las ramas y los PR solo ejecutan las comprobaciones de `ci.yml`; no publican.

**Requisito (lo hace el titular, una vez):** crear en GitHub, en Settings → Secrets and variables → Actions, el secreto `CLOUDFLARE_API_TOKEN` con un token de Cloudflare con permiso «Editar Workers» limitado a esta cuenta. El identificador de cuenta ya está en `wrangler.jsonc`. Mientras el secreto no exista, el flujo avisa («Despliegue omitido») y no publica; nunca imprime ni guarda credenciales. `npm run deploy` manual sigue funcionando desde un ordenador con sesión de Wrangler.

La web corporativa sirve `/`, `/servicios`, `/apoyo`, `/equipo`, `/colaboraciones`, `/proyectos`, `/contacto`, sus recursos estáticos y `/healthz`. Los alias con barra final y `/index.html` redirigen a la ruta canónica; las rutas de la aplicación antigua devuelven 404. El catálogo y `/admin` utilizan las claves existentes de Turso. El acceso administrativo utiliza Lichess con PKCE y retorno `https://chedex.app/auth/callback`, sin un secreto OAuth nuevo. Solo el ID autenticado `andresli` puede gestionar el catálogo. No se integra Apple Wallet.

Los datos nuevos se guardan en `chedex_v2_catalog`, `chedex_v2_oauth`, `chedex_v2_sessions` y `chedex_v2_limits`. Las tablas antiguas permanecen intactas. El servidor local nunca conecta con Turso.

`assets.html_handling` se fija a `none`: el Worker sirve explícitamente `index.html` y `admin.html`, manteniendo las rutas públicas limpias y evitando redirecciones automáticas en la vista administrativa. El dominio, la cuenta y el nombre del Worker se conservan.

Tras publicar, comprobar portada, `/servicios`, `/api/services`, `/admin`, rechazo anónimo de `/api/admin/services` y acceso real con AndresLi. Los precios del catálogo inicial están desactivados.


El área privada `/cuenta` y el panel `/admin` sirven documentos sin caché y con CSP. Las tablas aditivas de usuarios, proyectos y reseñas se inicializan con las mismas credenciales Turso existentes. El primer acceso de cada persona a Lichess la registra para poder asignarle proyectos. Las notas internas se filtran en el servidor y las reseñas solo son públicas tras moderación. No se necesita ningún secreto nuevo.

## Controles preparados tras la auditoría

La configuración incorpora limpieza de registros caducados cada hora mediante `scheduled` y registros propios sin logs automáticos de invocación. Los errores se correlacionan mediante identificadores sin cuerpos, URLs, cookies ni credenciales. Consultar [mantenimiento de datos](mantenimiento-datos.md) para las limitaciones y comprobaciones previas a publicación. Estos cambios se han desplegado tras la autorización posterior.

Añadir a la comprobación posterior a publicación `/readyz`, las cabeceras efectivas, la limpieza programada y la recepción de un registro de prueba sin datos reales. La comprobación de preparación solo consulta el catálogo existente; no crea tablas mediante ese endpoint.

Publicación comprobada: versión `71c833ff-fc94-4533-8f22-0e6e5d23041c`. El cron está registrado y el identificador técnico de la cuenta no habilita acceso público por workers.dev. OAuth real con AndresLi, panel, cuenta, disponibilidad y cabeceras se verificaron en el dominio. Consultar el bloque 05 de la auditoría para evidencias y límites.
