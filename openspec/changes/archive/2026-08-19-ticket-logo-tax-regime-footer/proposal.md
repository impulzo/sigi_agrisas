## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Encargado de configuración (`settings:write`) | Como encargado de configuración, quiero que el logo del ticket se imprima 40% más grande sin desplazar el resto del contenido para que sea más legible al cliente sin romper el formato del ticket | - Logo impreso pasa de `75px × 105px` a `105px × 147px` (+40% en ambas dimensiones)<br>- El margen inferior del logo (`margin: 0 auto 2.4px`) y el resto del layout (información del negocio, folio, etc.) no cambian de posición relativa<br>- Aplica igual en la vista previa (`TicketPreviewPage`) y en el ticket impreso (`PrintableTicket`)<br>- El tamaño no depende de `paperWidth` (58mm/80mm) — hoy tampoco depende, se mantiene así | - Sin impacto de seguridad — cambio puramente visual |
| 2 | Encargado de configuración (`settings:write`) | Como encargado de configuración, quiero que el ticket muestre la descripción completa del régimen fiscal en vez de sólo el código para que el cliente vea la leyenda fiscal completa como exige la práctica común de negocios en México | - El campo `businessTaxRegime` de settings pasa de input libre a un combobox contra el catálogo SAT (`SatCatalogCombobox catalog="regimen-fiscal"`, ya usado en clientes)<br>- Se persiste `"<code> — <description>"` (mismo formato que ya trae el seed, ej. `"612 Personas Físicas con Actividad Empresarial"`)<br>- El ticket impreso y la vista previa muestran ese valor completo tal cual está guardado, sin truncar<br>- Configuraciones existentes con texto libre siguen imprimiéndose sin romper (compatibilidad hacia atrás, sin migración de datos forzosa) | - Sólo `settings:write` edita el régimen fiscal en `/settings`; lectura vía `settings:read` sin cambios |
| 3 | Encargado de configuración (`settings:write`) | Como encargado de configuración, quiero que la vista previa del ticket muestre exactamente el mensaje final configurado en settings, no un texto de ejemplo hardcodeado, para poder verificar antes de imprimir cómo se verá realmente | - `TicketPreviewPage` deja de usar el fallback hardcodeado `"¡Gracias por su compra! / Agricultura Sana & Sustentable."` cuando `footerText` está vacío<br>- La vista previa muestra `footerText`/`legendText` exactamente como en `PrintableTicket` (mismo comportamiento: si están vacíos, no se renderiza nada, igual que hoy en el ticket impreso)<br>- Guardar un mensaje distinto en `/settings` y volver a abrir la vista previa refleja el cambio sin caché obsoleta | - Sin impacto de seguridad — cambio de fidelidad de UI |

Nota: se mantienen como 3 historias independientes (logo, régimen fiscal, mensaje final) porque tocan piezas de UI distintas (dimensiones CSS, tipo de input/catálogo, lógica de fallback) y son verificables por separado.

## Why

El ticket impreso y su vista previa arrastran tres desajustes menores pero visibles al cliente final: (1) el logo se imprime a un tamaño fijo de `75×105px` que el negocio considera pequeño y quiere agrandar sin romper el resto del layout; (2) `businessTaxRegime` es hoy texto libre (`VarChar(120)`) que casi siempre se captura como sólo el código de 3 dígitos, cuando la práctica fiscal esperada es mostrar la descripción completa del régimen; (3) `TicketPreviewPage.tsx` tiene un fallback hardcodeado (`"¡Gracias por su compra! / Agricultura Sana & Sustentable."`) que reemplaza silenciosamente el `footerText` vacío configurado por el usuario — la vista previa miente sobre lo que realmente se va a imprimir cuando el footer está vacío, divergiendo de `PrintableTicket` (que simplemente omite el párrafo).

## What Changes

- El logo del ticket (impreso y vista previa) crece de `75×105px` a `105×147px` (+40%), sin tocar márgenes ni el resto del layout.
- `businessTaxRegime` en `/settings` pasa de `<input type="text">` a `SatCatalogCombobox catalog="regimen-fiscal"`, persistiendo `"<code> — <description>"`.
- `TicketPreviewPage.tsx` elimina el fallback hardcodeado de `footerText` — se alinea con el comportamiento ya correcto de `PrintableTicket` (omitir el párrafo si está vacío).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `ticket-print-ui`: `Print ticket action on the ticket view` — logo a `105×147px`.
- `sales-ticket-preview-ui`: `Ticket preview page` — logo a `105×147px`, sin fallback hardcodeado de `footerText`.
- `settings-ui`: `Ticket settings form` — `businessTaxRegime` como combobox SAT.

## Impact

- **Sin migración Prisma**: `TicketSettings.businessTaxRegime` ya es `VarChar(120)`, suficiente para `"<code> — <description>"`.
- **Backend**: sin cambios — `settings-api` ya acepta `businessTaxRegime: string | null` libre; el combobox sólo cambia cómo la UI construye ese string.
- **Frontend**: `app/(private)/sales/_blocks/PrintableTicket.tsx`, `app/(private)/sales/[id]/ticket/_blocks/TicketPreviewPage.tsx`, `app/(private)/settings/_blocks/TicketSettingsForm.tsx`.
- **Sin impacto** en el envío de ticket por correo (`SendSaleTicketEmailUseCase`) — ese flujo no renderiza logo ni régimen fiscal hoy, fuera de alcance de este change.
