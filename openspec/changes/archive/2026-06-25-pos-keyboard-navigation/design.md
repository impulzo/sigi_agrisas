## Context

El POS de Agrisas (`app/(private)/pos/`) hoy combina:

- Catálogo: `ProductCatalogGrid` (cards 2×4) con `useGridKeyboard` para flechas + Enter.
- Carrito: `CartPanel` → `CartLinesList` → `CartLine` con inputs nativos navegables sólo con Tab.
- Modales overlay (`<div role="dialog">`) sin manejo de `Esc`, sin focus trap, sin retorno de foco.

Hooks ya disponibles:
- `app/_hooks/useTableKeyboard.ts` — roving tabindex para `<tr>`. Aceptado y testado en 10+ tablas.
- `app/_hooks/useGridKeyboard.ts` — usado exclusivamente por el grid del POS.

Componente de referencia para `<dialog>`: `app/_components/molecules/ConfirmDialog/ConfirmDialog.tsx` (líneas 42-47) registra `cancel` listener para Esc nativa.

Stakeholders: cajeros (operadores), administradores. Esperan UX consistente con catálogos: tabla, focus visible, Enter abre modal de edición/selección.

## Goals / Non-Goals

**Goals:**
- Operar todo el POS sin tocar el ratón: navegar catálogo, añadir productos, navegar carrito, ajustar cantidades, eliminar líneas, abrir clientes/precios, confirmar venta o cotización, cerrar modales.
- Mantener accesibilidad: roles ARIA semánticos, `aria-keyshortcuts`, anuncio `aria-live` al alternar paneles, focus visible.
- Reusar `useTableKeyboard`. Reusar el patrón `<dialog>` de `ConfirmDialog`.

**Non-Goals:**
- Cambiar la arquitectura del carrito (`useCart` reducer permanece).
- Reescribir `CustomerPicker` (ya es Combobox con kbd nativo).
- Touch / mobile gestures.
- Soportar `useGridKeyboard` en otros módulos (queda eliminado del repo).
- Cron de limpieza de cotizaciones expiradas u otras features.

## Decisions

### 1. `<table>` reemplaza al grid de cards (no es opcional, es ruptura)

**Decisión**: Migrar `ProductCatalogGrid` → `ProductCatalogTable`. Estructura idéntica a `ProductsTable.tsx` del catálogo de productos (raw `<table>`, columnas `Código`, `Nombre`, `Departamento`, `Acción`).

**Por qué**:
- Hook `useTableKeyboard` ya maduro; consistencia con los 10+ tables del panel.
- Tabla expone semántica de filas/columnas para SR; cards requieren más ARIA manual.
- Densidad: tabla muestra ~20 productos/pantalla vs 8 del grid actual.
- Requirement explícito del usuario.

**Alternativa descartada**: Mantener cards + añadir más atajos. Rechazado: rompe consistencia con el resto del panel y duplica patrones.

### 2. Hook `usePosKeyboard` centralizado vs distribuir handlers en cada componente

**Decisión**: Centralizar todos los atajos globales del POS en un único hook `usePosKeyboard(args)` que registra un listener `keydown` en `window`. Se invoca desde `PosPage`.

**Por qué**:
- Único punto de verdad para resolver conflictos entre atajos.
- Facilita testabilidad: se prueba el hook independientemente, no cada componente.
- Permite añadir atajos nuevos sin tocar componentes hijos.

**Alternativa descartada**: Listeners por componente (`PosHeader`, `CartPanel`, etc.). Rechazado: dispersa lógica y complica la decisión de qué shortcut gana cuando hay solapamiento (p. ej., `Enter` en input vs. atajo global).

**Refs como contrato**: el hook recibe `searchInputRef`, `catalogContainerRef`, `cartContainerRef`. La responsabilidad de pasar refs queda en `PosPage`, que es la única fuente de la topología visual.

### 3. `<dialog>` nativo para los 3 modales del POS

**Decisión**: Migrar `PriceTierPicker`, `CustomerQuickAddModal` y `SaleConfirmedModal` de `<div role="dialog">` a `<dialog>` con `dialog.showModal()` y listener `cancel` para Esc (mismo patrón que `ConfirmDialog`).

**Por qué**:
- Soporte nativo de Esc, focus trap, click backdrop, restauración de foco — sin código adicional.
- Consistencia con `ConfirmDialog` ya en el repo.
- Soporte navegadores objetivo: Chromium, Firefox, Safari ≥15.4 (todos cubiertos por el target del proyecto).

**Alternativa descartada**: Hook custom `useEscapeKey(onClose)` + focus trap manual. Más código, más superficie de bugs, no resuelve restauración de foco automática.

**Riesgo**: estilos de `<dialog>` con Tailwind requieren `&::backdrop` para el fondo. `ConfirmDialog` ya provee el patrón a copiar.

### 4. `useListKeyboard` genérico vs forzar `<table>` en el carrito

**Decisión**: Crear `useListKeyboard<T>` genérico para `HTMLElement` con callbacks adicionales `onPlus`, `onMinus`, `onDelete`. Aplicarlo a las `<div>` de `CartLinesList`. **No** convertir el carrito a tabla.

**Por qué**:
- El carrito necesita layout flex (cantidad, precio, descuento, eliminar) más expresivo que una tabla.
- `useTableKeyboard` está tipado para `HTMLTableRowElement` y se quiere preservar para uso estricto en tablas.
- Los callbacks `+/-/Delete` aplican sólo al carrito; mantenerlos opcionales en `useListKeyboard` evita acoplar `useTableKeyboard` a esa semántica.

**Alternativa descartada**: Convertir `CartLinesList` en `<table>`. Rechazado: pierde flexibilidad de layout y reuso de `useTableKeyboard` sería marginal.

### 5. Paginación de la tabla del POS por flechas al borde

**Decisión**: Extender `useTableKeyboard` con callbacks opcionales `onPageDown?: () => void` y `onPageUp?: () => void`. `ArrowDown` en la última fila invoca `onPageDown`; `ArrowUp` en la primera invoca `onPageUp`. El caller controla cambio de página y reposicionamiento de foco vía `useEffect` que observa `page`.

**Por qué**:
- Lo eligió el usuario explícitamente.
- Mantiene el contrato del hook (no cambia su firma principal, sólo añade opcionales).
- Es retrocompatible: las tablas existentes que no pasan `onPageDown` mantienen el comportamiento previo (foco se queda en el borde).

**Alternativa descartada**: Teclas dedicadas `PageDown/PageUp`. Rechazado por el usuario tras presentar opciones.

### 6. `Ctrl/Cmd + F` sobrescribe la búsqueda nativa del navegador

**Decisión aceptada explícitamente por el usuario.**

**Mitigación**: incluir nota en `PosShortcutsOverlay` ("Ctrl+F enfoca el buscador del catálogo, no la búsqueda del navegador") y exponer `aria-keyshortcuts="Control+F"` en el input para que screen readers la anuncien.

### 7. Confirmación de "vaciar carrito"

**Decisión**: `Ctrl/Cmd + Shift + Backspace` lanza un `ConfirmDialog` (no `window.confirm` nativo) reusable. Si el dialog no está fácilmente accesible desde el hook, fallback a `window.confirm` en primera iteración y refactor posterior.

**Por qué**: la acción es destructiva e irreversible (carrito en memoria); requiere confirmación. `ConfirmDialog` ya existe y mantiene consistencia visual.

### 8. Restauración de foco tras cerrar modal

**Decisión**: `<dialog>` nativo restaura el foco automáticamente al elemento que invocó `showModal()`. Si por algún caso edge no lo hace (p. ej., el elemento se desmontó), `PosPage` mantiene un `lastFocusedRef` como respaldo.

## Risks / Trade-offs

| Riesgo | Mitigación |
|---|---|
| Estilos de `<dialog>` rompen el visual actual de los modales | Copiar el wrapper `<div className="rounded-2xl bg-surface p-6...">` dentro del `<dialog>` y estilar `dialog::backdrop` con la clase global `bg-black/40`. |
| Atajos chocan con extensiones del navegador (1Password, LastPass) | Documentar en overlay. Permitir override via `e.defaultPrevented` (no disparar si otro listener ya consumió). |
| Usuarios con teclados sin `Shift + Backspace` ergonómico | Acción accesible también vía botón "Vaciar carrito" en `PosHeader`. |
| Cambio de página rápido al mantener `ArrowDown` presionado | Throttle 150 ms en el callback `onPageDown` dentro del wrapper de `ProductCatalogTable`. |
| `Ctrl+F` evita búsqueda del navegador y confunde a usuarios primerizos | Tooltip en el input y overlay `?`. |
| `Esc` en `SaleConfirmedModal` cierra y descarta el ticket sin acción | Decisión explícita: Esc = "Nueva venta" (no descarta info; el sale ya está persistido). Comunicar en el modal con texto "Esc o Enter para nueva venta". |

## Migration Plan

No aplica migración de datos (cambio puramente UI). Despliegue: simple rollout con el resto del front. Rollback: revertir commits del cambio; no hay state persistente afectado.

## Open Questions

- ¿`Esc` en `CustomerQuickAddModal` con formulario sucio debería pedir confirmación? Por ahora descarta sin preguntar (consistente con `<dialog cancel>`). Levantar si surge feedback.
- ¿Incluir `PosShortcutsOverlay` en v1 o diferir a follow-up? Plan actual: incluir, atajo `?`.
