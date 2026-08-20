## 1. Generador (fuente de verdad)

- [x] 1.1 En `prisma/seeds/data/generate-inventory-data.ts`, agregar `UNIT_CODE_MAP` (`PZA`→`H87`, `NA`→`ACT`), `DEFAULT_UNIT_CODE = "H87"` y la función `resolveUnitCode(raw)` con `console.warn` para valores no mapeados.
- [x] 1.2 Reemplazar la línea `const unit = String(row["Unidad"] ?? "PZA").trim() || "PZA";` por `const unit = resolveUnitCode(row["Unidad"]);`.

## 2. Regeneración de datos

- [x] 2.1 Correr `npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventory-data.ts` contra el Excel fuente local.
- [x] 2.2 Verificar en el log del comando: 582 productos, 0 omitidos, 0 colisiones (mismos conteos que antes del cambio) y sin `console.warn` de "Unidad no mapeada" inesperados.
- [x] 2.3 Revisar el diff de `prisma/seeds/data/inventario-agrisas-v2.ts`: comparación programática por `code` confirma 580 filas `PZA→H87`, 2 filas `NA→ACT`, y todos los demás campos (`name`, `prices`, `departmentCode`, `satProductCode`, `ivaRate`, `iepsRate`, `quantity`) con el mismo valor. Nota: 3 filas muestran `satProductCode: null` explícito donde antes la clave estaba simplemente omitida (drift pre-existente del generador, no introducido por este cambio — mismo valor semántico, `row.satProductCode ?? null` en el seeder trata ambos casos igual).

## 3. Propagación a base de datos

- [x] 3.1 Correr `npm run seed:inventory` en el entorno de desarrollo.
- [x] 3.2 Verificar en `/catalogs/products` que la columna de unidad muestra "Pieza" (antes "PZA") y "Actividad" (antes "NA") para los productos afectados.

## 4. Verificación

- [x] 4.1 Correr `npm test` — si algún fixture de test referencia literalmente `"PZA"`/`"NA"` en datos de este seeder, actualizarlo a la clave nueva.
- [x] 4.2 Correr `npm run build` para confirmar tipos.
- [x] 4.3 Confirmar contra `openspec/changes/sat-unit-code-inventory-seed/specs/inventory-seed-data/spec.md` que los 4 requirements con sus escenarios quedan satisfechos.
