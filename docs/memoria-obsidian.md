# Memoria de Chedex en Obsidian

La conexión es local y usa archivos Markdown de una carpeta específica de la bóveda existente. No añade servicios, plugins comunitarios, API públicas ni acceso a la base de datos de Chedex.

## Organización

- `00-Indice.md`: entrada y selección del bloque adecuado.
- `01-Estado.md`: situación comprobada, con fecha y fuentes.
- `02-Decisiones.md`: decisiones vigentes y motivos.
- `03-Pendientes.md`: trabajo abierto, bloqueos y siguiente acción.
- `04-Arquitectura.md`: mapa breve para localizar código y documentación.

La ruta de la carpeta se guarda exclusivamente en `.chedex-memory.json`, excluido de Git. `AGENTS.md` indica a Codex cómo consultar y mantener esas notas. Los chats que trabajen en este checkout y tengan acceso a los archivos pueden recuperar el contexto siguiendo ese índice. No implica acceso desde otros equipos ni memoria automática en cualquier conversación.

## Conservación de información

Las notas son editables directamente en Obsidian. No hay dos copias que deban sincronizarse ni una tarea que sobrescriba cambios del usuario: la carpeta de Obsidian es la memoria de trabajo. El repositorio conserva sus documentos técnicos; las notas mantienen resúmenes y enlaces a ellos.

Solo se actualizan decisiones, estado y pendientes materiales. No se guardan secretos, datos de clientes, conversaciones completas, copias de bases de datos ni registros crudos. Las notas no se sirven desde la web ni se suben a Git.

## Uso en otro equipo

Abrir la bóveda en ese equipo mediante el mecanismo de sincronización elegido por el titular y crear allí una configuración local que apunte a la carpeta de Chedex. No copiar una ruta personal a la configuración pública del repositorio. Si la bóveda no está disponible, consultar el índice de auditoría y el código del checkout.

## Fundamento

Obsidian almacena y actualiza archivos Markdown de una carpeta local: [documentación de Obsidian](https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data). Codex descubre instrucciones de proyecto mediante `AGENTS.md`: [documentación oficial de OpenAI](https://developers.openai.com/codex/guides/agents-md).
