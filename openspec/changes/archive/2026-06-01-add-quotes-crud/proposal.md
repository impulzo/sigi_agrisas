## Why

El backend cubre catálogo, RBAC, productos, precios, inventario por sucursal y emisión de tickets (POS), pero no existe ningún mecanismo para **cotizar** una venta antes de cerrarla. Los vendedores deben capturar precios "a mano" en un PDF, papel o WhatsApp, sin trazabilidad, sin formato consistente, y con riesgo de cobrar un precio distinto al cotizado o de generar una venta que el cliente no autorizó.

El cliente fijó tres reglas concretas para este módulo:

1. La cotización SHALL seleccionar **cliente + productos (con cantidad) + precio tomado de la lista de precios** del producto (misma regla que aplica al POS).
2. La cotización **NO debe afectar el inventario** (ni reservar, ni descontar). Una cotización es un compromiso comercial, no un movimiento de almacén.
3. Si la cotización es **autorizada**, debe poder **convertirse a un ticket**. La conversión es la única vía por la que esta cotización toca el inventario — y lo hace reutilizando la maquinaria atómica del POS (`CreateSaleUseCase`).

Para soportarlo el sistema necesita: una nueva entidad `Quote` con líneas snapshot, un ciclo de vida claro (`draft → authorized → converted | cancelled | expired`), un permiso separado de autorización (`quotes:authorize`) y un flujo de conversión atómico que enlaza la cotización con la venta resultante. El módulo reutiliza al máximo lo ya construido: scoping por sucursal, snapshot por línea, cálculo de totales puro, catálogo de folios.

## What Changes

### Migración + esquema

Nueva migración Prisma `add_quotes_tables_and_link_to_sale` que:

- Crea las tablas:
  - `quotes` (encabezado de cotización con folio, montos, estado, cliente, sucursal, vendedor, expiración).
  - `quote_items` (líneas con **snapshot** de `productCode`, `productName`, `priceName`, `unitPrice`, `discountPct`, `ivaRate`, `iepsRate` — mismo patrón que `sale_items`).
- Modifica `sales`: añade `quote_id TEXT NULL` con FK a `quotes(id) ON DELETE SET NULL`; índice en `quote_id`. Refleja "esta venta nació de la cotización X".
- Índices: en `quotes(code)` (no único — el `code` snapshot del folio cabe varias veces), `quotes(branch_id)`, `quotes(customer_id)`, `quotes(status)`, `quotes(folio_id, folio_number)` único, `quotes(expires_at)`, `quotes(created_at)`. Sobre `quote_items(quote_id)` y `quote_items(product_id)`.

### Nuevo módulo `src/modules/quotes/`

Hexagonal completo. CRUD admin de cotizaciones más ciclo de vida (`authorize`, `cancel`, `expire`) y `convert-to-sale`:

- **Dominio**: entidades `Quote`, `QuoteItem`; value object `QuoteStatus` (`draft`/`authorized`/`converted`/`cancelled`/`expired`); errores tipados (`QuoteNotFoundError`, `QuoteNotEditableError`, `QuoteAlreadyAuthorizedError`, `QuoteNotAuthorizedError`, `QuoteAlreadyConvertedError`, `QuoteExpiredError`, `EmptyQuoteError`, `ProductPriceMismatchError`).
- **Servicio de dominio** puro `QuoteTotalsCalculator` con la **misma fórmula y redondeo** que `SaleTotalsCalculator` (mismo half-to-even a 4 decimales). Implementado como módulo separado para no acoplar `quotes` con `pos`; los tests verifican equivalencia exacta sobre 10 vectores de entrada compartidos.
- **Aplicación**: puerto `QuoteRepository`; use cases `CreateQuoteUseCase` (transaccional: valida, snapshotea, asigna folio, persiste — **sin tocar inventario**), `ListQuotesUseCase`, `GetQuoteUseCase`, `UpdateQuoteUseCase` (sólo si `status='draft'`), `AuthorizeQuoteUseCase`, `CancelQuoteUseCase`, `ConvertQuoteToSaleUseCase` (delega al POS, transaccional, idempotente vía `quote.convertedSaleId`).
- **Infraestructura**: `PrismaQuoteRepository`; `QuotesController`; DI container que importa `customerRepository`, `productRepository`, `productPriceRepository`, `branchRepository`, `folioRepository`, `authorizationService` y, para la conversión, `saleRepository` + `SaleTotalsCalculator`.

### Route handlers (todos bajo `/api/v1/admin/quotes`)

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/v1/admin/quotes` | `quotes:read` — paginado, `?branchId&customerId&status&from&to&search` |
| GET | `/api/v1/admin/quotes/:id` | `quotes:read` — detalle con items |
| POST | `/api/v1/admin/quotes` | `quotes:create` — crea en estado `draft` |
| PATCH | `/api/v1/admin/quotes/:id` | `quotes:write` — sólo si `status='draft'` |
| DELETE | `/api/v1/admin/quotes/:id` | `quotes:cancel` — soft cancel (`status='cancelled'`) |
| POST | `/api/v1/admin/quotes/:id/authorize` | `quotes:authorize` — transición `draft → authorized` |
| POST | `/api/v1/admin/quotes/:id/convert` | `quotes:convert` — emite venta y deja la cotización en `converted` |

### Cambios en módulos existentes

- **`rbac`**: 6 permisos nuevos (`quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`). El total sube de 25 a **31**. Asignación a roles base: `admin` recibe los 6; `operator` recibe `quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`; `viewer` recibe sólo `quotes:read`.
- **`pos-api`**: el `Sale` añade `quoteId: string | null`. El `SaleDetailDto` lo expone. `POST /api/v1/admin/sales` acepta `quoteId?: string | null` en el body (opcional, sin cambios en el flujo existente). Nuevo escenario "venta creada por conversión": cuando la venta nace desde `ConvertQuoteToSaleUseCase`, el `quoteId` queda persistido y la venta cumple las mismas reglas de scoping/folio/inventario del POS normal.

### Branch scoping

El módulo `quotes` aplica el mismo patrón transversal que `pos-api`/`inventory-api`: el controller usa el helper compartido `enforceBranchScope` antes de invocar el use case. Los usuarios con `branches:access_all` (admin) ven todo; los demás están limitados a su `x-user-branch-id`.

### Conversión a venta (resumen del flujo)

`POST /api/v1/admin/quotes/:id/convert` exige `quotes:convert` **y** que el estado sea `authorized`. El controller resuelve la cotización, valida estado, valida que no haya expirado, y delega a `ConvertQuoteToSaleUseCase`. Éste, dentro de una transacción Prisma:

1. Verifica `quote.convertedSaleId === null` (idempotencia: si ya fue convertida, devuelve la venta existente).
2. Toma los items snapshot de la cotización y los pasa al flujo del POS (`SaleRepository.createCompleted`), respetando el `branchId` y el `customerId` de la cotización. El `paymentMethodId` y el `folioId` (de venta, no de cotización) se reciben en el body de la conversión y se validan exactamente como en `POST /sales`.
3. Persiste `quote.status='converted'`, `quote.convertedAt=NOW()`, `quote.convertedSaleId=<id>`.
4. La venta resultante NACE con `quoteId = quote.id`.

El descuento de inventario, asignación de folio fiscal y demás efectos siguen el contrato del POS — no hay lógica duplicada.

### Tests

- Unit tests por use case (in-memory repos) — ~10 archivos.
- Unit tests del `QuoteTotalsCalculator` puro + **test de equivalencia** contra `SaleTotalsCalculator` sobre vectores compartidos.
- Tests de validación Zod en el controller nuevo.
- Tests de integración Supabase: crear cotización → editar (draft) → autorizar → convertir → verificar venta + quote.status='converted' + inventario decrementado. Caminos: cancelar en `draft`, autorizar y cancelar, convertir dos veces (idempotente devuelve la venta existente), intentar editar `authorized` (409), intentar convertir `draft` (409), intentar convertir `expired` (409).

**No-Goals (fuera de scope de este change):**

- UI/frontend de cotizaciones (se construye en `add-quotes-ui`).
- Múltiples versiones/revisiones de una cotización (`quote_revisions`) — al editar, se sobreescribe.
- Aprobación multi-nivel / workflow con múltiples firmantes.
- Notificación al cliente (email/WhatsApp) con el PDF de la cotización.
- Generación de PDF/impresión.
- Descuentos a nivel de encabezado (sólo `discountPct` por línea, igual que POS).
- Bloqueo de stock futuro / reserva temporal en `branch_inventory`.
- Conversión parcial (sólo algunos items) — la conversión es total. Para conversión parcial el usuario debe cancelar y crear una cotización nueva con los items restantes.
- Expiración automática vía cron — el campo `expiresAt` se valida al convertir (rechaza si vencida) y se filtra en la lista; ningún job marca automáticamente `status='expired'` (se difiere a `add-quote-expiration-cron`).
- Cambiar `customerId`/`branchId` de una cotización: ambos son inmutables tras la creación (al editar `draft` sólo se aceptan items y notas; para cambiar cliente o sucursal hay que cancelar y crear otra).
- Múltiples métodos de pago en la conversión — un solo `paymentMethodId`, igual que POS.

## Capabilities

### New Capabilities

- `quotes-api`: REST admin de cotizaciones — emisión sin afectar inventario, edición en borrador, autorización, cancelación, conversión a venta. Cálculo de totales como servicio de dominio puro. Branch scoping y soporte para el catálogo existente de folios.

### Modified Capabilities

- `rbac`: 6 permisos nuevos (`quotes:read`, `quotes:create`, `quotes:write`, `quotes:cancel`, `quotes:authorize`, `quotes:convert`) y nuevas asignaciones a roles base. El total sube de 25 a 31.
- `pos-api`: `Sale` se enlaza opcionalmente a una `Quote` vía `quoteId: string | null` (nullable, FK `ON DELETE SET NULL`). El campo aparece en `SaleDto`/`SaleDetailDto` y se acepta en el body de `POST /api/v1/admin/sales` como opcional. Cuando la venta nace desde `ConvertQuoteToSaleUseCase`, queda persistido el enlace.

## Impact

- **Código nuevo**: 1 módulo hexagonal completo (`quotes`) — ~35 archivos backend, 7 route handlers, ~12 archivos de tests.
- **Código modificado**: `prisma/schema.prisma` (2 modelos nuevos + 1 modelo modificado), `prisma/seed.ts` (6 permisos nuevos), `src/modules/pos/` (DTO/controller aceptan `quoteId` opcional; repo lo persiste), `CLAUDE.md` (nueva sección "Cotizaciones (Backend)" + actualización de la sección "POS (Backend)" para mencionar `quoteId`).
- **Migraciones de BD**: una migración (`add_quotes_tables_and_link_to_sale`) que crea 2 tablas y añade 1 columna nullable a `sales`.
- **Sin cambios en UI/frontend** en este change.
- **Sin cambios en branch scoping global** — se reutiliza el helper `enforceBranchScope` ya existente.
- **Riesgo principal**: duplicación parcial de lógica entre `QuoteTotalsCalculator` y `SaleTotalsCalculator`. Mitigación: el test de equivalencia sobre vectores compartidos detecta divergencias; si en el futuro la fórmula evoluciona, se promueve a un servicio compartido en `src/shared/domain/`.
