## 1. Icono y verificación previa

- [x] 1.1 Verificar si `local_shipping` existe en `app/_components/atoms/Icon/icons.ts`; si no, añadirlo al registro de `IconName` y al set de Material Symbols cargado
- [x] 1.2 Verificar que `app/_lib/authFetch.ts` y los errores tipados (`UnauthenticatedError`, `ForbiddenError`, `NetworkError`) están disponibles y se usan en los 4 catálogos existentes (referencia de patrón)
- [x] 1.3 Verificar que `useDebounce` existe en `app/_hooks/`. Si no, NO crearlo como hook global; usar `setTimeout` + `useEffect` inline dentro de `ProvidersPage` (suficiente para este caso, evita sobreingeniería)

## 2. Tipos, errores y schemas `_logic`

- [x] 2.1 Crear `app/(private)/catalogs/providers/_logic/types/api.ts` con `ProviderDto`, `ListProvidersResponse`, `CreateProviderBody`, `UpdateProviderBody`, `ListProvidersParams` (`{ page, pageSize, includeInactive, search? }`)
- [x] 2.2 Crear `app/(private)/catalogs/providers/_logic/types/domain.ts` con `Provider` (mismas claves que `ProviderDto`, con `createdAt: Date`, `updatedAt: Date`)
- [x] 2.3 Crear `app/(private)/catalogs/providers/_logic/errors.ts` con `ProviderNotFoundError`, `ProviderCodeAlreadyInUseError`, `ProviderRfcAlreadyInUseError` (todos extienden `Error` con nombre tipado)
- [x] 2.4 Crear `app/(private)/catalogs/providers/_logic/schemas/provider.schema.ts` con `createProviderSchema` y `updateProviderSchema`; regex: `code` `^[A-Z0-9_]{1,32}$`, `rfc` `^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$`, `taxRegime` `^\d{3}$`, `cfdiUse` `^[A-Z]\d{2}$`, `taxZipCode` `^\d{5}$`; mensajes de error en español; campos opcionales con `.nullable()`; `update` con `.refine(...)` exigiendo al menos un campo distinto a `code`

## 3. Services `_logic/services/`

- [x] 3.1 Crear `services/listProviders.ts` (`{ page, pageSize, includeInactive, search?, fetchImpl? }` → `Promise<{ items: Provider[]; total: number; page: number; pageSize: number }>`); construir querystring; omitir `search` si es `undefined` o `< 2 chars`; parsear `createdAt`/`updatedAt` a `Date`
- [x] 3.2 Crear `services/getProvider.ts` (`{ id, fetchImpl? }` → `Promise<Provider>`); mapear 404 → `ProviderNotFoundError`
- [x] 3.3 Crear `services/createProvider.ts` (`{ body, fetchImpl? }` → `Promise<Provider>`); normalizar `code`/`rfc` a uppercase antes de enviar; mapear 409 con `"code already in use"` → `ProviderCodeAlreadyInUseError`; 409 con `"RFC already in use"` → `ProviderRfcAlreadyInUseError`
- [x] 3.4 Crear `services/updateProvider.ts` (`{ id, body, fetchImpl? }` → `Promise<Provider>`); normalizar `rfc` si presente; mapear 404 → `ProviderNotFoundError`, 409 con `"RFC already in use"` → `ProviderRfcAlreadyInUseError`
- [x] 3.5 Crear `services/softDeleteProvider.ts` (`{ id, fetchImpl? }` → `Promise<void>`); 204 → `void`; 404 → `ProviderNotFoundError`

## 4. Hooks `_logic/hooks/`

- [x] 4.1 Crear `hooks/useProviders.ts` (`{ page, pageSize, search, includeInactive }` → `{ items, total, isLoading, error, refresh }`); usar `AbortController` para cancelar requests previos cuando params cambian; cancelar al desmontar
- [x] 4.2 Crear `hooks/useProviderMutations.ts` con `createOne`, `updateOne`, `softDeleteOne`, `reactivateOne` (que llama `update` con `{ isActive: true }`); cada método acepta `{ onSuccess?, onError? }`

## 5. Bloques específicos del módulo `_blocks/`

- [x] 5.1 Crear `_blocks/ProvidersPage.tsx` (orquestador): estado `page`, `pageSize`, `searchInput`, `search` (debounced de `searchInput` con 300ms via `useEffect`+`setTimeout`), `includeInactive`, `modalState: { mode: "create" | "edit" | null; entity?: Provider }`; usa `useCurrentUser` para `canRead` y `canWrite`; renderiza `CatalogShell` + `CatalogToolbar` (con `searchScope="server"`) + `ProvidersTable` + `CatalogPagination` + `ProviderEditModal`; orquesta `useProviders` y `useProviderMutations`
- [x] 5.2 Crear `_blocks/ProvidersTable.tsx` (presentational): columnas `Código` | `Nombre` (con `legalName` como subtítulo gris si existe) | `RFC` (font-mono) | `Régimen` | `Contacto` (primer no-nulo de email/phone/contactName) | `Estado` (CatalogStatusBadge) | `Acciones` (edit, delete/restore); recibe `items`, `canWrite`, `onEdit(p)`, `onSoftDelete(p)`, `onReactivate(p)`; truncado con `truncate` Tailwind
- [x] 5.3 Crear `_blocks/ProviderEditModal.tsx` (modal con 3 secciones): Datos básicos (`code` inmutable en edit, `name`, `isActive`), Datos fiscales (`rfc`, `legalName`, `taxRegime`, `cfdiUse`, `taxZipCode`), Contacto (`email`, `phone`, `address` textarea, `contactName`, `notes` textarea); submit con diff en edit; map 409 → `codeError`/`rfcError` inline; mantiene mismo layout/estilos que `BranchEditModal`

## 6. Toolbar — extensión de `searchScope`

- [x] 6.1 Extender `app/(private)/catalogs/_blocks/CatalogToolbar.tsx` con prop opcional `searchScope?: "client" | "server"` (default `"client"`); cuando `"server"`, renderiza un badge debajo del input con texto "Búsqueda en servidor · 2+ caracteres" (estilo `text-label-sm text-on-surface-variant`)
- [x] 6.2 Verificar que los 4 catálogos existentes (`payment-methods`, `folios`, `departments`, `branches`) NO pasan `searchScope` y siguen funcionando exactamente igual

## 7. Hub `/catalogs` — quinta tarjeta

- [x] 7.1 Editar `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx`: añadir un quinto entry al array `CATALOG_CARDS` con `{ key: "providers", icon: "local_shipping", title: "Proveedores", description: "Gestiona los proveedores y sus datos fiscales.", href: "/catalogs/providers", permission: "providers:read" }`

## 8. NavigationRail — quinto hijo bajo `catalogs`

- [x] 8.1 Editar `app/_components/organisms/NavigationRail/items.ts`: añadir al array `children` del item `catalogs` un quinto entry `{ key: "providers", href: "/catalogs/providers", icon: "local_shipping", label: "Proveedores", requires: "providers:read" }` al final del array

## 9. Route handlers de Next

- [x] 9.1 Crear `app/(private)/catalogs/providers/layout.tsx` (lee cookie `refreshToken`, redirige si falta — mismo patrón que `branches/layout.tsx`)
- [x] 9.2 Crear `app/(private)/catalogs/providers/page.tsx` que renderiza `<ProvidersPage />` (Server Component con `metadata`)

## 10. Tests unitarios — services

- [x] 10.1 `tests/unit/ui/(private)/catalogs/providers/services/listProviders.test.ts` — éxito, mapeo de 401/403/network, conversión de fechas, query con `search` y `includeInactive`, omite `search` si `< 2 chars`
- [x] 10.2 `tests/unit/ui/(private)/catalogs/providers/services/getProvider.test.ts` — éxito (devuelve `Provider` con fechas parseadas), 404 → `ProviderNotFoundError`
- [x] 10.3 `tests/unit/ui/(private)/catalogs/providers/services/createProvider.test.ts` — 201 éxito, normalización de `code`/`rfc` a uppercase, 409 con `"code already in use"` → `ProviderCodeAlreadyInUseError`, 409 con `"RFC already in use"` → `ProviderRfcAlreadyInUseError`
- [x] 10.4 `tests/unit/ui/(private)/catalogs/providers/services/updateProvider.test.ts` — 200 éxito, 404 → `ProviderNotFoundError`, 409 con `"RFC already in use"` → `ProviderRfcAlreadyInUseError`
- [x] 10.5 `tests/unit/ui/(private)/catalogs/providers/services/softDeleteProvider.test.ts` — 204 → void, 404 → `ProviderNotFoundError`

## 11. Tests unitarios — hooks

- [x] 11.1 `tests/unit/ui/(private)/catalogs/providers/hooks/useProviders.test.ts` — carga inicial; cambio de `page` refetch; cambio de `search` refetch; cambio de `includeInactive` refetch; cancelación de fetch anterior cuando params cambian rápidamente; cancelación al desmontar
- [x] 11.2 `tests/unit/ui/(private)/catalogs/providers/hooks/useProviderMutations.test.ts` — `createOne` éxito invoca `onSuccess` con la entidad; `createOne` con 409 invoca `onError`; `updateOne` con diff vacío NO llama el service; `softDeleteOne` llama; `reactivateOne` llama PATCH con `{ isActive: true }`

## 12. Tests unitarios — bloques

- [x] 12.1 `tests/unit/ui/(private)/catalogs/providers/ProvidersPage.test.tsx` — render con `canRead` true/false/loading; gating del botón "Nuevo" por `canWrite`; debounce de búsqueda (escribir → esperar 300ms → fetch); `searchInput < 2 chars` no dispara fetch
- [x] 12.2 `tests/unit/ui/(private)/catalogs/providers/ProvidersTable.test.tsx` — render de filas con `legalName` como subtítulo; oculta acciones sin `canWrite`; badge "Activo"/"Inactivo"; botón "Eliminar" vs "Reactivar" según `isActive`; columna Contacto muestra primer no-nulo
- [x] 12.3 `tests/unit/ui/(private)/catalogs/providers/ProviderEditModal.test.tsx` — modo create con todos los campos editables; modo edit con `code` disabled; validación regex de `code`, `rfc`, `taxRegime`, `cfdiUse`, `taxZipCode`; uppercase forzado en `code` y `rfc` al escribir; diff vacío deshabilita "Guardar"; 409 `code` muestra error inline en campo `code`; 409 `rfc` muestra error inline en campo `rfc`; secciones "Datos básicos", "Datos fiscales", "Contacto" renderizadas

## 13. Tests unitarios — integración con shell

- [x] 13.1 Extender `tests/unit/ui/_components/organisms/NavigationRail.test.tsx`: verificar que el flyout de `catalogs` ahora muestra 5 hijos (incluyendo "Proveedores") cuando todos los permisos están concedidos
- [x] 13.2 Extender `tests/unit/ui/(private)/catalogs/CatalogsHubPage.test.tsx`: verificar que se renderizan 5 tarjetas (incluyendo "Proveedores") y que el gating por `providers:read` funciona

## 14. Documentación

- [x] 14.1 Actualizar `CLAUDE.md` en la sección "Administración de catálogos (UI)": añadir `providers` a la lista de rutas, añadir fila a la tabla de "Campos por módulo" con (code, name, rfc, legalName, taxRegime, cfdiUse, taxZipCode, email, phone, address, contactName, notes, isActive) y notar que es el primer módulo con búsqueda server-side
- [x] 14.2 Actualizar `CLAUDE.md` documentando la nueva prop `searchScope?: "client" | "server"` de `CatalogToolbar` (default `"client"`)
- [x] 14.3 Actualizar `CLAUDE.md` sección de OpenSpec con el change `add-providers-ui` en curso (y al archivar, moverlo a la lista de archivados)

## 15. Verificación final

- [x] 15.1 Ejecutar `npm run build` y verificar 0 errores de TypeScript
- [x] 15.2 Ejecutar `npm test` y verificar que la suite completa pasa (nuevos + existentes); permitir fallos pre-existentes documentados pero no regresiones
- [x] 15.3 Iniciar dev server (`npm run dev`) y verificar con un admin: hover sobre `catalogs` muestra flyout con 5 hijos; click en "Proveedores" navega a `/catalogs/providers`; hub `/catalogs` muestra 5 tarjetas; en `/catalogs/providers`: listar, paginar, búsqueda server-side por RFC (mín 2 chars), crear (con 3 secciones), editar (diff), desactivar (con confirmación), reactivar (sin confirmación), toggle "Mostrar inactivos"
- [x] 15.4 Verificar con `viewer` (sólo `providers:read`): tabla y búsqueda funcionan; botones "Nuevo", "Editar", "Eliminar", "Reactivar" no se muestran
- [x] 15.5 Verificar con un usuario sin `providers:read`: tarjeta de "Proveedores" en hub aparece como "Sin acceso"; entry "Proveedores" del flyout desaparece después de que la verificación resuelve
- [x] 15.6 Snapshot manual: comparar visualmente `/catalogs/providers` con `/catalogs/branches` para confirmar consistencia (tipografía, spacing, badges, modal con secciones)
