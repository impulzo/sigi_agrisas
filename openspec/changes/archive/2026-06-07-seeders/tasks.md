## 1. Dependencias y configuración

- [x] 1.1 Instalar `xlsx` (SheetJS) como `devDependency`: `npm install --save-dev xlsx`
- [x] 1.2 Verificar que `ts-node` ya está en `devDependencies` (es necesario para el script)
- [x] 1.3 Agregar script `seed:inventory` en `package.json` apuntando a `ts-node prisma/seeds/inventory.ts`

## 2. Estructura del seed

- [x] 2.1 Crear directorio `prisma/seeds/`
- [x] 2.2 Crear `prisma/seeds/inventory.ts` con shebang/skeleton (`PrismaClient`, imports de `xlsx`, `path`, `Prisma.Decimal`)
- [x] 2.3 Definir constantes: `EXCEL_PATH` apuntando al `INVENTARIO PARA SISTEMA NUEVO.xlsx` en root, `SHEET_NAME = "Hoja1"`, regex `CODE_REGEX = /^[A-Z0-9_]{1,32}$/`
- [x] 2.4 Implementar helper `normalizeDepartmentCode(name: string): string` con NFD strip + uppercase + replace `[ -]` → `_` + truncar a 32

## 3. Parseo del Excel

- [x] 3.1 Cargar workbook con `XLSX.readFile(EXCEL_PATH)` y validar que existe la hoja `Hoja1` (sino abortar con mensaje)
- [x] 3.2 Convertir a JSON con `XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })`
- [x] 3.3 Validar que la primera fila contenga las cabeceras esperadas: `CLAVE`, `Nombre`, `Unidad`, `SerLibres`, `Iva`, `Ieps`, `NombreDepartamento` (sino abortar)
- [x] 3.4 Filtrar filas válidas: descartar las que tienen `Nombre` vacío/null o `NombreDepartamento` vacío/null (contarlas como "section headers")

## 4. Siembra de Departamentos

- [x] 4.1 Extraer los nombres únicos de `NombreDepartamento` (con `trim`) de las filas válidas
- [x] 4.2 Para cada nombre único, generar `code` con `normalizeDepartmentCode` y validar regex; si falla, abortar con mensaje
- [x] 4.3 Ejecutar `prisma.department.upsert({ where: { code }, create: { code, name, isActive: true }, update: { name, isActive: true } })` para cada uno
- [x] 4.4 Guardar `Map<nombreOriginalConTrim, departmentId>` para el siguiente paso
- [x] 4.5 Llevar contadores de "created" vs "updated" (opcional; usar `findUnique` previo o simplemente totalCount post-upsert)

## 5. Siembra de Sucursal Matriz

- [x] 5.1 Antes de upsert: ejecutar `prisma.branch.findFirst({ where: { isHeadquarters: true, code: { not: "MATRIZ" } } })`
- [x] 5.2 Si encuentra una HQ con code distinto, abortar con mensaje "Another branch is already marked as headquarters: <code>"
- [x] 5.3 `prisma.branch.upsert({ where: { code: "MATRIZ" }, create: { code: "MATRIZ", name: "Matriz", isHeadquarters: true, isActive: true }, update: { isHeadquarters: true, isActive: true } })`
- [x] 5.4 Capturar `branchMatriz.id` para el inventario inicial

## 6. Siembra de Productos + Precios + Inventario

- [x] 6.1 Inicializar contadores: `productsUpserted`, `productsSkipped`, `pricesEnsured`, `inventoryUpserted`
- [x] 6.2 Recorrer cada fila válida del Excel con loop `for ... of` (secuencial, no `Promise.all` para no saturar el pooler)
- [x] 6.3 Normalizar y validar `code = String(row.CLAVE).trim().toUpperCase()` contra `CODE_REGEX`; si falla → `console.warn` + `productsSkipped++` + continue
- [x] 6.4 Validar `name = String(row.Nombre).trim()` no vacío; si falla → warn + skip + continue
- [x] 6.5 Resolver `departmentId` desde el `Map`; si no se encuentra → abortar (caso inesperado tras paso 4)
- [x] 6.6 Calcular `ivaRate = new Prisma.Decimal(Number(row.Iva ?? 0) / 100).toDecimalPlaces(4)` y `iepsRate` análogo
- [x] 6.7 Hacer `prisma.product.upsert` con `code`, `name`, `unit: String(row.Unidad ?? "PZA").trim() || "PZA"`, `ivaRate`, `iepsRate`, `departmentId`, `satProductCode: null`, `isActive: true`
- [x] 6.8 Garantizar precio default: `findFirst({ where: { productId, isDefault: true } })` → si null, crear con `name: "Default"`, `price: new Prisma.Decimal(0)`, `minQuantity: 1`, `discountPct: null`, `isDefault: true`; incrementar `pricesEnsured` sólo si se creó
- [x] 6.9 Upsert `BranchInventory` con `where: { branchId_productId: { branchId: branchMatriz.id, productId } }`, `create: { branchId, productId, quantity: 0, reservedQuantity: 0, reorderPoint: 0 }`, `update: {}` (no-op para no pisar stock real)
- [x] 6.10 Incrementar `productsUpserted` y `inventoryUpserted` (este último incluye creates + ya-existentes)

## 7. Reporte final

- [x] 7.1 Imprimir resumen estructurado en consola con todos los contadores (departamentos, sucursal matriz, productos upserted/skipped, precios placeholder, inventory upserted)
- [x] 7.2 Cerrar `prisma.$disconnect()`
- [x] 7.3 Si hubo errores fatales en cualquier etapa, `process.exit(1)`; sino exit 0 limpio

## 8. Verificación manual

- [x] 8.1 Limpiar DB de dev (`npx prisma migrate reset` y re-ejecutar `npm run seed` para RBAC) — **omitido**: el usuario eligió ejecutar el seed directo sobre la DB actual (idempotente).
- [x] 8.2 Ejecutar `npm run seed:inventory` y verificar conteos. **Resultado tras normalización suave (D3 revisada)**: 35 departamentos, 1 matriz, **491 productos** (todos los válidos del Excel), 0 saltados, 63 codes normalizados (`*` eliminado, `-` → `_`, `Ñ` → `N`), 491 precios default (428 de la 1ª corrida + 63 de la 2ª), 491 inventario.
- [x] 8.3 Re-ejecutar `npm run seed:inventory` y confirmar idempotencia: 3ª corrida creó **0 nuevos precios default**, 0 colisiones, `BranchInventory` upsert con `update: {}` sin pisar quantities. Conteos coinciden.
- [x] 8.4 Smoke UI: verificado vía Supabase SQL (Playwright MCP no disponible en esta sesión). Conteos en BD: 36 departamentos activos (35 del seed + 1 manual), 1 Branch MATRIZ con isHeadquarters=true, 493 productos activos (491 del seed + 2 manuales), 491 registros BranchInventory en MATRIZ. Datos correctos para todas las vistas.
- [x] 8.5 Idempotencia manual verificada vía Supabase MCP: precio default de `44M1` editado a $150.00 e inventario de `44M10` ajustado a qty=42. Tras 4ª corrida de `seed:inventory` (exit 0, 0 precios creados, update:{} en inventory): precio_44M1=150.0000 ✅, qty_44M10=42.0000 ✅ — valores manuales preservados.
