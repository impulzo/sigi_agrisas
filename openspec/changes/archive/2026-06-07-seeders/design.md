## Context

`prisma/seed.ts` ya siembra RBAC (40 permisos + 3 roles) de forma idempotente vía `prisma.$transaction` con `upsert`. El cliente acaba de entregar `INVENTARIO PARA SISTEMA NUEVO.xlsx` con su catálogo real (491 productos × 35 departamentos). El Excel tiene 1 hoja (`Hoja1`), 7 columnas (`CLAVE`, `Nombre`, `Unidad`, `SerLibres`, `Iva`, `Ieps`, `NombreDepartamento`) y 526 filas de las cuales 35 son encabezados de sección con todo vacío salvo `CLAVE`. Los modelos Prisma `Department`, `Product`, `ProductPrice`, `Branch` y `BranchInventory` ya soportan toda la data sin migración nueva.

Restricciones relevantes del dominio:
- `Product.code` debe matchear `^[A-Z0-9_]{1,32}$` y es inmutable tras creación.
- `Product.ivaRate` / `iepsRate` son `Decimal(5,4)` y el rango canónico es `0–1` (no porcentaje entero).
- Existe un partial unique `product_default_price_idx` que permite a lo sumo un `ProductPrice.isDefault = true` por producto.
- Existe un partial unique `branches_hq_idx` que permite a lo sumo una `Branch.isHeadquarters = true`.
- `BranchInventory` tiene composite unique `(branchId, productId)`; las quantities deben respetar el CHECK `quantity >= 0` (el admin no genera stock negativo; sólo el POS lo permite vía `$executeRaw`).

## Goals / Non-Goals

**Goals:**
- Cargar el catálogo entero del Excel en una sola corrida (`npm run seed:inventory`).
- Ser estrictamente idempotente: ejecutar N veces produce el mismo estado y no pisa stock real ni precios ya editados.
- Reportar en consola filas saltadas (códigos inválidos, nombre vacío) sin abortar el seed completo.
- Mantener `prisma/seed.ts` (RBAC) intacto; los dos seeds son independientes.
- No requerir migración de Prisma ni cambios de schema.

**Non-Goals:**
- Importar stock real (quantity inicial es 0; el usuario ajusta luego vía `/inventory`).
- Importar precios reales del cliente (placeholder $0; el usuario captura los reales por `/catalogs/products/[id]`).
- Crear múltiples sucursales (solo Matriz; las sucursales adicionales se crean por UI).
- Sincronizar el Excel de forma continua (este es un seed de carga inicial, no un ETL).
- Cubrir el caso en que el cliente entregue otro Excel con esquema distinto; el script asume las 7 columnas conocidas.

## Decisions

### D1 — Librería de parseo Excel: `xlsx` (SheetJS)

- **Elegida**: `xlsx` como `devDependency`.
- **Alternativas**: `exceljs` (más pesada, API streaming), `node-xlsx` (wrapper limitado), convertir manualmente a CSV (frágil).
- **Razón**: `xlsx` está madura, sin deps nativas, suficiente para 526 filas, y se carga sólo cuando se ejecuta el seed (no impacta el bundle de la app).

### D2 — Mapeo Iva/Ieps de porcentaje entero a tasa decimal

- **Elegido**: dividir entre 100 con `Prisma.Decimal` y `.toDecimalPlaces(4)`. `16 → 0.1600`, `6 → 0.0600`.
- **Alternativa**: guardar el valor literal del Excel (`16`) y dejar que el controller normalice. No: el seed escribe directo en Prisma sin pasar por el controller, así que la normalización ocurre acá.
- **Razón**: alinea con la convención del dominio (`ivaRate ∈ [0, 1]`) sin acoplar al endpoint HTTP. Usar `Decimal` evita errores de coma flotante (`0.16` exacto, no `0.15999…`).

### D3 — Política de normalización suave de códigos (revisada)

- **Versión inicial (descartada)**: política estricta — si `CLAVE.trim().toUpperCase()` no matcheaba `^[A-Z0-9_]{1,32}$`, se saltaba la fila. La primera corrida real arrojó 63 filas saltadas (CLAVES con `-`, `*`, `Ñ`), todas legítimas del cliente.
- **Versión vigente**: normalización suave en `normalizeProductCode(raw)` — NFD strip diacríticos (`Ñ → N`) → trim → upper → `[\s\-]+ → _` → eliminar `*` → eliminar otros chars fuera de `[A-Z0-9_]` → truncar 32. Validar contra `^[A-Z0-9_]{1,32}$` y saltar sólo si el resultado queda vacío o sigue inválido.
- **Mitigación de transparencia**: cuando `raw ≠ normalizado`, el script emite `console.warn` con el mapeo `CLAVE → code` para que el operador pueda reconciliar manualmente con el sistema viejo del cliente si lo necesita.
- **Detección de colisiones**: un `Set<code>` en memoria rastrea codes ya tomados en la corrida. Si dos CLAVES distintas normalizan al mismo code, la segunda se omite con warning (first-wins). Este caso es raro pero posible (ej. `FOO-BAR` y `FOO_BAR`).
- **Razón del cambio**: la política estricta dejaba fuera ~13% del catálogo (63 de 491 productos), todos de la línea "OUT" del cliente. Tras revisar la corrida con el usuario, optó por normalización suave + reporte explícito, ganando cobertura sin perder trazabilidad.

### D4 — Precio default placeholder en $0

- **Elegida**: por cada producto sembrado, garantizar exactamente un `ProductPrice` con `name="Default"`, `price=0`, `isDefault=true`.
- **Alternativa**: dejar productos sin precios. Descartada porque el POS no podría vender ni listar líneas con precio.
- **Razón**: hace que el catálogo sea inmediatamente navegable. El operador edita el precio antes de habilitar ventas. **Idempotencia**: usar `findFirst({ productId, isDefault: true })` + `create` sólo si no existe — nunca pisar un precio default ya capturado por el usuario.

### D5 — Sucursal Matriz fija (`code = "MATRIZ"`)

- **Elegida**: crear/upsert una sola sucursal con `code="MATRIZ"`, `name="Matriz"`, `isHeadquarters=true`.
- **Alternativa**: pedir nombre/code por env var. Descartado por simplicidad inicial; el usuario renombra desde UI si lo desea (sólo el `code` queda inmutable).
- **Razón**: el POS y los flujos scoped por sucursal requieren al menos una branch; HQ desbloquea las operaciones "todas las sucursales" del admin. Si ya existe otra HQ con code distinto, el seed aborta para no violar `branches_hq_idx`.

### D6 — BranchInventory inicial en 0 con `update: {}`

- **Elegida**: `upsert` con composite key `(branchId, productId)` y `update: {}` (no-op en re-ejecuciones).
- **Alternativa**: `update: { quantity: 0, reservedQuantity: 0, reorderPoint: 0 }`. Descartada porque pisaría stock real en re-ejecuciones.
- **Razón**: idempotencia segura. La primera corrida crea filas en 0; las siguientes no tocan nada si ya existen.

### D7 — Archivo separado en `prisma/seeds/inventory.ts`

- **Elegido**: `prisma/seeds/inventory.ts` + script `seed:inventory` separado del `seed` de RBAC.
- **Alternativa**: extender `prisma/seed.ts`. Descartada para no acoplar RBAC con catálogo del cliente (RBAC corre en CI y tests; el de inventario es operativo manual).
- **Razón**: separación de responsabilidades. Cada seed se invoca según el contexto.

### D8 — Una sola conexión Prisma + loop secuencial de upserts

- **Elegido**: instanciar `PrismaClient` una vez; ejecutar la etapa de departamentos+branch en `$transaction([...])` y luego un `for` secuencial de upserts por producto.
- **Alternativa**: una mega-transacción de 1500+ operaciones. Descartada porque el limite default de Prisma `transactionOptions.maxWait` y los timeouts del pooler pgbouncer (puerto 6543) pueden romper. 491 upserts secuenciales tardan ~5-15s y cada uno es atómico.
- **Razón**: simplicidad y robustez. Si una fila falla, las anteriores ya están persistidas y la siguiente corrida las skippea por idempotencia.

## Risks / Trade-offs

- **[CLAVES inválidas en el Excel]** → mitigado por política estricta + reporte. El operador reconcilia manualmente las pocas (si las hay) saltadas.
- **[Otra HQ ya existe en DB]** → el seed detecta con `findFirst({ isHeadquarters: true, NOT: { code: "MATRIZ" } })` y aborta con mensaje explícito. El usuario decide si renombra/desmarca y re-ejecuta.
- **[Nombres de departamento con espacios trailing]** → normalizar la key del `Map<nombreOriginal, id>` con `trim()` antes de buscar.
- **[Excel con esquema futuro distinto]** → el parser sólo lee las 7 columnas conocidas e ignora el resto. Si una columna requerida falta, abortar con error claro al iniciar.
- **[Re-ejecutar pisa cambios manuales]** → mitigado por `update: {}` en `BranchInventory` y `findFirst+create` en `ProductPrice`. El nombre del producto y `ivaRate`/`iepsRate` sí se sobre-escriben (Excel es la fuente canónica de catálogo).
- **[ts-node no instalado globalmente]** → el script usa `ts-node` desde `devDependencies`; ya está en el `package.json` (verificado).
- **[xlsx vulnerabilidades conocidas]** → el script corre en el entorno del operador con un Excel propio (no input externo no confiable). El riesgo de prototype pollution de versiones antiguas no aplica acá.

## Migration Plan

No hay migración de schema. Pasos de despliegue:
1. `git pull` (trae el script + cambios en `package.json`).
2. `npm install` (instala `xlsx`).
3. `npx prisma generate` (no estrictamente necesario; el schema no cambia).
4. `npm run seed:inventory`.
5. Verificar conteos en consola y vía UI (ver tasks.md).

Rollback: no hay rollback automático. Si el seed contamina la DB, vaciar manualmente las tablas `branch_inventory`, `product_prices`, `products`, `departments` y `branches` no-deseadas vía `prisma studio` o `psql`. En dev, `npx prisma migrate reset` resetea todo (también pisa RBAC; re-ejecutar `npm run seed` después).

## Open Questions

- ¿El cliente entregará nuevos lotes de productos en el futuro como Excel? Si sí, conviene extender el script para tomar el path por arg `--file` y mantener el script reusable. Hoy se hardcodea el path al Excel actual.
- ¿Queremos un flag `--dry-run` que valide sin escribir? No para esta primera iteración; el operador puede revertir limpiando tablas. Lo añadimos si surge necesidad.
