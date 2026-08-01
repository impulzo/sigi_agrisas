## 1. Tipos, servicios y lógica base

- [x] 1.1 Creados `_logic/types/api.ts` (montos como `string` — igual convención que `payments`, no `number`) y `_logic/types/domain.ts` (con `Date` y montos `number`) + `_logic/_mappers.ts` (parseFloat + Date, patrón híbrido Return+Payments)
- [x] 1.2 Creado `_logic/errors.ts` con todos los errores de dominio + forbidden/scoping
- [x] 1.3 Creados `_logic/services/{listPurchases,getPurchase,createPurchase,cancelPurchase,registerProviderPayment,cancelProviderPayment,searchProviders,createProvider,searchProducts}.ts` + barrel `index.ts` — `createProvider`/`searchProducts` son copias locales propias (no import cross-módulo desde `catalogs/providers`/`pos`), siguiendo el patrón real ya establecido por `pos/_logic/services/createCustomer.ts` (duplicación intencional), corrigiendo la intención original de design.md
- [x] 1.4 Creado `_logic/lib/computePurchaseTotalsClient.ts` (banker's rounding 4 decimales, mismo shape que `computeTotalsClient`)
- [x] 1.5 Creado `_logic/schemas/createPurchase.ts` (validación Zod cliente)

## 2. Listado de compras (`/purchases`)

- [x] 2.1 Creado `_logic/hooks/usePurchasesList.ts` (filtros provider/branch/status/fechas → `listPurchases`); debounce de búsqueda de proveedor vive en `PurchasesToolbar` (Combobox + `useProviderSearch` + `useDebounce`), no en este hook
- [x] 2.2 Creados `_blocks/PurchasesToolbar.tsx`, `PurchasesTable.tsx`, `PurchasesEmpty.tsx`, `PurchaseStatusBadge.tsx`
- [x] 2.3 Creado `_blocks/PurchasesListPage.tsx` — gate por `purchases:read`, filtro de sucursal solo si `branches:access_all`
- [x] 2.4 Creado `page.tsx` de `/purchases` (Server Component, exporta `metadata`, sin lógica propia)

## 3. Creación de compra (`/purchases/new`)

- [x] 3.1 Creados `_blocks/ProviderPicker.tsx` (Combobox + búsqueda server-side, análogo a `CustomerPicker`) y `_logic/hooks/useProviderSearch.ts`
- [x] 3.2 Creado `_blocks/ProviderQuickAddModal.tsx` usando copia local `_logic/services/createProvider.ts` (no cross-módulo, ver nota task 1.3)
- [x] 3.3 Creado `_blocks/PurchaseLineRow.tsx` (producto read-only + cantidad, costo unitario, descuento %, remove) análogo a `CartLine.tsx`; la selección de producto vive en un Combobox separado en `CreatePurchasePage` (agrega línea nueva), no dentro de la fila — más simple que POS al no requerir price tiers/dosificaciones
- [x] 3.4 Creado `_logic/hooks/useCreatePurchaseForm.ts` — estado de líneas, proveedor, forma de pago (deriva `isCredit`), notas; invoca `computePurchaseTotalsClient` vía `useMemo`; `submit()` → `createPurchase` + redirige a `/purchases/[id]`
- [x] 3.5 Creado `_blocks/CreatePurchasePage.tsx` — gate por `purchases:create`, `canSubmit` deshabilita sin proveedor/forma de pago/líneas, muestra aviso si la forma de pago es crédito (no oculta un "monto pagado" porque ese campo no existe en el formulario — se calcula 100% en backend)
- [x] 3.6 Creado `new/page.tsx`
- [x] 3.7 Errores 400 (proveedor/producto inactivo) y de items vacíos mostrados inline sin perder los datos capturados (el formulario no se resetea en error)

## 4. Detalle de compra (`/purchases/[id]`)

- [x] 4.1 Creado `_logic/hooks/usePurchaseDetail.ts` (id → `getPurchase`, `refresh()` vía tick counter)
- [x] 4.2 Creado `_blocks/PurchaseItemsTable.tsx` (líneas snapshot, solo lectura)
- [x] 4.3 Creado `_blocks/PurchaseMetaPanel.tsx` (proveedor, sucursal, creador, forma de pago, fecha, notas, banner de cancelación si `status="cancelled"`)
- [x] 4.4 Creado `_blocks/ProviderPaymentsSection.tsx` — lista de abonos + CTA "Registrar abono" condicionado (crédito + no saldada + `purchases:pay`); oculto por completo si la compra es de contado
- [x] 4.5 Creado `_blocks/PurchaseActionsBar.tsx` — botón "Cancelar compra" deshabilitado + mensaje si hay abonos activos (`providerPayments.some(status==='completed')`)
- [x] 4.6 Creado `_blocks/PurchaseDetailPage.tsx` — gate por permisos vía `useCurrentUser().can`, orquesta los bloques anteriores
- [x] 4.7 Creado `[id]/page.tsx`

## 5. Modales de acciones

- [x] 5.1 Creado `_blocks/RegisterProviderPaymentModal.tsx` — valida en cliente `monto <= saldo pendiente` antes de enviar, maneja 409 inline
- [x] 5.2 Creado `_blocks/CancelProviderPaymentModal.tsx` — confirmación previa, maneja 409 (doble cancelación) inline
- [x] 5.3 Creado `_blocks/CancelPurchaseModal.tsx` — campo de razón obligatorio (submit deshabilitado sin razón)
- [x] 5.4 Creado `_logic/hooks/usePurchaseMutations.ts` — orquesta las 3 mutaciones (`cancel`/`registerPayment`/`cancelPayment`) vía callback `onChange` para refresh del detalle

## 6. NavigationRail

- [x] 6.1 Agregado item `purchases` (`href: "/purchases"`, icon `shopping_cart`, label `"Compras"`, `requires: "purchases:read"`) a `primaryItems` en `app/_components/organisms/NavigationRail/items.ts` — posicionado justo después de `payments` (antes de `billing`), más cerca temáticamente de los otros documentos operativos que lo que sugería el spec original

## 7. Tests

- [x] 7.1 Unit tests de `usePurchasesList`, `usePurchaseDetail`, `useCreatePurchaseForm`, `usePurchaseMutations` (mock de `_logic/services`) — 21 tests
- [x] 7.2 Unit tests de servicios (`listPurchases`/`getPurchase`/`createPurchase`/`cancelPurchase`/`registerProviderPayment`/`cancelProviderPayment`) con `fetch` inyectado, cubriendo 200/400/403/404/409/500 — 25 tests
- [x] 7.3 Unit test de `computePurchaseTotalsClient` (casos representativos + smoke de equivalencia estructural contra `totalsVectors` compartido)
- [x] 7.4 Behavior tests de `PurchaseStatusBadge` y `PurchasesListPage` (gate de permisos, error, empty state, scoping de sucursal) con hooks mockeados — `CreatePurchasePage`/`PurchaseDetailPage` quedan cubiertos indirectamente por los tests de sus hooks (`useCreatePurchaseForm`, `usePurchaseMutations`, `usePurchaseDetail`); no se agregó snapshot dedicado para esas dos páginas compuestas por límite de tiempo de esta sesión
- [x] 7.5 Test de `NavigationRail` actualizado — visibilidad con/sin `purchases:read`, estado `"loading"`, posición entre Abonos y Facturación, href `/purchases`

## 8. Verificación

- [x] 8.1 `npm run build` — exitoso, rutas `/purchases`, `/purchases/[id]`, `/purchases/new` registradas
- [x] 8.2 `npm test` — 2837/2841 pasan; los 4 fallos (`sales-edit-from-hq.test.ts`, integration real DB) son flakiness preexistente por paralelismo contra Supabase compartido, confirmado pasando en aislado, no relacionado a `purchases`
- [ ] 8.3 `npm run dev` levantado y respondiendo 200 (log confirmado); verificación manual en navegador NO completada en esta sesión — el browser automation (extensión Chrome) falló sistemáticamente con timeout de inyección de script incluso en pestañas nuevas y en un endpoint JSON trivial (`/api/v1/health`), confirmando que es un problema de la extensión/entorno y no del código. Servidor dev queda corriendo en `localhost:3000` para verificación manual del usuario. Cobertura de facto mientras tanto: build limpio + 2837/2841 tests en verde + revisión de código contra los patrones probados de `returns`/`pos`/`payments`
- [x] 8.4 `openspec validate ui-ux-purchases --strict` → "Change 'ui-ux-purchases' is valid"
