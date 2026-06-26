## Context

El panel tiene 15 componentes de tabla/grid dispersos en 10 módulos. Todos comparten la misma necesidad: navegación ↑/↓ con flechas y activar la acción principal con Enter. Actualmente ninguno expone `tabIndex` ni maneja eventos de teclado en sus filas. La implementación debe ser uniforme, sin duplicar lógica, y respetar la frontera presentational de los `_blocks/`.

## Goals / Non-Goals

**Goals:**
- Un único hook reutilizable `useTableKeyboard` en `app/_hooks/` que cubra el 95 % de las tablas.
- Un hook adicional `useGridKeyboard` para el grid de tarjetas del POS (no es un `<table>`).
- Cero cambios de backend.
- Accesibilidad mínima: `tabIndex`, `aria-selected`, `role="row"`.

**Non-Goals:**
- Navegación horizontal (←/→) entre celdas dentro de una fila — no aplica a este panel.
- Soporte multi-selección con Shift+↑/↓.
- Navegación dentro de modales que ya se abren — el foco dentro del modal lo gestiona el modal.
- Refactorizar la estructura HTML de las tablas existentes más allá de lo necesario.

## Decisions

### D1 — Hook `useTableKeyboard<T>` en `app/_hooks/`

- **Elegida**: un hook genérico que recibe `items: T[]` y `onEnter: (item: T) => void`. Devuelve `getRowProps(index: number)` que retorna `{ tabIndex, ref, onKeyDown, "aria-selected" }` para cada `<tr>`.
- **Alternativa**: añadir `tabIndex` + `onKeyDown` inline en cada tabla sin hook compartido.
- **Razón**: 15 tablas con la misma lógica → hook compartido evita 15 copias. El hook es agnóstico al tipo de ítem (genérico con `<T>`), así cualquier tabla lo puede consumir.

Signatura:
```ts
function useTableKeyboard<T>(
  items: T[],
  onEnter: (item: T, index: number) => void,
): { getRowProps: (index: number) => RowProps }
```

Internamente mantiene `rowRefs: MutableRefObject<(HTMLTableRowElement | null)[]>`. En `onKeyDown`:
- `ArrowDown` → `e.preventDefault(); rowRefs.current[Math.min(i+1, items.length-1)]?.focus()`
- `ArrowUp`   → `e.preventDefault(); rowRefs.current[Math.max(i-1, 0)]?.focus()`
- `Enter`     → `e.preventDefault(); onEnter(items[i], i)`
- Otras teclas → no interceptar (permite Tab, Escape, etc. fluir normalmente)

Primera fila obtiene `tabIndex={0}`; el resto `tabIndex={-1}`. Al navegar con flechas se actualiza `tabIndex` del foco. Esto sigue el patrón *roving tabindex* (accesibilidad WAI-ARIA para grids).

### D2 — Hook `useGridKeyboard<T>` para el grid de productos del POS

- **Elegida**: hook separado porque el grid de tarjetas no es un `<table>`. Opera sobre un array de `divRef` en lugar de `<tr>`. Misma lógica de ↑/↓/Enter; también soporta ←/→ para moverse dentro de la fila del grid (columnas configurables con `columns: number`).
- **Alternativa**: unificar con `useTableKeyboard` usando un tipo de elemento genérico.
- **Razón**: el HTML target es diferente (`<div>` vs `<tr>`); unificarlos con genéricos de HTML element haría el hook más complejo sin beneficio real para tablas estándar.

### D3 — Las tablas reciben `onEnter` como prop opcional

- **Elegida**: cada tabla recibe `onEnter?: (item: T) => void`. Si `onEnter` es `undefined`, el hook no se instancia (o devuelve props vacíos). Esto preserva el contrato presentational de los `_blocks/` — las tablas no importan `useRouter` directamente para navegar; la lógica de qué hacer la inyecta el padre.
- **Alternativa**: integrar `useRouter` o `onEdit` directamente dentro del hook.
- **Razón**: los `_blocks/` son presentational según las reglas de CLAUDE.md (`_components/` y `_blocks/` son presentational: no `useRouter().push`). El padre (`*Page` o `*ListPage`) inyecta el callback `onEnter` con la navegación o apertura de modal apropiada.

**Excepción razonada**: para tablas que ya tienen `onEdit` como prop (catálogos modales), `onEnter` simplemente llama a `onEdit(item)`. El padre ya gestiona el estado del modal.

**Excepción razonada — tabs de detalle de Producto**: `ProductPricesTab` y `ProductDosificationsTab` instancian `useTableKeyboard` directamente (no via prop `onEnter?`). El callback (`openEditModal`) es interno al componente; exponerlo hacia afuera no aporta valor ya que estos tabs no tienen un padre que necesite inyectar comportamiento distinto. El hook se aplica correctamente conforme al requisito; la diferencia es de encapsulamiento, no de comportamiento.

### D4 — `ProductCatalogGrid` recibe `onEnter` del `ProductCatalogPanel`

El grid del POS ya tiene `onAddProduct`. El `ProductCatalogPanel` pasa ese mismo callback como `onEnter` al grid. No requiere cambios en `PosPage`.

## Risks / Trade-offs

- **Riesgo**: si una tabla renderiza filas condicionalmente (skeletons, empty state), los índices del `rowRefs` array pueden desincronizarse.  
  **Mitigación**: el hook re-inicializa `rowRefs` cuando cambia `items.length`. El caso de loading/empty ya retorna antes del render de filas → `items` estará vacío → no hay filas que registrar.

- **Trade-off**: roving tabindex implica que solo una fila del panel es tabbable a la vez. Si el usuario navega con Tab fuera de la tabla y vuelve, el foco llegará a la última fila activa, no siempre a la primera.  
  **Aceptado**: el comportamiento es estándar WAI-ARIA y consistente con la mayoría de data-grids accesibles.

- **Trade-off**: 15 componentes modificados en un solo PR aumenta la superficie de revisión.  
  **Mitigación**: el cambio por componente es mínimo (agregar prop + pasar `getRowProps`); riesgo de regresión bajo.
