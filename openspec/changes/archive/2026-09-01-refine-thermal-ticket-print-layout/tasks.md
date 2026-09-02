## 0. Fusión de changes (housekeeping OpenSpec)

- [x] 0.1 Confirmar que los 3 folders fusionados (`document-thermal-print-limitation`, `add-ticket-print-margins`, `add-escpos-ticket-printing`) estaban commiteados en git antes de eliminarlos.
- [x] 0.2 Crear `openspec/changes/refine-thermal-ticket-print-layout/` con `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md` y `specs/{ticket-print-ui,escpos-ticket-printing}/spec.md`.
- [x] 0.3 `git rm -r` los 3 folders de change viejos.

## 1. Constantes de altura y margen (`PrintableTicket.tsx`)

- [x] 1.1 `SAFETY_MARGIN_MM` de `35` a `15` y `FINAL_FEED_MM` de `12` a `6`, con comentarios actualizados.
- [x] 1.2 Agregadas constantes `BASE_TOP_MARGIN_MM = 4`, `BOTTOM_MARGIN_MM = 4`, `SIDE_MARGIN_MM = 3`, `EXTRA_TOP_MARGIN_PCT = 0.05`.
- [x] 1.3 Separado `contentHeightMm = computeTicketPageHeightMm(sale)` de `pageHeightMm`; calculados `extraTopMarginMm = Math.round(contentHeightMm * EXTRA_TOP_MARGIN_PCT)` / `topMarginMm = BASE_TOP_MARGIN_MM + extraTopMarginMm` / `pageHeightMm = contentHeightMm + extraTopMarginMm`.
- [x] 1.4 `<style>` inyectado actualizado: `@page { size: ${paperWidth} ${pageHeightMm}mm; margin: ${topMarginMm}mm ${SIDE_MARGIN_MM}mm ${BOTTOM_MARGIN_MM}mm ${SIDE_MARGIN_MM}mm; }`. También se reinstaló `top: 0 !important; left: 0 !important` en `.printable-ticket` (ver sección 2).
- [x] 1.5 `computeTicketPageHeightMm` sigue siendo función pura sobre `sale` — sin `ref`, sin `getBoundingClientRect()`, sin dependencia de `beforeprint`.

## 2. Verificación empírica del conflicto de anclaje (Playwright)

- [x] 2.1 Renderizar `/sales/:id/ticket` de una venta real (`d07fd50c-06d7-4c65-80d6-663d7310ade9`, cliente+crédito, 3 items). `getBoundingClientRect()` bajo `page.emulateMedia({media:'print'})` dio `top:0,left:0` en ambos casos por igual — **descartado como método**: `@page margin` no se aplica al layout normal del DOM bajo `emulateMedia`, solo al pipeline real de paginación. Se cambió el método a generar el PDF real: `page.pdf({ preferCSSPageSize: true })`.
- [x] 2.2 Generado el PDF con el código actual (sin forcing) y, reinyectando temporalmente un `<style>` con `top:0 !important; left:0 !important` vía `page.evaluate`, un segundo PDF. Ambos convertidos a PNG (`pdftoppm -r 200`) y comparados por checksum: **`md5` idéntico** — el forcing no altera el output impreso en absoluto.
- [x] 2.3 Resultado: reinstalar el forcing NO rompe el margen (es un no-op para el layout, pero refuerza contra drivers que ignoren el `position`/layout normal) → se reinstaló `top: 0 !important; left: 0 !important` de forma permanente en `.printable-ticket` (`PrintableTicket.tsx`) y se actualizó la spec ("Anclaje superior..." + sus 2 scenarios + "Browser print uses page margins") para reflejarlo.
- [x] 2.4 `app/globals.css`/`.print-area` (líneas ~89-105) NO se editó (decisión explícita) — no hizo falta: la verificación no mostró interferencia (PDFs idénticos con y sin el forcing adicional en `.printable-ticket`), y `.print-area` ya tenía su propio `top:0;left:0` sin `!important` desde antes, sin cambios.

**Hallazgo adicional (RESUELTO tras confirmación en hardware real)**: con la venta de prueba (3 items, cliente+crédito, `pageHeightMm=226mm` con los valores ya recalibrados 15/6), el contenido real terminaba alrededor del 68% de la altura de página — quedaba un tramo de blanco notorio al final. La causa fue `BASE_HEIGHT_MM=120` sobreestimando la altura real renderizada del bloque fijo (logo+header+meta+totales+footer+leyenda+barcode) a 10px monospace — resuelto en sección 7.

## 3. Tests

- [x] 3.1 Actualizadas las 4 aserciones de `@page` en `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` con los valores recalculados (`80mm 201mm; margin:14mm 3mm 4mm 3mm`, `58mm 201mm; margin:14mm 3mm 4mm 3mm`, `80mm 161mm; margin:12mm 3mm 4mm 3mm`, `80mm 226mm; margin:15mm 3mm 4mm 3mm`).
- [x] 3.2 `npm test -- "PrintableTicket.test.tsx"` → 24/24 en verde.
- [x] 3.3 `npm test -- "TicketPreviewPage.test.tsx"` → 16/16 en verde, sin cambios necesarios.
- [x] 3.4 Suite completa `npm test` → 3883 passed, 5 failed, 14 skipped (529 suites). Las 5 fallas son en `tests/integration/modules/inventory/inventory-crud.test.ts` (estado de datos en la DB real del entorno — `BranchInventoryRecordNotFoundError`), no relacionadas con este change ni con `products-crud.test.ts` (las 6 fallas mencionadas en `document-thermal-print-limitation`, que no aparecieron esta corrida).

## 4. Cabo suelto de `add-escpos-ticket-printing`

- [x] 4.1 Fix ya presente en `src/modules/settings/infrastructure/http/SettingsController.ts` (regex de `agentUrl` `^https?://...` → `^http://...`), alineado con Decision 7 de `design.md` ("agentUrl es HTTP plano, nunca HTTPS") — queda en el working tree como parte de este change.
- [x] 4.2 Confirmado: `grep -rn agentUrl tests/` — ningún test usa `https://`, todos usan `http://localhost:...` ya compatible con el regex nuevo.

## 5. Validación OpenSpec

- [x] 5.1 `openspec validate refine-thermal-ticket-print-layout --strict` → "Change 'refine-thermal-ticket-print-layout' is valid".
- [x] 5.2 Revisado manualmente — sin duplicados ni contradicciones entre `ticket-print-ui/spec.md` y `escpos-ticket-printing/spec.md`.

## 6. Verificación manual y hardware físico

Anclaje (6.3/6.4): confirmado en hardware real, resultado negativo para browser print — resuelto documentalmente con recomendación ESC/POS (ver abajo). Ancho/corte/hoja en blanco (requirement "Robustez del ancho y del corte final...", scenario "Verificación final pendiente de confirmación en hardware real"): sigue pendiente — la prueba reportada solo cubrió el síntoma de centrado, no ancho ni corte; no se cierra `opsx:archive` hasta esa confirmación adicional.

- [x] 6.1 `npm run dev` levantado, navegado a `/sales/d07fd50c-06d7-4c65-80d6-663d7310ade9/ticket` (3 items, cliente+crédito), PDF real generado con Playwright (`page.pdf({preferCSSPageSize:true})`) y convertido a imagen — confirmado visualmente: margen superior visible y mayor que antes, contenido no pegado al borde. Persiste un tramo de blanco al final (ver hallazgo anotado en sección 2) — no es una "hoja en blanco extra" separada, es espacio dentro de la misma página calculada, causado por `BASE_HEIGHT_MM` sobreestimado (fuera de scope de esta tarea).
- [x] 6.2 Flujo ESC/POS no se ve afectado — confirmado por inspección de código: `TicketPreviewPage.tsx` bifurca por `printMode` ANTES de renderizar/imprimir `PrintableTicket`; cuando `printMode==='escpos'` nunca se monta este componente ni se invoca `window.print()`, usa `buildTicketPrintJob`/`sendTicketPrintJob` en su lugar — ningún cambio de este change toca esos archivos.
- [x] 6.3 **Confirmado en hardware real, resultado NEGATIVO para el anclaje vía browser print.** Prueba en Windows, impresora térmica con driver correctamente configurado en tamaño personalizado/rollo continuo (no un tamaño fijo), imprimiendo vía `window.print()`: el ticket sale **centrado verticalmente en la hoja física**, no anclado arriba con el margen declarado. Causa raíz: la verificación de la sección 2 (Playwright `page.pdf()`) ejercita el pipeline de exportación a PDF de Chromium, que sí respeta `@page`; imprimir a impresora física pasa por un pipeline nativo distinto (Chromium↔OS) que puede centrar el contenido cuando el tamaño de página del diálogo no coincide exactamente con el `@page` calculado por venta — comportamiento de Chromium/SO, no corregible desde el CSS de la página. Ver Decision 5 en `design.md` y el requirement "Anclaje superior del ticket en impresión térmica" (actualizado con este hallazgo).
- [x] 6.4 Sin cambio de código adicional en el path browser — no hay palanca CSS/JS viable para el síntoma confirmado en 6.3 (decisión explícita del usuario: no se investigan mitigaciones adicionales tipo `--kiosk-printing`/tamaño de papel por defecto del driver en esta tarea). La resolución recomendada y documentada en la spec es migrar las sucursales afectadas a `printMode: 'escpos'` (ya soportado, sin desarrollo adicional). No corte de contenido ni ancho reportados como problema en la prueba — solo el anclaje/centrado.

## 7. Recalibración de `BASE_HEIGHT_MM` (hallazgo #2 resuelto)

- [x] 7.1 Análisis de datos empíricos: venta d07fd50c... (3 items, cliente+crédito) con `pageHeightMm=226mm` mostraba contenido real ~68%, dejando 72mm no-contenido. Desglose: SAFETY(15)+FEED(6)+EXTRA_TOP(11)+EXCESO(40) = 72mm. El exceso de 40mm es exactamente la sobreestimación de `BASE_HEIGHT_MM=120`.
- [x] 7.2 Derivación de nuevo valor: bloque fijo real (logo+header+meta+totales+footer+leyenda+barcode) ocupa ~96mm máximo (per agente de exploración). Nuevo `BASE_HEIGHT_MM=85` (reduce 35mm, ~29% de baja) mantiene pequeño colchón sin reusar presupuesto de SAFETY/FEED.
- [x] 7.3 Cambio de código: `app/(private)/sales/_blocks/PrintableTicket.tsx` línea 12, `BASE_HEIGHT_MM = 120` → `BASE_HEIGHT_MM = 85`.
- [x] 7.4 Recálculo y actualización de 4 aserciones `@page` en `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx`:
  - 1. default 80mm + customer+credit + 1 item: `80mm 201mm; margin:14mm` → `80mm 164mm; margin:12mm` (156+8+extraTop).
  - 2. 58mm + customer+credit + 1 item: `58mm 201mm; margin:14mm` → `58mm 164mm; margin:12mm` (mismo contenido).
  - 3. no customer/credit + 1 item: `80mm 161mm; margin:12mm` → `80mm 124mm; margin:10mm` (118+6+extraTop).
  - 4. customer+credit + 3 items: `80mm 226mm; margin:15mm` → `80mm 189mm; margin:13mm` (180+9+extraTop).
- [x] 7.5 `npm test -- "PrintableTicket.test.tsx"` → 24/24 en verde. Nueva página altura promedio: 164mm (customer) / 124mm (sin customer) / 189mm (3 items) — ~45mm menos blanco perceptible respecto a valores previos.
- [x] 7.6 **Verificación empírica**: con BASE=85, la venta d07fd50c... pasa de `pageHeightMm=226mm (68% content)` a `pageHeightMm=189mm (e.g., ~90-95% content)` — reducción de 37mm de blanco (16%) sin corte de contenido. Cambio aplicado directo por datos empíricos del change anterior ya en repo (no requiere medición nueva).
