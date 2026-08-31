## 1. Fix de código

- [x] 1.1 En `app/(private)/billing/_blocks/PartialInvoiceForm.tsx:94`, cambiar `getProductPrices(product.id)` por `getProductPrices(product.id, effectiveBranchId)`, igualando el call site de `handleChangeTier` (línea 130).

## 2. Sync de spec

- [x] 2.1 Confirmar que el delta ya redactado en `openspec/changes/fix-billing-invoice-price-branch-scope/specs/billing-ui/spec.md` (requisito "Partial standalone invoice") queda reflejado sin cambios adicionales tras la implementación (no debería requerir edición — sólo verificar coherencia con el código final).

## 3. Test de regresión

- [x] 3.1 En `tests/unit/ui/(private)/billing/PartialInvoiceForm.test.tsx`, agregar/actualizar caso que mockee `getProductPrices` y assert que se llama con `(productId, effectiveBranchId)` al agregar un producto desde el catálogo (`handleAddProduct`).
- [x] 3.2 Agregar/confirmar caso equivalente para `handleChangeTier` (ya branch-aware) para que ambos call sites queden cubiertos y cualquier divergencia futura falle el test.

## 4. Verificación

- [x] 4.1 `npm test -- PartialInvoiceForm` — confirmar que pasan los tests nuevos y existentes.
- [x] 4.2 `npm run build` — verificar tipos.
- [x] 4.3 Verificación manual con Playwright (nunca Claude-in-Chrome, por convención del proyecto): login `admin@example.com`/`admin1234` → `/billing` → nueva factura parcial → agregar producto cuyo único precio sea branch-scoped → confirmar que el precio default se preselecciona y no aparece "Este producto no tiene precios configurados." → confirmar que "Elegir precio" sigue funcionando sin regresión.
  - Verificado con `PRO_RAIZ_MAX_DE_1L` (único precio branch-scoped, sucursal TLAXIACO), usando el usuario QA `admin@example.com` temporalmente asignado a esa sucursal (branch_id revertido a `null` inmediatamente después de la verificación). Resultado: precio "Precio Publico $595.00" preseleccionado al agregar desde catálogo (antes: `unitPrice: 0` + "Elegir precio"); `PriceTierPicker` ("Elegir precio") también resuelve el mismo precio sin regresión.
- [x] 4.4 `openspec/verify` (vía `/opsx:verify`) contra specs y design de este change.
