## 1. Fix — declarar @page en el CSS de impresión

- [x] 1.1 `app/(private)/sales/_blocks/PrintableTicket.tsx`: agregado `@page { size: ${paperWidth} 3276mm; margin: 0; }` como regla hermana de `@media print` dentro del mismo `<style>`, usando la misma variable `paperWidth` ya definida en línea 17.
- [x] 1.2 Revisado `app/globals.css:89-105`: `.print-area { width: 100% }` es sobreescrito por `.printable-ticket { width: ${paperWidth} }` por orden de cascada (el `<style>` del componente está más abajo en el DOM que las reglas de `globals.css` en `<head>`, misma especificidad, gana el último) — comportamiento preexistente, no afectado por `@page`. `position: absolute; top:0; left:0` no interactúa con `@page { margin: 0 }`. Sin cambios en `globals.css`. Confirmación visual pendiente en 3.3.

## 2. Tests

- [x] 2.1 `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx`: agregado test que verifica `@page { size: 80mm 3276mm; margin: 0; }` con `ticketSettings: null` (default `80mm`).
- [x] 2.2 Mismo archivo: agregado test con `paperWidth: "58mm"` verificando `@page { size: 58mm 3276mm; margin: 0; }`.

## 3. Verificación

- [x] 3.1 `npm test` — 468/468 suites, 3313/3313 tests en verde.
- [x] 3.2 `npm run build` — sin errores de tipos (Node 20.20.2).
- [x] 3.3 Verificado con Playwright real (`tests/e2e/plan-verification.spec.ts`, test "C2 — ticket imprimible declara @page con el ancho de papel configurado"): navega a `/sales/[id]/ticket` autenticado, extrae el `<style>` inyectado en `.printable-ticket` y confirma la regex `@page\s*\{\s*size:\s*(58mm|80mm)\s+3276mm;\s*margin:\s*0;\s*\}` — PASS. No se validó el PDF impreso físicamente (Cmd+P) por no ser automatizable sin intervención humana; la presencia real de la regla CSS en el navegador (no solo en el output de React) es la confirmación disponible por este medio.
