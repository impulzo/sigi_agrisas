## Context

`Department` existe como catálogo plano. `Product` tiene `departmentId` (TEXT, FK Restrict). `Provider` tiene campos fiscales MX. No hay FK entre `departments` y `providers`. El proyecto mantiene FKs como `TEXT` (no `@db.Uuid`) para evitar mismatch con las PKs `String @id @default(uuid())`.

La migración debe ser no-destructiva: los departamentos existentes tendrán `provider_id = NULL` tras la migración. La API no fuerza NOT NULL en BD para proteger datos existentes; la validación de requerido ocurre en el controller (Zod) para nuevos registros.

## Goals / Non-Goals

**Goals:**
- Columna `provider_id TEXT` nullable en `departments` con FK Restrict.
- DTO enriquecido con `providerId`/`providerName` en departments y `providerName` en products.
- Filtros `?providerId` en departments y products.
- Guard en provider soft-delete: 409 si tiene departamentos activos.
- UI: combobox proveedor en departamentos; filtro proveedor en productos; campo derivado en formulario de producto.

**Non-Goals:**
- No duplicar `provider_id` en `products` (la jerarquía se resuelve via join department→provider).
- No migrar datos existentes a un proveedor por defecto (quedan con `providerId: null`).
- No cambiar la lógica de cálculo de totales ni snapshots de ventas.

## Decisions

**D1 — FK TEXT nullable en departments**
Patrón ya establecido en el proyecto. `provider_id TEXT` referencia `providers.id`. ON DELETE RESTRICT: un proveedor con departamentos no puede borrarse físicamente (soft-delete tampoco si tiene deptos activos). Alternativa (CASCADE) descartada porque huérfanos son datos de negocio valiosos.

**D2 — Validación de requerido en capa de aplicación, no en BD**
Permite migración limpia sin backfill. El controller Zod marca `providerId` como requerido en POST. En PATCH es opcional. Datos legacy con `providerId=null` se muestran en UI con "Sin proveedor".

**D3 — Filtro `?providerId` en departments y products**
`GET /departments?providerId=<uuid>` filtra por FK directa. `GET /products?providerId=<uuid>` requiere un join: `JOIN departments d ON p.department_id = d.id WHERE d.provider_id = :providerId`. Ambos usan `parseListQuery` extendido con el campo opcional.

**D4 — Provider soft-delete guard**
En `ProvidersController.deactivate`: antes de `isActive=false`, contar `departments WHERE provider_id=id AND is_active=true`. Si > 0 → 409 `{"error":"ProviderHasDepartments","departmentCount":N}`. Misma estrategia que `TaxRateInUseByProductsError`.

**D5 — `providerName` en ProductDto via join doble**
`PrismaProductRepository.list` agrega join: `Department → Provider`. Se añade `providerName: string | null` al DTO plano de lista. En `findById` se usa `include: { department: { include: { provider: true } } }`. Sin N+1 en ambos casos.

**D6 — Filtro de departamentos por proveedor en UI productos**
Al cambiar el filtro de proveedor en `ProductsPage`, se limpia el filtro de departamento y se dispara `GET /departments?providerId=<uuid>&pageSize=100` para poblar el combobox de departamentos filtrado. Usa el mismo hook `useDepartmentsOptions` extendido con el parámetro.

**D7 — `<select>` nativo en lugar del componente `Combobox` para listas estáticas**
El componente `Combobox` de Atomic Design (`app/_components/molecules/Combobox/`) está diseñado para búsqueda typeahead con `onSearch` (ej. `CustomerPicker` con paginación server-side). Para listas estáticas cortas (≤ 20 proveedores, ≤ 50 departamentos) cargadas en caché, `<select>` nativo ofrece mejor accesibilidad, menor complejidad y UX equivalente. Los specs usan "Combobox" en sentido genérico (dropdown); la implementación usa `<select>` intencionalmente.

## Risks / Trade-offs

- **Datos legacy sin proveedor**: los departamentos existentes tendrán `providerId: null`. La UI los muestra con "Sin proveedor". Al editar uno de ellos, el campo pasa a ser requerido. → Aceptado; se documenta en la UI con un mensaje inline con ícono de info (no tooltip nativo, que tiene accesibilidad limitada en mobile).
- **Restricción de soft-delete de proveedor**: si un operador intenta desactivar un proveedor con departamentos activos, recibe 409. → UX esperada; se muestra mensaje claro.
- **Join doble en products list**: agrega latencia marginal. Con índice en `departments.provider_id` (incluir en migración) el impacto es mínimo.
