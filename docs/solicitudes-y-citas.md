# Solicitudes privadas y videollamadas

Implementación: 3 de noviembre de 2026.

- La landing dirige a la cuenta privada con Lichess; no prepara consultas por correo.
- La solicitud pide nombre y apellidos si es posible. El nombre es obligatorio; los apellidos son opcionales. Son datos declarados por la persona, sin verificación documental.
- El envío se confirma en el historial y queda **Pendiente de revisión**. Administración puede pasar a **En evaluación**, **Aceptada** o **Denegada**, con motivo opcional visible para la persona. Las notas internas siguen separadas.
- La decisión se consulta en **Solicitudes y proyectos → Solicitud y cita**. Es independiente del estado de las tareas y de la colaboración posterior. Aceptar permite una primera conversación, sin formalizar un servicio.
- En el mismo apartado, **Agenda de videollamadas** permite añadir fechas y horas concretas, de 30, 45 o 60 minutos, o esconder y volver a habilitar huecos libres. No se ofrecen horarios solapados. La agenda es común a las solicitudes aceptadas.
- La persona ve un calendario con días y horas disponibles únicamente al aceptar su solicitud. Al reservar facilita el correo para la invitación. Las fechas se almacenan como instantes UTC y se muestran en la zona horaria indicada en cada dispositivo.
- Hay como máximo una cita reservada por solicitud y por hueco. La comprobación y escritura son atómicas, con índices únicos adicionales. Revisión, aceptación, archivo, disponibilidad y fecha futura se contrastan al reservar.
- Administración añade un enlace externo HTTPS a la cita. Se muestra de forma privada en la cuenta; Chedex no carga ni incorpora el servicio externo. El correo de invitación se prepara desde administración y se **envía manualmente** con su aplicación de correo. No hay proveedor de envío automático configurado.
- Ambas partes pueden cancelar antes del inicio y elegir otro horario. La cancelación conserva el registro y libera el hueco. Para denegar o archivar una solicitud con cita futura hay que cancelar primero. Las citas pasadas no impiden archivar.
- El correo **chedexapp@proton.me** atiende incidencias de acceso o formulario, además de cuestiones legales y privacidad. La landing, el acceso y el formulario ofrecen esa ayuda con una dirección copiable; el recorrido normal de propuestas sigue dentro de Chedex.

## Compatibilidad y datos

El esquema añade `chedex_v2_slots` y `chedex_v2_appointments`. No borra tablas ni registros anteriores. Las solicitudes nuevas guardan `requestStatus`, `applicant` y `decisionReason` en el contenido existente. Los proyectos anteriores sin decisión se interpretan como pendientes si estaban «Por hablar» y aceptados si ya tenían seguimiento acordado; al guardar se conserva esa interpretación, sin deducir una nueva decisión de posteriores cambios de tareas.

La exportación y supresión locales incluyen los datos de citas de esa cuenta. El almacenamiento offline de la app sigue limitado al aviso genérico: no almacena solicitudes, reservas, correos ni enlaces privados.

## Validación

3 de noviembre de 2026: 62 pruebas correctas, sintaxis de 44 módulos y preparación del despliegue correctas. Incluye aislamiento entre cuentas, protección de escrituras, revisión concurrente, reservas simultáneas, cancelación, enlaces externos y exportación/supresión con datos ficticios. No se envían correos ni se crean reservas de prueba en producción.

Publicado en `https://chedex.app`, versión de Worker `375ff85a-9ccb-4cc4-a2c3-4e989223f647`. Agenda administrativa y paso de la landing al formulario privado comprobados en navegador, sin errores de pantalla. Archivos publicados coincidentes con los locales y nuevas rutas privadas devuelven 401 sin sesión; disponibilidad de la base correcta.


## Nuevo recorrido publicado el 2026-11-04

Sustituye la gestión de proyectos en la interfaz por consulta por correo y seguimiento de fases. El formulario sigue siendo el primer paso: nombre, correo de respuesta, modalidad, objetivo y disponibilidad con zona horaria para una llamada inicial de 15 minutos. Genera una plantilla específica por modalidad, asunto y destinatario `chedexapp@proton.me`; permite copiar cada campo o abrir el gestor habitual. No hay proveedor nuevo ni envío automático.

Preparar el correo no crea una solicitud ni acredita un envío. Después de enviarlo manualmente, la persona puede indicar que lo ha enviado y guardar su seguimiento. La fase inicial es **Por confirmar**; el administrador comprueba el buzón antes de marcar **Recibida**. No se envió ningún correo durante las pruebas.

La cuenta muestra solo fases y aclaraciones: Por confirmar → Recibida → Llamada de 15 min → Valoración → Propuesta acordada → En marcha → Completado; puede terminar en No seguimos. Los avances no saltan fases. La fase de llamada no acredita asistencia ni reserva: horario y enlace se acuerdan por correo. Preparar o guardar la consulta no contrata trabajo.

Administración conserva un formulario para actualizar fase y aclaración visible. Se retiran del recorrido los tableros, conversación, entregas, agenda nueva y delegación; no se borran tablas, permisos ni datos históricos. Las API anteriores se conservan por compatibilidad; una consulta creada con `intakeMode: email-template` rechaza comentarios. Las citas anteriores siguen disponibles para gestión explícita cuando existen; no se cancelan automáticamente. Las cuentas del equipo se dirigen a su cuenta personal al abrir el panel.

Validación del 2026-11-04: 84 pruebas comprobadas (83 pasaron en la ejecución general; la prueba de conexión local bloqueada por el entorno pasó al repetir el archivo de auditoría con acceso a red local), sintaxis de 52 módulos y paquete Worker correctos. Recorrido real de interfaz con datos ficticios en memoria: preparar correo, copiar asunto, indicar envío manual, guardar seguimiento pendiente y confirmar recepción desde administración. No se enviaron correos ni se modificaron datos de producción. Páginas de servicios y textos legales adaptados al recorrido. Vista previa local utilizada en puerto 4184.

Publicación autorizada el 2026-11-04 en https://chedex.app, versión Worker `9a3c2293-2ccb-4a46-af0a-8074e2a1874d`. Tras propagarse, los 14 recursos actualizados coinciden con el checkout; disponibilidad y base de datos correctas. Las API de cuenta y proyectos rechazan acceso anónimo. No se enviaron correos ni se crearon, modificaron o borraron registros reales durante la verificación.
