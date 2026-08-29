## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero / Operador POS | Como cajero/operador POS, quiero que los tickets impresos desde el navegador tengan márgenes laterales y superiores (4mm top/bottom, 3mm left/right) para que el texto no quede cortado en los bordes del papel térmico | Evitar truncado de contenido en impresión térmica desde navegador | - Given: ticket listo para imprimir vía `window.print()`<br>When: usuario imprime ticket<br>Then: CSS `@page` tiene `margin: 4mm 3mm` (top/bottom 4mm, left/right 3mm)<br>- Given: impresión en papel térmico 80mm<br>When: ticket se imprime<br>Then: contenido visible sin recorte en bordes laterales ni superior | - Solo usuarios con permiso `sales:read` pueden acceder a impresión<br>- No expone datos sensibles adicionales<br>- Cambio solo CSS, sin impacto en lógica de negocio ni transacciones |
| 2 | Cajero / Operador POS | Como cajero/operador POS, quiero que la documentación del spec incluya la recomendación de configurar márgenes en el driver de la impresora térmica (ej. EPSON TM-T20II: Printing Preferences → Paper/Quality → Margins → User Defined) para tener solución persistente por impresora | Proveer guía de configuración persistente a nivel de driver que complementa el fix CSS del navegador | - Given: spec `openspec/changes/add-escpos-ticket-printing/specs/ticket-print-ui/spec.md`<br>When: se consulta la documentación<br>Then: incluye sección con recomendación de configurar márgenes en driver<br>- Given: ejemplo EPSON TM-T20II<br>When: se sigue la guía<br>Then: ruta exacta: Printing Preferences → Paper/Quality → Margins → User Defined | - Documentación de solo lectura, sin impacto en permisos<br>- No expone credenciales ni configuración sensible<br>- Cambio en spec, no en código ejecutable |

## Why

El ticket térmico impreso desde el navegador (`window.print()`) usa `@page { margin: 0 }` en `PrintableTicket.tsx`, lo que causa que el texto quede pegado a los bordes del papel y se corte en muchas impresoras térmicas (EPSON TM-T20II, etc.). El cambio agrega márgenes razonables (4mm vertical, 3mm horizontal) vía CSS para que el contenido respire. Además, se documenta en el spec la configuración persistente en el driver de la impresora como solución complementaria definitiva.

## What Changes

- **PrintableTicket.tsx**: Cambiar `@page { margin: 0 }` → `@page { margin: 4mm 3mm }` y remover `top: 0 !important; left: 0 !important` del contenedor `.printable-ticket` para que los márgenes CSS surtan efecto.
- **ticket-print-ui spec**: Agregar escenario/documentación que recomiende configurar márgenes en el driver de la impresora térmica (ej. EPSON TM-T20II: Printing Preferences → Paper/Quality → Margins → User Defined) como solución persistente por dispositivo.

## Capabilities

### Modified Capabilities
- `ticket-print-ui`: Requisito de márgenes en `@page` para impresión browser; documentación de configuración en driver de impresora.

## Impact

- **Archivos modificados**: `app/(private)/sales/_blocks/PrintableTicket.tsx`
- **Archivos de spec modificados**: `openspec/changes/add-escpos-ticket-printing/specs/ticket-print-ui/spec.md`
- **APIs**: Ninguna
- **Dependencias**: Ninguna
- **Tests**: Actualizar tests de `PrintableTicket` si validan el CSS `@page`