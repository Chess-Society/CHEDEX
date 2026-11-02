# Revisión de seguridad · 2 de noviembre de 2026

Alcance: revisión del código del servidor, OAuth, controles de propiedad y privacidad, renderizado de datos, archivos públicos, configuración de despliegue y dependencias. Pruebas automatizadas con SQLite temporal y solicitudes limitadas sin autenticación a https://chedex.app. No se han alterado perfiles reales ni realizado pruebas de carga.

## Refuerzos aplicados

- Cookies de sesión y OAuth con prefijo `__Host-` en HTTPS, además de Secure, HttpOnly, SameSite=Lax y Path=/. El servidor exige el nombre completo; no acepta como alternativa la cookie antigua. Después del despliegue será necesario volver a iniciar sesión. Basado en [OWASP: atributos de cookies](https://owasp.github.io/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes).
- Lectura de JSON limitada a 500.000 bytes, tanto por longitud declarada como por bytes recibidos. Rechazo con 413 al superar el límite. Decodificación UTF-8 estricta después de reunir fragmentos, evitando corrupción de caracteres y recuentos repetidos sobre toda la cadena.
- Comparación del estado OAuth por longitud en bytes antes de la comparación criptográfica.
- Límite básico de solicitudes también en `/healthz`, mapa acotado a 5.000 clientes y dirección del cliente proporcionada por Cloudflare en el Worker. El servidor local utiliza la dirección de su conexión y no confía en cabeceras reenviadas.

## Controles comprobados

- OAuth PKCE con estado vinculado al navegador, caducidad y consumo de un solo uso. No se conserva el token Lichess. Administración basada en identidad autenticada, no en el alias editable.
- Sesiones aleatorias almacenadas mediante hash; control del origen y cabecera propia en operaciones de escritura.
- Consultas SQL parametrizadas y propiedad exigida en modificación y borrado de registros.
- Perfil privado por defecto. Contacto y secciones ocultas excluidos de la respuesta pública y de sus estadísticas. Un perfil privado o eliminado deja de estar disponible mediante enlace o QR.
- Datos incorporados al HTML escapados, enlaces externos restringidos a HTTPS y avatares limitados a imágenes rasterizadas. Las fuentes aportadas por usuarios no se descargan desde el servidor.
- CSP sin scripts externos ni inline, bloqueo de marcos, nosniff, HTTPS/HSTS y respuestas sin caché. Archivos públicos sujetos a una lista explícita.
- Pruebas HTTP públicas: portada 200; `/api/me` y `/api/admin` 401; perfil inexistente y archivos `.env`/certificados 404; escritura con origen ajeno 403.
- `npm audit`: cero vulnerabilidades conocidas en las dependencias instaladas en la fecha de revisión. Esto no descarta fallos desconocidos o propios de la aplicación.

## Límites y pendientes

- El limitador en memoria es por instancia, se reinicia y no comparte contadores entre ubicaciones. Usuarios con la misma IP comparten el límite. No se ha validado resistencia ante ataques distribuidos; requiere una protección adicional antes de tráfico elevado.
- No se ha comprobado una restauración de copias de seguridad de Turso ni auditado los permisos internos de las cuentas de Cloudflare, GitHub y Turso.
- Apple Wallet sigue pendiente de certificados reales. Las pruebas de firma utilizan certificados sintéticos y no acreditan aceptación por un iPhone.
- Esta revisión acotada no es una prueba de intrusión independiente ni una garantía de ausencia de vulnerabilidades.
