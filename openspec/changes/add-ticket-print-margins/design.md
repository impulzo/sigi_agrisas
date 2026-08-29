## Context

El componente `PrintableTicket.tsx` (en `app/(private)/sales/_blocks/`) renderiza el ticket térmico para impresión vía `window.print()`. Actualmente el CSS inyectado declara `@page { margin: 0 }` y el contenedor `.printable-ticket` fuerza `top: 0 !important; left: 0 !important`, anulando cualquier margen que el navegador pudiera aplicar. Esto causa truncado de texto en los bordes del papel térmico (80mm/58mm).

El spec `ticket-print-ui` (en `openspec/changes/add-escpos-ticket-printing/specs/ticket-print-ui/spec.md`) ya define el comportamiento de impresión browser y ESC/POS. Este change modifica solo el camino browser.

## Goals / Non-Goals

**Goals:**
- Agregar márgenes CSS `@page { margin: 4mm 3mm }` para que el contenido no quede pegado a los bordes
- Remover `top: 0 !important; left: 0 !important` del contenedor para que los márgenes surtan efecto
- Documentar en el spec la recomendación de configurar márgenes en el driver de la impresora (persistente por dispositivo)

**Non-Goals:**
- Cambiar el flujo ESC/POS (agente local) — ese camino no usa `PrintableTicket` ni `window.print()`
- Agregar configuración de márgenes en settings/UI — los márgenes son fijos en CSS (valores razonables por defecto)
- Modificar la lógica de cálculo de altura (`computeTicketPageHeightMm`) — los márgenes se restan del área imprimible, no se suman a la altura de página

## Decisions

### 1. Valores de margen fijos en CSS (no configurables)
**Rationale:** Los márgenes de 4mm vertical / 3mm horizontal son valores conservadores que funcionan en la mayoría de impresoras térmicas 80mm/58mm. Hacerlos configurables añade complejidad (settings, UI, validación) para un caso edge que se resuelve mejor en el driver de la impresora.
**Alternativa considerada:** Agregar `marginTop`, `marginRight`, `marginBottom`, `marginLeft` a `TicketSettings` — rechazada por YAGNI.

### 2. Remover `top: 0 !important; left: 0 !important` del contenedor
**Rationale:** Estas reglas fuerzan el contenido al origen (0,0) ignorando los márgenes de `@page`. Al removerlas, el navegador posiciona el contenido respetando los márgenes declarados.
**Nota:** Se mantiene `position: absolute !important` para que el ticket ocupe el área de impresión completa, pero sin anclar a la esquina superior izquierda.

### 3. No ajustar `computeTicketPageHeightMm`
**Rationale:** La altura de página calculada ya incluye `SAFETY_MARGIN_MM = 35mm` + `FINAL_FEED_MM = 12mm` = 47mm de margen de seguridad vertical. Los 4mm de `@page margin-top/bottom` están contenidos dentro de ese buffer. No hay riesgo de desbordamiento.

### 4. Documentar configuración en driver como solución complementaria
**Rationale:** El CSS `@page margin` depende del driver del navegador y del driver de la impresora; algunos drivers térmicos (EPSON) ignoran `@page margin` y usan su propio page size. La configuración en el driver (Printing Preferences → Paper/Quality → Margins → User Defined) es la única forma 100% confiable y persistente por dispositivo.

## Risks / Trade-offs

| Risk | Mitigación |
|---|---|
| Drivers térmicos que ignoran `@page margin` siguen cortando contenido | Documentar configuración en driver como solución definitiva; el CSS es fallback para drivers que sí lo respetan |
| `margin: 4mm 3mm` reduce área imprimible útil | Valores conservadores; 80mm - 6mm = 74mm útiles, suficiente para 48 chars monospace @ 10px |
| Remover `top/left: 0` rompe layout en algún navegador | `position: absolute` sin top/left posiciona en origen por defecto; márgenes de `@page` desplazan el área de contenido — comportamiento estándar CSS Print |
| Tests existentes fallen por cambio en CSS | Actualizar snapshots/aserciones en `tests/unit/ui/(private)/sales/PrintableTicket.test.tsx` |