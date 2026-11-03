# Auditoría de Chedex

Fecha: 3 de noviembre de 2026. Objeto: estado actual del directorio de trabajo, incluidos cambios todavía sin confirmar en Git.

## Conclusión

La auditoría inicial identificó **1 hallazgo de prioridad alta, 7 de prioridad media y 3 de prioridad baja**. Se han implementado y publicado las correcciones. Docker está verificado en GitHub Actions, existe una copia cifrada recuperable de producción y se han comprobado dominio, cabeceras, acceso real y registros. La limpieza horaria está activada; no se ha ejecutado una limpieza manual adicional. Esto no equivale a una certificación de seguridad.

La caída del servidor Node está corregida: la prueba envía una petición malformada, obtiene 400 y comprueba que después sigue respondiendo. La batería completa tiene 49 pruebas correctas.

## Bloques y orden de lectura

| Bloque | Contenido | Cuándo consultarlo |
| --- | --- | --- |
| [01 · Código y funcionamiento](01-codigo.md) | Arquitectura, fallos funcionales, concurrencia y mantenibilidad | Cambios en API, panel o despliegue |
| [02 · Seguridad](02-seguridad.md) | Amenazas, controles, prioridades y límites de revisión | Acceso, exposición, incidentes y publicación |
| [03 · Datos y conservación](03-datos.md) | Qué se recoge, dónde se almacena, quién lo recibe y cómo se recupera | Privacidad, almacenamiento y solicitudes de información |
| [04 · Contexto y memoria](04-contexto-memoria.md) | Fuentes de verdad, consulta por bloques y límites de lo que recuerda el asistente | Retomar trabajo sin reconstruir todo el proyecto |
| [05 · Evidencias y comprobaciones](05-validacion.md) | Resultados, reproducciones y comprobaciones pendientes | Verificar o repetir la auditoría |

## Registro único de hallazgos

Los bloques 01–03 conservan el diagnóstico inicial y sus referencias de línea originales. Este registro mantiene el estado actual; el bloque 05 recoge la validación de las correcciones.

| ID | Prioridad inicial | Corrección | Estado actual |
| --- | --- | --- | --- |
| AUD-01 | Alta | Validación del destino HTTP y manejo global de errores | Corregido; prueba real de petición y supervivencia |
| AUD-02 | Media | Directorio Docker con propietario/permisos y comprobación `/readyz` | Verificado en GitHub: escritura, usuario sin privilegios, reinicio y volumen |
| AUD-03 | Media | Historial asociado a tarea; retirada de eventos y protección de eventos antiguos | Corregido; dos pruebas de privacidad |
| AUD-04 | Media | Páginas de 100 en API y recorrido completo en el cliente | Corregido; proyectos, personas y reseñas comprobados |
| AUD-05 | Media | Alta condicional en una sola sentencia SQL | Corregido; solicitudes simultáneas respetan el máximo |
| AUD-06 | Media | Revisión del perfil y rechazo 409 de copia antigua | Corregido; edición cruzada comprobada |
| AUD-07 | Media | Limpieza horaria, herramienta local y procedimiento de datos | Copia remota cifrada restaurada en memoria; cron registrado; operación manual no ejecutada |
| AUD-08 | Media | Incidentes sin datos sensibles, readiness y configuración de logs | Recepción de eventos de producción comprobada; monitor de disponibilidad en GitHub |
| AUD-09 | Baja | Cabeceras compartidas en Worker y Node | Verificado en las respuestas publicadas de doce rutas |
| AUD-10 | Baja | Carga e indisponibilidad del catálogo sin oferta de fábrica | Corregido; comprobado el fallo de API |
| AUD-11 | Baja | Comprobación de todos los módulos y documentación actualizada | Corregido; 37 módulos comprobados |

## Publicación y operación

- Sitio publicado: https://chedex.app. Versión del Worker: `71c833ff-fc94-4533-8f22-0e6e5d23041c`.
- Referencia anterior para reversión: `8d84f430-1d76-4f62-8b15-06ef0753ed44`.
- [CI con Docker verificado](https://github.com/Chess-Society/CHEDEX/actions/runs/41634098136).
- Cuenta administrativa real AndresLi: autorización Lichess completada; panel, catálogo y área personal cargan sin modificar contenido.
- Limpieza configurada a los 17 minutos de cada hora UTC. La configuración se comprobó en la API del proveedor. La primera ejecución programada posterior a la publicación queda prevista para el siguiente minuto 17; no se ha observado todavía y deberá comprobarse en los registros. no se adelanta mediante una supresión manual.
- La política de conservación del negocio y el alcance contractual de proveedores requieren decisiones del titular; no se inventan plazos ni se certifica cumplimiento legal.

## Alcance y límites

Se revisaron API, almacenamiento, Worker, servidor Node, módulos de navegador, rutas, textos legales, configuración de despliegue, contenedor, CI y pruebas existentes. CSS, SVG y HTML se revisaron como recursos y superficie de exposición; no se realizó una auditoría visual exhaustiva ni de accesibilidad con tecnologías de asistencia.

La primera entrega añadió únicamente la auditoría. La segunda, autorizada por el usuario, modifica código, pruebas, configuración local y documentación. Durante las correcciones iniciales no se accedió a producción. En la publicación posterior, expresamente autorizada, se leyeron las credenciales existentes en memoria sin mostrarlas, se obtuvo una copia remota cifrada autorizada y se publicó el Worker. No se modificaron perfiles, proyectos, mensajes ni reseñas reales. El empaquetado regeneró `.worker-build`, ya excluido de Git. La supresión se probó únicamente con archivos ficticios; la copia real se restauró en memoria y superó integridad. La sesión real de acceso creó sus registros técnicos normales de OAuth/sesión.

No se inspeccionó todo el historial Git, configuración real de TLS/WAF, permisos de cuentas externas, contratos de tratamiento ni copias externas. Los cambios previos del usuario se conservaron.
