# Bloque 04 · Cómo consultar y conservar el contexto

## Separación de conceptos

| Capa | Evidencia disponible | Límite |
| --- | --- | --- |
| Instrucciones del usuario | Texto AGENTS.md incluido en este chat | No se encontró un AGENTS.md físico en los archivos de proyecto buscados; no se presupone que ese texto se cargue en otro chat |
| Contexto de trabajo | Mensajes, instrucciones y resultados de herramientas de esta sesión | No equivale a recordar indefinidamente todo el repositorio o todos los chats |
| Archivos persistentes del proyecto | Código, README y estos bloques de auditoría | Persisten como archivos; otro chat debe encontrarlos y leer lo pertinente |
| Base de datos de la aplicación | Perfiles, proyectos, sesiones y reseñas | Es memoria funcional de Chedex, no memoria del asistente; no se consultó producción |
| Memoria interna o de cuenta de Codex | No auditada desde esta sesión | No se afirma que esté activada, qué conserve ni qué otros chats incluya |

La documentación oficial distingue herramientas, contexto de ejecución y archivos de contexto reutilizables. Mantener apuntes por fase y solo cuando sean materiales está descrito en [OpenAI Docs: flujos de desarrollo con Codex](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex). Estos documentos aplican esa idea al proyecto; no demuestran la configuración interna de esta cuenta.

## Protocolo por bloques

1. **Entrada:** leer `00-indice.md`, la petición actual y las instrucciones que estén vigentes en la sesión.
2. **Selección:** abrir únicamente el bloque relacionado. Autenticación → seguridad; perfiles y conservación → datos; API/interfaz → código; continuidad del trabajo → este bloque.
3. **Evidencia:** buscar el símbolo o ruta de la tabla de fuentes y leer el fragmento actual. El código vigente prevalece sobre una descripción antigua de su comportamiento.
4. **Validación:** consultar el bloque 05 y ejecutar solo las comprobaciones afectadas. No dar por ejecutada hoy una prueba citada en una auditoría anterior.
5. **Actualización:** modificar la explicación canónica del bloque y su estado en el índice. Evitar duplicar el detalle en README, notas y varios informes.

La estructura ya está distribuida y enlazada. No se ha instalado un cargador automático ni se ha cambiado la configuración del asistente.

## Qué conservar entre sesiones

- Decisiones de arquitectura que sigan vigentes: Worker público, SQLite local aislado, Turso remoto y permisos por ID verificado.
- Restricciones: conservar tablas anteriores, no tocar secretos ni producción sin autorización y no inventar contenido comercial.
- Hallazgos con ID, evidencia, prioridad y estado de corrección.
- Una decisión nueva solo cuando afecte al comportamiento o evite repetir trabajo sustancial.

No conservar credenciales, cookies, valores de entorno, datos de clientes, conversaciones completas ni salidas extensas. No copiar datos personales publicados a notas de trabajo cuando basta con referenciar su fuente.

## Qué no asumir

- Que una comprobación de noviembre de 2026 siga vigente después de cambiar código o dependencias.
- Que haber leído un archivo implique que se volverá a cargar automáticamente en un chat nuevo.
- Que una memoria resumida contenga todos los detalles o sustituya la consulta del código.
- Que el README certifique lo que está desplegado. La afirmación existente sobre un acceso real anterior no se volvió a verificar.

## Observación sobre esta auditoría

La información se obtuvo por áreas y búsquedas dirigidas, sin abrir valores de los secretos locales ni toda la base de datos. Algunas lecturas agrupadas generaron salidas demasiado grandes y truncadas; se recuperaron después los fragmentos necesarios. Para futuras tareas, conviene limitar desde el inicio cada lectura a un bloque, símbolos y líneas relevantes. No se trató una salida truncada como evidencia de una revisión completa.

Estos archivos son una referencia verificable para retomar el trabajo, no una promesa de memoria automática o ilimitada.
