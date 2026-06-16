# Spec: keyboard-navigation

## Purpose

Proveer navegación por teclado accesible (patrón *roving tabindex*) en todas las tablas y grids del panel de administración, mediante los hooks reutilizables `useTableKeyboard` y `useGridKeyboard`.

---

## Requirements

### Requirement: Hook useTableKeyboard para navegación de filas con teclado

El sistema SHALL proveer el hook `useTableKeyboard<T>(items: T[], onEnter: (item: T, index: number) => void)` en `app/_hooks/useTableKeyboard.ts`. El hook SHALL implementar el patrón *roving tabindex*: la fila actualmente enfocada tendrá `tabIndex={0}`; el resto `tabIndex={-1}`. El hook SHALL devolver `getRowProps(index: number)` que retorna `{ tabIndex, ref, onKeyDown, "aria-selected" }` para ser aplicado a cada `<tr>`. Las teclas ArrowDown y ArrowUp SHALL mover el foco a la fila siguiente o anterior (sin salirse de los límites). La tecla Enter SHALL llamar a `onEnter(items[index], index)`. Cualquier otra tecla SHALL propagarse normalmente sin prevenir el comportamiento por defecto.

#### Scenario: Navegación con ArrowDown

- **WHEN** el usuario tiene el foco en la fila `i` y presiona ArrowDown
- **THEN** el foco se mueve a la fila `i+1`; si `i` es la última fila el foco no se mueve

#### Scenario: Navegación con ArrowUp

- **WHEN** el usuario tiene el foco en la fila `i` y presiona ArrowUp
- **THEN** el foco se mueve a la fila `i-1`; si `i` es la primera fila el foco no se mueve

#### Scenario: Enter activa la acción principal

- **WHEN** el usuario tiene el foco en la fila `i` y presiona Enter
- **THEN** se invoca `onEnter(items[i], i)` y el evento no hace scroll ni submit de formulario

#### Scenario: Hook con items vacíos no falla

- **WHEN** `items` es un array vacío
- **THEN** el hook no lanza excepciones y `getRowProps` no es llamado

---

### Requirement: Hook useGridKeyboard para navegación en grids de tarjetas

El sistema SHALL proveer el hook `useGridKeyboard<T>(items: T[], columns: number, onEnter: (item: T, index: number) => void)` en `app/_hooks/useGridKeyboard.ts`. El hook SHALL implementar roving tabindex sobre elementos `<div>` o `<button>` (no `<tr>`). ArrowDown/ArrowUp SHALL mover el foco `columns` posiciones hacia adelante/atrás. ArrowLeft/ArrowRight SHALL mover 1 posición (sin salir del límite del array). Enter SHALL llamar `onEnter`. El hook SHALL devolver `getItemProps(index: number)` con `{ tabIndex, ref, onKeyDown }`.

#### Scenario: ArrowDown en grid de 4 columnas mueve al item de la fila siguiente

- **WHEN** el foco está en el ítem con índice `i` de un grid de 4 columnas y el usuario presiona ArrowDown
- **THEN** el foco se mueve al ítem con índice `i + 4` (o al último si no existe)

#### Scenario: Enter en tarjeta de producto activa onEnter

- **WHEN** el usuario enfoca una tarjeta de producto en el grid del POS y presiona Enter
- **THEN** se invoca `onEnter(items[i], i)` que abre el diálogo de selección de precio / agrega al carrito

---

### Requirement: Navegación por teclado en tablas de catálogos con modal de edición

Las tablas `FoliosTable`, `PaymentMethodsTable`, `DepartmentsTable`, `BranchesTable`, `ProvidersTable` SHALL aceptar la prop opcional `onEnter?: (item: T) => void`. Cuando `onEnter` está presente, cada `<tr>` SHALL aplicar los props de `useTableKeyboard` (tabIndex, ref, onKeyDown). Presionar Enter SHALL llamar `onEnter(item)`. Los padres (`FoliosPage`, etc.) SHALL pasar `onEnter={onEdit}` cuando el usuario tenga permiso de escritura (`canWrite`), y omitir la prop cuando no tenga.

#### Scenario: Enter abre modal de edición en tabla de Folios

- **WHEN** el usuario con `folios:write` tiene el foco en una fila de `FoliosTable` y presiona Enter
- **THEN** se abre el modal de edición para ese folio (equivalente a hacer click en el botón "Editar")

#### Scenario: Sin permiso de escritura no hay acción al presionar Enter

- **WHEN** el usuario sin `folios:write` navega con flechas en `FoliosTable` y presiona Enter
- **THEN** no ocurre ninguna acción (el padre no pasa `onEnter`)

---

### Requirement: Navegación por teclado en tabla de Productos (catálogo)

`ProductsTable` SHALL aceptar la prop opcional `onEnter?: (item: Product) => void`. El padre (`ProductsListPage`) SHALL pasar `onEnter={(p) => router.push(\`/catalogs/products/${p.id}\`)}`. Presionar Enter SHALL navegar al detalle del producto.

#### Scenario: Enter en tabla de Productos navega al detalle

- **WHEN** el usuario tiene el foco en una fila de `ProductsTable` y presiona Enter
- **THEN** la navegación va a `/catalogs/products/[id]` del producto enfocado

---

### Requirement: Navegación por teclado en tabs de detalle de Producto

`ProductPricesTab` y `ProductDosificationsTab` SHALL aplicar `useTableKeyboard` a sus tablas internas. Presionar Enter en una fila SHALL abrir el modal de edición correspondiente, si el usuario tiene `products:write`.

#### Scenario: Enter en lista de precios abre modal de edición de precio

- **WHEN** el usuario con `products:write` tiene el foco en una fila de precios y presiona Enter
- **THEN** se abre el modal de edición de ese precio

#### Scenario: Enter en lista de dosificaciones abre modal de edición

- **WHEN** el usuario con `products:write` tiene el foco en una fila de dosificaciones y presiona Enter
- **THEN** se abre el modal de edición de esa dosificación

---

### Requirement: Navegación por teclado en tablas de listado con página de detalle

Las tablas `SalesTable`, `QuotesTable`, `ReturnsTable`, `PaymentsTable` SHALL aceptar `onEnter?: (item: T) => void`. Los padres (`SalesListPage`, `QuotesListPage`, `ReturnsListPage`, `PaymentsListPage`) SHALL pasar `onEnter={(item) => router.push(\`/<módulo>/${item.id}\`)}`.

#### Scenario: Enter en SalesTable navega al detalle de venta

- **WHEN** el usuario tiene el foco en una fila de `SalesTable` y presiona Enter
- **THEN** la navegación va a `/sales/[id]` de la venta enfocada

#### Scenario: Enter en QuotesTable navega al detalle de cotización

- **WHEN** el usuario tiene el foco en una fila de `QuotesTable` y presiona Enter
- **THEN** la navegación va a `/quotes/[id]`

#### Scenario: Enter en ReturnsTable navega al detalle de devolución

- **WHEN** el usuario tiene el foco en una fila de `ReturnsTable` y presiona Enter
- **THEN** la navegación va a `/returns/[id]`

#### Scenario: Enter en PaymentsTable navega al detalle de abono

- **WHEN** el usuario tiene el foco en una fila de `PaymentsTable` y presiona Enter
- **THEN** la navegación va a `/payments/[id]`

---

### Requirement: Navegación por teclado en InventoryTable

`InventoryTable` SHALL aceptar `onEnter?: (item: InventoryItem) => void`. El padre SHALL pasar `onEnter={onAdjust}` cuando el usuario tenga `inventory:write`. Presionar Enter SHALL abrir el modal de ajuste para ese ítem.

#### Scenario: Enter en InventoryTable abre modal de ajuste

- **WHEN** el usuario con `inventory:write` tiene el foco en una fila de `InventoryTable` y presiona Enter
- **THEN** se abre el modal de ajuste para ese ítem de inventario

---

### Requirement: Navegación por teclado en UsersTable

`UsersTable` SHALL aceptar `onEnter?: (item: User) => void`. El padre SHALL pasar `onEnter={onEdit}` cuando `users:write`. Presionar Enter SHALL abrir el modal de edición.

#### Scenario: Enter en UsersTable abre modal de edición

- **WHEN** el usuario con `users:write` tiene el foco en una fila de `UsersTable` y presiona Enter
- **THEN** se abre el modal de edición de ese usuario

---

### Requirement: Navegación por teclado en grid de productos del POS

`ProductCatalogGrid` SHALL aceptar `onEnter?: (item: ProductDto, index: number) => void` y usar `useGridKeyboard` con `columns` derivado del breakpoint actual (4 por defecto para `md` y superior, 2 para `sm`). `ProductCatalogPanel` SHALL pasar `onEnter={onAddProduct}`.

#### Scenario: Enter en tarjeta de producto en el POS agrega al carrito

- **WHEN** el usuario tiene el foco en una tarjeta de producto del POS y presiona Enter
- **THEN** se invoca `onAddProduct(product)` (mismo efecto que hacer click en la tarjeta)

#### Scenario: ArrowDown mueve el foco a la tarjeta de la fila siguiente

- **WHEN** el foco está en la tarjeta con índice `i` y el usuario presiona ArrowDown
- **THEN** el foco se mueve a la tarjeta con índice `i + columns`
