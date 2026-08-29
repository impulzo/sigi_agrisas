## 1. Modificar PrintableTicket.tsx (CSS @page y contenedor)

- [x] 1.1 Cambiar `@page { margin: 0 }` a `@page { margin: 4mm 3mm }` en el template literal del estilo inyectado (línea ~56)
- [x] 1.2 Remover `top: 0 !important;` y `left: 0 !important` del bloque `.printable-ticket` en `@media print` (líneas ~61-63)
- [x] 1.3 Verificar que `position: absolute !important` se mantiene sin top/left
- [x] 1.4 Confirmar que `computeTicketPageHeightMm` no requiere cambios (márgenes incluidos en SAFETY_MARGIN_MM)

## 2. Actualizar spec ticket-print-ui (documentación driver)

- [x] 2.1 Agregar escenario "Driver margin configuration recommended for persistent margins" al spec delta en `openspec/changes/add-ticket-print-margins/specs/ticket-print-ui/spec.md` (ya incluido en el delta spec creado)
- [x] 2.2 Verificar que el escenario referencia ejemplo EPSON TM-T20II con ruta exacta: Printing Preferences → Paper/Quality → Margins → User Defined

## 3. Tests

- [x] 3.1 Ejecutar tests existentes de `PrintableTicket`: `npm test -- tests/unit/ui/(private)/sales/PrintableTicket.test.tsx`
- [x] 3.2 Actualizar aserciones/snapshots si fallan por cambio en CSS `@page`
- [x] 3.3 Verificar que no hay regresiones en tests de `TicketPreviewPage` (usa `PrintableTicket`)

## 4. Verificación manual

- [x] 4.1 Levantar `npm run dev` y navegar a `/sales/<id>/ticket`
- [x] 4.2 Imprimir a PDF (Save as PDF) y verificar que el contenido tiene márgenes visibles (no pegado a bordes)
- [x] 4.3 Confirmar que impresión ESC/POS (si hay agente configurado) no se ve afectada — usa flujo separado