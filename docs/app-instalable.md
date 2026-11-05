# Chedex como aplicación web

Chedex incluye un manifiesto instalable, iconos propios de 192 y 512 píxeles y apertura en una ventana independiente. El inicio de la aplicación es `/cuenta`; la instalación no inicia sesión ni concede permisos nuevos.

## Instalación en ordenador

En la web, usar «Instalar Chedex» en el pie de página. Cuando el navegador ofrece instalación, el botón abre su confirmación. Si aún no la ofrece, muestra las instrucciones de Chrome/Edge y Safari para Mac. La instalación y sus opciones finales dependen del navegador; no se descarga un ejecutable de Windows.

## Conexión y privacidad

Se necesita Internet para iniciar sesión y consultar o modificar perfiles y proyectos. El service worker solo guarda `/offline.html`, una página genérica sin datos personales. No guarda documentos públicos o privados, respuestas de API, estados OAuth ni recursos dinámicos. No se añade persistencia offline de la cuenta.

Las peticiones de API y OAuth quedan fuera de la interceptación. Los documentos se solicitan siempre por red; si una navegación falla por falta de conexión, se muestra el aviso genérico. Los errores HTTP de servidor no se sustituyen por copias antiguas.

Los cambios del service worker y manifiesto se sirven con revalidación; el navegador comprueba actualizaciones sin reutilizar su caché HTTP para registrar el worker. La limpieza de cachés solo afecta a versiones antiguas del aviso offline de Chedex.

## Fuentes

Publicada el 3 de noviembre de 2026: Worker `313562b1-c78b-40a3-b206-f19f095e1d65`. Validación: 54 pruebas correctas, sintaxis de 41 módulos, empaquetado y siete recursos publicados comprobados por hash. El botón y su ayuda se verificaron en el dominio sin errores de consola. La confirmación final de instalación del sistema operativo corresponde al usuario; no se instaló una aplicación en su ordenador durante las comprobaciones.

`public/manifest.webmanifest`, `public/pwa.js`, `public/sw.js`, `server/pwa-assets.js` y `test/pwa.test.js`. El generador legal conserva las referencias al manifiesto y al instalador.
