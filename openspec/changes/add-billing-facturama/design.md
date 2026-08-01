## Context

Las ventas (`Sale`) y sus líneas (`SaleItem`) ya contienen todo lo necesario para timbrar: el receptor vive en `Customer` con datos fiscales (`rfc`, `cfdiUse` mapeado a `CfdiUse`, `taxRegime` → `FiscalRegime`, `taxZipCode`), y cada `SaleItem` snapshotea `productCodeSnapshot`, `productNameSnapshot`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate`. Los productos aportan `satProductCode`. El cálculo de totales usa banker's rounding a 4 decimales (`SaleTotalsCalculator`) — la factura **reusa** esos importes, no recalcula impuestos por su cuenta.

Facturama expone una API REST 4.0 (CFDI 4.0). El SDK JS oficial es browser-only (jQuery/XHR) — descartado. Base URLs: sandbox `https://apisandbox.facturama.mx/`, producción `https://api.facturama.mx/`. Autenticación: header `Authorization: Basic base64(user:password)`. Endpoints relevantes: `POST /cfdis` (timbrar), `DELETE /cfdi/{id}?type=issued&motive=NN` (cancelar), `GET /cfdi/{format}/{type}/{id}` (descargar pdf/xml en base64), `POST /api/Csd` (alta de CSD multiemisor).

El proyecto no permite slugs hermanos distintos en App Router (lección de `inventory`), por lo que las rutas anidadas usan `[id]` consistente.

## Goals / Non-Goals

**Goals:**
- Módulo `billing` hexagonal aislado que emite/cancela/descarga/consulta CFDI 4.0.
- Timbrado desde `Sale` existente y standalone (items libres).
- Persistencia con snapshot fiscal completo (sobrevive cambios de catálogo/cliente).
- Gateway Facturama desacoplado tras un port, con implementación REST real y `FakeFacturamaGateway` para mock/tests.
- Gestión de CSD por RFC.
- Branch scoping + RBAC consistentes con el resto de módulos.

**Non-Goals:**
- UI de facturación (alcance futuro `billing-ui`).
- Complementos CFDI (pagos, comercio exterior, nómina) — solo CFDI de Ingreso `I`.
- Sustitución por refacturación encadenada automática (solo se acepta `uuidReplacement` como dato en la cancelación 01).
- Movimiento de inventario (la facturación es estrictamente fiscal).
- Cálculo propio de impuestos: se reusan los importes ya calculados por el dominio de ventas; en standalone se calculan con el mismo `Decimal(14,4)` banker's rounding.

## Decisions

**D1 — Adaptador REST propio, no el SDK jQuery**
El port `FacturamaGateway` define `stamp/cancel/download/uploadCsd/getCsdStatus`. `FacturamaRestGateway` lo implementa con `fetch` (inyectable como `fetchImpl?` para tests), arma el header Basic Auth desde env y normaliza errores HTTP de Facturama a errores tipados del dominio (`FacturamaStampError`, `FacturamaCancelError`). Cumple el espíritu de "implementar la librería" sin arrastrar jQuery a un contexto server.

**D2 — Modo mock con credenciales simuladas (default hasta tener las reales)**
`FACTURAMA_MOCK` (default `true`) selecciona `FakeFacturamaGateway`: genera `uuid`/`facturamaCfdiId` deterministas y PDF/XML placeholder, sin red. Al obtener credenciales reales se pone `FACTURAMA_MOCK=false` y la DI usa `FacturamaRestGateway`. El `.env.example` documenta `FACTURAMA_BASE_URL` (sandbox por defecto), `FACTURAMA_USER`, `FACTURAMA_PASSWORD`. El gateway falla en arranque solo si `FACTURAMA_MOCK=false` y faltan credenciales.

**D3 — `Invoice` con snapshot fiscal; `saleId` nullable**
La factura no depende del estado vivo de la venta/cliente. Se snapshotea receptor (`receiverRfc`, `receiverName`, `receiverCfdiUse`, `receiverFiscalRegime`, `receiverTaxZipCode`) y por línea (igual que `SaleItem`). `saleId` FK `ON DELETE SET NULL`: standalone → `null`. Una `Sale` tiene 0..1 invoice **vigente** (`status='stamped'`); una venta cuyo único CFDI está `cancelled` puede re-timbrarse.

**D4 — Mapeo de campos venta → CFDI**
Por línea: `ProductCode`=`satProductCode` (fallback código genérico `01010101` si falta), `Description`=`productNameSnapshot`, `Quantity`, `UnitPrice`, `Discount` derivado de `discountPct`, `Subtotal`=`lineSubtotal`, `Taxes`=[IVA con `Base`/`Rate`/`Total` desde `ivaRate`; IEPS si `iepsRate>0`], `TaxObject` `02` si hay impuestos / `01` si no. Cabecera: `CfdiType='I'`, `Currency='MXN'`, `ExpeditionPlace`= zip de la sucursal/emisor, `PaymentForm`/`PaymentMethod` SAT desde el `paymentMethod` de la venta (o del body en standalone), `Receiver` desde `Customer`.

**D5 — Estados de la factura**
`status: 'stamped' | 'cancelled'`. Se persiste **solo tras timbrado exitoso** en Facturama (no hay `draft`). Si Facturama rechaza el timbrado, no se crea fila y se devuelve 422 con el detalle. Cancelar es idempotente-tolerante: cancelar una ya `cancelled` → 409.

**D6 — Descarga proxy, no almacenamiento pesado**
`xmlUrl`/`pdfUrl` se guardan si Facturama los devuelve; de lo contrario el endpoint `/download` consulta Facturama en vivo por `facturamaCfdiId` y hace stream del base64 con `Content-Type` correcto. No se guardan blobs en BD.

**D7 — Branch scoping y RBAC**
`Invoice.branchId`: en timbrado desde venta se hereda del `sale.branchId`; en standalone se resuelve con `resolveScopedBranchId`. `list` usa `resolveScopedBranchId`; `getById`/`cancel`/`download`/`listBySale` cargan el recurso y aplican `enforceBranchScope`. Permisos: `billing:read` (admin/operator/viewer), `billing:write` y `billing:cancel` (admin/operator), `billing:manage_csd` (**solo admin** — maneja la llave privada del CSD).

**D8 — Validación en controller (Zod), orden estándar**
Orden en handlers scoped: validar UUID + body (Zod → 400) → `enforceBranchScope` (401/403) → use case. El CSD recibe `.cer`/`.key` en base64 + contraseña; nunca se persisten en BD locales (se reenvían a Facturama), se loggean redactados.

## Risks / Trade-offs

- **[Riesgo] Esquema CFDI 4.0 estricto del SAT**: campos como `FiscalRegime`, `CfdiUse`, `TaxZipCode` del receptor deben ser válidos o Facturama rechaza (422). → Se mapean desde `Customer` y se valida presencia en el use case antes de llamar a Facturama; error claro `ReceiverFiscalDataIncompleteError` (400) si faltan.
- **[Riesgo] CSD multiemisor vs cuenta single-emisor**: si la cuenta Facturama es single-emisor el CSD se configura en el portal, no por API. → El endpoint CSD documenta que aplica al flujo multiemisor; en mock es no-op exitoso.
- **[Trade-off] Reuso de importes de la venta**: si los importes guardados en `sale_items` difieren de lo que el SAT esperaría (redondeos), Facturama podría ajustar. → Se envía `Subtotal`/`Total` calculados con el mismo banker's rounding del dominio; se confía en el cálculo existente.
- **[Riesgo] Secretos en entorno**: `FACTURAMA_PASSWORD` y la contraseña del CSD son sensibles. → Solo server-side, nunca expuestos al cliente; redacción en logs.
- **[Trade-off] Cancelación SAT asíncrona**: algunas cancelaciones requieren aceptación del receptor. → v1 registra el estado devuelto por Facturama; no implementa polling de acuse (deuda documentada).

## Migration Plan

`npx prisma migrate dev --name add_billing_tables`. Solo tablas nuevas (`invoices`, `invoice_items`) y relación opcional `Sale.invoices`. Sin backfill. `npx prisma generate`.

## Open Questions

_Resueltas:_
- SDK vs REST → adaptador REST propio (D1).
- Persistencia → tabla `Invoice` con `saleId` nullable (D3).
- Inventario → la facturación nunca mueve stock.
- Credenciales → simuladas vía `FACTURAMA_MOCK=true` hasta obtener las reales (D2).

_Pendientes (no bloquean v1):_
- ¿La cuenta Facturama es single-emisor o multiemisor? Define si el endpoint CSD opera por API o es informativo.
- Códigos SAT `PaymentForm`/`PaymentMethod`: ¿se derivan del `PaymentMethod` del catálogo o se capturan por factura? v1 los acepta en el body con default `PaymentForm='01'`, `PaymentMethod='PUE'`.
