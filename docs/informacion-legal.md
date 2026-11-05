# Información legal de Chedex

Revisión editorial y funcional: 3 de noviembre de 2026.

## Fuentes y generación

- Textos propios: `server/legal-content.js`. Identidad ya autorizada: `server/legal-config.js`.
- Generación de las cuatro páginas: `npm run legal:build`, mediante `scripts/render-legal.mjs`.
- Presentación y navegación: `public/legal.css` y `public/legal.js`.
- La fecha se define en `legalRevision`; actualizarla cuando cambie materialmente el documento. Las páginas generadas no deben editarse por separado.

Los cuatro documentos de Ventta aportados por el usuario se consultaron como referencia de organización. La redacción de Chedex es propia y responde a su servicio actual. No se incorporaron condiciones de pago, penalizaciones, legislación extranjera, tratamientos publicitarios ni otras funciones de ese proveedor.

Fuentes normativas consultadas:

- [LSSI, artículo 10: identificación y contacto](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758#a10).
- [RGPD: información, legitimación y derechos](https://www.boe.es/doue/2016/119/L00001-00088.pdf).
- [LOPDGDD, incluida la intervención de representantes de menores](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673).
- [Normativa de consumidores y usuarios](https://www.boe.es/buscar/act.php?id=BOE-A-2007-20555).
- [Guía de cookies de la AEPD](https://www.aepd.es/guias/guia-cookies.pdf).

## Inventario técnico interno de almacenamiento

La política pública explica las finalidades, la duración y el control con lenguaje sencillo. Este inventario de mantenimiento no se publica en la web; no contiene valores de cookies ni datos de cuentas.

| Elemento | Finalidad | Duración máxima |
| --- | --- | --- |
| `__Host-chedex_admin` | Sesión verificada con Lichess | 8 horas; retirada al cerrar sesión |
| `__Host-chedex_oauth` | Vincular autorización y navegador | 10 minutos; retirada al procesar el retorno |
| `__Host-chedex_destination` | Recordar el destino durante el acceso | 10 minutos; retirada al procesar el retorno |
| `__Host-chedex_notice` | Aviso de acceso no completado | 2 minutos; puede retirarse antes |
| `chedex_cookie_notice` (almacenamiento local) | Recordar la lectura del aviso, sin asociarla a la cuenta | Hasta 180 días; restablecible desde configuración |
| `chedex-offline-v1` (caché de la aplicación) | Solo `/offline.html`, sin datos privados | Sin caducidad fija; actualización o retirada por aplicación, navegador o borrado del sitio |

Fuentes: `server/api.js`, `public/cookie-ui.js` y `public/sw.js`. Revisión: 3 de noviembre de 2026.

## Criterios y límites

La identificación fiscal y el domicilio existentes se concentran en el aviso legal; las otras páginas enlazan esa identificación sin repetirla. Se mantiene el canal legal y de privacidad, separado de las propuestas comerciales dentro de la cuenta. No se añaden documentos personales, teléfono, registros ni datos de terceros.

Los textos reflejan el acceso por Lichess, nombre requerido y apellidos opcionales, revisión humana de propuestas, reserva tras aceptación, enlace externo e invitación manual. No atribuyen a Chedex pagos en línea, avisos automáticos, analítica, publicidad ni un modo privado sin conexión.

La revisión de contenidos no certifica por sí sola cumplimiento integral. Siguen pendientes de comprobación operativa las condiciones contractuales y garantías de cada proveedor, las ubicaciones efectivas de tratamiento y el procedimiento del titular para conservación, derechos y copias. No se inventan plazos de borrado automático, certificados ni garantías de residencia de datos. Los acuerdos particulares de servicios de pago requieren su información previa específica.

Validación: 17 pruebas relacionadas correctas y sintaxis de 44 módulos. Revisión de vínculos internos, índices, tablas, identificación mínima y correspondencia con el funcionamiento actual.

Publicación comprobada en las cuatro rutas legales de `https://chedex.app`, Worker `3cabc13a-6dbc-4429-9ede-6f3ea06780ec`: respuesta 200, HTML coincidente con el generado y datos identificativos concentrados en aviso legal. Navegación del índice, foco del encabezado y lectura sin desbordamiento horizontal comprobados en navegador; sin errores de pantalla.
