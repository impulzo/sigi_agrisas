## 1. Dominio

- [x] 1.1 `src/modules/products/domain/services/sortProductPricesForDisplay.ts` — función pura `sortProductPricesForDisplay(prices: ProductPrice[]): ProductPrice[]`. Rango: `isDefault` → 0, `name` matchea `/subdis/i` → 1, `name` matchea `/distri/i` → 2, resto → 3; desempate `name.localeCompare(name)` dentro de cada rango.

## 2. Backend — repositorios

- [x] 2.1 `PrismaProductPriceRepository.findByProductId` — fetch (orderBy simplificado o removido) + aplica `sortProductPricesForDisplay` antes de retornar.
- [x] 2.2 `InMemoryProductPriceRepository.findByProductId` — reemplaza el `.sort()` inline por la misma función (paridad Prisma/InMemory).

## 3. Frontend

- [x] 3.1 `app/(private)/pos/_logic/services/getProductPrices.ts` — elimina el `.sort()` client-side redundante (el orden ya viene correcto del backend).

## 4. Tests

- [x] 4.1 `tests/unit/modules/products/domain/services/sortProductPricesForDisplay.test.ts` — casos: los 4 nombres reales (Publico, Subdis 10%, Distri 15%, Precio 4) → orden esperado; nombre no reconocido (ej. "General") → al final, alfabético; sin ningún `isDefault` → no rompe; empate dentro del mismo rango → `name ASC`.
- [x] 4.2 `tests/unit/modules/products/application/use-cases/ListProductPricesUseCase.ordering.test.ts` (nuevo) — verifica el nuevo orden con los 4 nombres reales vía `InMemoryProductPriceRepository`.
- [x] 4.3 `tests/unit/ui/.../getProductPrices.test.ts` (nuevo, no existía) — confirma que el service ya no reordena y devuelve los items en el mismo orden que entrega el body de la respuesta mockeada.

## 5. Verificación

- [x] 5.1 `npm run build` OK.
- [x] 5.2 `npx jest` verde en los archivos tocados (incluye `tests/integration/modules/products/products-crud.test.ts` contra BD real).
- [x] 5.3 Smoke real: producto real "PACKHARD 20 L" (`018f6f84-6fa2-45d1-bc12-05fae0c20b7b`, tiene los 4 precios reales). Verificado en `/catalogs/products/[id]` (tab Precios): orden Precio Publico, Precio Subdis 10%, Precio Distri 15%, Precio 4. Verificado en POS al añadir el producto al carrito (`PriceTierPicker`): mismo orden exacto. Nota operativa: `npm run build` sobrescribe `.next/` y corrompe un `next dev` corriendo en paralelo (assets 404, sesión rota) — hubo que reiniciar el dev server tras correr el build de la tarea 5.1.
