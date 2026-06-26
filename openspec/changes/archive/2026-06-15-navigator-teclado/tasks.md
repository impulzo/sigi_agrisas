## 1. Hook useTableKeyboard

- [x] 1.1 Crear `app/_hooks/useTableKeyboard.ts` con signatura `useTableKeyboard<T>(items: T[], onEnter: (item: T, index: number) => void)`. Implementar roving tabindex: array de refs `rowRefs`, `focusedIndex` state inicializado en 0. `getRowProps(index)` devuelve `{ tabIndex: index === focusedIndex ? 0 : -1, ref, onKeyDown, "aria-selected": index === focusedIndex }`. `onKeyDown`: ArrowDown → focus `min(i+1, len-1)` + update focusedIndex; ArrowUp → focus `max(i-1, 0)` + update focusedIndex; Enter → `onEnter(items[i], i)` con `e.preventDefault()`.

## 2. Hook useGridKeyboard

- [x] 2.1 Crear `app/_hooks/useGridKeyboard.ts` con signatura `useGridKeyboard<T>(items: T[], columns: number, onEnter: (item: T, index: number) => void)`. Misma estructura que `useTableKeyboard` pero refs son `HTMLDivElement | HTMLButtonElement`. ArrowDown → `i + columns` (clamped); ArrowUp → `i - columns` (clamped a 0); ArrowLeft → `max(i-1, 0)`; ArrowRight → `min(i+1, len-1)`. Enter → `onEnter(items[i], i)`. `getItemProps(index)` devuelve `{ tabIndex, ref, onKeyDown }`.

## 3. Catálogos con modal de edición

- [x] 3.1 `FoliosTable.tsx`: agregar prop `onEnter?: (item: Folio) => void`. Dentro del componente, llamar `useTableKeyboard(items, onEnter ?? (() => {}))` cuando `onEnter` está definido. Aplicar `{...getRowProps(index)}` a cada `<tr>`. El padre `FoliosPage` (o equivalente) pasa `onEnter={canWrite ? onEdit : undefined}`.
- [x] 3.2 `PaymentMethodsTable.tsx`: misma pauta que 3.1. Prop `onEnter?: (item: PaymentMethod) => void`. El padre pasa `onEnter={canWrite ? onEdit : undefined}`.
- [x] 3.3 `DepartmentsTable.tsx`: misma pauta. Prop `onEnter?: (item: Department) => void`. El padre pasa `onEnter={canWrite ? onEdit : undefined}`.
- [x] 3.4 `BranchesTable.tsx`: misma pauta. Prop `onEnter?: (item: Branch) => void`. El padre pasa `onEnter={canWrite ? onEdit : undefined}`.
- [x] 3.5 `ProvidersTable.tsx`: misma pauta. Prop `onEnter?: (item: Provider) => void`. El padre pasa `onEnter={canWrite ? onEdit : undefined}`.

## 4. Catálogo de Productos (navegación a detalle)

- [x] 4.1 `ProductsTable.tsx`: agregar prop `onEnter?: (item: Product) => void`. Aplicar `useTableKeyboard`. El padre (`ProductsListPage`) pasa `onEnter={(p) => router.push(\`/catalogs/products/${p.id}\`)}`.

## 5. Tabs de detalle de Producto

- [x] 5.1 `ProductPricesTab.tsx`: aplicar `useTableKeyboard` a la tabla de precios. El callback `onEnter` llama a `onEdit(price)` si `canWrite`. Si `!canWrite`, pasar `onEnter` vacío o `undefined`.
- [x] 5.2 `ProductDosificationsTab.tsx`: misma pauta que 5.1 para la tabla de dosificaciones.

## 6. Tablas de listado con página de detalle

- [x] 6.1 `SalesTable.tsx`: agregar prop `onEnter?: (item: SaleListItem) => void`. Aplicar `useTableKeyboard`. El padre `SalesListPage` pasa `onEnter={(s) => router.push(\`/sales/${s.id}\`)}`.
- [x] 6.2 `QuotesTable.tsx`: agregar prop `onEnter?: (item: QuoteListItem) => void`. El padre `QuotesListPage` pasa `onEnter={(q) => router.push(\`/quotes/${q.id}\`)}`.
- [x] 6.3 `ReturnsTable.tsx`: agregar prop `onEnter?: (item: ReturnListItem) => void`. El padre `ReturnsListPage` pasa `onEnter={(r) => router.push(\`/returns/${r.id}\`)}`.
- [x] 6.4 `PaymentsTable.tsx`: agregar prop `onEnter?: (item: PaymentListItem) => void`. El padre `PaymentsListPage` pasa `onEnter={(p) => router.push(\`/payments/${p.id}\`)}`.

## 7. InventoryTable

- [x] 7.1 `InventoryTable.tsx`: agregar prop `onEnter?: (item: InventoryItem) => void`. Aplicar `useTableKeyboard`. El padre pasa `onEnter={canWrite ? onAdjust : undefined}`.

## 8. UsersTable

- [x] 8.1 `UsersTable.tsx`: agregar prop `onEnter?: (item: User) => void`. Aplicar `useTableKeyboard`. El padre pasa `onEnter={canWrite ? onEdit : undefined}`.

## 9. POS — Grid de productos

- [x] 9.1 `ProductCatalogGrid.tsx`: agregar prop `onEnter?: (item: ProductDto, index: number) => void`. Aplicar `useGridKeyboard(items, 4, onEnter ?? (() => {}))` (columnas fijas en 4 — coincide con el grid `grid-cols-2 md:grid-cols-4` actual). Aplicar `{...getItemProps(index)}` a cada tarjeta de producto. Agregar `role="gridcell"` a las tarjetas y `role="grid"` al contenedor.
- [x] 9.2 `ProductCatalogPanel.tsx`: pasar `onEnter={onAddProduct}` a `ProductCatalogGrid`.

## 10. Verificación

- [x] 10.1 `npm run build` pasa sin errores TypeScript en `app/` y `src/`.
- [x] 10.2 Verificar en el navegador: en `FoliosTable` (u otra tabla con modal) se puede navegar con ↑/↓ y presionar Enter abre el modal de edición.
- [x] 10.3 Verificar en el navegador: en `SalesTable` (u otra tabla con detalle) Enter navega a la página de detalle.
- [x] 10.4 Verificar en el navegador: en el POS, con el grid de productos enfocado, ↑/↓ navegan entre filas de tarjetas y Enter agrega el producto al carrito.
- [x] 10.5 Verificar que el foco en tablas de solo-lectura (sin permiso de escritura) sigue funcionando con flechas aunque Enter no haga nada.
