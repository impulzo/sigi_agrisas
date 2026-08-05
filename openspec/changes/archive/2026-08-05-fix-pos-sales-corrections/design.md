## Context

Cuatro correcciones acotadas sobre el flujo POS/Ventas/Cotizaciones detectadas en análisis con cliente (ver `## Historia de Usuario` en proposal.md). Comparten dominio (POS/ventas/cotizaciones) y tamaño pequeño, por eso van en un solo change en vez de 4 specs independientes.

Estado actual verificado en el código (exploración previa):
- **Historia 1**: `SaleDetailPage.tsx:145-152` renderiza `<Link href="/sales/[id]/edit">` bajo guard `canEdit` (l.63-65 = `sales:edit_completed` + HQ). Es el único punto de acceso UI; la ruta, el service `editSale.ts`, el hook y el endpoint PATCH permanecen fuera de alcance.
- **Historia 2**: la cadena `ProductCatalogTable → useProductSearch → searchProducts (GET /api/v1/admin/products) → ListProductsUseCase → PrismaProductRepository.findAll → toProductDto` nunca toca `branch_inventory`. El service YA envía `branchId` como query param (`searchProducts.ts:24`) pero el backend lo ignora (no está en el schema Zod del controller).
- **Historia 3**: `createQuote.ts:33-44` mapea 400 sólo por palabras clave (customer/branch/folio/product/price/empty/items); cualquier mensaje real que no matchee (`"Invalid uuid"`, `"expiresAt must be in the future"`) cae en `throw NetworkError()` genérico. Candidatos de causa raíz: `branchId=""` en modo bypass admin sin sucursal elegida, o construcción de `expiresAt` (`${expiresAt}T23:59:59Z`) con riesgo de zona horaria contra la validación `futureIsoDate` server-side.
- **Historia 4**: `CreateSaleUseCase.ts:61` lanza `CustomerHasNoCreditLineError` si `creditLimit===null`; l.177-178 lanza `CreditLimitExceededError` si `creditAvailable < total`. Mismo bloqueo replicado en `ConvertQuoteToSaleUseCase.ts:72-76`.

## Goals / Non-Goals

**Goals:**
- Ocultar el botón "Editar venta" en UI sin tocar backend/permiso/ruta (historia 1).
- Exponer `quantity` de `branch_inventory` por producto en el catálogo del POS, filtrado por sucursal (historia 2).
- Reproducir con Playwright la causa real del error de creación de cotización, corregirla, y mejorar el surfacing de errores 400 no mapeados (historia 3).
- Quitar el bloqueo duro por límite/ausencia de crédito en venta y conversión de cotización; agregar flag informativo `creditLimitExceeded` + toast de aviso (historia 4).

**Non-Goals:**
- No se reactiva ni se rediseña el flujo de edición de venta — sigue existiendo, sólo sin botón.
- No se implementa gestión de cobranza ni ajuste automático de `creditLimit` — el flag es puramente informativo.
- No se agrega pre-chequeo proactivo de crédito antes del submit (decisión del usuario: sólo toast al completar).
- No se toca `inventory:read` ni el endpoint dedicado de inventario (`/branches/[id]/inventory`) — el stock del POS se sirve desde `products:read`.
- Sin migraciones de base de datos.

## Decisions

### D1 — Ocultar botón editar con feature flag const (historia 1)
Envolver el bloque JSX del botón (`SaleDetailPage.tsx:145`) con una constante `const SALE_EDIT_UI_ENABLED = false;` en el módulo, además del guard `canEdit` ya existente. Alternativa descartada: eliminar el bloque de código — se rechaza porque el requisito explícito es "no se desactiva la funcionalidad, solo se quita el acceso desde la UI"; un flag const documenta la intención y permite reactivar con un solo cambio de valor. `canEdit`/`isInHq` (Criterio de Seguridad: no alterar el guard HQ) quedan intactos y sin uso visible mientras el flag está en `false`.

### D2 — Stock vía extensión de `GET /products`, no vía endpoint de inventario (historia 2)
Se elige extender `ProductsController` (query `branchId` opcional) + `PrismaProductRepository.findAll` (include `inventory` filtrado por `branchId`) + `ProductDto.stock`, en vez de que el POS consuma el endpoint ya existente `GET /branches/[id]/inventory`. Razones:
- El POS ya usa `products:read` (Criterio de Seguridad de historia 2: no abrir `inventory:read` adicional); consumir el endpoint de inventario forzaría un segundo permiso y una segunda llamada HTTP con paginación propia a reconciliar contra el catálogo.
- `branchId` ya viaja en la query del cliente (`searchProducts.ts:24`) pero se ignora — es la extensión mínima.
- `Product.inventory` (relación 1-a-muchos hacia `BranchInventory`, unique `[branchId, productId]`) permite un `include` filtrado por `branchId` sin JOIN manual.
`stock` es `number | null`: `null` cuando no se envía `branchId` o no existe registro de inventario para esa combinación — el frontend lo renderiza como `"—"`.

### D3 — Surfacing de error 400: no perder el mensaje real (historia 3)
En `createQuote.ts`, cuando ningún patrón de palabra clave matchea el `error` del body 400, en vez de `throw new NetworkError()` se preserva el mensaje real del backend en un error tipado (ej. `QuoteCreateValidationError(message)`) que el toast pueda mostrar tal cual. Esto es prerrequisito para diagnosticar la causa raíz real vía Playwright — sin esto, cualquier fix posterior es a ciegas. Una vez reproducido el caso concreto (candidatos: `branchId` vacío en bypass, o `expiresAt` en el borde de zona horaria), se aplica el fix específico:
- Si es `branchId=""`: `canSubmitCart` (o equivalente) debe impedir el submit cuando el usuario está en bypass y no ha elegido sucursal, en vez de dejar pasar un UUID vacío al backend.
- Si es `expiresAt`: normalizar su construcción para que el ancla de "fin de día" no cruce a pasado por diferencia de zona horaria contra la validación server-side `> now()`.
No se decide de antemano cuál de los dos es la causa — la repro con Playwright lo confirma antes de tocar el código de negocio.

### D4 — Crédito no bloqueante vía flag informativo, no vía nuevo estado persistido (historia 4)
Se quitan los dos `throw` en `CreateSaleUseCase` y `ConvertQuoteToSaleUseCase`, pero se conserva intacta la lógica de `paidAmount=0`, `paymentStatus="pending"` e incremento de `currentBalance` para ventas a crédito (Criterio de Seguridad: no relajar otras validaciones de recursos). El resultado del use case gana un campo transitorio `creditLimitExceeded: boolean`, calculado así:
```
creditLimitExceeded = payment.isCredit && customer.creditLimit !== null && creditAvailable < totals.total
```
Cuando `creditLimit === null` (sin línea configurada) el flag es `false` — decisión del usuario: "permitir siempre a crédito", sin aviso porque no hay límite contra el cual compararse. El flag viaja en el body 201 de `SalesController`/`QuotesController` (conversión); no se persiste en `sales` ni en ninguna tabla — es puramente informativo para el toast del POS (decisión del usuario: "toast al completar", no pre-chequeo). Las clases de error `CreditLimitExceededError`/`CustomerHasNoCreditLineError` quedan sin uso en este flujo pero no se eliminan del código (podrían usarse en otro contexto futuro; fuera de alcance decidir eso ahora).

**BREAKING**: clientes HTTP que hoy manejan 409 de estos dos errores en `POST /sales` y `POST /quotes/:id/convert` deben migrar a leer `creditLimitExceeded` del 201. Se documenta en proposal.md.

## Risks / Trade-offs

- [Historia 1: acceso directo por URL] → Mitigación: aceptado explícitamente como comportamiento esperado — el requisito es "quitar el botón", no "bloquear la ruta"; el guard de permiso backend (`sales:edit_completed`) sigue siendo el control real de autorización.
- [Historia 2: `stock` desincronizado si hay venta concurrente entre el fetch del catálogo y el submit del carrito] → Mitigación: fuera de alcance de esta corrección — el POS ya no valida stock en el carrito hoy; el número es informativo para el cajero, no una reserva. `CreateSaleUseCase` sigue siendo la fuente de verdad al decrementar inventario.
- [Historia 3: la causa raíz real puede no ser ninguno de los dos candidatos] → Mitigación: la repro con Playwright ocurre ANTES de fijar el fix de causa raíz (D3); el fix de surfacing (mostrar el mensaje real) se aplica de todas formas porque es valioso independientemente de cuál sea la causa.
- [Historia 4: usuarios/integraciones externas que dependían del 409 para bloquear UI en tiempo real] → Mitigación: cambio de contrato documentado como BREAKING en proposal.md; el único consumidor conocido en este repo es el POS/quotes UI del propio proyecto, actualizado en el mismo change.
- [Historia 4: tests unitarios existentes de `CreateSaleUseCase`/`ConvertQuoteToSaleUseCase` que esperan los throws quedan rotos] → Mitigación: se actualizan como parte de tasks.md (ver sección de verificación).

## Migration Plan

Sin migración de base de datos. Despliegue estándar (build + deploy); no requiere pasos de rollback especiales más allá de revertir el commit/PR. El flag `SALE_EDIT_UI_ENABLED` (D1) permite reactivar el botón editar con un solo cambio de valor si el negocio lo pide más adelante, sin nuevo despliegue de backend.

## Open Questions

- Historia 3: causa raíz exacta pendiente de confirmar con repro Playwright antes de aplicar el fix específico (branchId vacío vs. zona horaria de `expiresAt`) — ver D3.
