## Context

El módulo `folios` ya está consolidado como CRUD admin estándar (spec `admin-folios`): tablas Prisma, controller hexagonal, UI en `/catalogs/folios`, hook `useFoliosOptions` cacheado a 60 s. El seed RBAC actual (`prisma/seed.ts`) hace un `upsert` de un único folio (`RECIBO`) usado como default por el módulo de Abonos (`RegisterPaymentModal.tsx:51` busca `code === "RECIBO"`). Los demás folios (`TK`, `TC`, `COT`, etc.) los crea el operador desde la UI sin ningún seed reproducible.

Los modelos referencing folio (`Sale.folioId`, `Quote.folioId`, `CustomerPayment.folioId`) usan FK con `onDelete: Restrict`. Cualquier intento de borrar un folio referenciado falla a nivel DB. Esto es importante para la política de borrado del nuevo seed.

El cliente entregó la lista canónica de 8 folios con reglas semánticas:

| Code | Name | Prefix | Scope | Uso |
|---|---|---|---|---|
| TK | Folio de Venta Efectivo | TK- | POS | Venta de contado en POS |
| TC | Folio de Venta Crédito | TC- | POS | Venta a crédito en POS |
| COT | Cotización | COT- | POS | Cotización (no consume stock) |
| TS | Traspaso entre inventarios | TS- | INVENTORY | Traspasos (módulo a construir) |
| RB | Recibo de Pago — Cobranza | RB- | OPERATIONS | Recibo emitido al registrar abono |
| AB | Cobranza / Abono | AB- | OPERATIONS | Folio alterno para abonos |
| DEV | Devolución | DEV- | OPERATIONS | Folio de devolución (módulo Returns no usa folio hoy; reservar) |
| CP | Compras | CP- | OPERATIONS | Folio de compras (módulo a construir) |

Restricciones relevantes del dominio:
- `Folio.code` es inmutable, regex `^[A-Z0-9_]{1,32}$`, único.
- `Folio.prefix` regex `^[A-Z0-9-]{1,8}$` cuando no es `null`; todos los nuestros son `<CODE>-`.
- `Folio.currentNumber` debe preservarse al re-correr el seed (idempotencia fiscal: la numeración consecutiva en MX no admite reuso).
- `Sale/Quote/CustomerPayment` referencian folios con `onDelete: Restrict`.
- El módulo `returns` actualmente NO consume folios del catálogo (decisión documentada en `CLAUDE.md`); preparar `DEV` solo deja la pieza lista para cuando sea cableado.
- Los módulos `transfers` y `purchases` aún no existen; preparar `TS` y `CP` los deja listos para cuando se construyan.

## Goals / Non-Goals

**Goals:**
- Definir el catálogo canónico de 8 folios como código versionado (seed reproducible).
- Introducir `Folio.scope` (`POS`|`INVENTORY`|`OPERATIONS`) y enforzarla en backend.
- Hacer que `POST /folios` exija `scope` y `GET /folios?scope=` filtre.
- Wirear el FE para que cada flujo (POS, Cotizaciones, Abonos) consuma solo los folios cuyo `scope` corresponda.
- Cambiar el folio default de Abonos de `RECIBO` a `RB` sin perder funcionalidad.
- Garantizar idempotencia del seed: re-correrlo no resetea `current_number`, no duplica registros, ni borra folios referenciados.
- Documentar el comando operativo y el orden de seeds.

**Non-Goals:**
- Construir el módulo de Traspasos (`TS`) ni el de Compras (`CP`). El seed solo siembra los folios; la lógica HTTP/UI queda fuera.
- Cablear `DEV` al módulo `returns`. Returns mantiene su diseño actual (no consume folio del catálogo).
- Migrar manualmente datos de producción. La política es "borrar legacy si no tiene FKs; abortar si tiene FKs". El operador decide la limpieza manual cuando hay datos reales.
- Renombrar el folio existente `RECIBO` a `RB` preservando su `current_number`. El seed lo borra (si no tiene referencias) y crea `RB` con `current_number=0`. Si hay payments referenciando `RECIBO`, el seed aborta y el operador debe ejecutar manualmente `UPDATE folios SET code='RB', prefix='RB-', name='Recibo de Pago - Cobranza', scope='OPERATIONS' WHERE code='RECIBO'` antes de re-correr.
- Soportar múltiples folios por scope de tipo "preferido" / "fallback" (out of scope; el FE elige el primero o el match exacto por code).

## Decisions

### D1 — `Folio.scope` como `VARCHAR(32)` con enum aplicado en Zod, no en DB

- **Elegida**: `scope` es `VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'` en la migración Prisma. El conjunto válido `('POS', 'INVENTORY', 'OPERATIONS')` se enforza con un Zod enum en el controller y un tipo TypeScript `FolioScope` en el dominio.
- **Alternativa**: usar Postgres `ENUM TYPE`. Descartada porque Prisma maneja enums Postgres con menos ergonomía y agregar valores futuros (`PURCHASE` separado, `REFUND` separado, etc.) requeriría migración. Con VARCHAR + Zod, agregar un nuevo scope es solo un cambio de código.
- **Razón**: el conjunto es pequeño pero podría crecer; mantenemos la flexibilidad sin sacrificar validación. El default `'OPERATIONS'` permite que la migración aplique sin fallar sobre filas existentes.

### D2 — Tres scopes (`POS`, `INVENTORY`, `OPERATIONS`) en lugar de uno por folio

- **Elegida**: agrupar los 8 folios en 3 scopes amplios.
- **Alternativa**: scope fine-grained de 7-8 valores (`SALE_CASH`, `SALE_CREDIT`, `QUOTE`, `TRANSFER`, `RECEIPT`, `DEPOSIT`, `RETURN`, `PURCHASE`). Permite enforcement más estricto (ej. una venta cash solo puede usar `TK`).
- **Razón**: el usuario describió 3 buckets explícitos. Fine-grained reintroduce hardcodes por code (lo que tratábamos de evitar). Si más adelante se necesita strict per-code, se agrega como sub-regla del use case sin tocar el schema. Operational reality: TK/TC/COT son intercambiables a nivel de validación; el FE distingue (cash vs credit vs quote) por flujo, no por enum DB.

### D3 — Política de borrado: hard delete con guard FK

- **Elegida**: en el seed `prisma/seeds/folios.ts`, identificar folios cuyo `code NOT IN (canonical 8)` y borrarlos uno a uno. Antes de cada `DELETE`, consultar `prisma.folio.findUnique({ include: { _count: { select: { sales, quotes, payments } } } })`. Si `_count.sales + _count.quotes + _count.payments > 0`, abortar con `process.exit(1)` y mensaje claro: `Folio <code> tiene N referencias activas (sales: X, quotes: Y, payments: Z); migra manualmente o limpia antes de re-correr`.
- **Alternativa A**: soft-delete (set `isActive=false`). Descartada porque la instrucción explícita del usuario fue "borrar los anteriores".
- **Alternativa B**: bulk `DELETE WHERE code NOT IN (...)` y dejar que Postgres rechace por FK. Descartada porque el error de Postgres no indica qué folios referenciados ni cuántas filas; el guard previo da feedback mucho más útil.
- **Razón**: borrar limpio en dev; abortar con mensaje claro en cualquier otra situación. El operador decide.

### D4 — `current_number` se preserva en upsert

- **Elegida**: el `upsert` de cada folio canónico usa:
  ```ts
  prisma.folio.upsert({
    where: { code },
    create: { code, name, prefix, scope, isActive: true, currentNumber: 0 },
    update: { name, prefix, scope, isActive: true }, // ← NO toca currentNumber
  });
  ```
- **Razón**: si un folio canónico ya existe (ej. `COT` con `currentNumber=523` por uso previo), re-correr el seed no debe resetear su numeración. Esto es coherente con cómo el seed RBAC trata `RECIBO` hoy.

### D5 — Migración con default `'OPERATIONS'`, no `NULL`

- **Elegida**: `ALTER TABLE folios ADD COLUMN scope VARCHAR(32) NOT NULL DEFAULT 'OPERATIONS'`.
- **Alternativa**: agregar columna `NULL`, ejecutar el seed para poblar, luego una segunda migración que vuelva la columna `NOT NULL`. Más limpia conceptualmente pero requiere dos migraciones.
- **Razón**: el default permite aplicar la migración sin estado intermedio. El seed canónico sobrescribe los valores correctos. Folios legacy que el seed no borra (si los hay) quedan con scope `OPERATIONS` por default, lo cual es el bucket más permisivo y minimiza el daño.

### D6 — Errores de dominio: nuevo `FolioScopeMismatchError` compartido en `src/shared/domain/errors/`

- **Elegida**: definir una sola clase `FolioScopeMismatchError(expectedScope: FolioScope, actualScope: FolioScope)` en `src/shared/domain/errors/` (carpeta que ya hospeda `InactiveResourceError`). Los controllers de pos/quotes/payments mapean a HTTP 400 con mensaje `Folio scope mismatch: expected <X>, got <Y>`.
- **Alternativa**: error por módulo (`PosFolioScopeMismatchError`, `QuoteFolioScopeMismatchError`, etc.). Más explícito pero ruidoso, idéntica semántica.
- **Razón**: la regla "scope debe coincidir" es transversal y merece un solo punto de definición. Si emerge un caso especial (ej. el módulo de transfers acepta scope ∈ {INVENTORY, OPERATIONS}), se generaliza a `expectedScopes: FolioScope[]`.

### D7 — `useFoliosOptions(scope?)`: cache key compuesta por scope

- **Elegida**: el hook acepta `{ scope?: FolioScope }` y mantiene un `Map<scope|"_all", CacheEntry>` (no un único cache global). Cada scope tiene su propio TTL de 60 s y dedupe de promise.
- **Alternativa**: cachear el listado completo y filtrar in-memory por scope. Más simple pero hace overfetch (todos los folios) y deja el filtro en cliente.
- **Razón**: alinear con el backend (que ya soporta `?scope=` server-side) y reducir payload. Cuando se invoca sin scope, sigue funcionando como hoy (lista completa, default key `_all`).

### D8 — Estructura del script en `prisma/seeds/folios.ts`

- **Elegida**: script standalone con una `main()` que ejecuta:
  1. Carga `PrismaClient`.
  2. Define constante `CANONICAL_FOLIOS: Array<{ code, name, prefix, scope, isActive }>` con los 8.
  3. Lista todos los folios existentes, identifica el conjunto a borrar.
  4. Para cada folio a borrar: consulta `_count` de FKs → aborta con mensaje claro si referenciado, sino `delete`.
  5. Para cada canónico: `upsert` con la lógica de D4.
  6. Imprime resumen estructurado: `{ canonicalUpserted, legacyDeleted, abortedReferences: [] }`.
  7. `process.exit(0)` limpio; `process.exit(1)` con stderr en cualquier error.
- **Alternativa**: una sola gran transacción. Descartada porque borrar legacy + upsert los 8 dentro de una `$transaction` es seguro, pero si un solo upsert falla por validación se rollbackea todo y deja al operador sin diagnóstico parcial.
- **Razón**: secuencial es transparente. Cada paso loguea. Las FK guards corren antes de cualquier mutación.

### D9 — `prisma/seed.ts` deja de gestionar folios

- **Elegida**: remover el bloque de upsert de `RECIBO` del seed RBAC. El nuevo seed `seed:folios` se vuelve responsable único del catálogo de folios.
- **Razón**: separación de responsabilidades. El seed RBAC corre en CI y tests; el seed de folios es operativo (igual que `seed:inventory`).

## Risks / Trade-offs

- **Riesgo**: tras la migración pero antes de correr el seed, el módulo de Abonos rompe (el FE busca `RECIBO`, ya inválido). **Mitigación**: el orden de despliegue documentado es `migrate deploy` → `npm run seed:folios` (atómico) → deploy FE. En dev, los tres pasos los corre el desarrollador en la misma sesión.
- **Riesgo**: si existe un `customer_payment` con `folio_id = (RECIBO)`, el seed aborta y el operador queda bloqueado sin guía. **Mitigación**: el mensaje de error incluye la query SQL exacta para renombrar manualmente (`UPDATE folios SET code='RB', prefix='RB-', name='Recibo de Pago - Cobranza', scope='OPERATIONS' WHERE code='RECIBO'`). Documentar este caveat en CLAUDE.md y en `tasks.md`.
- **Riesgo**: backend valida scope, pero el FE en una versión vieja (antes de filtrar por scope) podría seguir mandando el folio "equivocado" y recibir 400. **Mitigación**: deploy coordinado; los handlers retornan 400 con mensaje claro que el FE pueda mostrar inline.
- **Riesgo**: el módulo `returns` actualmente NO usa folio del catálogo; reservar `DEV` con `scope='OPERATIONS'` puede confundir (¿para qué existe?). **Mitigación**: documentar explícitamente en `CLAUDE.md` que `DEV` es un placeholder hasta que se conecte `returns`.
- **Trade-off**: 3 scopes en lugar de 8 deja sin enforcement la regla fine-grained "venta cash usa TK, venta crédito usa TC". El POS termina ofreciendo los 3 (TK, TC, COT) en cualquier flujo y depende del operador elegir bien. **Mitigación**: el FE puede aplicar reglas heurísticas (default TK cuando paymentMethod no es crédito, TC cuando sí); registrar como follow-up si se vuelve dolor real.

## Migration Plan

1. **PR único** (sin feature flag): la migración + el seed + cambios FE viajan juntos. Razón: `RECIBO → RB` es BREAKING y un flag aquí complica más de lo que ayuda en esta fase del proyecto.
2. **Pasos de despliegue (orden estricto)**:
   1. Merge a `master` y CI verde.
   2. `npx prisma migrate deploy` aplica `add_folios_scope_column`.
   3. `npm run seed:folios` ejecutado contra el ambiente target. Si aborta por FKs, el operador limpia manualmente y re-corre.
   4. `npm run build` y deploy del FE (lleva ya las llamadas con `scope=POS` / `scope=OPERATIONS`).
3. **Rollback**:
   - Revertir el deploy del FE primero (vuelve a buscar `RECIBO`).
   - Re-insertar `RECIBO` con `INSERT INTO folios (..., scope) VALUES (..., 'OPERATIONS')`.
   - `prisma migrate resolve --rolled-back add_folios_scope_column` y `ALTER TABLE folios DROP COLUMN scope`.
   - Revertir el PR del backend.
   - Caveat: `current_number` de `RB` se pierde (vuelve a 0 al re-insertar RECIBO desde cero). En la práctica, si el rollback ocurre en horas, el conteo perdido es mínimo (≤N abonos del día).

## Open Questions

- ¿Conviene exponer `scope` en la URL del catálogo (`/catalogs/folios?scope=POS`)? No por ahora; el catálogo admin lista todos y el filtro vive en los flujos consumidores.
- ¿El módulo `transfers` (cuando se construya) debería pedir `scope='INVENTORY'` estrictamente, o ampliar a `[INVENTORY, OPERATIONS]` para permitir folios genéricos? Se decide cuando exista el módulo; por ahora `TS` queda como única opción de `INVENTORY`.
- ¿Se necesita una columna `is_default` para indicar "este es el folio default de mi scope"? Hoy el FE hace fallback por `code === 'RB'` (en pagos) o `code === 'COT'` (en quotes). Si llega un segundo folio del mismo scope, el FE necesita una regla. Cuando ocurra, agregamos `Folio.isDefault` con partial unique por scope. Out of scope acá.
