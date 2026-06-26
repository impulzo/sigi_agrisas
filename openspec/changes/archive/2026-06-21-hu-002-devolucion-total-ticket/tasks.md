## 1. Base de datos y Prisma

- [x] 1.1 Crear migración `add_returned_total_sale_status`: extender el tipo/check de `sales.status` para incluir `returned_total`
- [x] 1.2 Actualizar tipo `SaleStatus` en `src/modules/pos/domain/entities/Sale.ts` para incluir `'returned_total'`
- [x] 1.3 Ejecutar `npx prisma generate` para regenerar el cliente

## 2. Backend — lógica de full-return

- [x] 2.1 Agregar método `markReturnedTotal(saleId: string): Promise<void>` en `PrismaSaleRepository`
- [x] 2.2 Implementar lógica en `ReturnsController.fullReturn`: cargar sale+items, calcular remaining por línea, construir payload, llamar `CreateReturnUseCase`, evaluar si todo quedó en 0 y llamar `markReturnedTotal`
- [x] 2.3 Agregar error domain `SaleAlreadyFullyReturnedError` en `src/modules/returns/domain/errors/`
- [x] 2.4 Agregar validación: si sale `status = 'returned_total'` → 409 `SaleAlreadyFullyReturnedError`
- [x] 2.5 Agregar validación: si sale `status = 'cancelled'` → 409 `SaleNotReturnableError` (ya existe, verificar que aplica)

## 3. Backend — endpoint y routing

- [x] 3.1 Agregar route handler `POST /api/v1/admin/sales/[id]/full-return/route.ts` que delega a `ReturnsController.fullReturn`
- [x] 3.2 Actualizar `CancelSaleUseCase` y `EditCompletedSaleUseCase` para rechazar con 409 si `sale.status = 'returned_total'`
- [x] 3.3 Actualizar `SaleDto` para incluir `returned_total` como valor válido de `status`
- [x] 3.4 Actualizar filtro `?status=` en `GET /sales` para aceptar `returned_total`

## 4. Frontend — SaleStatusBadge

- [x] 4.1 Agregar case `returned_total` → "Devuelto total" con `bg-error-container text-on-error-container` en `SaleStatusBadge`
- [x] 4.2 Agregar opción "Devuelto total" en el filtro "Estado" de `/sales` (`SalesToolbar`)

## 5. Frontend — FullReturnModal

- [x] 5.1 Crear componente `FullReturnModal` en `app/(private)/sales/_blocks/` con campos `reason` (requerido, 3–500) y `notes` (opcional, max 1000)
- [x] 5.2 Crear servicio `fullReturnSale` en `app/(private)/sales/_logic/services/`
- [x] 5.3 Integrar `FullReturnModal` en `SaleDetailPage`: botón "Devolución Total" visible cuando `status === 'completed'`, `can("returns:create") === true`, y hay remaining > 0

## 6. Tipos frontend

- [x] 6.1 Agregar `'returned_total'` al tipo `SaleStatus` en `app/(private)/sales/_logic/types/domain.ts`
- [x] 6.2 Agregar `fullReturnSale` al tipo `SaleApiDto` en `app/(private)/sales/_logic/types/api.ts` si aplica

## 7. Tests

- [x] 7.1 Test unitario: `fullReturn` → sale status cambia a `returned_total` cuando remaining = 0 en todos los items
- [x] 7.2 Test unitario: `fullReturn` → 409 cuando sale ya está en `returned_total`
- [x] 7.3 Test unitario: `CancelSaleUseCase` rechaza sale con `returned_total`
- [x] 7.4 Test unitario: `EditCompletedSaleUseCase` rechaza sale con `returned_total`
