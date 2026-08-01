## 1. Lógica de módulo (`_logic/`)

- [x] 1.1 Crear `app/(private)/catalogs/customers/_logic/types/api.ts` con `CustomerDto` (incluye `creditLimit`, `currentBalance`, `creditDays`) y tipos de request/response de list/create/update
- [x] 1.2 Crear `app/(private)/catalogs/customers/_logic/types/domain.ts` con el tipo `Customer` usado internamente por hooks/componentes
- [x] 1.3 Crear `app/(private)/catalogs/customers/_logic/errors.ts` con `CustomerNotFoundError`, `CustomerCodeAlreadyInUseError`, `CustomerRfcAlreadyInUseError`
- [x] 1.4 Crear `app/(private)/catalogs/customers/_logic/schemas/customer.schema.ts` (Zod create/update: `code`, `name`, `rfc` requeridos; fiscales opcionales con regex; `creditLimit` número ≥0 o null; `creditDays` entero ≥0 opcional)
- [x] 1.5 Crear `app/(private)/catalogs/customers/_logic/services/listCustomers.ts` (`GET /customers` con page/pageSize/search/includeInactive, acepta `fetchImpl?`)
- [x] 1.6 Crear `app/(private)/catalogs/customers/_logic/services/getCustomer.ts`
- [x] 1.7 Crear `app/(private)/catalogs/customers/_logic/services/createCustomer.ts` (mapea 409 code/rfc a errores tipados)
- [x] 1.8 Crear `app/(private)/catalogs/customers/_logic/services/updateCustomer.ts` (mapea 404/409 a errores tipados)
- [x] 1.9 Crear `app/(private)/catalogs/customers/_logic/services/softDeleteCustomer.ts`
- [x] 1.10 Crear `app/(private)/catalogs/customers/_logic/hooks/useCustomers.ts` (fetch con `AbortController` en cambio de params/unmount)
- [x] 1.11 Crear `app/(private)/catalogs/customers/_logic/hooks/useCustomerMutations.ts` (`createOne`, `updateOne` no-op si diff vacío, `softDeleteOne`, `reactivateOne`)

## 2. Componentes de presentación

- [x] 2.1 Crear `app/(private)/catalogs/customers/page.tsx` y `layout.tsx` (calco de `catalogs/providers/`)
- [x] 2.2 Crear `app/(private)/catalogs/customers/_blocks/CustomersPage.tsx` (orquesta page/pageSize/search debounced 300ms/includeInactive/modal state, gate `customers:read`/`customers:write`)
- [x] 2.3 Crear `app/(private)/catalogs/customers/_blocks/CustomersTable.tsx` (columnas code, name+legalName subtítulo, rfc monospace, creditLimit, currentBalance, creditDays, `CatalogStatusBadge`, acciones editar/eliminar/reactivar)
- [x] 2.4 Crear `app/(private)/catalogs/customers/_blocks/CustomerEditModal.tsx` (modo create/edit, 3 secciones: Datos básicos / Datos fiscales / Contacto y crédito, `code` disabled en edit, diff-based PATCH, errores inline 409)

## 3. Descubribilidad (hub y navegación)

- [x] 3.1 Agregar tarjeta "Clientes" a `CATALOG_CARDS` en `app/(private)/catalogs/_blocks/CatalogsHubPage.tsx` (icon `groups`, permission `customers:read`, href `/catalogs/customers`)
- [x] 3.2 Agregar item `customers` a los `children` de `catalogs` en `app/_components/organisms/NavigationRail/items.ts` (icon `groups`, requires `customers:read`, como último child)

## 4. Tests

- [x] 4.1 Tests unitarios de los services (`_logic/services/*`) mockeando `fetchImpl`: mapeo de 404/409 a errores tipados, éxito, parseo de fechas si aplica
- [x] 4.2 Test de `useCustomerMutations`: `updateOne` con body vacío es no-op, `reactivateOne` envía sólo `isActive`, errores 409 se re-lanzan (no sólo capturados en `mutationError`)
- [x] 4.3 Test de UI (RTL) de `CustomerEditModal`: modo create habilita submit con campos requeridos válidos; modo edit deshabilita submit con diff vacío; `code` disabled en edit; error inline en 409 duplicado de `code`/`rfc`
- [x] 4.4 Test de UI (RTL) de `CustomersTable`/`CustomersPage`: acciones ocultas sin `customers:write`; toggle "Mostrar inactivos" agrega `includeInactive=true`

## 5. Verificación manual

**Verificado end-to-end con Playwright contra sesión real (admin) y BD real (Supabase dev):**

- [x] 5.1 `npm run dev`, navegado a `/catalogs` con sesión admin → tarjeta "Clientes" visible (icon `groups`, descripción correcta, link a `/catalogs/customers`); listado en `/catalogs/customers` carga datos reales de un cliente preexistente mostrando `creditDays: 30` (default del backend) en la columna "Plazo (días)"
- [x] 5.2 Confirmado en snapshot de accesibilidad: hover sobre "Catálogos" abre el flyout con "Clientes" (icon `groups`) como último item, después de "Productos"
- [x] 5.3 Creado cliente completo `CLIQA02` (datos básicos + fiscales `taxRegime/cfdiUse/taxZipCode` + `creditLimit: 15000` + `creditDays: 45`) vía el modal → `POST /api/v1/admin/customers` devolvió 201, tabla refrescó mostrando `$15,000.00` / `$0.00` / `45` / Activo
- [x] 5.4 Editado sólo `creditDays` de 45→60 en modo edición → capturado el body real del `PATCH /api/v1/admin/customers/:id` con `browser_network_request`: `{"creditDays":60}` exacto (diff-only confirmado), tabla reflejó `60` inmediatamente
- [x] 5.5 Tipeado `"p"` (1 char) → sin request `?search=` disparado (confirmado en `browser_network_requests`); completado a `"laywright"` (2+ chars) → disparó `GET .../customers?...&search=laywright` tras debounce, tabla filtró a 1 resultado
- [x] 5.6 Click "Desactivar" → `ConfirmDialog` apareció con el texto esperado → confirmado → fila desapareció del listado activo; toggle "Mostrar inactivos" → fila reapareció con badge "Inactivo" y única acción "Reactivar" → click → volvió a "Activo" con acciones editar/desactivar, sin diálogo de confirmación (reversible/benigno, según spec)
- [x] 5.7 (ver arriba) — confirmado por inspección estática, sin necesidad de browser

Cero errores de consola durante toda la sesión (`browser_console_messages` limpio). Cliente de prueba `CLIQA02` eliminado de la BD al finalizar (hard delete vía script puntual, ya que la API sólo expone soft-delete).
- [x] 5.7 Confirmado por inspección: `CustomerQuickAddModal`, su schema (`pos/_logic/schemas/customerQuickAdd.schema.ts`) y `CustomerPicker` no aparecen en `git diff` de este change — cero líneas tocadas; el nuevo `_logic/` de `catalogs/customers` no importa nada de `pos/_logic` ni viceversa (confirmado por grep)

## 6. Documentación

- [x] 6.1 Actualizar `CLAUDE.md` — agregar `Customers` a la tabla "Capacidades CRUD admin" y una breve entrada en "UI por feature" describiendo `/catalogs/customers`
