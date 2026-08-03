## Context

`prisma/seeds/` ya contiene seeders idempotentes para RBAC (`prisma/seeds/rbac.ts`) y folios (`prisma/seeds/folios.ts`). El patrón establecido: upsert por clave única, reporte en stdout, transacción Prisma. El modelo `Product` y `ProductPrice` ya existen. No existe seeder de inventario real.

## Goals / Non-Goals

**Goals:**
- Script idempotente `prisma/seeds/inventory.ts` que carga departamentos, sucursal matriz, productos, **precios multi-tier**, **satProductCode** e **inventario inicial** desde datos del negocio embebidos en TS
- Reporte de created/updated/skipped/errors en stdout
- Comando `npm run seed:inventory`

**Non-Goals:**
- Cargar `BranchInventory` en sucursales distintas a la matriz — la existencia inicial va solo a `MATRIZ`
- UI para importar inventario
- Migración de esquema

## Decisions

### D-1: Datos en archivo TypeScript de constantes, no JSON

**Decisión**: `prisma/seeds/data/inventario-agrisas-v2.ts` exporta `const INVENTORY_DATA: InventoryRow[]` y `const DEPARTMENTS: DepartmentRow[]`. Generado por `generate-inventory-data.ts` desde `INVENTARIO AGRISAS 2.0.xlsx`; **el Excel no se lee en runtime**.

**Alternativa**: leer el Excel directamente en el seeder (como hacía la versión previa) o JSON/CSV.

**Razón**: embeber en TS permite tipado estático, hace el seed reproducible sin el binario Excel, y es consistente con el resto de seeders. El generador centraliza el parseo/normalización en un solo lugar re-ejecutable.

### D-2: Upsert por `code` de producto

`code` es PK de negocio (único, inmutable tras creación). Upsert: `prisma.product.upsert({ where: { code }, create: {...}, update: {...} })`.

### D-3: Precios multi-tier — un `ProductPrice` por columna `/precio/i`

El Excel trae 4 columnas de precio: `PRECIO PUBLICO` (default), `PRECIO SUBDIS 10%`, `PRECIO DISTRI 15%`, `PRECIO 4`. El generador detecta dinámicamente cualquier header que matchee `/precio/i` y produce un tier (`name` = header en Title Case, ej. `Precio Publico`). Upsert por `(productId, name)`.

- **`Precio Publico` siempre se crea** como `isDefault: true`, aunque su valor sea 0 (el POS necesita un precio default para listar/vender; el operador lo corrige luego).
- Los tiers extra se incluyen **solo si valor `> 0`** (evita sembrar precios placeholder en 0).

### D-4: Solo un precio `isDefault` por producto

El índice parcial único `product_default_price_idx` (`WHERE is_default = TRUE`) admite un solo default por producto. Antes de upsertar los precios del archivo, el engine: (1) `updateMany({ productId, isDefault: true } → { isDefault: false })` y (2) `deleteMany({ productId, name: "Default" })` para eliminar el placeholder legacy del seeder anterior. Sin esto, una re-corrida sobre una BD ya sembrada revienta con `23505`. Además, si el archivo marca múltiples defaults, el engine respeta el primero y degrada los demás.

### D-5: Upserts idempotentes sin transacción, aislamiento por producto

El engine NO envuelve los upserts en `prisma.$transaction`. El catálogo (~582 productos × ~10 round-trips c/u) excede el timeout de transacción interactiva de Prisma (5 s) sobre el pooler PgBouncer → `Transaction already closed`. Como todos los writes son upserts idempotentes, la atomicidad por lote no aporta: un try/catch por producto (y por precio/inventario) aísla fallos sin perder progreso y el seeder es re-ejecutable. Un fallo a mitad de un producto se reporta en `errors` y la siguiente fila continúa.

### D-6: `satProductCode` desde `Codigo SAT`

El generador toma `Codigo SAT` (entero de 8 dígitos) como `string`. Si falta o no cumple `^\d{8}$`, se omite (→ `satProductCode: null` en `Product`).

### D-7: `quantity` desde `Existencia` → `BranchInventory` en matriz

El generador toma `Existencia` como `quantity` y el engine la upsertea en `branch_inventory` para la sucursal `MATRIZ`. **Permite negativos y 0** (la migración POS eliminó el CHECK `quantity >= 0`; algunas existencias del Excel son negativas).

### D-8: `Iva`/`Ieps` porcentaje entero → tasa decimal

El generador divide `Iva`/`Ieps` entre 100 y redondea a 4 decimales (`16 → 0.16`, `6 → 0.06`), alineado con la convención de dominio (`ivaRate ∈ [0, 1]`). El seeder escribe directo en Prisma sin pasar por el controller, así que la normalización ocurre en generación.

## Risks / Trade-offs

- **[Riesgo] Archivo no disponible en repo**: si `inventario-agrisas-v2.ts` no existe, el seeder falla con mensaje `"Error: Archivo de inventario no encontrado en prisma/seeds/data/inventario-agrisas-v2.ts. Colócalo antes de ejecutar."`.
- **[Trade-off] No se eliminan productos obsoletos**: el seeder es upsert-only; productos en BD no presentes en el archivo fuente NO se borran (safe).
- **[Riesgo] Departamentos no existentes**: si el archivo referencia `departmentId`/`departmentCode` que no existe en BD, el seeder lo omite (no falla) y reporta como `skipped` con razón.

## Migration Plan

Sin migración de BD. Solo archivos nuevos.

## Open Questions

_Resueltas:_
- Departamentos: se siembran desde `DEPARTMENTS` (derivado de `NombreDepartamento`, normalizado a `code`); el seeder los upsertea antes que los productos.
- `BranchInventory`: sí se carga la existencia inicial (`Existencia`) en la sucursal `MATRIZ` (D-7).
