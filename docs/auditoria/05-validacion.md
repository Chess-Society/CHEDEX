# Bloque 05 · Evidencias de las correcciones

Fecha: 3 de noviembre de 2026. Node.js v24.14.0. Los cambios anteriores del usuario se mantienen; la publicación posterior fue autorizada explícitamente. No se ejecutaron escrituras de contenido ni supresiones manuales de producción.

## Resultados finales

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `npm test` | 49/49 correctas | 35 pruebas originales, adaptando el contrato de revisión del perfil, y 14 nuevas regresiones/controles |
| `npm run check` | 37 módulos correctos | Todos los `.js`/`.mjs` propios bajo public, server, worker, scripts y test |
| `npm run deploy:check` | Correcto | Empaquetado del Worker, recursos y configuración; no publica |
| `git diff --check` | Sin errores de espacios | Revisión de cambios actuales registrados por Git |
| Consulta npm de la auditoría inicial | 0 vulnerabilidades notificadas | No se han añadido ni actualizado dependencias durante la corrección |

El primer intento de sintaxis del nuevo comprobador encontró una incompatibilidad de rutas file-URL en Windows. Se corrigió convirtiéndolas a rutas de sistema. La prueba original de perfil se actualizó para incluir su revisión obligatoria; después pasó la batería completa.

## Regresiones integradas

La reproducción que antes esperaba fallos se ha convertido en [test/audit.test.js](../../test/audit.test.js) y forma parte de `npm test`. Ya no existe el diagnóstico anterior que daba por correctos los comportamientos defectuosos.

| Caso | Comprobación actual |
| --- | --- |
| AUD-01 | Una petición malformada recibe 400; el mismo servidor hijo responde a `/healthz` después |
| AUD-03 | Al hacer interna una tarea dejan de entregarse sus títulos históricos; los eventos antiguos sin ID tampoco se republican |
| AUD-04 | Se recuperan 501 proyectos, personas y reseñas mediante páginas; se mantiene aislamiento por propietario y se rechaza un offset inválido |
| AUD-05 | Dos altas simultáneas desde 99 proyectos producen un alta y un rechazo; total final 100 |
| AUD-06 | El segundo perfil antiguo recibe 409, conserva el primer cambio y permite guardar tras recuperar la revisión vigente |

[test/hardening.test.js](../../test/hardening.test.js) comprueba categorías de incidentes sin mensajes sensibles, cabeceras públicas/privadas, fallo del catálogo sin oferta predeterminada, limpieza programada con adaptador simulado y recorrido de páginas en cliente.

[test/maintenance.test.js](../../test/maintenance.test.js) verifica que la limpieza respeta registros vigentes; exportación sin notas internas/tokens; rechazo de sobrescrituras y de supresión sin confirmación correcta; copia recuperable y supresión transaccional que conserva otras cuentas y tablas antiguas. Solo se usan datos ficticios en memoria o en directorios temporales propios.

## Privacidad del historial

Los eventos nuevos de tareas guardan `taskId`. Al retirar una tarea se conservan sus eventos para administración y se excluyen del seguimiento compartido. Los eventos antiguos sin un ID fiable no se republican al propietario; permanecen disponibles para el equipo. No es posible deshacer lo que una persona ya haya visto, copiado o descargado.

## Compatibilidad de publicación

La revisión del perfil se guarda dentro del JSON existente, con revisión inicial 0 para registros anteriores: no se altera el esquema de tablas ni se migra una base real. Una pestaña antigua sin este campo deberá recargarse para guardar. Los clientes actuales consultan todas las páginas; un cliente externo que use los listados debe continuar con `nextOffset` hasta recibir null.

La limpieza horaria y los logs propios del Worker están preparados en Wrangler. Están publicados y la API del proveedor confirma el cron horario y la observabilidad sin registros automáticos de invocación. La preparación sigue el [manejador scheduled oficial de Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/); la primera ejecución programada se verifica mediante el evento `chedex_maintenance`; no se fuerza una ejecución manual sin autorización específica.

## Verificaciones externas realizadas

- Docker en Ubuntu de GitHub: imagen construida, usuario UID 1000, SQLite escribible, reinicio y recreación de contenedor conservando el volumen. Resultado correcto en el [run 41634098136](https://github.com/Chess-Society/CHEDEX/actions/runs/41634098136).
- Turso: exportación de solo lectura autorizada, cifrada con AES-256-GCM en directorio local excluido de Git y protegido por ACL. Restauración completa en SQLite en memoria con `quick_check=ok`, descifrado y coincidencia exacta comprobados. No se subió el contenido ni la clave al repositorio.
- Publicación del Worker y dominio completadas; cron `17 * * * *` registrado. Se creó, con permiso explícito, el identificador técnico `chedex-chesssociety.workers.dev`; acceso público del Worker y previews siguen desactivados.
- Doce rutas públicas y privadas sirven 200 con cabeceras verificadas; cuatro API privadas devuelven 401 sin sesión. Cuatro recursos modificados coinciden con los archivos locales por SHA256. `/readyz` confirma acceso real a base de datos.
- OAuth real: PKCE y cookies seguras comprobados; cancelación controlada verificada; autorización real con AndresLi completada en navegador, con carga de panel, catálogo administrativo y cuenta personal. No se crearon proyectos ni reseñas de prueba.
- Eventos de ejecución del Worker recibidos mediante tail y sin excepciones en las solicitudes observadas. Los diagnósticos que se conservan se limitan a categorías controladas, sin copiar solicitudes o credenciales a los documentos.
- Monitor público en `scripts/monitor-production.mjs`: prueba disponibilidad, acceso a base y rechazo anónimo de administración con reintentos. El workflow `monitor.yml` lo ejecuta cada hora desde la rama predeterminada; GitHub marca fallos persistentes y distribuye avisos según las preferencias ya configuradas en la cuenta.

## Límites operativos que se mantienen

La limpieza manual fue rechazada por la revisión automática y no se ejecutó: se mantiene la programación horaria que sí está autorizada. No se ha pretendido probar una supresión sobre datos vigentes.

No se afirma haber verificado el plan PITR, región o retención contractual de Turso mediante su API de administración: las credenciales disponibles permiten acceso a base, no acreditan esa configuración. La copia independiente y su recuperación sí están verificadas. El titular debe mantener sus criterios de conservación y el tratamiento de copias que contengan datos suprimidos.

No se certifica accesibilidad completa, entrega de correos de GitHub ni ausencia de vulnerabilidades desconocidas.

## Criterio de cierre

El índice distingue código corregido, comprobaciones reales de publicación y límites operativos. La versión publicada se verificó además del dry-run. No se ejecutará una supresión real ni una restauración sobre un servicio activo como parte de estas pruebas.
