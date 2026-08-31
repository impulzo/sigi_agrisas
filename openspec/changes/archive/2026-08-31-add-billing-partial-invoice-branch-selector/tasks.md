## 1. `NewInvoicePage.tsx` — estado de sucursal seleccionada

- [x] 1.1 Leer `can` de `useCurrentUser()` (ya se lee `branchId`) y derivar `isBypass = can("branches:access_all") === true`.
- [x] 1.2 Agregar estado `branches: BranchOption[]` y `selectedBranchId: string` (mismo tipo/inicial `""` que `PosPage.tsx`).
- [x] 1.3 Agregar `useEffect` que replica el de `PosPage.tsx` (líneas 123-140): si `isBypass !== true` y hay `branchId` propio, setea `branches` a una única opción "Mi sucursal" y `selectedBranchId` a ese `branchId`; si `isBypass === true`, hace `authFetch("/api/v1/admin/branches?pageSize=100&includeInactive=false")` y llena `branches` con el resultado, sin autoseleccionar nada.
- [x] 1.4 Calcular `effectiveBranchId = selectedBranchId || null` y pasarlo como prop `branchId` a `PartialInvoiceForm` (reemplaza el `branchId={branchId}` actual, que pasaba el JWT directo).
- [x] 1.5 Renderizar el selector de sucursal (átomo `Select`, no `<select>` crudo — ver `design.md` Decisión 3) sólo cuando `isBypass === true`, visible únicamente en el modo `"partial"` (no debe aparecer en "Facturar venta").

## 2. `PartialInvoiceForm.tsx` — retirar el fallback a HQ

- [x] 2.1 Eliminar el import y uso de `useHeadquarters` (`app/_hooks/useHeadquarters`) — ya no se usa tras este cambio (ver `design.md` Decisión 2).
- [x] 2.2 Cambiar `const effectiveBranchId = branchId ?? hq?.id ?? null;` a `const effectiveBranchId = branchId ?? null;` (la prop `branchId` ya trae resuelta la sucursal desde `NewInvoicePage`, incluida la selección explícita del bypass).
- [x] 2.3 Confirmar que `handleAddProduct` (línea ~94) y `handleChangeTier` (línea ~130) siguen usando `effectiveBranchId` sin cambios adicionales — la paridad entre ambos call sites ya la garantizó el fix anterior.

## 3. Tests unitarios (`tests/unit/ui/(private)/billing/`)

- [x] 3.1 Caso bypass: usuario con `branches:access_all` ve el selector, sin sucursal preseleccionada. (`NewInvoicePage.branchSelector.test.tsx`)
- [x] 3.2 Caso no-bypass: usuario sin `branches:access_all` con `branchId` propio NO ve selector, y `getProductPrices` se llama con su `branchId` (regresión cero — mismo test que ya cubre el fix anterior, no debe romperse). (`NewInvoicePage.branchSelector.test.tsx` + `PartialInvoiceForm.test.tsx` sin cambios, ambos en verde)
- [x] 3.3 Caso bypass selecciona sucursal → `PartialInvoiceForm` recibe ese `branchId` (`NewInvoicePage.branchSelector.test.tsx`); resolución del precio branch-scoped cubierta end-to-end (selector real + `PartialInvoiceForm` real, sin mocks intermedios) por `NewInvoicePage.branchPriceIntegration.test.tsx` — cierra el gap de cobertura señalado en `opsx:verify` (antes sólo verificado manualmente con Playwright).
- [x] 3.4 Caso bypass sin seleccionar sucursal → `PartialInvoiceForm` recibe `branchId: null`, sin crash (`NewInvoicePage.branchSelector.test.tsx`) — cubre el escenario "No branch resolves" de la spec.
- [x] 3.5 Caso bypass cambia de sucursal después de agregar una línea → la línea ya agregada no cambia su `unitPrice` (`PartialInvoiceForm.test.tsx`, describe "changing branchId does not retroactively re-price existing lines").
- [x] 3.6 Verificado: `useHeadquarters` nunca estuvo mockeado en `PartialInvoiceForm.test.tsx` (el componente tampoco lo importa ya) — nada que limpiar.

## 4. Verificación en vivo (obligatoria antes de dar el cambio por terminado)

- [x] 4.1 Levantar servidor dev (`npm run dev`), login con `admin@example.com` (sesión fresca, confirmar `branchId: null` en el JWT decodificado). Hallazgo de entorno: un Service Worker offline activo (`sw.js`) cacheaba HTML/JS y ocultaba los cambios tras varios reinicios del server — se desregistró y limpiaron caches (`caches.delete`) para poder verificar en vivo; no es un problema del código de este cambio.
- [x] 4.2 En `/billing/new` → "Factura parcial", confirmado: selector de sucursal aparece con `— Selecciona sucursal —` preseleccionado (vacío).
- [x] 4.3 Sin seleccionar sucursal, agregado "INFINITO 1L" → línea queda en `$0.00`, "Elegir precio" — comportamiento documentado como "sin regresión" confirmado.
- [x] 4.4 Seleccionada "TLAXIACO" → agregado "INFINITO 1L" de nuevo → línea precarga `$1,076.00` / "Precio Publico". Request de red confirmado: `GET /admin/products/.../prices?branchId=2519c4ff-...` (TLAXIACO).
- [x] 4.5 No hay usuario no-bypass con `branchId` propio sembrado en esta DB para probar manualmente — cubierto en su lugar por `NewInvoicePage.branchSelector.test.tsx` (casos "sin selector visible" + "recibe su branchId propio"), ambos en verde.
- [x] 4.6 `npx tsc --noEmit`: sin errores nuevos en archivos tocados por este cambio (errores preexistentes en otros módulos, ajenos). `npx jest --selectProjects ui`: 281 suites / 1913 tests, todo en verde.

## 5. Sync de spec

- [x] 5.1 Confirmado: la implementación final coincide con el delta ya redactado en `specs/billing-ui/spec.md` (selector visible sólo bypass, sin autoselección, `effectiveBranchId` sin fallback a HQ, no re-cotiza líneas existentes al cambiar sucursal). Sin cambios pendientes al delta. Sync real a `openspec/specs/billing-ui/spec.md` queda para `opsx:archive`, sólo cuando el usuario lo indique explícitamente.
