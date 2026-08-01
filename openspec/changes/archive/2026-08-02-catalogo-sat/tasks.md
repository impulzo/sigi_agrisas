## 1. Prisma schema + migración

- [x] 1.1 `prisma/schema.prisma`: nuevo modelo `SatProductServiceCode` (`code String @id @db.VarChar(8)`, `description String @db.Text`, `createdAt`, `updatedAt`), `@@map("sat_product_service_codes")`.
- [x] 1.2 Migración generada manualmente (filtrada a la tabla nueva, mismo enfoque que changes previos de esta sesión) y aplicada con `prisma migrate deploy`.
- [x] 1.3 `npx prisma generate`.

## 2. Seed (placeholder)

- [x] 2.1 `prisma/seeds/satCodes.ts` — comentario inicial explícito marcando los datos como subconjunto aproximado no verificado; ~50-100 entradas `{code, description}` de rubros agro/agroquímicos (fertilizantes, semillas, plaguicidas/herbicidas, maquinaria agrícola, riego, etc.), `upsert` por `code`.
- [x] 2.2 `package.json` — script `seed:sat-codes` (patrón igual a `seed:folios`).
- [x] 2.3 Correr el seed contra la BD de pruebas y confirmar filas sembradas.

## 3. Backend — módulo `sat-codes` (hexagonal mínimo)

- [x] 3.1 `src/modules/sat-codes/application/ports/SatCodeRepository.ts` — `search(query: string | undefined, limit: number): Promise<{code, description}[]>`.
- [x] 3.2 `src/modules/sat-codes/application/use-cases/SearchSatCodesUseCase.ts`.
- [x] 3.3 `src/modules/sat-codes/infrastructure/repositories/PrismaSatCodeRepository.ts` — `ILIKE` sobre `code` OR `description`, límite 20, orden `code ASC`.
- [x] 3.4 `src/modules/sat-codes/infrastructure/repositories/InMemorySatCodeRepository.ts` (tests).
- [x] 3.5 `src/modules/sat-codes/infrastructure/http/SatCodesController.ts` — `GET` con Zod (`search` opcional, min 2 chars), sin `requirePermission` (sólo requiere sesión — ver D1).
- [x] 3.6 `src/modules/sat-codes/infrastructure/di/container.ts` — exporta `satCodesController`.
- [x] 3.7 `app/api/v1/admin/sat-codes/route.ts` — GET, delega al controller.

## 4. Frontend

- [x] 4.1 `app/_hooks/useSatCodesSearch.ts` (hook global, reutilizable — mismo nivel que `useTaxRatesOptions`) — debounce ~300ms, llama `GET /api/v1/admin/sat-codes?search=`.
- [x] 4.2 `app/(private)/catalogs/products/_blocks/SatCodeCombobox.tsx` (nuevo) — input con sugerencias `"<code> — <description>"`, permite seleccionar o seguir escribiendo manualmente (no fuerza selección de la lista).
- [x] 4.3 `ProductGeneralTab.tsx` — reemplazar el `<input>` de `satProductCode` por `<SatCodeCombobox>`, preservando el diff/validación `^\d{8}$` existente.

## 5. Tests

- [x] 5.1 `tests/unit/modules/sat-codes/application/use-cases/SearchSatCodesUseCase.test.ts`.
- [x] 5.2 `tests/unit/modules/sat-codes/infrastructure/http/SatCodesController.test.ts` — búsqueda válida, `search` corto → 400, sin `search` → página inicial.
- [x] 5.3 `tests/unit/ui/.../SatCodeCombobox.test.tsx` — sugerencias aparecen, selección completa el campo, valor manual de 8 dígitos se acepta sin match.

## 6. Verificación

- [x] 6.1 `npm run build` OK.
- [x] 6.2 `npx jest` verde en los archivos tocados.
- [x] 6.3 Smoke real: crear/editar un producto, buscar un código SAT del subconjunto sembrado, seleccionarlo, guardar, confirmar `satProductCode` persistido correctamente. Bug encontrado y corregido en el camino: `SatCodeCombobox` filtraba `\D` en cada keystroke, impidiendo buscar por descripción (ej. "fertilizante") — sólo dejaba escribir dígitos. Fix: el input ya no filtra caracteres; la validación `^\d{8}$` sigue aplicando en el schema Zod al guardar (capa existente, sin tocar). Verificado en vivo: búsqueda "fertil" → 6 sugerencias del subconjunto sembrado → selección → guardar → reload → `satProductCode` persistido.
