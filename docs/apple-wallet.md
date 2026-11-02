# Apple Wallet

Apple Wallet es la integración prioritaria. Google Wallet queda para una fase posterior y no ocupa espacio en la pantalla principal.

## Qué está implementado

`GET /api/wallet/apple` requiere sesión y perfil público. Genera un `.pkpass` con firma PKCS#7, manifiesto e iconos de las tres resoluciones, con `application/vnd.apple.pkpass`. Solo incluye los campos públicos esenciales: nombre, identificador, club y Elo/título cuando sean visibles. El historial y los datos de contacto no se incluyen. Títulos y Elo se indican como declarados.

La generación comprueba que certificado, clave, Team ID y Pass Type ID coincidan, que el certificado tenga la firma del WWDR configurado y que no hayan caducado. Sin configuración válida o sin HTTPS, la interfaz muestra «Próximamente» y no entrega pases ficticios.

## Qué debe aportar el titular

1. Membresía Apple Developer con capacidad para crear pases.
2. Un Pass Type ID registrado, por ejemplo `pass.app.chedex.card`.
3. Su Team ID.
4. Certificado de firma de ese Pass Type ID en PEM y su clave privada correspondiente.
5. Certificado intermedio WWDR que haya emitido el certificado de firma.

No envíes claves privadas en el chat. En local, utiliza la carpeta ignorada `certs/` y las rutas `APPLE_WWDR_CERT_PATH`, `APPLE_SIGNER_CERT_PATH`, `APPLE_SIGNER_KEY_PATH`. En Cloudflare, configura los PEM como **secrets** `APPLE_WWDR_CERT`, `APPLE_SIGNER_CERT`, `APPLE_SIGNER_KEY`; si la clave está cifrada, configura `APPLE_SIGNER_KEY_PASSPHRASE`. Los identificadores son `APPLE_PASS_TYPE_ID` y `APPLE_TEAM_ID`.

## Límites de esta primera integración

El pase tiene un número de serie estable por cuenta. Volver a añadirlo actualiza la instantánea. No se han implementado registro de dispositivos, APNs ni actualizaciones automáticas. Así se indica al descargar y en el reverso del pase.

Pasar el perfil a privado o eliminarlo impide consultar el historial desde el QR. No borra una tarjeta que ya esté instalada en el dispositivo; esto también se comunica al usuario. Cambiar el enlace invalida los QR antiguos y exige descargar un pase nuevo.

Las pruebas generan certificados sintéticos y comprueban firma/contenedor, manifiesto, campos públicos y rechazo de certificados incorrectos. No equivalen a una prueba de instalación en un iPhone. Antes de habilitarlo para usuarios, debe probarse con certificados reales emitidos por Apple y un dispositivo compatible.

Referencia: [Apple: diseño y creación de pases](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Creating.html).
