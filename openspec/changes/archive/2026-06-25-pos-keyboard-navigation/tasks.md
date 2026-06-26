## 1. Hooks compartidos

- [x] 1.1 Crear `app/_hooks/useListKeyboard.ts` con firma `<T>(items, onEnter, opts?)` que devuelva `getItemProps(idx)` y soporte callbacks opcionales `onPlus`, `onMinus`, `onDelete`. Tipar `ref` como `HTMLElement | null`.
- [x] 1.2 Extender `app/_hooks/useTableKeyboard.ts` con parámetros opcionales `onPageDown?: () => void` y `onPageUp?: () => void`; invocarlos cuando ArrowDown/ArrowUp ocurren en los bordes.
- [x] 1.3 Tests unit `tests/unit/ui/_hooks/useListKeyboard.test.ts`: ArrowDown/Up, Enter, `+/-`, `Delete`, items vacío, callbacks opcionales no rompen si no se proveen.
- [x] 1.4 Tests unit `tests/unit/ui/_hooks/useTableKeyboard.test.ts` (ampliar el existente o crear): `onPageDown`/`onPageUp` se invocan en bordes; retrocompatibilidad sin esas props.

## 2. Tabla del catálogo del POS

- [x] 2.1 Crear `app/(private)/pos/_blocks/ProductCatalogTable.tsx` con `<table>`, `<thead>`, `<tbody>`, columnas `Código`, `Nombre`, `Departamento`, `Acción`; reusar estructura de `ProductsTable.tsx`.
- [x] 2.2 Aplicar `useTableKeyboard` con `onEnter={onAddProduct}` y wrappers para `onPageDown`/`onPageUp` que invoquen `onPageChange` y reposicionen foco vía `useEffect(page)`.
- [x] 2.3 Eliminar `app/(private)/pos/_blocks/ProductCatalogGrid.tsx`.
- [x] 2.4 Actualizar `app/(private)/pos/_blocks/ProductCatalogPanel.tsx` para importar `ProductCatalogTable` y aceptar `searchInputRef?: RefObject<HTMLInputElement>` propagado a `SearchInput`.
- [x] 2.5 Si `SearchInput` no acepta `inputRef`, extender el componente en `app/_components/molecules/SearchInput/SearchInput.tsx` con prop opcional `inputRef`.
- [x] 2.6 Tests `tests/unit/ui/pos/ProductCatalogTable.test.tsx`: render filas, ArrowDown/Up navegan, Enter invoca `onAddProduct`, paginación al borde dispara `onPageChange` y mueve foco.
- [x] 2.7 Verificar con `grep` que `useGridKeyboard` no tiene otros consumidores; eliminar `app/_hooks/useGridKeyboard.ts` si está huérfano.

## 3. Hook global usePosKeyboard

- [x] 3.1 Crear `app/(private)/pos/_logic/hooks/usePosKeyboard.ts` con la firma definida en design. Registrar `keydown` en `window` con cleanup.
- [x] 3.2 Implementar lógica para ignorar atajos sin modificador cuando target es `input`/`textarea`/`select`/`contenteditable`; aplicar los atajos con modificador siempre.
- [x] 3.3 Implementar handlers: `Ctrl/Cmd+F`, `Ctrl/Cmd+ArrowLeft/Right`, `Ctrl/Cmd+Enter` (respeta `canSubmit`/`isSubmitting`), `Alt+V/C` (respeta `canToggleMode`), `Ctrl/Cmd+Shift+Backspace` (con `ConfirmDialog` o fallback `window.confirm`).
- [x] 3.4 Tests `tests/unit/ui/pos/usePosKeyboard.test.ts`: cada combinación dispara handler correcto; `isSubmitting=true` bloquea Ctrl+Enter; `canToggleMode=false` ignora Alt+V/C; eventos consumidos por inputs no disparan atajos sin modificador.

## 4. PosPage integra refs y handlers

- [x] 4.1 Crear refs `searchInputRef`, `catalogContainerRef`, `cartContainerRef` en `app/(private)/pos/_blocks/PosPage.tsx`.
- [x] 4.2 Extraer lógica `canSubmit` a `app/(private)/pos/_logic/lib/canSubmitCart.ts` (función pura); consumirla desde `PosPage` y `CartPanel`.
- [x] 4.3 Invocar `usePosKeyboard({ searchInputRef, catalogContainerRef, cartContainerRef, onSubmit: handleSubmit, onClearCart: clear, onToggleMode: setMode, canToggleMode: showSegmented, canSubmit, isSubmitting })`.
- [x] 4.4 Pasar refs a `ProductCatalogPanel` (search) y `CartPanel` (container).
- [x] 4.5 Implementar restauración de foco `lastFocusedRef` cuando `modal` pasa a `null` (respaldo si `<dialog>` falla).

## 5. Modales a `<dialog>`

- [x] 5.1 Migrar `PriceTierPicker.tsx` a `<dialog>` + `showModal()`/`close()` en `useEffect`; listener `cancel` invoca `onClose`. Auto-focus al input cantidad. Enter confirma si datos válidos.
- [x] 5.2 Migrar `CustomerQuickAddModal.tsx` a `<dialog>` con auto-focus al primer input. Esc cierra (descarta cambios).
- [x] 5.3 Migrar `SaleConfirmedModal.tsx` a `<dialog>` con auto-focus al botón "Nueva venta". Enter y Esc invocan `onNewSale()`. Mostrar hint "Esc / Enter para nueva venta".
- [x] 5.4 Aplicar estilo `dialog::backdrop` con `bg-black/40` mediante clase Tailwind (copiar patrón de `ConfirmDialog`).
- [x] 5.5 Tests `tests/unit/ui/pos/PriceTierPicker.test.tsx`, `CustomerQuickAddModal.test.tsx`, `SaleConfirmedModal.test.tsx`: Esc cierra, Enter dispara acción primaria, focus inicial correcto, focus regresa al elemento que lo abrió.

## 6. Carrito navegable

- [x] 6.1 Modificar `app/(private)/pos/_blocks/CartLinesList.tsx` para usar `useListKeyboard(lines, onChangeTier, { onPlus, onMinus, onDelete })`.
- [x] 6.2 En cada `CartLine.tsx`, propagar `getItemProps(idx)` al `<div>` raíz; añadir `aria-keyshortcuts="+ - Delete Enter"`.
- [x] 6.3 En los inputs de cantidad y descuento dentro de `CartLine`, detener propagación de `+`, `-`, `Delete`, `Backspace` para no disparar los atajos del hook.
- [x] 6.4 Implementar foco automático a la siguiente línea (o input de cantidad) tras eliminar la línea actual.
- [x] 6.5 Tests `tests/unit/ui/pos/CartLinesList.keyboard.test.tsx`: ArrowDown/Up navegan, `+/-` ajustan qty, Delete remueve y reposiciona foco, Enter abre `PriceTierPicker`, edición en input no dispara atajos.

## 7. Header y accesibilidad

- [x] 7.1 Añadir `aria-keyshortcuts="Control+Enter"` al botón Confirmar venta/cotización en `CartPanel.tsx`.
- [x] 7.2 Añadir `aria-live="polite"` en una región oculta de `PosPage` que anuncie "Carrito enfocado" / "Catálogo enfocado" al activarse `Ctrl+Arrow`.
- [x] 7.3 Crear `app/(private)/pos/_blocks/PosShortcutsOverlay.tsx` con lista `<kbd>` de atajos; abrir con atajo `?` (registrado por `usePosKeyboard`).
- [x] 7.4 Añadir botón discreto "Atajos" en `PosHeader.tsx` que abre el overlay.

## 8. QA y cierre

- [x] 8.1 `npm run build` debe pasar `tsc` sin errores.
- [x] 8.2 `npm test` debe pasar (todos los nuevos suites incluidos).
- [x] 8.3 Verificación manual con `/run`: `npm run dev`, navegar al POS como admin, probar cada atajo, Esc en cada modal, restauración de foco, anuncios SR (VoiceOver Cmd+F5).
- [x] 8.4 Capturar pantalla del overlay `?` para PR.
- [x] 8.5 Crear PR con descripción que enumere atajos y mencione el override de `Ctrl+F`.
