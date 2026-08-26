# document-thermal-print-limitation

## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero | Como cajero, quiero que el ticket impreso en la EPSON TM-T20II salga con el ancho, alineación y corte correctos para poder entregar un comprobante físico legible y completo al cliente | Evita reimprimir tickets recortados/desalineados, agiliza el cierre de venta y da una imagen profesional al negocio | - Given una venta con impresora TM-T20II configurada a 80mm, When el cajero hace clic en "Imprimir Ticket", Then el contenido sale anclado arriba-izquierda de la hoja calculada, sin desplazamiento a centro<br>- Given un ticket con N líneas de producto, When se imprime, Then no se corta ninguna línea de contenido ni queda una hoja en blanco adicional al final<br>- Given `paperWidth: "80mm"` en `TicketSettings`, When se imprime, Then el ancho renderizado coincide con los 80mm reales de la TM-T20II (sin recorte lateral ni sobra de margen que fuerce reescalado del driver)<br>- Given un ticket con pocas líneas y otro con muchas, When se imprime cada uno, Then ambos casos calibran correctamente sin depender de medición DOM ni de timing de `beforeprint`<br>- Given que no hay impresora física TM-T20II disponible en el entorno de desarrollo, When se cierra este change, Then la validación final queda condicionada a confirmación explícita del cliente en hardware real (no se marca "resuelto" solo con revisión de código) | - No se introduce nueva superficie de red/credenciales (se descartó ePOS-Print/ESC-POS) — el cambio es puramente CSS/cálculo de altura en cliente, sin nuevo endpoint ni dato sensible expuesto<br>- El ajuste no altera el contenido fiscal/orden de secciones ya definido en `ticket-print-ui` (folio, RFC, totales) — solo geometría de impresión<br>- Mantiene branch scoping y permisos existentes de `/sales/:id/ticket` (`sales:read`) sin cambios |

## Why

Este change quedó `BLOCKED` esperando información real del cliente sobre la limitación de impresión térmica. Ya la tenemos: la impresora es una EPSON TM-T20II de 80mm conectada por red, y el cliente reporta simultáneamente tres síntomas — contenido centrado (no anclado arriba-izquierda), corte de contenido u hoja en blanco extra al final, y ancho que no coincide con los 80mm reales del rollo.

Los tres síntomas juntos apuntan a la misma causa raíz documentada como "fuera de alcance" en el requirement "Anclaje superior del ticket en impresión térmica" de `ticket-print-ui`: el driver de la impresora no reconoce el tamaño de página custom (`@page` en mm) que calcula `PrintableTicket.tsx` y sustituye una hoja fija, lo que descuadra ancho, altura y anclaje a la vez. El cliente decidió explícitamente NO migrar a impresión directa ESC/POS vía Epson ePOS-Print (que eliminaría esta clase de problema de raíz, pero es una feature nueva de mayor alcance) y prefiere calibrar el CSS/`@page` actual manteniendo `window.print()`.

Esto difiere de los tres intentos previos (`fix-thermal-ticket-page-size`, `fix-ticket-print-size`, `config-ticket-miniprinter`) en que ahora se calibra con el modelo de impresora real conocido (TM-T20II, 80mm, red) y con los tres síntomas reportados a la vez, en vez de ajustar constantes a ciegas sin saber qué impresora ni qué fallaba exactamente.

## What Changes

- Forzar el ancho de contenido impreso a un valor seguro dentro del área imprimible real de la TM-T20II (80mm nominal), evitando que el driver reescale/recentre por desajuste de ancho.
- Reforzar el anclaje superior-izquierdo del `.printable-ticket` con reglas CSS adicionales a prueba de sustitución de tamaño de página por el driver (sin depender solo de `position:absolute` en `.print-area`).
- Recalibrar las constantes de altura estimada (`BASE_HEIGHT_MM`, `CUSTOMER_SECTION_HEIGHT_MM`, `CREDIT_LINE_HEIGHT_MM`, `PER_ITEM_HEIGHT_MM`, `SAFETY_MARGIN_MM`) y añadir un margen de "feed" final explícito para que el auto-cutter de la TM-T20II no corte la última línea ni deje hoja en blanco sobrante.
- Documentar en el propio change (y en la spec) que la verificación final requiere confirmación del cliente en la impresora física — no hay hardware disponible en este entorno de desarrollo para probar.
- Desbloquear este change (quitar el estado `BLOCKED`) y completarlo con `design.md`, `specs/` y `tasks.md`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ticket-print-ui`: se actualiza el requirement "Anclaje superior del ticket en impresión térmica" — el escenario que declaraba el centrado por limitación de driver como fuera de alcance se reemplaza por un ajuste concreto calibrado a la TM-T20II (ancho seguro, refuerzo de anclaje, feed final), sujeto a verificación en hardware real.

## Impact

- `app/(private)/sales/_blocks/PrintableTicket.tsx` — CSS `@page`/`@media print`, constantes de altura, ancho de contenido, feed final.
- `app/globals.css` (bloque `@media print` de `.print-area`, líneas ~89-105) — posible refuerzo de anclaje.
- `openspec/specs/ticket-print-ui/spec.md` — actualización del requirement de anclaje superior.
- Sin cambios de API, base de datos ni permisos.
