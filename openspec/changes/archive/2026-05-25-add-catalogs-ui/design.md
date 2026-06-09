## Context

El backend `crud-settings-models` (archivado el 2026-05-20) expone cuatro CRUDs administrativos homogéneos sobre `/api/v1/admin/payment-methods`, `/api/v1/admin/folios`, `/api/v1/admin/departments` y `/api/v1/admin/branches`. Cada recurso comparte el mismo contrato base:

| Operación | Permiso | Forma común a los 4 |
|---|---|---|
| `GET /api/v1/admin/<recurso>?page&pageSize&includeInactive` | `<recurso>:read` | Lista paginada `{ items, total, page, pageSize }` |
| `GET /api/v1/admin/<recurso>/:id` | `<recurso>:read` | Detalle (puntual) |
| `POST /api/v1/admin/<recurso>` | `<recurso>:write` | Crear; `code` único; 409 si duplicado |
| `PATCH /api/v1/admin/<recurso>/:id` | `<recurso>:write` | Update parcial; `code` inmutable; 400 si body vacío |
| `DELETE /api/v1/admin/<recurso>/:id` | `<recurso>:write` | Soft delete: marca `isActive=false`; idempotente |

La única variación es la lista de campos editables por recurso:

| Recurso | Campos extra |
|---|---|
| `payment-methods` | `description?: string \| null` |
| `folios` | `prefix?: string \| null` (matches `^[A-Z0-9-]{1,8}$`), `currentNumber: integer ≥ 0` |
| `departments` | `description?: string \| null` |
| `branches` | `address?`, `phone?`, `email?` (cada uno `string \| null`) |

El frontend ya tiene los patrones a seguir, validados en `users-ui` (2026-05-18) y `roles-ui` (2026-05-18):
- `_blocks/` presentational + `_logic/{services,hooks,types,schemas,errors}`.
- `authFetch` con errores tipados (`UnauthenticatedError`, `ForbiddenError`, `NetworkError`).
- `useCurrentUser().can(perm)` para gating UI (con re-comprobación en el backend).
- Modal de edición con diff submit (`PATCH` solo si hay cambios).
- Tests RTL + jsdom con `fetchImpl` inyectado.

El `NavigationRail` actual es plano (6 items primarios + 2 secundarios + logout). Añadir 4 items adicionales al rail lo saturaría visualmente, por eso el cambio introduce el patrón de submenú.

## Goals / Non-Goals

**Goals:**
- Cuatro pantallas administrativas funcionales y estéticamente consistentes con `/users` y el diseño Stitch "Agro-Systemic" (Material 3).
- Modal único por módulo que cubre creación y edición, replicando el patrón "diff submit" de `users-ui`.
- Submenú "Catálogos" en el `NavigationRail` que no rompe la API existente del rail y permite agregar futuros catálogos sin tocar el organism.
- Reuso máximo de átomos/moléculas existentes; sólo se añaden átomos genuinamente nuevos (`Switch`) o moléculas con valor más allá de catálogos (`RailFlyout`).
- Tests RTL/jsdom por módulo cubriendo flujos felices y errores tipados.

**Non-Goals:**
- Generalizar los 4 módulos en un único `<CatalogResource>` configurable. Cada módulo conserva su propio `_logic/` y `_blocks/` para mantener simplicidad y facilidad de evolución independiente; el factor común se extrae solo a átomos/moléculas reutilizables.
- Búsqueda server-side (el backend no acepta `?q=` aún; los filtros viven en cliente sobre la página cargada).
- Hard delete (el backend implementa soft delete; la UI ofrece "Reactivar" para items inactivos).
- Validaciones cruzadas entre catálogos (sin relación FK entre `Department` y `Branch` por ahora).
- Internacionalización (textos en español hard-coded, como `users-ui`).

## Decisions

### Decisión 1 — Hub `/catalogs` + 4 subrutas anidadas, no rutas planas

Las cuatro pantallas viven bajo `app/(private)/catalogs/<módulo>/`:

```
app/(private)/catalogs/
├── layout.tsx              # Hereda del shell privado; no añade chrome adicional
├── page.tsx                # Hub con 4 tarjetas (una por catálogo, gated por permiso)
├── _blocks/                # Bloques compartidos por las 4 subpantallas
│   ├── CatalogShell.tsx    # Estructura: título, breadcrumb opcional, toolbar slot, contenido
│   ├── CatalogToolbar.tsx  # Search + toggle inactivos + botón "Nuevo"
│   ├── CatalogPagination.tsx
│   ├── CatalogEmpty.tsx
│   ├── CatalogError.tsx
│   └── CatalogStatusBadge.tsx  # Badge "Activo" / "Inactivo"
├── payment-methods/
│   ├── layout.tsx
│   ├── page.tsx            # Server: cookie check + render <PaymentMethodsPage />
│   ├── _blocks/{PaymentMethodsPage,PaymentMethodsTable,PaymentMethodEditModal}.tsx
│   └── _logic/{services,hooks,types,schemas,errors}.ts
├── folios/...
├── departments/...
└── branches/...
```

**Por qué anidado**: agrupar bajo `/catalogs` deja la URL semántica (`/catalogs/payment-methods`), permite que el hub `/catalogs` sirva como punto de entrada cuando el usuario hace click en el padre del submenú, y mantiene el `NavigationRail` con un único item primario (`catalogs`) en lugar de cuatro.

**Alternativa descartada**: rutas planas (`/payment-methods`, `/folios`, etc.) — fuerza añadir 4 items al rail, satura la barra, y diluye la idea conceptual de "catálogos administrativos".

### Decisión 2 — Submenú vía `children?: RailItem[]` + `RailFlyout` molécula

`RailItem` se extiende con `children?: RailItem[]`. El `NavigationRail.tsx` detecta items con `children` y los renderiza con interacción dual:

1. **Click en el icono del padre** → navega a `item.href` (el hub `/catalogs`).
2. **Hover sobre el icono del padre** → muestra el flyout vertical (`RailFlyout`) anclado a la derecha del rail (posición `left: 80px`), con los hijos visibles según permisos.
3. **Click en un hijo del flyout** → navega al hijo y cierra el flyout.
4. **Mouse leave del flyout y del padre** → cierra el flyout.

Visibilidad del padre: `visible = children.some(child => can(child.requires) !== false)` — se muestra el padre si AL MENOS UNO de los hijos es visible. Si todos los hijos están en `loading`, se muestra optimistamente.

Estilo del flyout: panel `bg-surface-container-low` con `shadow-lg rounded-r-xl border border-outline-variant py-2`, cada item con icono + label horizontal (no vertical), `min-width: 240px`. Mantiene `usePathname()` para active state de los hijos.

**Alternativa descartada A — Tabs internas en `/catalogs`**: el usuario pidió explícitamente "submenu de catálogos" en el menú; mover el switching a tabs internas oculta los 4 destinos del navegador principal y rompe la solicitud.

**Alternativa descartada B — Drawer modal Material 3**: introduce complejidad de overlay/aria, mayor coste de tests, y obliga al usuario a hacer clic doble. El flyout-on-hover es directo y consistente con otros panels admin estilo G Suite.

### Decisión 3 — Modal único con dos modos por módulo (`create` | `edit`)

Cada `<Módulo>EditModal.tsx` recibe `mode: "create" | "edit"` + (`initial?: <Entidad>` para edit). Estado local controlado para los campos editables. Submit:

- **Create**: valida con `createSchema` Zod, llama `create<Módulo>(body)`. En éxito, cierra y refresca la tabla.
- **Edit**: valida con `updateSchema` Zod, calcula el diff respecto a `initial`. Si el diff es vacío, "Guardar" queda deshabilitado. Si no, llama `update<Módulo>(id, diff)`.

`code` se renderiza con `<input>` en `create` y como `<span class="font-mono text-on-surface-variant">` en `edit` (visual, no editable). El backend ignora silenciosamente `code` en PATCH, pero la UI lo previene explícitamente para evitar confusión.

`isActive` aparece como `Switch` en ambos modos. En `create` su default es `true`. En `edit` lo controla el usuario; en paralelo, las acciones de la fila ofrecen "Eliminar" (DELETE) y "Reactivar" (PATCH `{ isActive: true }`) para los flujos rápidos sin modal.

**Por qué un solo modal**: dos modales separados duplican layout, validación y tests. El patrón con `mode` se ve cómodo en React y es coherente con varios panels admin (Stripe, Linear).

### Decisión 4 — Soft delete sin `ConfirmDialog` cuando ya está inactivo; reactivar es un acto explícito

Si `entity.isActive === true`, el botón de la fila es "Eliminar" (icono `delete`); al hacer click muestra un `ConfirmDialog` ("¿Desactivar este <recurso>?") y, al confirmar, llama `softDelete<Módulo>(id)`. La fila pasa a mostrarse con badge "Inactivo" en gris.

Si `entity.isActive === false` y la tabla se carga con `?includeInactive=true`, el botón de la fila es "Reactivar" (icono `restore`); al hacer click llama `update<Módulo>(id, { isActive: true })` directamente, sin confirmación (acción reversible y benigna).

**Alternativa descartada**: confirmación para reactivar también. No agrega seguridad y agrega fricción innecesaria.

### Decisión 5 — Toggle "Mostrar inactivos" en toolbar, persistido en `useState` (no URL)

El backend acepta `?includeInactive=true`. La UI lo expone como toggle `Switch` en la toolbar; cuando se activa, el hook `use<Módulo>` añade el query param y refresca. No se persiste en URL ni en `sessionStorage` — al recargar la pantalla, vuelve al default `false`.

**Por qué no URL**: añadir querystring requiere `next/navigation`'s `useSearchParams` + `useRouter` en bloques presentacionales o mover lógica al orquestador con efecto extra. Para un panel admin de uso esporádico, el coste no se justifica. Si en el futuro se quiere shareable links se abre como change incremental.

### Decisión 6 — `_logic/services/` por módulo replica el shape de `users-ui`

Cada módulo expone:

```ts
list<Módulo>({ page, pageSize, includeInactive, fetchImpl? }): Promise<List<Módulo>Response>
get<Módulo>({ id, fetchImpl? }): Promise<<Entidad>>
create<Módulo>({ body, fetchImpl? }): Promise<<Entidad>>
update<Módulo>({ id, body, fetchImpl? }): Promise<<Entidad>>
softDelete<Módulo>({ id, fetchImpl? }): Promise<void>
```

Todos vuelven datos parseados (`createdAt`, `updatedAt` ya convertidos a `Date`) o lanzan errores tipados del módulo: `<Módulo>NotFoundError` (404), `<Módulo>CodeAlreadyInUseError` (409 con `"code already in use"` en el mensaje), y re-lanzan `ForbiddenError`/`NetworkError`/`UnauthenticatedError` de `authFetch`.

Esto reproduce exactamente el contrato de `users-ui` y permite testear hooks sin tocar `sessionStorage`.

### Decisión 7 — Átomos/moléculas reutilizables: `Switch` y `RailFlyout`

- `Switch` se reutiliza en cada modal (campo `isActive`) y en cada toolbar (toggle "Mostrar inactivos"). Se ubica en `app/_components/atoms/Switch/Switch.tsx`. API: `<Switch checked onChange disabled? aria-label />`. Estilo Material 3 (track redondeado con thumb deslizante).
- `RailFlyout` se ubica en `app/_components/molecules/RailFlyout/RailFlyout.tsx`. API: `<RailFlyout open anchorTop items onItemClick onClose />`. Renderiza la lista vertical de items, captura `onMouseLeave`, devuelve focus al padre al cerrar.

Ambos llevan tests RTL en `tests/unit/ui/_components/`.

### Decisión 8 — Hub `/catalogs` con 4 tarjetas, no redirect

Cuando el usuario hace click en el padre `catalogs` del rail (sin pasar por el flyout), aterriza en `/catalogs`. Esta página muestra 4 tarjetas con icono + título + descripción corta del catálogo + botón "Abrir" deshabilitado si el usuario no tiene `<recurso>:read`. Permite navegación incluso desde dispositivos sin hover (tablets) y da contexto cuando el usuario no recuerda exactamente qué hay bajo "Catálogos".

**Alternativa descartada**: redirect a la primera subruta accesible. Quita la noción del hub y obliga a lógica de servidor para escoger la primera accesible.

### Decisión 9 — Datos numéricos y de máscara: validación en cliente espejo del backend

- `code` en `create`: `z.string().regex(/^[A-Z0-9_]{1,32}$/, "El código debe ser MAYÚSCULAS, dígitos y guiones bajos")`.
- `folios.prefix`: `z.string().regex(/^[A-Z0-9-]{1,8}$/)` con opción `null` (campo vacío → `null` antes de enviar).
- `folios.currentNumber`: `z.number().int().min(0)`. Input `type="number" min="0"` con `parseInt`.
- `branches.email`: `z.string().email().max(120)` con opción `null`.
- `description`, `address`, `phone` con `z.string().max(...)` según los límites de cada spec.

Mantener las regex idénticas al backend evita 400s sorpresivos tras un submit aparentemente válido.

## Risks / Trade-offs

- **Filtros client-side** → mismo trade-off que `users-ui`: la búsqueda solo opera sobre la página cargada. Mitigación: rótulo "Filtra solo la página actual" debajo del input; cambio incremental futuro para `?q=` server-side si crece el volumen.
- **Hover-only flyout en mobile** → en pantallas táctiles "hover" se simula con tap. Mitigación: además del hover, el flyout se abre con `click` en el icono cuando el evento no es `pointer: fine`; los hijos siempre son accesibles también desde el hub `/catalogs`.
- **`code` inmutable en edit** → el usuario podría querer corregir un typo. Mitigación: el backend explícitamente no permite cambiar `code`; en la UI se muestra deshabilitado con tooltip "El código es inmutable. Crea un nuevo recurso si necesitas cambiarlo". Es una decisión de producto consolidada en el backend; no se va a litigar aquí.
- **Soft delete + reactivar carrera** → dos admins que cambian `isActive` simultáneamente pueden producir un estado inesperado. Mitigación: aceptado para volumen admin bajo; el último que escribe gana; sin pérdida de datos críticos.
- **Submenú vía hover acopla la UX al pointer device** → ya mitigado en el punto anterior con click fallback. Tests RTL ejercitan ambos paths (`fireEvent.mouseEnter`, `fireEvent.click`).
- **Volumen de código nuevo** → 4 módulos con `_blocks/` + `_logic/` añade ~30 archivos. Compensado por la extracción agresiva a `_blocks/` compartidos (`CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`).

## Migration Plan

Sin migraciones de BD ni cambios de schema. Deploy:

1. `npm run build` — verifica tipos TS y compila el bundle de la nueva ruta.
2. `npm test` — toda la suite (incluyendo nuevos tests) debe pasar.
3. Deploy normal a Vercel/Docker.
4. Verificación manual con un admin:
   - Login → submenú "Catálogos" visible al hacer hover sobre `catalogs` en el rail.
   - Navegar a `/catalogs` → ver las 4 tarjetas.
   - En cada subpantalla: listar, crear, editar (diff), soft delete, reactivar, paginar, toggle "Mostrar inactivos".
5. Verificación con un usuario `viewer` (lecturas pero sin `*:write`): los botones "Nuevo", "Editar" y "Eliminar" deben estar ocultos; la tabla y la búsqueda funcionan.
6. Verificación con un usuario sin ningún permiso de catálogo: el item `catalogs` no aparece en el rail; navegar manualmente a `/catalogs` muestra una tarjeta de "Sin acceso" o redirección.

Rollback: revertir el commit. Sin estado persistido nuevo.

## Open Questions

- ¿El item `catalogs` debe ser navegable directamente al hub `/catalogs`, o solamente debe abrir el flyout sin navegar? → **Decisión**: navegable. Hacer click en el icono navega al hub. Hover muestra el flyout. Esto cubre tanto el caso desktop como el touch.
- ¿"Reactivar" debe estar disponible para todos con `<recurso>:write`, o requerir un permiso aparte (`<recurso>:reactivate`)? → **Decisión**: usar `<recurso>:write`, alineado con el contrato del backend que no distingue entre PATCH y DELETE más allá del permiso write.
- ¿Mostrar los items inactivos en la página por defecto si el usuario los acaba de desactivar? → **Decisión**: no auto-toggling. El toggle "Mostrar inactivos" controla la consulta; tras desactivar, la fila desaparece de la lista por defecto (consistente con el contrato backend) y el usuario puede activar el toggle si quiere volver a verla. El `ConfirmDialog` de desactivación menciona explícitamente este comportamiento.
