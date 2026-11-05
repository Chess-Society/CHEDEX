# Soporte y comprobación del contacto

Revisión: 3 de noviembre de 2026.

## Hechos comprobados

- Se recibió un aviso de que un botón del formulario no abría el gestor de correo. El aviso no permite determinar fecha del intento, navegador ni versión utilizada. No se ha establecido la causa del incidente comunicado.
- En la versión pública comprobada antes de este cambio, el acceso «Cuéntanos tu idea» llevó a la solicitud privada. Con la sesión disponible en el navegador, abrió el formulario sin errores de pantalla. Ese acceso no tiene como función abrir el correo.
- El acceso denominado «También puedes contactar sin registrarte» llevaba a `/contacto`, cuyo siguiente paso exige Lichess. Se retiró esa indicación contradictoria y se añadió un canal explícito de ayuda.
- El README conservaba una descripción obsoleta del formulario por correo. Se actualizó para describir las solicitudes privadas actuales.

## Comportamiento publicado

El canal de ayuda ante problemas con el formulario o el acceso es **chedexapp@proton.me**, también utilizado para el contacto legal y de privacidad. La dirección se muestra en HTML estático en la landing, antes del acceso privado y dentro del diálogo de solicitud; es visible aunque falle el script y se puede copiar sin abrir un gestor de correo.

Los accesos de contacto de la portada y las tarjetas conservan enlaces normales a la cuenta. JavaScript añade la apertura de la solicitud y la modalidad, pero no es necesario para esa navegación básica. La solicitud privada sigue necesitando JavaScript y una sesión de Lichess.

No se ha enviado ningún mensaje ni se ha comprobado la recepción del buzón. Para reproducir el incidente original hacen falta el navegador, la fecha y los pasos exactos de la persona afectada. No se atribuye el fallo a su dispositivo ni a una versión anterior sin pruebas.

Validación del cambio: 14 pruebas relacionadas correctas y sintaxis de 45 módulos. Publicado en el Worker `9bc6ee7a-85cf-4b95-950d-d01777f3f82a`; seis páginas publicadas coinciden con las locales y muestran el correo corregido. Recorrido desde la landing al formulario y dirección de ayuda dentro de la solicitud comprobados en navegador, sin errores de pantalla y sin enviar una propuesta.
