# Bloque 05 · Evidencias de las correcciones

Fecha: 3 de noviembre de 2026. Node.js v24.14.0. Los cambios anteriores del usuario se mantienen; no se ha desplegado ni operado sobre datos reales.

## Resultados finales

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `npm test` | 49/49 correctas | 35 pruebas originales, adaptando el contrato de revisión del perfil, y 14 nuevas regresiones/controles |
| `npm run check` | 34 módulos correctos | Todos los `.js`/`.mjs` propios bajo public, server, worker, scripts y test |
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

La limpieza horaria y los logs propios del Worker están preparados en Wrangler. Solo se activarán al publicar. La preparación sigue el [manejador scheduled oficial de Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/); la ejecución real queda pendiente.

## Comprobaciones externas pendientes

- Docker real con volumen, permisos de montaje y reinicio: no hay ejecutable disponible aquí.
- Turso real: copia, recuperación, permisos, política de conservación y procedimiento autorizado de exportación/supresión.
- Cloudflare publicado: OAuth, cabeceras, recepción/retención de logs, alertas, cron y `/readyz`.
- Recorridos visuales y accesibilidad en navegadores y tecnologías de asistencia reales; las pruebas de cliente añadidas no sustituyen esa revisión.
- Secretos históricos y configuraciones externas: no forman parte de las correcciones locales.

## Criterio de cierre

El índice distingue correcciones verificadas localmente de validaciones externas pendientes. Un dry-run no acredita el estado publicado. No se ejecutará una supresión real ni una restauración sobre un servicio activo como parte de estas pruebas.
