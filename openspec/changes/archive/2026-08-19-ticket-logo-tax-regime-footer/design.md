## Context

Tres ajustes de fidelidad visual/dato sobre piezas ya existentes: `PrintableTicket.tsx` y `TicketPreviewPage.tsx` (ambos leen `TicketSettingsDto`), y `TicketSettingsForm.tsx`. `businessTaxRegime` es un campo de texto libre `VarChar(120)` sin FK a ningún catálogo — el patrón de combobox SAT (`SatCatalogCombobox`) ya existe y se usa en `CustomerEditModal.tsx` contra el mismo endpoint `GET /api/v1/admin/sat-codes/regimen-fiscal`.

## Goals / Non-Goals

**Goals:**
- Logo +40% en ambas superficies de render sin mover el resto del layout (historia 1).
- Régimen fiscal capturado desde catálogo SAT, persistido como descripción completa (historia 2).
- Vista previa fiel al footer realmente configurado, sin fallback inventado (historia 3).

**Non-Goals:**
- No se agrega FK real de `businessTaxRegime` a `SatTaxRegime` (seguiría siendo texto libre `VarChar(120)`, sólo cambia el método de captura en la UI) — evita migración y mantiene compatibilidad con configuraciones ya guardadas como texto libre.
- No se toca `SendSaleTicketEmailUseCase` (el ticket por correo no renderiza logo/régimen/footer hoy) — pedido explícitamente fuera de alcance por el usuario en la sección de ticket del pedido original (el punto de "mensaje final" se refiere a la vista previa, no al email).
- No se cambia el tamaño del logo en función de `paperWidth` — se mantiene fijo, igual que hoy.

## Decisions

**D1 — Logo +40% aplicado como valor absoluto (`105px × 147px`), no como variable calculada.**
`75 * 1.4 = 105`, `105 * 1.4 = 147`. Se hardcodea el resultado en ambos archivos (`PrintableTicket.tsx:35`, `TicketPreviewPage.tsx:92-96`) en vez de introducir una constante compartida — ambos ya duplican el valor de tamaño hoy (no hay un módulo de constantes de ticket compartido entre ambos componentes), así que introducir una abstracción nueva sólo para este valor sería una desviación no pedida.

**D2 — `SatCatalogCombobox` reemplaza el `<input>` de régimen fiscal, reutilizando el componente y el endpoint ya usados en `CustomerEditModal`.**
Alternativa descartada: crear un selector nuevo específico de settings. Se descarta porque `SatCatalogCombobox` ya soporta exactamente este catálogo (`catalog="regimen-fiscal"`) y el patrón "buscar por descripción, guardar el código" — sólo que aquí, a diferencia de `Customer.taxRegime` (que persiste sólo el código de 3 dígitos), `TicketSettings.businessTaxRegime` debe persistir `"<code> — <description>"` completo porque es lo que se imprime literalmente en el ticket (el ticket no tiene acceso a resolver el código contra el catálogo en tiempo de impresión). Al seleccionar una opción, `TicketSettingsForm` concatena `\`${code} — ${description}\`` antes de guardar, en vez de guardar sólo `code` como hace el combobox en su uso original.

**Amendment (durante apply):** `SatCatalogCombobox.onChange` real sólo exponía `code`, no `description` (el componente resuelve `description` internamente para el helper text bajo el input, pero no lo expone al padre). Se extendió la firma de `onChange` a `(value: string, description?: string) => void` — cambio backward-compatible: el único otro consumidor (`CustomerEditModal.tsx`) pasa un handler de un solo parámetro (`setTaxRegime`), que sigue siendo un valor válido para esa firma ampliada (TypeScript permite handlers con menos parámetros que los declarados en el tipo del callback).

**D3 — Texto libre preexistente en `businessTaxRegime` no se migra ni se valida contra el nuevo formato.**
El campo sigue siendo `string | null` sin regex — una configuración ya guardada como sólo `"612"` (o cualquier texto libre anterior) se sigue imprimiendo tal cual hasta que un admin la reedite con el nuevo combobox. No se fuerza un formato en el backend porque el criterio de aceptación pide compatibilidad hacia atrás explícita.

**D4 — El fallback hardcodeado de `TicketPreviewPage` se elimina, no se reemplaza por otro texto.**
`PrintableTicket.tsx:124-126` ya tiene el comportamiento correcto (omite el párrafo si `footerText` es falsy) — `TicketPreviewPage` sólo necesita converger a ese mismo patrón condicional, sin introducir lógica nueva.

## Risks / Trade-offs

- **[Riesgo]** Un ticket físico de 58mm con logo 40% más grande podría verse desproporcionado en papel angosto → **Mitigación**: el usuario pidió explícitamente el aumento sin condicionarlo al ancho de papel; se documenta como decisión de negocio, no un descuido técnico.
- **[Trade-off]** `businessTaxRegime` sigue sin FK real al catálogo SAT — una futura re-siembra del catálogo no puede detectar regímenes obsoletos ya impresos en `TicketSettings`. Aceptado porque migrar a FK real requeriría separar "código" de "descripción" en columnas distintas, cambio de mayor alcance no pedido.
