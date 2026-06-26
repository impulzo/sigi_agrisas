# Spec: keyboard-navigation

## Purpose

Proveer navegación por teclado accesible (patrón *roving tabindex*) en todas las tablas, listas y el POS del panel de administración, mediante los hooks reutilizables `useTableKeyboard` y `useListKeyboard`.

---

## Requirements

### Requirement: Hook useTableKeyboard para navegación de filas con teclado

El sistema SHALL proveer el hook `useTableKeyboard<T>(items: T[], onEnter: (item: T, index: number) => void)` en `app/_hooks/useTableKeyboard.ts`. El hook SHALL implementar el patrón *roving tabindex*: la fila actualmente enfocada tendrá `tabIndex={0}`; el resto `tabIndex={-1}`. El hook SHALL devolver `getRowProps(index: number)` que retorna `{ tabIndex, ref, onKeyDown, onFocus, "aria-selected" }` para ser aplicado a cada `<tr>`. Las teclas ArrowDown y ArrowUp SHALL mover el foco a la fila siguiente o anterior. Cuando el foco está en la última fila y se presiona ArrowDown, si el caller proveyó el callback opcional `onPageDown?: () => void` (vía firma extendida) éste SHALL invocarse; análogo para ArrowUp en la primera fila con `onPageUp?: () => void`. La tecla Enter SHALL llamar a `onEnter(items[index], index)`. Cualquier otra tecla SHALL propagarse normalmente.

#### Scenario: Navegación con ArrowDown

- **WHEN** el usuario tiene el foco en la fila `i` y presiona ArrowDown
- **THEN** el foco se mueve a la fila `i+1`; si `i` es la última fila y no hay `onPageDown` el foco no se mueve

#### Scenario: Navegación con ArrowUp

- **WHEN** el usuario tiene el foco en la fila `i` y presiona ArrowUp
- **THEN** el foco se mueve a la fila `i-1`; si `i` es la primera fila y no hay `onPageUp` el foco no se mueve

#### Scenario: ArrowDown en última fila invoca onPageDown si fue provisto

- **WHEN** el foco está en la última fila, el caller proveyó `onPageDown` y el usuario presiona ArrowDown
- **THEN** se invoca `onPageDown()` (el caller es responsable de cambiar página y reposicionar foco)

#### Scenario: Enter activa la acción principal

- **WHEN** el usuario tiene el foco en la fila `i` y presiona Enter
- **THEN** se invoca `onEnter(items[i], i)` y el evento no hace scroll ni submit de formulario

#### Scenario: Hook con items vacíos no falla

- **WHEN** `items` es un array vacío
- **THEN** el hook no lanza excepciones y `getRowProps` no es llamado

---

### Requirement: Hook useListKeyboard para navegación de listas verticales con teclado

El sistema SHALL proveer el hook `useListKeyboard<T>(items: T[], onEnter: (item: T, index: number) => void)` en `app/_hooks/useListKeyboard.ts`. El hook SHALL implementar el patrón *roving tabindex* sobre elementos `HTMLElement` (no `<tr>`). El hook SHALL devolver `getItemProps(index: number)` con `{ tabIndex, ref, onKeyDown, "aria-selected" }`. Las teclas ArrowDown y ArrowUp SHALL mover el foco a la siguiente o anterior posición (sin salirse de los límites). La tecla Enter SHALL llamar a `onEnter(items[index], index)`. El hook SHALL exponer adicionalmente los callbacks opcionales `onPlus?: (item: T, index: number) => void`, `onMinus?: (item: T, index: number) => void`, `onDelete?: (item: T, index: number) => void`; cuando se proveen, las teclas `+`/`=`, `-`, `Delete`/`Backspace` respectivamente SHALL invocarlos y `preventDefault()`.

#### Scenario: ArrowDown mueve el foco al siguiente elemento de la lista

- **WHEN** el foco está en el elemento con índice `i` y el usuario presiona ArrowDown
- **THEN** el foco se mueve al elemento con índice `i+1`; si `i` es el último el foco no se mueve

#### Scenario: Enter invoca onEnter

- **WHEN** el foco está en un elemento de la lista y el usuario presiona Enter
- **THEN** se invoca `onEnter(items[i], i)` y el evento no propaga submit

#### Scenario: Tecla + invoca onPlus cuando se provee

- **WHEN** el hook recibe `onPlus` y el usuario presiona `+` o `=` en un elemento enfocado
- **THEN** se invoca `onPlus(items[i], i)` y se previene comportamiento por defecto

#### Scenario: Tecla Delete invoca onDelete cuando se provee

- **WHEN** el hook recibe `onDelete` y el usuario presiona `Delete` o `Backspace` en un elemento enfocado
- **THEN** se invoca `onDelete(items[i], i)` y se previene comportamiento por defecto

---

### Requirement: Tabla de productos del POS reemplaza al grid de tarjetas

`ProductCatalogTable` SHALL renderizar el catálogo del POS como `<table>` semántico con columnas `Código`, `Nombre`, `Departamento`, `Acción`. Cada `<tr>` SHALL recibir los props de `useTableKeyboard`. La tabla SHALL recibir `onAddProduct: (product: ProductDto) => void` y pasarlo como `onEnter` al hook. Click sobre la fila SHALL invocar `onAddProduct`. Las filas SHALL exponer foco visible vía `focus-visible:ring-2 ring-primary`. El componente legado `ProductCatalogGrid` (cards) NO SHALL ser usado en el POS.

#### Scenario: Enter en fila de producto abre selector de precio

- **WHEN** el usuario tiene el foco en una fila de `ProductCatalogTable` y presiona Enter
- **THEN** se invoca `onAddProduct(product)` que abre `PriceTierPicker` (mismo efecto que hacer click en la fila)

#### Scenario: ArrowDown en última fila avanza a la siguiente página

- **WHEN** el foco está en la última fila de la tabla, existe siguiente página y el usuario presiona ArrowDown
- **THEN** la tabla invoca `onPageChange(page+1)` y al renderizarse la nueva página el foco aterriza en la primera fila

#### Scenario: ArrowUp en primera fila retrocede a la página anterior

- **WHEN** el foco está en la primera fila de la tabla, `page > 1` y el usuario presiona ArrowUp
- **THEN** la tabla invoca `onPageChange(page-1)` y al renderizarse la nueva página el foco aterriza en la última fila

---

### Requirement: Hook usePosKeyboard registra atajos globales del POS

El sistema SHALL proveer el hook `usePosKeyboard(args)` en `app/(private)/pos/_logic/hooks/usePosKeyboard.ts`. El hook SHALL registrar un listener `keydown` en `window` durante el ciclo de vida del componente que lo usa. El hook SHALL respetar los siguientes atajos:

| Atajo | Acción |
|---|---|
| `Ctrl/Cmd + F` | Enfocar el `searchInputRef` y seleccionar su contenido; previene la búsqueda nativa del navegador |
| `Ctrl/Cmd + ArrowRight` | Mover el foco al primer elemento focusable dentro de `cartContainerRef` |
| `Ctrl/Cmd + ArrowLeft` | Mover el foco a `searchInputRef` |
| `Ctrl/Cmd + Enter` | Invocar `onSubmit()` si `canSubmit === true && isSubmitting === false` |
| `Alt + V` | Invocar `onToggleMode("sale")` si `canToggleMode === true` |
| `Alt + C` | Invocar `onToggleMode("quote")` si `canToggleMode === true` |
| `Ctrl/Cmd + Shift + Backspace` | Solicitar confirmación al usuario y, al aceptar, invocar `onClearCart()` |

El hook SHALL ignorar los atajos cuya combinación no incluya `Ctrl/Cmd` o `Alt` cuando el `event.target` sea `<input>`, `<textarea>`, `<select>` o tenga `contenteditable=true`. Los atajos listados arriba (todos con modificador) SHALL funcionar incluso desde campos de texto.

#### Scenario: Ctrl+F enfoca el buscador

- **WHEN** el usuario presiona `Ctrl+F` (o `Cmd+F` en macOS) en cualquier parte del POS
- **THEN** se previene la búsqueda nativa, el buscador recibe foco y su contenido queda seleccionado

#### Scenario: Ctrl+Enter envía la venta cuando es válida

- **WHEN** el carrito es válido (`canSubmit=true`), no hay submit en curso (`isSubmitting=false`) y el usuario presiona `Ctrl+Enter`
- **THEN** se invoca `onSubmit()` con el carrito actual

#### Scenario: Ctrl+Enter ignorado cuando hay submit en curso

- **WHEN** `isSubmitting=true` y el usuario presiona `Ctrl+Enter`
- **THEN** no se invoca `onSubmit()` y no ocurre acción

#### Scenario: Ctrl+ArrowRight mueve foco al carrito

- **WHEN** el usuario presiona `Ctrl+ArrowRight` con el foco en el catálogo
- **THEN** el foco se mueve al primer elemento focusable del panel de carrito

#### Scenario: Alt+C alterna a modo cotización

- **WHEN** el usuario tiene permisos `sales:create` y `quotes:create` y presiona `Alt+C`
- **THEN** se invoca `onToggleMode("quote")` y el SegmentedButton refleja el cambio

#### Scenario: Ctrl+Shift+Backspace pide confirmación antes de vaciar carrito

- **WHEN** el usuario presiona `Ctrl+Shift+Backspace`
- **THEN** se muestra un diálogo de confirmación; al aceptar se invoca `onClearCart()`; al cancelar el carrito permanece intacto

---

### Requirement: Modales del POS responden a Esc y atrapan foco

Los modales `PriceTierPicker`, `CustomerQuickAddModal` y `SaleConfirmedModal` SHALL renderizarse como `<dialog>` nativo invocado mediante `dialog.showModal()` (mismo patrón que `ConfirmDialog`). Esto SHALL habilitar:

1. La tecla `Esc` cierra el modal invocando el callback `onClose` (o equivalente).
2. El foco queda atrapado dentro del modal mientras está abierto.
3. Al cerrarse, el foco regresa al elemento que lo abrió.

`PriceTierPicker` SHALL auto-enfocar el input de cantidad al abrirse y SHALL invocar `onConfirm(...)` cuando el usuario presiona `Enter` con datos válidos. `CustomerQuickAddModal` SHALL auto-enfocar el primer input del formulario. `SaleConfirmedModal` SHALL auto-enfocar el botón "Nueva venta" e invocar `onNewSale()` al presionar `Enter` o `Esc`.

#### Scenario: Esc cierra PriceTierPicker

- **WHEN** el modal `PriceTierPicker` está abierto y el usuario presiona `Esc`
- **THEN** el modal se cierra invocando `onClose()` y el foco regresa a la fila que lo originó

#### Scenario: Enter confirma PriceTierPicker con datos válidos

- **WHEN** el usuario tiene un precio seleccionado, cantidad ≥ 1 y presiona `Enter`
- **THEN** se invoca `onConfirm(price, quantity, discountPct)` y el modal se cierra

#### Scenario: Esc cierra CustomerQuickAddModal

- **WHEN** el modal `CustomerQuickAddModal` está abierto y el usuario presiona `Esc`
- **THEN** el modal se cierra invocando `onClose()` sin crear cliente

#### Scenario: Esc en SaleConfirmedModal inicia nueva venta

- **WHEN** el modal `SaleConfirmedModal` está abierto y el usuario presiona `Esc`
- **THEN** se invoca `onNewSale()` (equivalente a hacer click en "Nueva venta")

---

### Requirement: Carrito del POS navegable por teclado

`CartLinesList` SHALL aplicar `useListKeyboard(lines, onEnterChangeTier)` a sus elementos hijos `CartLine`. Cada `<div>` de línea SHALL recibir `getItemProps(idx)`. El hook SHALL recibir los callbacks adicionales:

- `onPlus`: incrementa la cantidad de la línea enfocada en 1 (`updateQuantity(id, qty + 1)`).
- `onMinus`: decrementa la cantidad de la línea enfocada en 1 con piso de 1 (`updateQuantity(id, Math.max(1, qty - 1))`).
- `onDelete`: quita la línea enfocada (`removeLine(id)`).

Los inputs internos de la línea (cantidad, descuento) SHALL detener la propagación de `+`, `-`, `Delete` y `Backspace` para no disparar los atajos del hook mientras se edita el input.

#### Scenario: + aumenta la cantidad de la línea enfocada

- **WHEN** el usuario tiene el foco en una línea del carrito (no en un input) y presiona `+` o `=`
- **THEN** la cantidad de esa línea aumenta en 1 y los totales se recalculan

#### Scenario: - disminuye la cantidad con piso de 1

- **WHEN** el usuario presiona `-` en una línea con `qty=1`
- **THEN** la cantidad permanece en 1 (no baja)

#### Scenario: Delete quita la línea

- **WHEN** el usuario tiene el foco en una línea y presiona `Delete` o `Backspace`
- **THEN** la línea se remueve del carrito y el foco salta a la siguiente línea (o al input de cantidad de la lista si era la última)

#### Scenario: Enter abre PriceTierPicker en modo edición

- **WHEN** el usuario tiene el foco en una línea y presiona `Enter`
- **THEN** se invoca `onChangeTier(id)` que abre `PriceTierPicker` con `lineId` cargado

#### Scenario: Edición de input de cantidad no dispara atajos del carrito

- **WHEN** el usuario escribe `-` o `Backspace` dentro del `<input type="number">` de cantidad o descuento
- **THEN** el input recibe el evento normalmente y NO se invoca `removeLine` ni se altera la línea enfocada por el hook

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
