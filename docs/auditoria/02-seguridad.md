# Bloque 02 · Seguridad

> Diagnóstico del estado inicial. Las correcciones posteriores y su estado se mantienen en [el índice](00-indice.md); las comprobaciones actuales, en [el bloque 05](05-validacion.md). Las referencias de línea siguientes corresponden al código previo a la corrección.

## Límites de confianza

1. Navegador → API: todos los campos y cookies se consideran manipulables; identidad y permisos se validan en servidor.
2. API → Lichess: el servidor intercambia el código y verifica la cuenta; no confía en un alias enviado por el cliente.
3. API → SQLite/Turso: consultas parametrizadas; credenciales remotas solo en el entorno del servidor.
4. Administrador → publicación: tareas, notas y reseñas cambian de visibilidad según reglas explícitas.

La revisión sigue el principio de comprobar autorización en cada petición, coherente con [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html). No se ha ejecutado una evaluación completa de conformidad con OWASP ASVS.

## Controles que sí se verificaron

| Control | Evidencia |
| --- | --- |
| OAuth con PKCE S256, estado vinculado al navegador y consumo único | `server/api.js`; pruebas de autenticación |
| Sesiones aleatorias de 32 bytes, hash en almacenamiento y expiración de ocho horas | Inspección y pruebas de expiración/cierre |
| Cookies públicas `__Host-`, Secure, HttpOnly y SameSite=Lax | Inspección y pruebas sobre origen HTTPS simulado |
| Permisos por ID verificado; usuario normal sin administración | Pruebas de suplantación y acceso a rutas administrativas |
| Propietario filtrado en servidor para proyectos | Pruebas con cuentas distintas |
| Filtrado de tareas, notas e historial internos desde el origen | Inspección y pruebas; excepción de historial histórico descrita abajo |
| Escrituras protegidas por origen exacto y cabecera propia | Pruebas CSRF |
| Consultas con parámetros; enlaces de perfil restringidos a HTTPS | Inspección del adaptador y pruebas |
| Cuerpo JSON limitado durante lectura a 64 KiB | Inspección y prueba de tamaño |
| Textos de usuario escapados al interpolar HTML en las vistas revisadas | Inspección de renderizadores; no se afirma una prueba exhaustiva de XSS |
| Reseñas no públicas hasta moderación; edición vuelve a pendiente | Pruebas de flujo y concurrencia de moderación |
| Archivos secretos locales ignorados y no registrados actualmente | `git check-ignore`; `git ls-files` |

## AUD-03 · Media · Retirada de visibilidad incompleta

**Ubicación:** `server/workspace-api.js:14-18,123-134,142`.

Cada evento conserva una copia del título y estado de una tarea con su visibilidad de aquel momento. Al pasar una tarea compartida a interna, sus eventos anteriores siguen siendo compartidos y no incluyen una referencia estructurada al ID de la tarea para aplicar una retirada conjunta.

**Resultado observado:** el propietario ya no recibe la tarea, pero sí su título anterior en el historial. El título nuevo, creado como interno, no se filtra. No se trata de acceso a notas que siempre fueron privadas ni permite borrar lo ya visto por una persona.

**Decisión necesaria:** si «interna» significa retirar también la información que el servidor sigue entregando, hay que actualizar el historial asociado. Si el historial compartido debe ser permanente, la interfaz debe explicarlo antes del cambio. La prioridad media refleja esa expectativa de privacidad todavía no definida.

## AUD-08 · Media · Falta de diagnóstico operativo propio

**Ubicación:** `server/api.js:179-182`; `server/local.js:79-83`; `wrangler.jsonc:19`.

Los fallos inesperados se convierten en un mensaje genérico, lo cual protege detalles internos, pero no se registra un evento propio con categoría, correlación y causa controlada. La configuración declara observabilidad desactivada. No se comprobó si existen herramientas externas que compensen esta carencia.

**Impacto:** difícil distinguir caída de Turso, error OAuth, esquema incorrecto o abuso. El estado `/healthz` solo prueba que responde la entrada HTTP; no comprueba base de datos.

**Corrección:** registrar categorías y un identificador de incidente sin cookies, tokens, códigos OAuth, cuerpos ni perfiles. Definir una comprobación interna de disponibilidad de dependencias y alertas proporcionadas. No devolver trazas al visitante.

## AUD-09 · Baja · Cabeceras públicas incompletas

**Ubicación:** `worker/index.js:18-28,30-41`; `server/local.js:104-112`.

Las páginas privadas añaden CSP y política de referente. Las respuestas públicas no reciben desde estas entradas una protección equivalente; `nosniff` se añade expresamente al JSON, pero no a todos los recursos. No hay una política HSTS declarada en el código revisado. Cloudflare podría añadir controles fuera del repositorio; no se verificó su estado real.

**Corrección:** definir una política compartida y comprobar respuestas efectivas. Probar la portada antes de endurecer `style-src`: el tablero usa atributos de estilo para posicionar piezas. No añadir una CSP que rompa la interfaz ni inferir que una cabecera ausente demuestra una explotación.

## Disponibilidad y abuso

AUD-01 es el problema de seguridad más urgente: véase [bloque de código](01-codigo.md). AUD-05 permite superar un cupo; no elimina el límite de frecuencia existente.

El límite OAuth confía en `cf-connecting-ip`; es una frontera adecuada solo si la cabecera procede realmente de la infraestructura confiable. La entrada Node copia cabeceras del cliente y no aporta por sí misma esa garantía. Si se expone directamente, un cliente puede alterar la clave del limitador. El despliegue público declarado usa Worker; no se comprobó una exposición Node en producción.

La escritura del catálogo solo admite al administrador, pero carece del limitador de frecuencia que sí tiene el espacio de proyectos. No se detectó una vía anónima de edición por ello.

## Dependencias y secretos

La consulta oficial `npm audit --json` terminó con **0 vulnerabilidades notificadas**, sobre el árbol instalado. Esto no cubre defectos del código propio, del sistema base de Docker ni avisos todavía no publicados.

Un barrido limitado de patrones de claves privadas, ciertos tokens de proveedores y JWT en el código actual no produjo coincidencias. No equivale a una búsqueda universal de secretos. No se leyeron valores de `.env`/`.dev.vars`, ni se auditó el historial Git ni el inventario remoto de secretos.

No se alteraron credenciales, permisos, infraestructura ni datos reales.
