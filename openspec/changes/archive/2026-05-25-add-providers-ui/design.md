## Context

El backend `add-providers-crud` (archivado 2026-05-25) expone un CRUD admin homogéneo con los 4 catálogos previos, **pero con dos diferencias clave**:

1. **Búsqueda server-side** vía `?search=` (mín 2 chars) que aplica `OR ILIKE '%search%'` sobre `name`, `legalName` y `rfc`.
2. **Modelo de campos más rico**: 3 obligatorios (`code`, `name`, `rfc`) + 9 opcionales (`legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `notes`), todos con validación regex específica.

Endpoint contract (recordatorio):

| Operación | Permiso | Forma |
|---|---|---|
| `GET /api/v1/admin/providers?page&pageSize&includeInactive&search` | `providers:read` | Lista paginada `{ items, total, page, pageSize }` |
| `GET /api/v1/admin/providers/:id` | `providers:read` | Detalle |
| `POST /api/v1/admin/providers` | `providers:write` | Crear; `code` único; 409 si duplicado; RFC único; 409 si duplicado |
| `PATCH /api/v1/admin/providers/:id` | `providers:write` | Update parcial; `code` ignorado silenciosamente; 400 si body vacío; 409 si RFC duplicado |
| `DELETE /api/v1/admin/providers/:id` | `providers:write` | Soft delete (`isActive=false`); idempotente |

Regex backend (replicar en cliente):
- `code`: `^[A-Z0-9_]{1,32}$`
- `rfc`: `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$`
- `taxRegime`: `^\d{3}$`
- `cfdiUse`: `^[A-Z]\d{2}$`
- `taxZipCode`: `^\d{5}$`

El frontend ya tiene el `_blocks/` compartido (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`, `CatalogEmpty`, `CatalogError`), el átomo `Switch`, la molécula `RailFlyout`, y el patrón de modal create/edit con diff probado en `branches`/`departments`/`payment-methods`/`folios`. No se introducen nuevos átomos ni moléculas.

## Goals / Non-Goals

**Goals:**
- Pantalla de gestión de proveedores funcional y estéticamente consistente con `/catalogs/branches` y el diseño Stitch "Agro-Systemic" (Material 3).
- Modal único con dos modos (`create` | `edit`) y los 12 campos agrupados en secciones lógicas para evitar saturación visual.
- Búsqueda server-side debounced que conecta al `?search=` del backend, demostrando el patrón para módulos futuros con volumen alto.
- Integración limpia en el submenú "Catálogos" y en el hub `/catalogs`: zero refactor del organism `NavigationRail` (su API ya acepta hijos arbitrarios) y zero refactor de `CatalogsHubPage` más allá de añadir un entry al array `CATALOG_CARDS`.
- Tests RTL/jsdom cubriendo: servicios (mapeo de errores), hooks (paginación, búsqueda debounced, cancelación), bloques (gating UI, diff submit, validación de RFC).

**Non-Goals:**
- Generalizar el modal de proveedores en un `<CatalogResource>` configurable. Se mantiene el módulo aislado por consistencia con los 4 catálogos previos; los `_blocks/` compartidos ya extraen el factor común.
- Catálogos enumerados (`<select>`) para `taxRegime` y `cfdiUse`. Por ahora `<input type="text">` con regex y placeholder con valores comunes (`601`, `612`, `626` para regime; `G01`, `G03`, `P01` para cfdiUse). Refactor futuro.
- Renderizar todos los proveedores en un mapa o vista geoespacial.
- I18n (textos hard-coded en español, consistente con el resto del panel).
- Wizard multi-paso para `create`. Modal único con scroll vertical y secciones colapsables si fuera necesario; ya cubre el caso de uso.

## Decisions

### Decisión 1 — Ruta bajo `/catalogs/providers/` y NO ruta plana `/providers`

Aunque el backend tiene su propio módulo `src/modules/providers/` (decisión del change `add-providers-crud`), la UI vive bajo `app/(private)/catalogs/providers/` por petición explícita del usuario: "Agrega el CRUD de proveedores como otro elemento del menú de catálogos." Esto:

- Mantiene el `NavigationRail` con un único item primario `catalogs` (no se añade un item top-level adicional).
- Aprovecha los `_blocks/` compartidos del hub (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`, `CatalogEmpty`, `CatalogError`).
- Hace que la URL semántica refleje la organización mental del admin: "proveedores es un catálogo más".

**Alternativa descartada A — Ruta plana `/providers`**: rompe la solicitud del usuario y satura el rail con un item primario más.

**Alternativa descartada B — Subnivel intermedio `/business/providers`**: introduce una jerarquía artificial; el usuario ya conoce el patrón `/catalogs/<recurso>` y no hay otros "business" actualmente.

### Decisión 2 — Búsqueda server-side con debounce de 300ms

A diferencia de los 4 catálogos previos (que filtran client-side sobre la página cargada porque su volumen es pequeño y el backend no acepta `?q=`), el backend de proveedores SÍ acepta `?search=` con `min 2 chars` y filtra `name`/`legalName`/`rfc` con `OR ILIKE`.

La UI:
1. El input de búsqueda en `CatalogToolbar` actualiza un estado local `searchInput` (sin debounce).
2. Un `useEffect` con `setTimeout(300ms)` actualiza un estado `search` que es lo que dispara el refetch.
3. Si `searchInput.trim().length === 0`, se envía `undefined` al backend (sin filtro).
4. Si `searchInput.trim().length === 1`, se muestra una pista inline "Mínimo 2 caracteres" y NO se dispara fetch (espejo del backend que devolvería 400).
5. La etiqueta de la toolbar dice "Buscar por nombre, razón social o RFC" para clarificar el alcance server-side.

**Por qué 300ms**: balance estándar entre responsividad y carga. Mismo valor que `app/_hooks/useDebounce.ts` (si ya existe; si no, se implementa inline).

**Alternativa descartada — Búsqueda client-side**: la lista de proveedores puede crecer a miles de filas y filtrar solo la página cargada da resultados confusos.

### Decisión 3 — Modal único con secciones agrupadas (no wizard)

`ProviderEditModal.tsx` recibe `mode: "create" | "edit"` + `entity?: Provider`. Los 12 campos se renderizan en **tres secciones visuales** con headings tipográficos (no acordeón colapsable):

1. **Datos básicos** — `code` (immutable en edit), `name`, `isActive` (Switch).
2. **Datos fiscales** — `rfc` (siempre presente, editable), `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`.
3. **Contacto** — `email`, `phone`, `address` (textarea), `contactName`, `notes` (textarea).

El modal tiene `max-h-[85vh]` con scroll vertical. Cada sección usa `space-y-4` y un `<h3 class="text-title-sm text-on-surface-variant">` como heading.

**Por qué no wizard**: añade fricción (3 clicks de "siguiente") sin valor real. El admin avanzado ya conoce los campos. El modal único permite editar cualquier campo en un solo paso.

**Por qué no colapsable**: añade complejidad de estado sin valor en este momento. Si los usuarios reportan que el modal es muy largo, se introduce colapso en un change incremental.

### Decisión 4 — Validación cliente que espeja exactamente el backend

`_logic/schemas/provider.schema.ts` define `createProviderSchema` y `updateProviderSchema` con Zod. Reglas:

```ts
const codeRegex = /^[A-Z0-9_]{1,32}$/;
const rfcRegex = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
const taxRegimeRegex = /^\d{3}$/;
const cfdiUseRegex = /^[A-Z]\d{2}$/;
const taxZipCodeRegex = /^\d{5}$/;
```

- `rfc` se normaliza en cliente a `.trim().toUpperCase()` antes de validar y antes de enviar.
- `code` se normaliza igualmente en cliente.
- `taxRegime`, `cfdiUse`, `taxZipCode`, `email`, `phone`, `address`, `contactName`, `legalName`, `notes` aceptan `null` (mapeado desde input vacío en la UI).
- Para `update`: se exige al menos un campo distinto a `code` con `.refine(...)`. En la UI, el botón "Guardar" queda deshabilitado si el diff es vacío.

Mensajes de error en español, coherentes con el resto del panel:
- `code`: "El código debe ser MAYÚSCULAS, dígitos y guiones bajos (máx. 32)."
- `rfc`: "RFC inválido. Formato esperado: 3-4 letras + 6 dígitos + 3 alfanuméricos."
- `taxRegime`: "El régimen fiscal debe ser de 3 dígitos (ej. 601)."
- `cfdiUse`: "El uso CFDI debe ser 1 letra + 2 dígitos (ej. G03)."
- `taxZipCode`: "El código postal fiscal debe ser de 5 dígitos."

### Decisión 5 — Tabla con columnas optimizadas para escaneo

`ProvidersTable` muestra: **Código** | **Nombre** | **RFC** | **Régimen** | **Contacto** | **Estado** | **Acciones**

- **Nombre**: si el proveedor tiene `legalName`, se muestra como subtítulo gris debajo del `name`. Si no, solo `name`.
- **RFC**: en `font-mono` para reconocimiento visual rápido.
- **Régimen**: muestra el `taxRegime` (3 dígitos) o `—` si es `null`.
- **Contacto**: muestra el primer valor no nulo en este orden: `email` → `phone` → `contactName` → `—`. Tooltip con los demás campos si hay múltiples.
- **Estado**: `CatalogStatusBadge` (Activo/Inactivo).
- **Acciones**: 3 iconos cuando `canWrite`: `edit`, `delete` (si activo) / `restore` (si inactivo).

**Truncado**: Nombre, legalName y contact se truncan con `truncate` Tailwind si exceden el ancho de columna. No tooltip de Material 3 al hover (mismo patrón que branches/departments).

### Decisión 6 — `useProviders` hook con debounce server-side integrado

`useProviders({ page, pageSize, search, includeInactive })`:

- Acepta `search` como prop ya debounced desde `ProvidersPage`.
- `useEffect` que dispara `listProviders(...)` cuando cualquier param cambia.
- Cancelación vía `AbortController` para evitar race conditions cuando el usuario teclea rápido.
- Devuelve `{ items, total, isLoading, error, refresh }`.
- `refresh()` re-fetcha con los mismos params (útil tras una mutación).

`useProviderMutations()`:
- `createOne(body)`: llama `createProvider`. Devuelve la entidad creada (o lanza error tipado).
- `updateOne(id, body)`: llama `updateProvider`. Devuelve la entidad actualizada.
- `softDeleteOne(id)`: llama `softDeleteProvider`. Devuelve `void`.
- `reactivateOne(id)`: llama `updateProvider(id, { isActive: true })`. Devuelve la entidad reactivada.

Cada mutation acepta opcionalmente `{ onSuccess, onError }` para que `ProvidersPage` orqueste el cierre del modal y el refresh de la tabla.

### Decisión 7 — Mapeo de errores HTTP a tipados en `_logic/services/`

Cada service usa `authFetch` y mapea:
- 401 → relanza `UnauthenticatedError` (manejado a nivel app).
- 403 → relanza `ForbiddenError` (manejado a nivel app o de hook).
- 404 → `ProviderNotFoundError` (en `get`, `update`, `softDelete`).
- 409 con cuerpo `{"error":"Provider code already in use"}` → `ProviderCodeAlreadyInUseError` (en `create`).
- 409 con cuerpo `{"error":"Provider RFC already in use"}` → `ProviderRfcAlreadyInUseError` (en `create` y `update`).
- Otros 4xx/5xx → genérico `Error(message)`.

El modal mapea 409 inline:
- `ProviderCodeAlreadyInUseError` → `codeError = "Este código ya está en uso."` (solo en modo create).
- `ProviderRfcAlreadyInUseError` → `rfcError = "Este RFC ya está en uso por otro proveedor."` (en create y edit).

### Decisión 8 — `isActive` toggleable directamente desde el modal Y desde acciones de fila

Mismo patrón que `branches`/`departments`:
- En el modal: `Switch` etiquetado "Activo" (default `true` en create).
- En la fila de la tabla: si `isActive === true` se muestra botón "Eliminar" (con `ConfirmDialog`); si `isActive === false` se muestra "Reactivar" (sin confirmación).

Esto da dos caminos al admin:
1. **Camino rápido** (sin modal): click en delete/restore → confirmación si delete → llamada directa.
2. **Camino completo** (con modal): edit → toggle Switch → guardar (entra en el diff).

### Decisión 9 — Icono `local_shipping` para proveedores

Material Symbol `local_shipping` representa visualmente "proveedores" mejor que alternativas como `factory`, `business_center` o `package_2`. Es consistente con el lenguaje icónico de Stitch/Material 3. Si el icono no está en `app/_components/atoms/Icon/icons.ts`, se añade al registro.

### Decisión 10 — Inserción del nuevo entry al **final** del array de hijos (no alfabético)

El array `children` de `catalogs` se mantiene en el orden actual: `payment-methods`, `folios`, `departments`, `branches`. El nuevo entry `providers` se inserta al final. Razones:

- Preserva el orden histórico (los catálogos existían antes; providers es el nuevo).
- Mismo criterio se aplica al hub `/catalogs`: la quinta tarjeta se renderiza al final.
- Si en el futuro se decide ordenar alfabéticamente, se hace como cambio cosmético cross-cutting.

### Decisión 11 — La toolbar de búsqueda incluye un indicador de "Búsqueda en servidor"

Para diferenciar visualmente de los otros 4 catálogos (que filtran client-side), `CatalogToolbar` recibe una nueva prop opcional `searchScope?: "client" | "server"` (default `"client"` para no romper los 4 catálogos existentes). En el módulo de proveedores se pasa `searchScope="server"`, lo que renderiza un pequeño badge gris debajo del input: "Búsqueda en servidor · 2+ caracteres".

**Trade-off**: añade una prop a un bloque compartido. La alternativa (no diferenciar) confunde al usuario que ya conoció el "filtra solo la página actual" en los otros catálogos.

### Decisión 12 — El modal cierra y refresca en mutations exitosas; permanece abierto con error inline

- `createOne` éxito → cerrar modal + `refresh()` de la tabla + toast (si hay sistema de toast; si no, no toast).
- `updateOne` éxito → cerrar modal + `refresh()`.
- `createOne` error tipado de `code`/`rfc` → mantener modal abierto + setear `codeError`/`rfcError` inline.
- `updateOne` error tipado de `rfc` → mantener modal abierto + setear `rfcError` inline.
- Errores no tipados (`Error` genérico) → mostrar banner rojo en el modal con el mensaje + permitir reintentar.

## Risks / Trade-offs

- **Modal con 12 campos puede sentirse abrumador** → Mitigación: agrupación en 3 secciones con headings; campos opcionales claramente marcados (placeholder "Opcional"); scroll vertical limpio. Si los usuarios reportan dolor, refactor incremental a colapsables.
- **Búsqueda server-side requiere debounce correcto** → Riesgo de race conditions si llegan respuestas desordenadas. Mitigación: `AbortController` en `useProviders` cancela el request anterior cuando llega uno nuevo.
- **Inserción del entry al final, no alfabético** → Riesgo cosmético menor: el orden no sigue alfabeto. Aceptado por la decisión histórica de orden de inserción.
- **`searchScope` añadido a `CatalogToolbar`** → Riesgo de acoplamiento. Mitigación: prop opcional con default `"client"` que mantiene compatibilidad; documentar en `CLAUDE.md` el nuevo valor.
- **RFC editable** → Documentado en el backend; la UI lo respeta. Riesgo de typo accidental al editar; mitigación: re-validación regex en cada submit.
- **Volumen de código nuevo** → ~15 archivos en `app/(private)/catalogs/providers/` + ~10 archivos de tests. Compensado por reutilización máxima de `_blocks/` compartidos y átomos/moléculas existentes.

## Migration Plan

Sin migraciones de BD ni cambios de schema. Deploy:

1. `npm run build` — verifica tipos TS y compila la nueva ruta.
2. `npm test` — toda la suite (incluyendo nuevos tests RTL) debe pasar.
3. Deploy normal a Vercel/Docker.
4. Verificación manual con admin:
   - Login → hover sobre `catalogs` muestra flyout con 5 hijos (último: "Proveedores").
   - Navegar a `/catalogs` → ver 5 tarjetas (última: "Proveedores").
   - En `/catalogs/providers`: listar, paginar, buscar por RFC server-side, crear (modal con 3 secciones), editar (diff), desactivar (con confirmación), reactivar (sin confirmación), toggle "Mostrar inactivos".
5. Verificación con `viewer` (`providers:read` pero no `providers:write`): tabla y filtros funcionan; botones "Nuevo", "Editar", "Eliminar", "Reactivar" ocultos.
6. Verificación con usuario sin `providers:read` (un rol custom): item "Proveedores" desaparece del flyout y tarjeta del hub queda en estado "Sin acceso".

Rollback: revertir el commit. Sin estado persistido nuevo.

## Open Questions

- ¿Mostrar el `legalName` como subtítulo bajo el `name` en la tabla, o como columna independiente? → **Decisión**: subtítulo. Una columna independiente añade ancho innecesario; el subtítulo gris pequeño bajo el nombre captura el contexto sin saturar.
- ¿El input de RFC debe forzar uppercase mientras el usuario escribe, o solo al `blur`/submit? → **Decisión**: forzar uppercase en `onChange` (igual que `code` en branches). Da retroalimentación visual inmediata y previene confusión con la regex.
- ¿La tarjeta del hub para Proveedores debe llevar un icono distinto al del rail? → **Decisión**: mismo icono (`local_shipping`) en rail y hub, igual que el resto de catálogos (consistencia visual).
- ¿`searchScope="server"` debe poder coexistir con un toggle "Mostrar inactivos" o son excluyentes? → **Decisión**: coexisten. El backend acepta ambos query params simultáneamente; la UI los envía juntos.
