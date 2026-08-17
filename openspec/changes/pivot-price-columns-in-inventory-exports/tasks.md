## 1. Servicio de dominio compartido

- [x] 1.1 Creado `src/modules/reports/domain/services/priceColumnNames.ts` — misma lógica que `InventoryPriceStockTable.tsx:18-28` (esa copia de la UI no se tocó).
- [x] 1.2 Creado `tests/unit/modules/reports/domain/services/priceColumnNames.test.ts` — 4 tests, todos en verde.

## 2. PDF pivotado

- [x] 2.1 `DepartmentPriceListReportPdf.tsx`: `PriceRows` anidado reemplazado por tabla plana por departamento — header Código/Producto/Unidad/Stock + columnas dinámicas por `priceColumnNames([dept])` (por sección, cada depto muestra solo sus propias listas), fila por producto, columnas de precio reusan el estilo `s.cell` ya existente (`flex: 1`) — no hizo falta estilo nuevo. Valor `"—"` cuando el producto no tiene esa lista.
- [x] 2.2 Subtotales por departamento y totales globales mantenidos sin cambio de estructura.

## 3. XLSX pivotado

- [x] 3.1 `buildDepartmentPriceListWorkbook.ts` reescrito: una fila por producto, header dinámico por departamento (`[Departamento, Código, Producto, Unidad, Stock, ...priceColumnNames([dept])]`, un header nuevo por sección de departamento ya que cada uno puede tener columnas distintas — consistente con el PDF), valor `"—"` cuando no aplica. Subtotales y totales mantenidos.

## 4. Tests de integración (controller)

- [x] 4.1 Sin cambio necesario: `DepartmentPriceListReportPdf` está mockeado (`() => null`) en este archivo de test — el test PDF existente ya cubre el contrato HTTP (Content-Type/Content-Disposition/`%PDF`) sin depender del JSX interno, que no se ejecuta en este suite.
- [x] 4.2 Agregado test "200 xlsx pivotea precios como columnas (una fila por producto, no por precio)": 2 precios en un producto + 1 producto sin la segunda lista, parseado con `XLSX.read`/`sheet_to_json`, verifica header dinámico `["Departamento","Código","Producto","Unidad","Stock","Mayoreo","Menudeo"]`, fila-por-producto y `"—"` cuando falta una lista.

## 5. Verificación

- [x] 5.1 `npm test` — 3325/3326 tests en verde. 1 falla en `tests/unit/ui/roles/blocks/RolesPage.test.tsx` (módulo `roles`, no tocado por este change) — confirmado flake de aislamiento entre suites: pasa en verde de forma aislada, y en corridas repetidas de la suite completa falla en un test distinto dentro del mismo archivo. Preexistente, no relacionado con `reports`/`inventory`.
- [x] 5.2 `npm run build` — sin errores de tipos (Node 20.20.2).
- [ ] 5.3 Manual: descargar PDF y Excel de `/reports/inventory` en ambos tabs (Por Departamento y Global) y confirmar que las columnas de precio coinciden con lo que ya muestra `InventoryPriceStockTable.tsx` en pantalla. — pendiente, requiere sesión de navegador (misma limitación de browser automation que Changes 1-3).
