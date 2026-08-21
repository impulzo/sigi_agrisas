## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Operador de venta | Como cajero, quiero que al imprimir un ticket éste salga al tamaño físico correcto (58mm/80mm de ancho, alto ajustado al contenido real) en vez de microscópico, para poder entregar un comprobante legible al cliente sin reimprimir ni ajustar manualmente el zoom de impresión | - Given una venta con N líneas de producto, When se hace clic en "Imprimir Ticket", Then el `@page` height se calcula a partir del alto real del contenido renderizado (no un valor fijo de 3276mm) más un margen de seguridad<br>- Given el mismo ticket, When se imprime en una impresora/driver con papel fijo (Letter/A4) o "Guardar como PDF", Then el contenido no sufre fit-to-page shrink perceptible — texto queda legible a tamaño ~10px monospace como en pantalla<br>- Given un ticket muy largo (muchas líneas de items), When se imprime, Then sigue saliendo en una sola página continua, sin cortes/paginado (no debe reintroducirse el problema que 3276mm resolvía)<br>- Given `paperWidth` configurado en `58mm` u `80mm` desde `ticketSettings`, When se imprime, Then el ancho del contenido y del `@page` siguen respetando ese valor exacto, sin cambios de comportamiento respecto al ancho | - El cálculo de altura corre client-side (medición DOM vía `useLayoutEffect`/ref), no expone ni depende de datos sensibles adicionales — usa el mismo `sale`/`ticketSettings` ya cargados por la página (sin fetch nuevo)<br>- Sin cambio de permisos: sigue gateado por `sales:read` como ya lo define `ticket-print-ui`<br>- El fallback ante fallo de medición (SSR, ref no montado aún) no debe romper el flujo de impresión — debe degradar a un valor de altura razonable por defecto, no a `undefined`/`NaN` en el CSS inyectado |

## Why

`PrintableTicket.tsx` fija `@page { size: <paperWidth> 3276mm; margin: 0; }` — una altura arbitrariamente enorme pensada para que rollos térmicos continuos nunca paginen. El problema: cuando el navegador imprime hacia un driver/impresora que NO tiene configurado papel de rollo continuo (papel fijo Letter/A4, o "Guardar como PDF" — el caso típico en pruebas de escritorio y en muchos entornos reales), Chrome aplica fit-to-page y escala el contenido completo en proporción a esa altura irreal (3276mm vs ~279mm de una hoja Letter), produciendo un ticket impreso microscópico e ilegible. El ancho configurable (`58mm`/`80mm` desde `ticketSettings.paperWidth`) ya funciona correctamente y no es la causa del bug — es específicamente la altura fija la que dispara el shrink.

## What Changes

- Reemplazar la altura fija `3276mm` del `@page` en `PrintableTicket.tsx` por una altura calculada dinámicamente a partir del alto real del contenido renderizado del ticket (medido en el DOM tras montar, vía `ref` + `useLayoutEffect`, convertido de px a mm), con un margen de seguridad para evitar cortes de última línea.
- Mantener el ancho (`58mm`/`80mm`, desde `ticketSettings.paperWidth`) sin cambios — el bug no está ahí.
- Fallback: si la medición aún no está disponible en el primer render (ref no montado / valor 0), usar una altura por defecto razonable (no `undefined`/`NaN` inyectado al CSS) para no romper el flujo de impresión.
- No se toca contenido, orden de secciones, ni ningún otro aspecto del ticket ya cubierto por `ticket-print-ui` (logo, datos de negocio, cliente, totales, leyenda, etc.) — cumplen spec vigente y no están en cuestión.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `ticket-print-ui`: cambia el requirement "Page size matches the configured paper width" (el `@page` ya no usa una altura fija de `3276mm`, sino una altura calculada dinámicamente del contenido) y el requirement "Long ticket does not split across pages" (la garantía de no-paginado pasa de depender de un valor fijo exagerado a depender del cálculo dinámico + margen de seguridad).

## Impact

- **Código afectado**: `app/(private)/sales/_blocks/PrintableTicket.tsx` (único archivo tocado — agrega medición de altura vía ref/`useLayoutEffect` y construye el `@page` con esa altura calculada en vez del literal `3276mm`).
- **Sin impacto en backend, API, ni en `ticketSettings`** — `paperWidth` (ancho) sigue viniendo de `GET /settings/ticket` sin cambios.
- **Sin impacto en otros consumidores de `PrintableTicket`**: usado también en `TicketPreviewPage.tsx` (`/sales/:id/ticket`) y potencialmente en el flujo de impresión desde `/sales/:id` — ambos heredan el fix automáticamente al ser el mismo componente.
- **Tests**: revisar/actualizar tests unitarios existentes de `PrintableTicket` (si existen) que asuman `3276mm` fijo.
