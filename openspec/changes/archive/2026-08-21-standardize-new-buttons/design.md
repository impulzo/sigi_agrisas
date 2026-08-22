## Context

El panel tiene ~15 puntos de entrada de creación de recursos repartidos en tres implementaciones distintas (ver `## Why` de `proposal.md`), lo que ya viola el requirement vigente "Button como única fuente de botones" de la capability `design-system` (prohíbe `<button>`/estilo hardcodeado fuera de la allowlist de deuda declarada). El guardarraíl automatizado `tests/unit/ui/design-system/tokens.test.ts` mantiene una `RAW_ELEMENT_ALLOWLIST` que hoy incluye, entre otros, `CatalogToolbar.tsx`, `UsersToolbar.tsx`, `QuotesToolbar.tsx` y `PurchasesToolbar.tsx` por contener `<button>`/`<select>` crudos.

Corregir cada call site a mano (Historias 1 y 2 de `proposal.md`) resuelve el síntoma pero no la causa raíz: sin un componente único que encapsule `variant="filled"`/`icon="add"`, un módulo futuro puede volver a divergir. Historia 3 pide explícitamente extraer ese componente y fijarlo como regla de diseño verificable — no una convención en prosa que nadie relee.

Este cambio es puramente de presentación (`app/_components/`, `app/(private)/**/_blocks/`); no toca backend, API ni RBAC. Los Criterios de Seguridad de las tres historias (proposal.md) se satisfacen por construcción: el gating `canWrite`/`can(...)` de cada toolbar envuelve el `onClick`/`href` del botón y no se toca en este cambio — sólo se reemplaza el elemento visual interior, incluyendo `users:write` (Users) y `roles:write` (Roles).

## Goals / Non-Goals

**Goals:**
- Un solo componente compartido (`CreateButton`) detrás de todo botón "Nuevo/a X" en toda la app — catálogos, Users, Roles, Quotes, Purchases, Billing, Waybills, Inventory —, sea que abra modal (`onClick`) o navegue a una ruta `/new` (`href`).
- Mismo color (`filled`/`bg-primary`) y mismo ícono (`add`) en los ~15 puntos de entrada de creación, incluyendo explícitamente "Nuevo usuario" y "Nuevo rol".
- Labels con género gramatical correcto y explícito (sin depender de un default genérico "Nuevo").
- Fijar la regla como requirement normativo en `openspec/specs/design-system/spec.md` + documentación en `designer.md`, de forma que sea verificable en revisión, no sólo una convención tácita.
- Reducir la `RAW_ELEMENT_ALLOWLIST` donde el único raw element del archivo era el botón de creación (ver Decisión 4).

**Non-Goals:**
- No se migra `UsersToolbar.tsx`, `QuotesToolbar.tsx` ni `PurchasesToolbar.tsx` fuera de la allowlist del guardarraíl de `<button>`/`<select>` crudo — conservan raw elements no relacionados con este cambio (filtros, toggles), fuera de alcance.
- No se toca `ProviderQuickAddModal` (submit de formulario) ni los enlaces contextuales de `SaleWaybillSection`/`SaleReturnsSection` — no son puntos de entrada "Nuevo X" de listado.
- No se cambia el comportamiento de `canWrite`/gating de permisos en ningún toolbar — `CreateButton` no tiene lógica de autorización propia.
- `CreateButton` no reemplaza usos de `Button` con `icon="add"` que NO sean creación de recurso (p.ej. si existiera un botón "Agregar línea" dentro de un formulario, no está en el inventario relevado y queda fuera de alcance).

## Decisions

**1. Extender `Button` con `href?: string` en vez de crear un `LinkButton` genérico separado.**
El atom ya centraliza `variantClasses`/`sizeClasses`/icon; duplicarlo en un componente hermano reintroduciría el mismo problema que este cambio corrige. Cuando `href` está presente, `Button` renderiza `next/link` con las mismas clases; cuando no, renderiza `<button>` como hoy. `CreateButton` (Decisión 2) consume esta capacidad para los casos de navegación (Quotes/Purchases/Billing/Waybills) sin necesitar su propia lógica de `<a>` vs `<button>`.

**2. Extraer `CreateButton` como componente nuevo en `molecules/`, no en `atoms/`.**
`Button` es un primitivo genérico de 5 variantes/3 tamaños — no debe saber nada sobre "crear un recurso". `CreateButton` es una composición opinionada (fija `variant="filled"` + `icon="add"`, exige `label` sin default) que encapsula una convención de producto, no una primitiva visual — encaja con la definición de `molecules/` ya usada en el proyecto para componer átomos con comportamiento/convención (ej. `FormField` sobre `Input`, `SearchBar` sobre `Input`+`Icon`). Alternativas descartadas:
- *Mantener la convención sólo en prosa* (documentar "usar `Button` con estas props" en `designer.md` sin componente): ya falló una vez — es exactamente cómo se llegó al estado actual (3 implementaciones divergentes). Historia 3 pide explícitamente que deje de ser sólo documentación.
- *Agregar el comportamiento directo al atom `Button`* (ej. `Button` detecta "modo creación"): contamina el primitivo genérico con semántica de dominio; rompe el principio de que `atoms/` no conoce el negocio.

**3. Firma de `CreateButton`: `label` obligatorio, `onClick` XOR `href`.**
```tsx
interface CreateButtonProps {
  label: string;
  onClick?: () => void;
  href?: string;
}
```
`label` sin default fuerza a cada caller a nombrar su recurso — evita que se repita el problema de "Nuevo" genérico (Historia 2). No se valida en runtime que `onClick`/`href` sean mutuamente excluyentes (TypeScript no expresa XOR simple sin unions incómodas); se documenta como contrato de uso en `designer.md` y en el requirement de spec — igual que el resto de primitivas del catálogo (`Button`, `Select`, etc.) confían en la disciplina de uso descrita en la doc, no en runtime guards.

**4. `CatalogToolbar` deja de tener su propio `<button>` y delega en `CreateButton`.**
Es el único punto que renderiza el botón "Nuevo" de los 10 catálogos; centralizar ahí basta — no hace falta tocar cada `*Page.tsx` salvo para pasar el label. Mantiene su firma de props actual (`onCreate`, `createButtonLabel`, etc.) — cambio interno, no rompe consumidores.

**5. Reducir la allowlist SOLO donde el único raw element remanente era el botón migrado.**
Verificado por archivo (grep de `<button|<select|<table`):
- `CatalogToolbar.tsx`: el `<button>` de creación era su ÚNICO raw element → tras migrar a `CreateButton`, se retira de `RAW_ELEMENT_ALLOWLIST` en `tests/unit/ui/design-system/tokens.test.ts`.
- `UsersToolbar.tsx`: tiene 2 raw `<button>` adicionales sin relación con este cambio → permanece en la allowlist.
- `QuotesToolbar.tsx`: su CTA de creación ya era un `<Link>` (no contaba para el guardarraíl); tiene 2 raw `<select>` + 1 `<button>` no relacionados → permanece en la allowlist.
- `PurchasesToolbar.tsx`: 1 raw `<select>` + 2 raw `<button>` no relacionados con la creación → permanece en la allowlist.
Esto cumple la regla del guardarraíl ("SHALL poder encoger pero no crecer") sin inventar una migración más amplia que no fue pedida.

**6. `QuotesToolbar`/`QuotesEmpty`/`PurchasesToolbar`/`BillingListPage`/`WaybillsListPage` pasan de `<Link>` con clases hardcodeadas a `<CreateButton href="...">`.**
No están en el regex del guardarraíl (que sólo mira `<button>|<table>|<select>`), así que su inconsistencia no la detectaba ningún test — de ahí que llegaran a divergir (tonal vs. filled, con/sin ícono, "+" literal). Usar `CreateButton` los alinea sin depender de un guardarraíl nuevo, y deja el requirement de spec como único mecanismo de verificación futura (ver specs/design-system).

**7. `ProviderPicker` (quick-add) NO se convierte a `CreateButton`.**
Es un ítem de footer dentro de un combobox (ancho completo, texto pequeño) — `CreateButton`/`Button` (pill, padding fijo) rompería su layout. Se limita a limpiar el texto ("+ Nuevo proveedor" → ícono `add` + "Nuevo proveedor"), consistente con la decisión ya tomada con el usuario en el plan aprobado.

**8. `InventoryPage` migra a `CreateButton` conservando su texto "Asignar producto".**
`CreateButton.label` no fuerza el formato "Nuevo/a X" — sólo fuerza que exista un label explícito. "Asignar producto" es una acción de asignación, no de creación, pero comparte el mismo look (`filled`+`add`) por decisión ya confirmada con el usuario, así que también consume el componente compartido.

## Risks / Trade-offs

- **[Riesgo] Cambiar `<Link>` por `<CreateButton href>` (que internamente usa `Button href` → `next/link`) cambia la fuente de las clases del elemento `<a>` renderizado.** Mitigación: correr `npm test` completo tras el cambio; si hay snapshots afectados, regenerarlos intencionalmente (no con `--ci` a ciegas).
- **[Riesgo] Remover `CatalogToolbar.tsx` de la allowlist y que el test de guardarraíl falle si quedó algún `<button>` residual.** Mitigación: correr `tests/unit/ui/design-system/tokens.test.ts` inmediatamente después de migrar `CatalogToolbar.tsx`, antes de tocar el resto de archivos.
- **[Riesgo] `CreateButton` sin guard runtime para `onClick`/`href` mutuamente excluyentes** — un caller podría pasar ambos o ninguno sin error de compilación. Mitigación: ninguno de los ~15 call sites de este cambio necesita ambos; se documenta el contrato en `designer.md` y el requirement de spec; si en el futuro se detecta mal uso, se puede endurecer con union types discriminados en un cambio posterior (no bloquea este).
- **[Trade-off] "Nueva cotización" pierde su diferenciación visual tonal (secondary-container) respecto a "Nueva venta" del POS.** Decisión explícita del usuario (ver AskUserQuestion en el plan aprobado) — prioriza consistencia global sobre diferenciación de esta acción puntual. `CartPanel` en modo cotización (bg-secondary-container para su propio CTA "Crear cotización") NO se toca — es un contexto distinto (dentro del carrito del POS, no un toolbar de listado) y no forma parte del alcance de este cambio.

## Migration Plan

Cambio de una sola pasada (sin datos, sin migración de BD). Orden recomendado para minimizar breakage intermedio:
1. `Button.tsx` (agrega `href`) — cambio aditivo, no rompe consumidores existentes.
2. `CreateButton.tsx` (nuevo, molecules) — consume `Button`.
3. `CatalogToolbar.tsx` → correr `tokens.test.ts` → retirar su entrada de la allowlist.
4. Los 6 `*Page.tsx` de catálogos con label explícito.
5. `UsersToolbar.tsx`, `RolesPage.tsx`.
6. `QuotesToolbar.tsx`, `QuotesEmpty.tsx`, `PurchasesToolbar.tsx`, `BillingListPage.tsx`, `WaybillsListPage.tsx`.
7. `InventoryPage.tsx`.
8. `ProviderPicker.tsx` (limpieza de texto, sin `CreateButton`).
9. `designer.md` — nueva subsección `molecules/CreateButton` en el catálogo de primitivas.
10. `npm run build && npm test` completo + verificación manual en browser.

Rollback: revert de commit único (no hay migración de datos ni cambio de contrato de API que requiera pasos adicionales).

## Open Questions

Ninguna — decisiones de diseño y alcance ya confirmadas con el usuario en la fase de Plan Mode previa a este proposal, y la extracción de `CreateButton` fue pedida explícitamente en la revisión de este proposal.
