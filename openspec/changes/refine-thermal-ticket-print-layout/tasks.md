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

**Hallazgo adicional (fuera de scope, para el reporte manual del usuario)**: con la venta de prueba (3 items, cliente+crédito, `pageHeightMm=226mm` con los valores ya recalibrados 15/6), el contenido real termina alrededor del 68% de la altura de página — sigue quedando un tramo de blanco notorio al final. La causa ya no es predominantemente `SAFETY_MARGIN_MM`/`FINAL_FEED_MM` (recalibrados a 21mm de colchón total) sino que `BASE_HEIGHT_MM=120` sobreestima la altura real renderizada del bloque fijo (logo+header+meta+totales+footer+leyenda+barcode) a 10px monospace. No se tocó `BASE_HEIGHT_MM`/`PER_ITEM_HEIGHT_MM` en este change (no fue parte de lo pedido y ajustarlos a ciegas arriesga cortar contenido con nombres/direcciones largos) — queda anotado para que el usuario decida si amerita otro ajuste tras la verificación en hardware físico.

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

## 6. Verificación manual y hardware físico (pendiente, no se cierra en esta sesión)

- [x] 6.1 `npm run dev` levantado, navegado a `/sales/d07fd50c-06d7-4c65-80d6-663d7310ade9/ticket` (3 items, cliente+crédito), PDF real generado con Playwright (`page.pdf({preferCSSPageSize:true})`) y convertido a imagen — confirmado visualmente: margen superior visible y mayor que antes, contenido no pegado al borde. Persiste un tramo de blanco al final (ver hallazgo anotado en sección 2) — no es una "hoja en blanco extra" separada, es espacio dentro de la misma página calculada, causado por `BASE_HEIGHT_MM` sobreestimado (fuera de scope de esta tarea).
- [x] 6.2 Flujo ESC/POS no se ve afectado — confirmado por inspección de código: `TicketPreviewPage.tsx` bifurca por `printMode` ANTES de renderizar/imprimir `PrintableTicket`; cuando `printMode==='escpos'` nunca se monta este componente ni se invoca `window.print()`, usa `buildTicketPrintJob`/`sendTicketPrintJob` en su lugar — ningún cambio de este change toca esos archivos.
- [ ] 6.3 **PENDIENTE POR NATURALEZA** — confirmación explícita del cliente imprimiendo en la EPSON TM-T20II física de que (a) el anclaje es correcto, (b) no hay corte de contenido, (c) no hay hoja en blanco sobrante, (d) el margen superior adicional se ve apropiado y no exagerado en tickets largos. No se marca "resuelto" ni se corre `opsx:archive` hasta esa confirmación — no se completa en esta sesión.
