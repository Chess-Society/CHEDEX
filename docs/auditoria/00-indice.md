# Auditoría de Chedex

Fecha: 3 de noviembre de 2026. Objeto: estado actual del directorio de trabajo, incluidos cambios todavía sin confirmar en Git.

## Conclusión

La auditoría inicial identificó **1 hallazgo de prioridad alta, 7 de prioridad media y 3 de prioridad baja**. Tras la autorización de corrección se han implementado cambios para los once: siete quedan verificados localmente y cuatro conservan comprobaciones externas pendientes. No se ha publicado ningún cambio. Esto no equivale a una certificación de seguridad.

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
| AUD-02 | Media | Directorio Docker con propietario/permisos y comprobación `/readyz` | Implementado; falta ejecutar Docker real |
| AUD-03 | Media | Historial asociado a tarea; retirada de eventos y protección de eventos antiguos | Corregido; dos pruebas de privacidad |
| AUD-04 | Media | Páginas de 100 en API y recorrido completo en el cliente | Corregido; proyectos, personas y reseñas comprobados |
| AUD-05 | Media | Alta condicional en una sola sentencia SQL | Corregido; solicitudes simultáneas respetan el máximo |
| AUD-06 | Media | Revisión del perfil y rechazo 409 de copia antigua | Corregido; edición cruzada comprobada |
| AUD-07 | Media | Limpieza horaria, herramienta local y procedimiento de datos | Local verificado; faltan copias, conservación y operación remotas |
| AUD-08 | Media | Incidentes sin datos sensibles, readiness y configuración de logs | Local verificado; faltan recepción y alertas en proveedor |
| AUD-09 | Baja | Cabeceras compartidas en Worker y Node | Pruebas correctas; falta verificar respuestas publicadas |
| AUD-10 | Baja | Carga e indisponibilidad del catálogo sin oferta de fábrica | Corregido; comprobado el fallo de API |
| AUD-11 | Baja | Comprobación de todos los módulos y documentación actualizada | Corregido; 34 módulos comprobados |

## Pendiente para el cierre externo

1. Construir y ejecutar Docker con volumen persistente; comprobar escritura y reinicio.
2. Revisar el [procedimiento de mantenimiento](../mantenimiento-datos.md), conservación y copias reales del proveedor antes de operar con datos personales.
3. Publicar únicamente cuando se autorice: la limpieza programada, logs y cabeceras preparadas no están activas todavía en producción.
4. Después de publicar, verificar OAuth, `/readyz`, registros, cabeceras y limpieza; definir alertas y comprobar restauración remota.

## Alcance y límites

Se revisaron API, almacenamiento, Worker, servidor Node, módulos de navegador, rutas, textos legales, configuración de despliegue, contenedor, CI y pruebas existentes. CSS, SVG y HTML se revisaron como recursos y superficie de exposición; no se realizó una auditoría visual exhaustiva ni de accesibilidad con tecnologías de asistencia.

La primera entrega añadió únicamente la auditoría. La segunda, autorizada por el usuario, modifica código, pruebas, configuración local y documentación. No se accedió a bases de producción, paneles de proveedores ni valores de `.env`/`.dev.vars`, ni se publicaron cambios. El empaquetado regeneró `.worker-build`, ya excluido de Git. Los procedimientos de datos se probaron solo sobre archivos temporales ficticios.

No se inspeccionó todo el historial Git, configuración real de TLS/WAF, permisos de cuentas externas, contratos de tratamiento ni copias externas. Los cambios previos del usuario se conservaron.
