# Mantenimiento de datos

## Alcance y permisos

La herramienta `scripts/maintain-data.mjs` trabaja **solo con un archivo SQLite local indicado explícitamente**. No lee `.env`/`.dev.vars`, no usa credenciales de Turso y no actúa sobre producción por sí misma. No ejecutar los ejemplos sobre datos reales sin la autorización correspondiente.

Todas las rutas de salida deben apuntar a directorios existentes y protegidos. Los archivos se crean de forma exclusiva, con modo 0600 donde el sistema lo admite; nunca se sobrescriben. En Windows, comprobar también las ACL del directorio. `backups/` está excluido de Git y del contexto Docker, pero esa exclusión no cifra los archivos.

## Limpieza automática

- Node: limpieza cada hora, con proceso activo; no requiere que nadie vuelva a iniciar sesión.
- Worker: manejador `scheduled`, configurado al minuto 17 de cada hora UTC. Activado en la publicación verificada.
- Se conservan los registros cuya fecha sigue vigente; se eliminan únicamente estados OAuth, sesiones y contadores caducados. No elimina perfiles ni proyectos por antigüedad.

Limpieza manual local, si es necesaria:

```sh
npm run data:maintain -- cleanup --database data/chedex-v2.db
```

## Copia y comprobación

Crear previamente el directorio protegido `backups`. Elegir un nombre nuevo en cada operación:

```sh
npm run data:maintain -- backup --database data/chedex-v2.db --output backups/chedex-AAAA-MM-DD.db
npm run data:maintain -- verify --database backups/chedex-AAAA-MM-DD.db
```

La copia usa `VACUUM INTO`, mantiene el contenido lógico de la base completa y comprueba su integridad abriéndola en otra conexión. Ese mecanismo está documentado por [SQLite](https://www.sqlite.org/lang_vacuum.html). Puede incluir tablas antiguas y datos personales: requiere protección y un plazo de conservación propio.

Una prueba de recuperación debe usar una ruta nueva y aislada, abrir la copia con SQLite, comprobar cuentas/proyectos esperados y ejecutar los flujos básicos sin acceso a producción. La batería automatizada hace esa recuperación con datos ficticios y verifica que una copia anterior a una supresión conserva sus registros.

Para restaurar un servicio real, detenerlo antes, conservar por separado la base actual y sustituirla con la copia verificada mediante un procedimiento autorizado. No copiar encima de una base activa ni mezclar una base restaurada con archivos WAL/SHM de otra versión. La herramienta deliberadamente no hace esa sustitución.

## Solicitudes de exportación

1. Verificar la identidad del solicitante y el alcance.
2. Obtener, si procede, una copia autorizada y detener modificaciones durante la operación operativa.
3. Exportar desde la copia local protegida:

```sh
npm run data:maintain -- export-user --database data/chedex-v2.db --user alice --output backups/alice-export.json
```

`alice` es un ejemplo: sustituir por el ID verificado. Se incluyen perfil, proyectos compartidos y reseñas de esa cuenta; se excluyen tokens de sesión y notas internas. Revisar el resultado y otros canales, como correo, antes de entregarlo por un medio adecuado. La herramienta no decide por sí misma el alcance jurídico de un derecho de acceso ni envía el archivo.

## Solicitudes de supresión

Verificar identidad, autorización, obligaciones de conservación y posibles referencias en textos libres o correo. Detener la aplicación para evitar nuevas sesiones o escrituras durante la operación. La herramienta requiere el ID repetido y una copia nueva anterior al borrado:

```sh
npm run data:maintain -- delete-user --database data/chedex-v2.db --user alice --confirm alice --backup backups/antes-supresion-alice.db
```

En una transacción elimina el perfil de esa cuenta, sus sesiones, proyectos, reseñas asociadas y contadores por usuario. No altera tablas antiguas, otras cuentas ni textos libres de proyectos ajenos. Revisar esas otras ubicaciones cuando la solicitud lo requiera.

Esto es una eliminación lógica en SQLite. No garantiza borrado forense de páginas, WAL o copias previas. La copia obligatoria contiene datos anteriores a la supresión: definir su acceso restringido, caducidad y el tratamiento de las supresiones si se restaura. No conservarla indefinidamente por comodidad.

## Conservación y proveedor remoto

La automatización de caducados no establece un plazo general para los proyectos. Revisar periódicamente los registros archivados y conservarlos solo conforme al criterio acordado y a las obligaciones aplicables. No se introduce un borrado automático de proyectos ni un plazo legal inventado.

Para Turso quedan pendientes de verificar las capacidades y configuración reales de copias, recuperación, región y permisos. Esta entrega no ejecuta exportaciones ni supresiones remotas. Antes de operar allí, preparar una copia verificable y aprobar el procedimiento específico del proveedor; no reutilizar esta herramienta apuntándola a una URL.

## Docker y disponibilidad

La imagen prepara `/app/data` para el usuario `node`. Montar un volumen persistente en esa ruta y verificar que el montaje mantiene permisos compatibles; la aplicación no debe publicar ese directorio como recurso estático.

El contenedor comprueba `/readyz`, que incluye acceso al almacenamiento. `/healthz` solo indica que el proceso HTTP responde. Para exposición pública detrás de un proxy HTTPS, configurar `NODE_ENV=production` y `APP_URL` con el origen HTTPS público y registrar el retorno OAuth correspondiente. En desarrollo se mantiene el origen local para no heredar por accidente un origen de producción de `.env`.

## Diagnóstico sin datos personales

Los fallos inesperados generan un identificador de incidente, componente y categoría controlada. No se registran cuerpos, URLs, cookies, mensajes de error sin filtrar ni credenciales. Wrangler habilita registros propios y deshabilita los registros automáticos de invocación. La configuración está publicada y se ha comprobado la recepción de eventos de ejecución. Configurar y verificar acceso, retención y alertas operativas en el proveedor antes de dar por cubierto un monitor de producción.

## Copia remota y publicación verificadas

El 3 de noviembre de 2026 se autorizó expresamente una copia completa de solo lectura de Turso. `scripts/backup-remote.mjs` usa el endpoint oficial `/dump`, comprueba su restauración en SQLite en memoria y guarda únicamente un sobre AES-256-GCM y una clave en un directorio propio de `backups/`, con ACL privada en Windows. Ambos archivos son necesarios para recuperar la copia; mantenerlos protegidos y trasladar la clave a custodia separada cuando se establezca el procedimiento de recuperación. No se han enviado a GitHub ni Cloudflare.

Para nuevas copias, obtener autorización y ejecutar con las credenciales existentes sin imprimirlas:

```sh
node --env-file=.dev.vars scripts/backup-remote.mjs
```

Para recuperar ese formato, leer `restore.key`, decodificar `iv`, `tag` y `data` del sobre, descifrar con AES-256-GCM y restaurar el SQL únicamente en un destino aislado autorizado. No sustituir una base activa. La ejecución inicial verificó tanto el SQL restaurado como la coincidencia exacta tras descifrar los archivos guardados.

Cloudflare ya tiene activos el cron horario y la observabilidad. El identificador técnico `chedex-chesssociety.workers.dev` existe como requisito del proveedor, pero el Worker conserva `workers_dev=false` y previews desactivadas. La web pública sigue exclusivamente en su dominio configurado.

El monitor horario de GitHub solo hace peticiones públicas de lectura y no descarga datos personales. Criterios de incidencia: fallo de portada o `/readyz`, pérdida de HSTS/nosniff o administración accesible sin sesión; reintenta dos veces antes de marcar error. Revisar el aviso de GitHub Actions y el identificador de incidente si existe; no incluir cookies ni cuerpos privados al diagnosticar. Los avisos dependen de las preferencias de notificación de GitHub existentes, que no se han cambiado.
