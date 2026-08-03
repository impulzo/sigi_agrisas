## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/operador de caja | Como cajero, quiero poder borrar la cantidad de una línea del carrito con backspace y reescribirla directo por teclado (sin dar click primero), para capturar cantidades rápido sin fricción durante la venta. | - Given una línea del carrito con cantidad `5`<br>- When el cajero selecciona el input con teclado y presiona Backspace repetidamente<br>- Then el campo queda vacío visualmente (no revierte a `5` en cada tecla) y el cajero puede escribir un nuevo valor dígito por dígito<br>- Given el cajero escribe `2.5` dígito por dígito<br>- When cada carácter se tipea<br>- Then el input muestra `2`, luego `2.`, luego `2.5` sin saltos ni reversión<br>- Given el cajero intenta escribir un 4º decimal (ej. `2.5678`)<br>- When tipea el 4º dígito decimal<br>- Then el input rechaza ese carácter (se detiene en 3 decimales), preservando venta a granel (kg/L) con precisión de milésimas<br>- Given el input queda vacío o en un valor inválido (`0`, negativo, sólo un punto) al perder el foco (blur)<br>- When el cajero hace click fuera o tabula<br>- Then el input revierte al último valor válido de la línea (no se permite dejar el carrito con cantidad NaN o 0) | - Cambio puramente de UX cliente, sin endpoints ni permisos nuevos; la validación server-side de `quantity > 0` en `POST /sales` (pos-api) no cambia y sigue siendo la barrera real |
| 2 | Cajero/operador de caja | Como cajero, quiero el mismo comportamiento de edición fluida en el input de cantidad del selector de precio (`PriceTierPicker`), para no tener una UX inconsistente entre el carrito y el modal de selección de precio. | - Given el modal `PriceTierPicker` abierto con cantidad inicial `1`<br>- When el cajero borra y reescribe la cantidad<br>- Then el mismo comportamiento (borrar libre, límite 3 decimales, revertir en blur si inválido) aplica igual que en `CartLine` | - Mismo alcance que la Historia 1 — sin cambios de permisos ni de validación server-side |

_Nota: se separó en 2 historias porque son 2 componentes distintos (`CartLine.tsx` y `PriceTierPicker.tsx`) que hoy tienen el mismo bug de forma independiente — ambos necesitan el fix pero son cambios de archivo aislados, verificables por separado._

## Why

`CartLine.tsx` y `PriceTierPicker.tsx` usan un input `type="number"` controlado directamente por `line.quantity` (un `number`). Al borrar el campo, `e.target.value` es `""`, `parseFloat("")` es `NaN`, el guard `if (!isNaN(v) && v > 0)` bloquea la actualización de estado, y React — al no cambiar el valor controlado — revierte visualmente el input al número anterior en cada pulsación de Backspace. Esto hace imposible borrar y reescribir la cantidad sin recurrir a seleccionar todo el texto primero (truco no obvio para el cajero). El usuario confirmó que la venta a granel (decimales) debe conservarse — el fix es de UX de edición, no de reglas de negocio.

## What Changes

- `CartLine.tsx`: el input de cantidad pasa a manejar un estado de "borrador" (`string`) desacoplado del valor numérico committeado, permitiendo estados intermedios (`""`, `"2."`, etc.) sin perder la cantidad válida hasta que el usuario confirme un número o el input pierda el foco con un valor inválido (revierte).
- `PriceTierPicker.tsx`: mismo patrón aplicado a su input de cantidad.
- Límite de 3 decimales aplicado por filtrado de teclas/regex en el `onChange`, no por el atributo `step` del input (que no bloquea el tipeo de más decimales).

## Capabilities

### New Capabilities
_(ninguna)_

### Modified Capabilities
_(ninguna — cambio de UX cliente puro, sin contrato de API ni requirement de negocio nuevo. `pos-api`/`pos-ui` specs no describen el comportamiento de edición carácter-por-carácter del input, por lo que no hay requirement existente que modificar)_

## Impact

- Sólo 2 archivos de UI (`CartLine.tsx`, `PriceTierPicker.tsx`), sin cambios de backend, sin migración, sin cambio de contrato.
- Sin riesgo de romper venta a granel: el límite pasa de "implícito por `step`" a "explícito por regex de 3 decimales", más estricto pero equivalente en la práctica (el `step="0.001"` ya sugería 3 decimales).
