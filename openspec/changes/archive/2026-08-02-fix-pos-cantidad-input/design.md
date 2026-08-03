## Context

Ver `proposal.md - Why` — bug de input controlado (`type="number"` atado directo a `line.quantity`) que impide borrar/reescribir libremente.

## Goals / Non-Goals

**Goals:** edición fluida del input de cantidad en `CartLine.tsx` y `PriceTierPicker.tsx`, límite de 3 decimales aplicado activamente.

**Non-Goals:** no se toca la validación server-side (`pos-api` sigue validando `quantity > 0` con hasta 4 decimales por línea, sin cambios); no se agrega selector de unidades ni cambia el modelo de datos.

## Decisions

**D1 — Estado de borrador (`string`) local, desacoplado del `number` committeado**
Patrón estándar para inputs numéricos editables: el input renderiza un `string` de borrador que puede estar en estados intermedios inválidos (`""`, `"2."`); sólo se llama `onUpdateQuantity` cuando el borrador parsea a un número válido `> 0`. En `blur`, si el borrador es inválido, se revierte al valor committeado más reciente (evita dejar el carrito en un estado NaN/vacío).

**D2 — Filtrado de teclas vía regex en `onChange`, no vía `type="number"` + `step`**
El atributo `step` de un input nativo `type="number"` no bloquea que el usuario tipee más decimales de los que el step sugiere — sólo afecta los controles de flecha arriba/abajo. Para forzar el límite de 3 decimales mientras se tipea, el `onChange` valida el string completo contra `/^\d*\.?\d{0,3}$/` antes de aceptar el cambio; si no matchea, la tecla se ignora (el borrador no se actualiza). Se mantiene `inputMode="decimal"` para el teclado numérico en móvil/tablet, mismo estilo visual.

## Risks / Trade-offs

- **[Riesgo] Ninguno funcional** — el guard de `quantity > 0` server-side (`pos-api`) es la barrera real; este cambio es puramente de UX cliente.

## Migration Plan

Ninguna — sin cambios de datos ni de API.

## Open Questions

_Ninguna — alcance confirmado explícitamente por el usuario antes de escribir esta propuesta._
