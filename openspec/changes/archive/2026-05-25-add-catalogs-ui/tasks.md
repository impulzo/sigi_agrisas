## 1. Átomos y moléculas compartidas

- [x] 1.1 Crear `app/_components/atoms/Switch/Switch.tsx` con API `{ checked, onChange, disabled?, "aria-label", id? }` y estilos Material 3 (track 36×20, thumb 16×16, transición); incluir `role="switch"` y `aria-checked`
- [x] 1.2 Crear `app/_components/atoms/Switch/index.ts` reexportando `Switch`
- [x] 1.3 Verificar que en `app/_components/atoms/Icon/icons.ts` existen los nombres `category`, `payments`, `tag`, `apartment`, `store`, `delete`, `restore`, `add`; agregar los que falten en el registro y en el set de Material Symbols cargado
- [x] 1.4 Crear `app/_components/molecules/RailFlyout/RailFlyout.tsx` con la API descrita en la spec (`open`, `anchorTop`, `items`, `activeHref`, `onItemClick`, `onClose`); usar `<Link role="menuitem">` para los hijos
- [x] 1.5 Crear `app/_components/molecules/RailFlyout/index.ts` reexportando `RailFlyout`

## 2. NavigationRail (submenú)

- [x] 2.1 Extender el tipo `RailItem` en `app/_components/organisms/NavigationRail/items.ts` con `children?: RailItem[]`
- [x] 2.2 Insertar el item `catalogs` en `primaryItems` entre `billing` y `users`, con `children`: `payment-methods`, `folios`, `departments`, `branches` (cada hijo con su `requires`, `icon`, `href`, `label`)
- [x] 2.3 Refactorizar `NavigationRail.tsx` para distinguir items con/sin `children`: items planos siguen el flujo actual; items con `children` calculan visibilidad como "al menos un hijo visible/loading" y renderizan `RailFlyout` adyacente con state local `flyoutOpen`
- [x] 2.4 Implementar interacción del padre con `children`: `onMouseEnter` abre, `onMouseLeave` (del padre y del flyout) cierra, `onClick` del icono navega a `href` del padre
- [x] 2.5 Calcular `anchorTop` del flyout midiendo el `getBoundingClientRect().top` del padre cuando se abre (usar `ref` + `useState`); recalcular en `resize`

## 3. Tipos, errores y servicios `_logic` por módulo

### 3.1 payment-methods

- [x] 3.1.1 Crear `app/(private)/catalogs/payment-methods/_logic/types/api.ts` con `PaymentMethodDto`, `ListPaymentMethodsResponse`, `CreatePaymentMethodBody`, `UpdatePaymentMethodBody`
- [x] 3.1.2 Crear `app/(private)/catalogs/payment-methods/_logic/types/domain.ts` con `PaymentMethod` (mismas claves; `createdAt: Date`, `updatedAt: Date`)
- [x] 3.1.3 Crear `app/(private)/catalogs/payment-methods/_logic/errors.ts` con `PaymentMethodNotFoundError` y `PaymentMethodCodeAlreadyInUseError`
- [x] 3.1.4 Crear `app/(private)/catalogs/payment-methods/_logic/services/listPaymentMethods.ts` (`{ page, pageSize, includeInactive, fetchImpl? }`); parsear fechas
- [x] 3.1.5 Crear `services/createPaymentMethod.ts`; mapear 409→`PaymentMethodCodeAlreadyInUseError`
- [x] 3.1.6 Crear `services/updatePaymentMethod.ts`; mapear 404→`PaymentMethodNotFoundError`, 409→`PaymentMethodCodeAlreadyInUseError`
- [x] 3.1.7 Crear `services/softDeletePaymentMethod.ts`; 404→`PaymentMethodNotFoundError`; devuelve `void` para 204
- [x] 3.1.8 Crear `_logic/schemas/paymentMethod.schema.ts` con `createPaymentMethodSchema` y `updatePaymentMethodSchema` (regex `code`, longitudes, `description` nullable)

### 3.2 folios

- [x] 3.2.1 Crear `app/(private)/catalogs/folios/_logic/types/api.ts` (`FolioDto`, `ListFoliosResponse`, `CreateFolioBody`, `UpdateFolioBody`)
- [x] 3.2.2 Crear `_logic/types/domain.ts` con `Folio`
- [x] 3.2.3 Crear `_logic/errors.ts` con `FolioNotFoundError`, `FolioCodeAlreadyInUseError`
- [x] 3.2.4 Crear `services/listFolios.ts`, `createFolio.ts`, `updateFolio.ts`, `softDeleteFolio.ts` (mismos contratos de mapping que payment-methods)
- [x] 3.2.5 Crear `_logic/schemas/folio.schema.ts` con regex de `prefix` (`^[A-Z0-9-]{1,8}$`), `currentNumber` entero ≥ 0

### 3.3 departments

- [x] 3.3.1 Crear `app/(private)/catalogs/departments/_logic/types/api.ts` (`DepartmentDto`, `ListDepartmentsResponse`, `CreateDepartmentBody`, `UpdateDepartmentBody`)
- [x] 3.3.2 Crear `_logic/types/domain.ts` con `Department`
- [x] 3.3.3 Crear `_logic/errors.ts` con `DepartmentNotFoundError`, `DepartmentCodeAlreadyInUseError`
- [x] 3.3.4 Crear los 4 services (`listDepartments`, `createDepartment`, `updateDepartment`, `softDeleteDepartment`)
- [x] 3.3.5 Crear `_logic/schemas/department.schema.ts`

### 3.4 branches

- [x] 3.4.1 Crear `app/(private)/catalogs/branches/_logic/types/api.ts` (`BranchDto`, `ListBranchesResponse`, `CreateBranchBody`, `UpdateBranchBody`)
- [x] 3.4.2 Crear `_logic/types/domain.ts` con `Branch`
- [x] 3.4.3 Crear `_logic/errors.ts` con `BranchNotFoundError`, `BranchCodeAlreadyInUseError`
- [x] 3.4.4 Crear los 4 services
- [x] 3.4.5 Crear `_logic/schemas/branch.schema.ts` con validación de `email` (con `null`), `phone`, `address`

## 4. Hooks por módulo

- [x] 4.1 Crear `app/(private)/catalogs/payment-methods/_logic/hooks/usePaymentMethods.ts` (`{ page, pageSize, includeInactive }` → `{ items, total, isLoading, error, refresh }`); cancela al desmontar; refetch en cambio de params
- [x] 4.2 Crear `app/(private)/catalogs/payment-methods/_logic/hooks/usePaymentMethodMutations.ts` (`createOne`, `updateOne`, `softDeleteOne`, `reactivateOne`)
- [x] 4.3 Replicar 4.1 y 4.2 para `folios` (`useFolios`, `useFolioMutations`)
- [x] 4.4 Replicar 4.1 y 4.2 para `departments` (`useDepartments`, `useDepartmentMutations`)
- [x] 4.5 Replicar 4.1 y 4.2 para `branches` (`useBranches`, `useBranchMutations`)

## 5. Bloques compartidos del hub `/catalogs`

- [x] 5.1 Crear `app/(private)/catalogs/_blocks/CatalogShell.tsx` con layout: header con título + descripción, slot de toolbar, slot de contenido (children)
- [x] 5.2 Crear `app/(private)/catalogs/_blocks/CatalogToolbar.tsx` con: input de búsqueda, `Switch` "Mostrar inactivos", botón "Nuevo" (props: `canWrite`, `onCreate`, `searchValue`, `onSearchChange`, `includeInactive`, `onIncludeInactiveChange`)
- [x] 5.3 Crear `app/(private)/catalogs/_blocks/CatalogPagination.tsx` (basado en `UsersPagination`): "Anterior/Siguiente", indicador "X-Y de N", selector de `pageSize` (10/20/50)
- [x] 5.4 Crear `app/(private)/catalogs/_blocks/CatalogStatusBadge.tsx` (Activo/Inactivo)
- [x] 5.5 Crear `app/(private)/catalogs/_blocks/CatalogEmpty.tsx` (estado vacío con CTA "Crear el primero" si `canWrite`)
- [x] 5.6 Crear `app/(private)/catalogs/_blocks/CatalogError.tsx` (estado de error con botón "Reintentar")
- [x] 5.7 Crear `app/(private)/catalogs/_blocks/CatalogHubCard.tsx` (tarjeta del hub: icono, título, descripción, botón "Abrir"; props: `icon`, `title`, `description`, `href`, `canAccess`, `tooltip?`)
- [x] 5.8 Crear `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx` (orquestador del hub: renderiza 4 `CatalogHubCard` con sus permisos calculados vía `useCurrentUser().can()`)

## 6. Bloques por módulo

### 6.1 payment-methods

- [x] 6.1.1 Crear `app/(private)/catalogs/payment-methods/_blocks/PaymentMethodsPage.tsx` (orquestador): estado `page`, `pageSize`, `search`, `includeInactive`, `modalState: { mode: "create" | "edit" | null; entity?: PaymentMethod }`; usa `useCurrentUser` para `canRead` y `canWrite`
- [x] 6.1.2 Crear `_blocks/PaymentMethodsTable.tsx` (columnas: code, name, description (truncada), Activo, acciones); presentational
- [x] 6.1.3 Crear `_blocks/PaymentMethodEditModal.tsx` (modo `create` | `edit`; campos `code`, `name`, `description`, `isActive`; submit con diff en edit; map 409 inline en `code`)

### 6.2 folios

- [x] 6.2.1 Crear `app/(private)/catalogs/folios/_blocks/FoliosPage.tsx`
- [x] 6.2.2 Crear `_blocks/FoliosTable.tsx` (columnas: code, name, prefix, currentNumber, Activo, acciones)
- [x] 6.2.3 Crear `_blocks/FolioEditModal.tsx` (campos: code, name, prefix, currentNumber, isActive; validación específica de `prefix` y `currentNumber`)

### 6.3 departments

- [x] 6.3.1 Crear `app/(private)/catalogs/departments/_blocks/DepartmentsPage.tsx`
- [x] 6.3.2 Crear `_blocks/DepartmentsTable.tsx` (columnas: code, name, description, Activo, acciones)
- [x] 6.3.3 Crear `_blocks/DepartmentEditModal.tsx`

### 6.4 branches

- [x] 6.4.1 Crear `app/(private)/catalogs/branches/_blocks/BranchesPage.tsx`
- [x] 6.4.2 Crear `_blocks/BranchesTable.tsx` (columnas: code, name, address (truncada), phone, email, Activo, acciones)
- [x] 6.4.3 Crear `_blocks/BranchEditModal.tsx` (campos: code, name, address, phone, email, isActive)

## 7. Route handlers de Next

- [x] 7.1 Crear `app/(private)/catalogs/layout.tsx` (lee cookie `refreshToken`, redirige si falta)
- [x] 7.2 Crear `app/(private)/catalogs/page.tsx` que renderiza `<CatalogsHubPage />`
- [x] 7.3 Crear `app/(private)/catalogs/payment-methods/{layout.tsx, page.tsx}` (page renderiza `<PaymentMethodsPage />`)
- [x] 7.4 Crear `app/(private)/catalogs/folios/{layout.tsx, page.tsx}`
- [x] 7.5 Crear `app/(private)/catalogs/departments/{layout.tsx, page.tsx}`
- [x] 7.6 Crear `app/(private)/catalogs/branches/{layout.tsx, page.tsx}`

## 8. Tests unitarios — átomos / moléculas / rail

- [x] 8.1 `tests/unit/ui/_components/atoms/Switch.test.tsx` — render, click toggles, disabled no toggle, teclado Space toggles, `aria-checked` refleja `checked`
- [x] 8.2 `tests/unit/ui/_components/molecules/RailFlyout.test.tsx` — no renderiza con `open=false`, render con items, active styling por `activeHref`, click invoca `onItemClick`, `onMouseLeave` invoca `onClose`, `anchorTop` aplica `style.top`
- [x] 8.3 Extender `tests/unit/ui/_components/organisms/NavigationRail.test.tsx`: muestra `catalogs` si al menos un hijo está permitido; oculta `catalogs` si todos los hijos están denegados; hover abre flyout; mouseleave cierra; click en icono padre navega a `/catalogs`; click en hijo navega y cierra

## 9. Tests unitarios — services por módulo

- [x] 9.1 `tests/unit/ui/(private)/catalogs/payment-methods/services/listPaymentMethods.test.ts` — éxito, 401/403/network mapeados, conversión de fechas, query `includeInactive`
- [x] 9.2 `tests/unit/ui/(private)/catalogs/payment-methods/services/createPaymentMethod.test.ts` — 201 éxito, 409→`PaymentMethodCodeAlreadyInUseError`, 400 validation
- [x] 9.3 `tests/unit/ui/(private)/catalogs/payment-methods/services/updatePaymentMethod.test.ts` — éxito, 404, 409 mapeados
- [x] 9.4 `tests/unit/ui/(private)/catalogs/payment-methods/services/softDeletePaymentMethod.test.ts` — 204→void, 404 mapeado
- [x] 9.5 Replicar 9.1–9.4 para `folios` (incluir caso de `currentNumber` parseado como número)
- [x] 9.6 Replicar 9.1–9.4 para `departments`
- [x] 9.7 Replicar 9.1–9.4 para `branches` (incluir caso de `email` válido/`null`)

## 10. Tests unitarios — hooks por módulo

- [x] 10.1 `tests/unit/ui/(private)/catalogs/payment-methods/hooks/usePaymentMethods.test.ts` — carga inicial, cambio de página, toggle `includeInactive`, refresh, cancelación al desmontar
- [x] 10.2 `tests/unit/ui/(private)/catalogs/payment-methods/hooks/usePaymentMethodMutations.test.ts` — createOne éxito, updateOne con diff vacío no llama, softDeleteOne llama, reactivateOne llama PATCH `{ isActive: true }`
- [x] 10.3 Replicar 10.1 y 10.2 para `folios`
- [x] 10.4 Replicar 10.1 y 10.2 para `departments`
- [x] 10.5 Replicar 10.1 y 10.2 para `branches`

## 11. Tests unitarios — bloques por módulo

- [x] 11.1 `tests/unit/ui/(private)/catalogs/payment-methods/PaymentMethodsPage.test.tsx` — render con `canRead` true/false/loading; gating del botón "Nuevo" por `canWrite`; integración con mocks de hooks
- [x] 11.2 `tests/unit/ui/(private)/catalogs/payment-methods/PaymentMethodsTable.test.tsx` — render de filas, oculta acciones sin `canWrite`, badge "Activo/Inactivo", botón Eliminar vs Reactivar según `isActive`
- [x] 11.3 `tests/unit/ui/(private)/catalogs/payment-methods/PaymentMethodEditModal.test.tsx` — modo create con todos los campos editables, modo edit con `code` disabled, validación regex `code`, diff vacío deshabilita "Guardar", 409 muestra inline en `code`
- [x] 11.4 Replicar 11.1–11.3 para `folios` (incluir validación de `prefix` y `currentNumber`)
- [x] 11.5 Replicar 11.1–11.3 para `departments`
- [x] 11.6 Replicar 11.1–11.3 para `branches` (incluir validación de `email`)

## 12. Tests unitarios — hub

- [x] 12.1 `tests/unit/ui/(private)/catalogs/CatalogsHubPage.test.tsx` — 4 tarjetas renderizadas; tarjeta disabled cuando falta el permiso correspondiente; navegación con click

## 13. Documentación

- [x] 13.1 Actualizar `CLAUDE.md` agregando la sección "Administración de catálogos (UI)" con: rutas (`/catalogs`, `/catalogs/<módulo>`), patrón de modal create/edit con diff, regla de visibilidad del submenú, listado de campos por módulo (tabla resumida)
- [x] 13.2 Documentar en `CLAUDE.md` el nuevo átomo `Switch` y la nueva molécula `RailFlyout` bajo la sección de Arquitectura Frontend
- [x] 13.3 Documentar la extensión del tipo `RailItem` con `children?` en la sección NavigationRail de `CLAUDE.md`

## 14. Verificación final

- [x] 14.1 Ejecutar `npm run build` y verificar 0 errores de TypeScript en los nuevos módulos
- [x] 14.2 Ejecutar `npm test` y verificar que la suite completa pasa (nuevos + existentes); permitir fallos pre-existentes documentados pero no regresiones
- [x] 14.3 Iniciar dev server y verificar con un admin: hover sobre `catalogs` muestra flyout; click en icono lleva al hub; hub muestra 4 tarjetas activas; cada subpantalla carga, pagina, crea, edita (diff), desactiva, reactiva (con toggle "Mostrar inactivos" encendido)
- [x] 14.4 Verificar con un usuario `viewer` (sólo `:read`) que: los botones "Nuevo", "Editar", "Eliminar", "Reactivar" no se muestran; las tablas y filtros funcionan
- [x] 14.5 Verificar con un usuario sin ningún permiso de catálogo que el item `catalogs` del rail desaparece después de que la verificación de permisos resuelve
- [x] 14.6 Verificar accesibilidad básica del flyout: navegación con teclado entre el padre y los hijos; `Escape` cierra el flyout
- [x] 14.7 Snapshot manual: comparar las pantallas con el diseño de Stitch / con `/users` para confirmar consistencia visual (tipografía, spacing, badges, modales)
