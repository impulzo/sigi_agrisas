## 1. Modelo y migración

- [x] 1.1 Agregar modelo `BranchPrinterConfig` a `prisma/schema.prisma`: `id`, `branchId` (único, FK a `Branch`, `@db.Uuid` NO — sigue la regla general TEXT del proyecto ya que `branches.id` es TEXT), `printMode` (`String`, default `"browser"`), `agentUrl` (`String?`), `printerHost` (`String?`), `printerPort` (`Int?`, default `9100`), `createdAt`, `updatedAt`.
- [x] 1.2 Agregar relación inversa `printerConfig BranchPrinterConfig?` en `model Branch`.
- [x] 1.3 Correr `npx prisma migrate dev --name add_branch_printer_config`. — `migrate dev` rechazó modo no-interactivo, y el diff automático quería tocar PKs de `users`/`roles`/`permissions` (drift cosmético preexistente ya documentado en CLAUDE.md, no tocar). Se escribió la migración a mano (`prisma/migrations/20260826200000_add_branch_printer_config/migration.sql`, solo la tabla nueva) y se aplicó con `prisma migrate deploy` (no hace diffing, solo ejecuta el SQL pendiente). `prisma generate` regenerado.

## 2. Backend — dominio y aplicación (`src/modules/settings/`)

- [x] 2.1 Entidad de dominio `PrinterConfig` (`printMode: 'browser' | 'escpos'`, `agentUrl`, `printerHost`, `printerPort`).
- [x] 2.2 Puerto `PrinterConfigRepository` (`getByBranchId(branchId)`, `upsert(branchId, data)`) en `application/ports/`.
- [x] 2.3 `GetBranchPrinterConfigUseCase` — si no hay fila, retorna `{ printMode: 'browser' }` por default (sin 404).
- [x] 2.4 `UpdateBranchPrinterConfigUseCase` — regla de negocio (no Zod): fusiona el estado actual con el update y si el `printMode` resultante es `'escpos'` sin `agentUrl`/`printerHost`, lanza `IncompletePrinterConfigError`. El regex/shape de `agentUrl` (`localhost`/`127.0.0.1` only) y el rango de `printerPort` van en el controller (Zod), siguiendo la convención del proyecto (validación de forma en controller, regla de negocio en use case).
- [x] 2.5 Repos: `PrismaPrinterConfigRepository` e `InMemoryPrinterConfigRepository` (para tests).

## 3. Backend — HTTP y DI

- [x] 3.1 Controller: `getPrinterConfig`/`updatePrinterConfig` agregados a `SettingsController` (no controller dedicado, para reusar el mismo patrón/DI que ticket/pricing/inventory-notifications). Orden respetado: validar UUID de `:id` + body (Zod → 400) → `enforceBranchScope(req, id)` (401/403) → use case.
- [x] 3.2 Rutas `app/api/v1/admin/branches/[id]/printer-config/route.ts` — `GET` (`settings:read`), `PATCH` (`settings:write`).
- [x] 3.3 DI: `PrismaPrinterConfigRepository` + ambos use cases registrados en `src/modules/settings/infrastructure/di/container.ts`.

## 4. Frontend — contrato de impresión ESC/POS

- [x] 4.1 Tipo/DTO `TicketPrintJob` (JSON) en `_logic/types/ticketPrintJob.ts` de `sales` — mismas secciones/orden que `PrintableTicket` (logo, header negocio, meta, cliente condicional, crédito condicional, items, totales IVA/IEPS separados, footer, leyenda condicional). El folio decorativo se omite del JSON (es puramente visual en HTML — el agente puede derivar su propio elemento de corte/separador desde `meta.folioCode` si lo desea, no es contenido informativo adicional).
- [x] 4.2 Función pura `buildTicketPrintJob(sale, ticketSettings, origin): TicketPrintJob` en `_logic/lib/` — sin JSX, sin fetch. `logoUrl` se resuelve como URL absoluta (el agente la descarga él mismo; mantiene la función síncrona/pura en vez de hacer base64 en el navegador).
- [x] 4.3 Servicio `sendTicketPrintJob(agentUrl, job, { timeoutMs, fetchImpl })` en `_logic/services/` — `fetch` con `AbortController` (timeout default 5s), sin reintento interno, nunca incluye headers de `Authorization`/sesión. Lanza `PrintAgentUnreachableError` tipado.
- [x] 4.4 `TicketPreviewPage.tsx`: nuevo servicio `getBranchPrinterConfig(branchId)` (degrada a `{printMode:'browser'}` ante cualquier error, nunca bloquea impresión) resuelto en `useEffect` tras cargar la venta; `handlePrintClick` bifurca entre `handlePrintEscPos` (ESC/POS) y `handlePrintBrowser` (`window.print()`, default sin regresión).
- [x] 4.5 Banner inline (no modal — más simple, igual de efectivo) con "Reintentar" e "Imprimir desde el navegador" cuando `sendTicketPrintJob` falla — sin reintento automático, siempre requiere clic explícito del cajero.

## 5. Agente de referencia (fuera del bundle de Next.js)

- [x] 5.1 Creado `tools/escpos-print-agent/` con `package.json` propio (`node-thermal-printer`). No afecta las dependencias del panel (Next.js) — es un proyecto Node standalone separado.
- [x] 5.2 Servidor HTTP (`http://127.0.0.1:<puerto>/print`, default `9101`) que recibe el `TicketPrintJob` JSON tal cual lo postea `sendTicketPrintJob`, lo traduce a ESC/POS (texto, alineación, tabla de dos columnas, imagen del logo descargada de `job.logoUrl`, corte) y lo envía vía `node-thermal-printer` con `interface: tcp://<printerHost>:<printerPort>` (socket TCP crudo, sin HTTP/ePOS-Print). `printerHost`/`printerPort` se pasan como flags de arranque del proceso (`--printer-host`, `--printer-port`), no en cada request — un agente sirve una impresora fija.
- [x] 5.3 README (`tools/escpos-print-agent/README.md`) con instrucciones de instalación/arranque, relación `agentUrl`↔puerto del agente, y limitaciones conocidas (sin instalador, sin hardware verificado).

## 6. Spec y verificación

- [x] 6.1 Correr `openspec validate --strict --changes add-escpos-ticket-printing` — pasa sin errores.
- [x] 6.2 Tests unitarios: `UpdateBranchPrinterConfigUseCase` (6 casos: completo, sin agentUrl, sin printerHost, update parcial incompleto, completar incrementalmente, revertir a browser), `GetBranchPrinterConfigUseCase` (default sin fila + no fuga entre sucursales), `buildTicketPrintJob` (8 casos de paridad con `PrintableTicket`), branch scoping del endpoint (401/403/200, mock de `rbacContainer` igual que `WaybillsController.branchScoping.test.ts`). 44/44 tests pasan.
- [x] 6.3 Prueba manual end-to-end: agente corriendo en `127.0.0.1:9101` apuntando a un puerto sin listener (`19100`); `POST /print` con un `TicketPrintJob` de ejemplo completó todo el pipeline (parseo, descarga de logo, armado ESC/POS) y falló solo en el paso final del socket (`ECONNREFUSED 127.0.0.1:19100`) — confirma que el contrato navegador→agente funciona de punta a punta.
- [x] 6.4 Documentado: la validación final en la EPSON TM-T20II física (¿ya imprime completo, sin corte, con ancho correcto?) requiere confirmación explícita del cliente con el agente de referencia corriendo apuntando a la impresora real y un usuario/sucursal con `printMode: 'escpos'` configurado — no se cierra `opsx:verify` como "resuelto" solo con revisión de código ni con la prueba de socket fallido de 6.3. Ver también limitaciones conocidas en `tools/escpos-print-agent/README.md` y Risks en `design.md`.
- [x] 6.5 Ajuste de impresión por navegador (`window.print()`): Se actualizó `PrintableTicket.tsx` para usar `@page { size: ${paperWidth} auto; margin: 0; }` y eliminar el cálculo de altura fija en mm (`computeTicketPageHeightMm`) y el margen de seguridad (`SAFETY_MARGIN_MM`). Esto permite que en Windows la altura del ticket se adapte dinámicamente al contenido sin generar márgenes ni páginas en blanco. Pruebas unitarias de `PrintableTicket.test.tsx` actualizadas (22/22 pasan).
