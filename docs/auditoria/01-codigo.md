# Bloque 01 · Código y funcionamiento

> Diagnóstico del estado inicial. Las correcciones posteriores y su estado se mantienen en [el índice](00-indice.md); las comprobaciones actuales, en [el bloque 05](05-validacion.md). Las referencias de línea siguientes corresponden al código previo a la corrección.

## Mapa mínimo

| Parte | Fuente principal | Responsabilidad |
| --- | --- | --- |
| Entrada publicada | `worker/index.js` | Rutas, recursos y API en Cloudflare |
| Entrada local y Docker | `server/local.js` | HTTP y SQLite local |
| Identidad y catálogo | `server/api.js` | OAuth PKCE, sesiones, permisos y edición de servicios |
| Seguimiento | `server/workspace-api.js` | Perfiles, proyectos, tareas, mensajes y reseñas |
| Persistencia | `server/store.js` | Esquema aditivo y adaptador HTTPS de Turso |
| Navegación | `public/routes.js` | Rutas compartidas entre navegador y servidores |
| Panel y cuenta | `public/admin*.js`, `public/account.js`, `public/workspace-ui.js` | Formularios y representación de información |
| Legales | `server/legal-config.js`, `server/legal-content.js`, `scripts/render-legal.mjs` | Fuentes y generación de HTML |

Es una aplicación de JavaScript ESM sin framework cliente, con un único paquete directo de desarrollo: Wrangler. No se identificó integración de IA, embeddings, búsqueda vectorial ni un sistema propio de memoria conversacional en el código actual.

## AUD-01 · Alta · Caída por URL malformada

**Ubicación:** `server/local.js:65-66`. La construcción de la URL está fuera de un manejo global de errores del callback asíncrono de HTTP.

**Resultado observado:** una solicitud con destino malformado provoca `ERR_INVALID_URL` y termina el proceso con código 1. Se comprobó exclusivamente contra un proceso hijo local creado para la auditoría.

**Impacto:** indisponibilidad del servidor Node. En desarrollo escucha en loopback; con `NODE_ENV=production` escucha en todas las interfaces. Docker ejecuta esa misma entrada. No se extrapola al Worker.

**Corrección:** validar el destino y capturar los errores de todo el manejador HTTP, responder 400 ante entradas inválidas y mantener vivo el proceso. Añadir una prueba de integración con una petición malformada seguida de otra válida.

## AUD-02 · Media · SQLite en Docker

**Ubicación:** `Dockerfile:3-8`; `server/local.js:57-58`.

`/app` se crea durante la construcción como root. Se cambia la propiedad de `server` y `public`, pero no se crea `/app/data` ni se concede escritura al usuario `node` sobre `/app`. Al primer acceso a la API, el código intenta crear `data/chedex-v2.db`.

**Consecuencia prevista:** sin un volumen o permiso externo que lo resuelva, la inicialización falla y la API devuelve 503, aunque `/healthz` siga dando 200. Es una deducción de la configuración; no se ejecutó Docker porque no está disponible.

**Corrección:** preparar únicamente el directorio de datos con permisos del usuario de ejecución, definir persistencia y probar inicio, escritura y reinicio. Si Docker se usa públicamente, revisar también el origen y HTTPS: esta entrada fija un origen de loopback y cookies locales sin `Secure`; no está preparada como equivalente del Worker público.

## AUD-04 · Media · Truncado sin recuperación por páginas

**Ubicación:** `server/workspace-api.js:81,84,146`; `public/admin-workspace.js:17-21,31,51-52`.

Proyectos y reseñas administrativas tienen `LIMIT 500`; personas, `LIMIT 1000`. No hay cursor, desplazamiento, total ni una consulta de búsqueda que continúe el listado. Los filtros del panel operan sobre el subconjunto descargado.

**Reproducción:** 501 proyectos distribuidos entre seis propietarios; el proyecto más antiguo sigue existiendo y puede obtenerse por ID, pero desaparece de la lista. Puede impedir encontrar proyectos o personas desde el panel y falsear sus contadores. La rama de reseñas y personas se verificó por inspección, no con una carga equivalente.

**Corrección:** paginar en servidor, permitir filtros en servidor y mostrar totales coherentes. No aumentar simplemente el límite.

## AUD-05 · Media · Límite de proyectos no atómico

**Ubicación:** `server/workspace-api.js:39-47`.

El recuento y la inserción son consultas separadas. Dos solicitudes sobre 99 proyectos leen el mismo recuento y ambas crean otro: resultado observado, 101. El límite de frecuencia por usuario no garantiza el máximo acumulado.

**Corrección:** imponer el cupo con una operación condicional atómica o transacción compatible con ambos adaptadores. Probar peticiones concurrentes en SQLite y en el adaptador remoto; este último no dispone actualmente de una abstracción de transacción compartida.

## AUD-06 · Media · Sobrescritura del perfil

**Ubicación:** `server/workspace-api.js:67-79`.

El perfil se sustituye completo sin revisión, mientras catálogo y proyectos sí usan control de concurrencia. Dos ventanas que parten del mismo perfil pueden guardar campos diferentes y borrar silenciosamente el primer cambio.

**Reproducción:** la primera guarda una biografía; la segunda guarda objetivos desde su copia anterior. Ambas reciben 200 y la biografía vuelve a quedar vacía.

**Corrección:** añadir revisión y conflicto 409 o una actualización parcial con reglas de concurrencia explícitas.

## AUD-10 · Baja · Catálogo predeterminado tras fallo

**Ubicación:** `public/service-cards.js`, función `loadServices`.

El navegador representa primero los servicios de fábrica. Si la consulta falla, conserva esa oferta sin avisar. Un servicio retirado en la base de datos podría seguir mostrándose durante un fallo, y también aparecer brevemente antes de recibir la respuesta correcta. No es filtración de un borrador privado, sino información comercial desactualizada.

**Corrección:** definir un estado de carga y otro de indisponibilidad, o una caché de la última versión válida con una política explícita.

## AUD-11 · Baja · Verificación y documentación incompletas

`npm run check` enumera archivos manualmente y omite módulos actuales como `public/routes.js`, `public/project-data.js`, `public/services-data.js`, `server/legal-config.js` y el generador legal. Sus importaciones pueden detectar algunos errores indirectamente, pero no sustituyen una comprobación sistemática de todos los módulos.

El README no incluye `npm test` en su bloque principal de validación y mantiene la advertencia de identificación fiscal pendiente, aunque la configuración actual ya la contiene. `LICHESS_ADMIN_IDS` y `ENABLE_DEMO` aparecen en Wrangler pero no controlan el código actual; el administrador está fijado en las dos APIs. Esto puede inducir a pensar que cambiar la variable modifica permisos.

**Corrección:** comprobar todos los módulos propios y actualizar documentación y variables sin cambiar silenciosamente quién administra.

## Mantenibilidad

Hay reutilización adecuada de rutas, validadores y funciones de presentación; la edición optimista protege catálogo y proyectos. Las listas de recursos y las cabeceras están duplicadas entre Worker y servidor local, lo que exige mantenerlas coordinadas. Varios módulos de interfaz concentran plantillas y manejadores en líneas extensas, dificultando revisión y referencias. Son observaciones de mantenimiento: no justifican una reescritura completa para resolver los hallazgos.
