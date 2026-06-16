## Why

El POS actual es **mouse-first**: el catálogo se muestra como grid de cards, los modales (`PriceTierPicker`, `CustomerQuickAddModal`, `SaleConfirmedModal`) no responden a Esc, y no existen atajos globales para enfocar el buscador, alternar paneles, confirmar venta o navegar el carrito. Cajeros que facturan a alta velocidad pierden tiempo soltando el teclado para usar el ratón. Esta brecha bloquea la productividad y degrada accesibilidad para usuarios con motor reducido.

## What Changes

- **BREAKING**: Reemplazar `ProductCatalogGrid` (cards) por `ProductCatalogTable` (`<table>` con `useTableKeyboard`). Se elimina la representación de cards en el POS.
- **BREAKING**: Eliminar `useGridKeyboard` y su requirement asociado en la capability `keyboard-navigation` (queda huérfano tras retirar las cards del POS).
- Nuevo hook `usePosKeyboard` registra atajos globales del POS a nivel `window`:
  - `Ctrl/Cmd + F`: enfocar buscador del catálogo (override del find nativo).
  - `Ctrl/Cmd + ←/→`: mover foco entre panel de catálogo y panel de carrito.
  - `Ctrl/Cmd + Enter`: confirmar venta/cotización.
  - `Alt + V` / `Alt + C`: alternar modo Venta ↔ Cotización (sólo si el usuario tiene ambos permisos).
  - `Ctrl/Cmd + Shift + Backspace`: vaciar carrito con confirmación.
- Paginación de la tabla via flechas al borde: `↓` en la última fila avanza página; `↑` en la primera retrocede. Tras el cambio el foco aterriza en la fila correspondiente.
- Carrito navegable por teclado: `↑/↓` mueven entre líneas, `+/=` y `-` ajustan cantidad, `Delete`/`Backspace` quita la línea, `Enter` abre cambio de precio. Nuevo hook genérico `useListKeyboard` (variante de `useTableKeyboard` para elementos `<div>`).
- Esc cierra cualquier modal del POS. Se migran los tres modales del POS a `<dialog>` nativo (patrón ya usado por `ConfirmDialog`), habilitando Esc, focus trap y click en backdrop sin código extra.
- Foco se restaura al elemento que abrió el modal al cerrarse.
- Componente opcional `PosShortcutsOverlay` (atajo `?`) lista los shortcuts disponibles para el usuario.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `keyboard-navigation`: añadir requirements para atajos globales del POS, navegación de la tabla del catálogo, navegación del carrito, cierre de modales con Esc; eliminar el requirement de `useGridKeyboard` y su uso en el POS.

## Impact

- **Frontend (`app/(private)/pos/`)**: renombra `ProductCatalogGrid.tsx` → `ProductCatalogTable.tsx`; modifica `PosPage.tsx`, `ProductCatalogPanel.tsx`, `CartPanel.tsx`, `CartLinesList.tsx`, `CartLine.tsx`, `PriceTierPicker.tsx`, `CustomerQuickAddModal.tsx`, `SaleConfirmedModal.tsx`, `PosHeader.tsx`; añade `_logic/hooks/usePosKeyboard.ts`, `_logic/lib/canSubmitCart.ts`, opcional `PosShortcutsOverlay.tsx`.
- **Hooks compartidos (`app/_hooks/`)**: añade `useListKeyboard.ts`; elimina `useGridKeyboard.ts` (huérfano tras retirar las cards).
- **Capability spec**: `openspec/specs/keyboard-navigation/spec.md` recibe deltas (`MODIFIED`, `REMOVED`, `ADDED`).
- **Tests**: añade unit tests en `tests/unit/ui/pos/` para tabla, hook global, carrito kbd y modales.
- **Backend**: ninguno. Cambio puramente UI.
- **Dependencias externas**: ninguna nueva. Usa `<dialog>` nativo (soportado en Chromium/Firefox/Safari ≥15.4).
- **Riesgos**: `Ctrl/Cmd+F` sobrescribe la búsqueda nativa del navegador (decisión explícita del usuario; se documenta en `PosShortcutsOverlay`).
