## Context

Ver `proposal.md` - Why para la motivación completa (fallo confirmado en hardware real del CSS/`@page` reforzado por `document-thermal-print-limitation`: el driver de Windows de la TM-T20II inyecta su propio margen superior, no controlable desde el navegador).

Restricciones ya confirmadas con el usuario (no reabrir):
- El panel corre en Vercel — el backend no tiene alcance de red a la LAN de cada sucursal; la impresión debe iniciarse desde el navegador del cajero.
- Los navegadores no abren sockets TCP crudos — solo HTTP(S)/WebSocket. Por eso se necesita un agente local por sucursal que sí pueda hablar TCP crudo a la impresora.
- Protocolo ya decidido: navegador→agente en JSON por HTTP a `localhost` (exento de mixed-content); agente→impresora por socket TCP crudo al puerto 9100 (no HTTP/ePOS-Print), usando una librería npm de ESC/POS en el agente para la conversión (incluida la rasterización del logo).
- `TicketSettings` hoy es un singleton global (`prisma/schema.prisma`, modelo `TicketSettings`, sin `branchId`) — no existe precedente de configuración de dispositivo/red por sucursal en el repo.
- `Branch` (`prisma/schema.prisma:149-185`) no tiene ningún campo de red/dispositivo hoy.

## Goals / Non-Goals

**Goals:**
- Definir el modelo de configuración de impresora por sucursal y su endpoint admin (Historia #2).
- Definir el contrato JSON navegador→agente y su punto de disparo en `TicketPreviewPage`/`PrintableTicket` (Historia #1).
- Definir el flujo de error/reintento/fallback en la UI cuando el agente no responde (Historia #3).
- Dejar una implementación de referencia del agente local (script Node standalone, fuera del bundle de Next.js) para poder probar el contrato end-to-end sin depender de que el cliente ya tenga uno instalado.

**Non-Goals:**
- Empaquetado/distribución/instalación del agente en las PCs de cada sucursal (instalador `.exe`, servicio de Windows con auto-arranque, actualizaciones) — change de seguimiento.
- Autodescubrimiento de impresoras en la red (el host/puerto se configura a mano por un administrador).
- Soporte a impresoras que no sean compatibles con ESC/POS estándar por socket 9100.
- Cambiar el contenido/orden de secciones del ticket — se preserva exactamente igual, solo cambia el mecanismo de entrega.

## Decisions

1. **Nuevo modelo `BranchPrinterConfig` (branch-scoped), NO extender `TicketSettings`.**
   Responde a Historia #2. `TicketSettings` es y debe seguir siendo un singleton de identidad de negocio (logo, RFC, razón social) — mezclarlo con config de red por sucursal rompería ese contrato ya spec'eado (`settings-api`). Se crea un modelo nuevo con `branchId` único (relación 1:1 con `Branch`), campos `printMode` (`'browser' | 'escpos'`, default `'browser'`), `agentUrl` (`String?`), `printerHost` (`String?`), `printerPort` (`Int?`, default `9100`). Ausencia de fila = `printMode: 'browser'` (sin necesidad de backfill).

2. **Ubicación en la arquitectura hexagonal: nuevo agregado dentro de `src/modules/settings/`, no un módulo nuevo.**
   Sigue el mismo patrón que `TicketSettingsRepository`/`PricingSettingsRepository` ya existentes ahí (configuración administrable), evitando fragmentar en un módulo de un solo agregado. Alternativa considerada: colgarlo de `src/modules/branches/` (como hace `inventory` con `BranchInventory`) — se descarta porque conceptualmente es configuración de la capa de impresión/settings, no un dato operativo de la sucursal en sí (como inventario o ventas).

3. **Endpoint: `GET`/`PATCH /api/v1/admin/branches/:id/printer-config`.**
   Sigue el patrón ya usado por inventario (`/branches/[id]/inventory`) para recursos anidados bajo una sucursal — Next.js no permite slugs hermanos distintos como `[branchId]` en el mismo árbol de rutas, así que se reutiliza `[id]` bajo `branches/[id]/`. Guard: `enforceBranchScope(req, branchIdDeLaRuta)` antes del use case (Historia #2, Criterio de Seguridad), igual que el resto de recursos por sucursal — bypass solo con `branches:access_all`.

4. **Contrato navegador→agente: JSON estructurado, no bytes ESC/POS ya construidos.**
   Ya decidido y confirmado con el usuario (ver historial de la conversación): el navegador arma un JSON con las mismas secciones/orden que `PrintableTicket` (logo como base64 o URL, líneas de header/meta/cliente/items/totales/footer/leyenda/folio), y hace `POST` a `agentUrl` (ej. `http://localhost:9100/print` — el puerto del agente es independiente del puerto 9100 de la impresora, son procesos distintos). El agente traduce ese JSON a ESC/POS con una librería npm (ej. `node-thermal-printer` o `escpos`) y lo envía por socket TCP crudo a `printerHost:printerPort`. Esto evita construir bytes ESC/POS (incluida la rasterización de imagen del logo) en el navegador.

5. **Agente de referencia: script Node standalone en `tools/escpos-print-agent/`, fuera del build de Next.js/Vercel.**
   Necesario para poder probar el contrato de extremo a extremo sin depender de que el cliente ya tenga un agente propio funcionando. Vive en su propio `package.json` (con la dependencia ESC/POS elegida) para no ensuciar las dependencias del panel — el panel principal (`package.json` raíz) no gana ninguna dependencia nueva, solo hace `fetch()` a `agentUrl` con JSON plano.

6. **Timeout de la petición navegador→agente: acotado y explícito (ej. AbortController con unos segundos), sin reintento automático.**
   Responde a Historia #3. Un timeout corto evita que el cajero quede esperando indefinidamente si el agente no está corriendo; el reintento es siempre una acción explícita del cajero (botón), nunca un loop automático, para no saturar `localhost` ni enmascarar el problema real (agente caído / impresora apagada).

7. **`agentUrl` es HTTP plano (`http://localhost:<puerto>`), nunca HTTPS.**
   El navegador SÍ está sujeto a mixed-content para esta llamada (a diferencia del salto agente→impresora, que es un proceso Node, no una página). La excepción de "origen seguro" para `localhost`/`127.0.0.1` en navegadores modernos (Chrome/Edge) es lo que permite este `fetch` desde una página HTTPS sin bloqueo — documentar esto explícitamente porque si el agente algún día corriera en otra IP de la LAN (no `localhost`), la excepción de mixed-content YA NO aplicaría y el fetch fallaría. Por diseño, `agentUrl` debe apuntar siempre a `localhost`/`127.0.0.1` de la propia PC del cajero.

**Criterios de Seguridad de la Historia de Usuario** (obligatorios): el payload navegador→agente nunca lleva JWT/tokens de sesión (Decisión 4, reflejado en el `escpos-ticket-printing` spec); el endpoint de configuración de impresora aplica `settings:write`/`settings:read` + `enforceBranchScope` igual que el resto de recursos por sucursal (Decisión 3); no se agrega ningún permiso RBAC nuevo.

## Risks / Trade-offs

- [El agente local es una pieza de infraestructura nueva y frágil por sucursal — puede no estar corriendo, quedar desactualizado, o fallar silenciosamente] → Mitigación: Historia #3 — timeout acotado + fallback explícito a `window.print()`, nunca bloquea el cierre de la venta.
- [Sin empaquetado/instalador (Non-Goal explícito), el cliente necesita ayuda técnica para tener el agente corriendo y arrancando con Windows] → Mitigación: se documenta como change de seguimiento; mientras tanto, cualquier sucursal sin agente simplemente no configura `printMode: 'escpos'` y sigue con el flujo actual sin regresión.
- [`agentUrl` apuntando a algo que no sea `localhost` rompería silenciosamente por mixed-content, con un error de red genérico difícil de diagnosticar para el cliente] → Mitigación: validar en el PATCH del endpoint que `agentUrl` sea `http://localhost:<puerto>` o `http://127.0.0.1:<puerto>` (400 si no), y que el mensaje de error de la Historia #3 sea específico, no un error de red genérico.
- [Cambiar de HTML/CSS a ESC/POS significa que un futuro cambio al contenido del ticket (nueva sección, campo) debe implementarse DOS veces — en `PrintableTicket.tsx` y en el generador del JSON/ESC/POS] → Mitigación aceptada como trade-off inherente a mantener ambos mecanismos en paralelo (browser fallback sigue siendo necesario); no se resuelve en este change.

## Migration Plan

Nueva tabla (`BranchPrinterConfig`) vía `prisma migrate dev` — aditiva, sin filas por default (ausencia = comportamiento actual). Nuevo endpoint admin, nuevo agente de referencia fuera del build de Next.js — despliegue estándar del panel sin downtime. Rollback: si `printMode` de una sucursal causa problemas, revertir a `'browser'` vía el mismo endpoint PATCH sin necesidad de rollback de código.
