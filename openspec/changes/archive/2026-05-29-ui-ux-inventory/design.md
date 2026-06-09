## Context

El backend de `inventory-backend` ya expone dos módulos hexagonales completos (`products`, `inventory`) con sus route handlers bajo `/api/v1/admin/`. El panel tiene 6 CRUDs de UI operativos (`users`, 5 catálogos incluyendo `providers`) que comparten un conjunto maduro de bloques presentacionales (`CatalogShell`, `CatalogToolbar`, `CatalogPagination`, `CatalogStatusBadge`, `CatalogEmpty`, `CatalogError`) y un patrón `_logic/` por feature (`types/`, `services/`, `schemas/`, `hooks/`, `errors.ts`). El cliente HTTP autenticado (`authFetch`) y el gating de permisos (`useCurrentUser().can()`) ya están consolidados.

Este change construye **solo la capa de UI** sobre ese backend. La complejidad nueva respecto a los catálogos previos:

1. **Productos es un agregado con sub-colecciones** (`prices`, `dosifications`). Ningún catálogo previo tiene sub-recursos editables → requiere una **vista de detalle** además del listado.
2. **Inventario es operacional, no un catálogo**: el stock se gestiona por sucursal, con dos primitivas de escritura distintas en backend (set absoluto vía PATCH, delta atómico vía POST `/adjust`).
3. **Modelo de permisos asimétrico**: `operator` tiene `inventory:write` pero solo `products:read`. La UI debe respetar esa asimetría por pantalla.

## Goals / Non-Goals

**Goals:**

- Reutilizar al máximo los bloques presentacionales y el patrón `_logic/` ya validados; introducir bloques nuevos solo donde el dominio lo exige (detalle de producto con tabs, modales de inventario).
- Productos integrado visualmente con los catálogos (`/catalogs/products`, tarjeta en el hub, item en el flyout), preservando la convención de ruta de los otros 5.
- Detalle de producto con tabs (General / Precios / Dosificaciones) que cubra el ciclo completo del agregado sin modales anidados.
- Inventario por sucursal con selector de sucursal, alerta visual de punto de reorden y las dos primitivas de escritura (ajuste delta y edición absoluta) como flujos diferenciados.
- Gating de permisos fiel por pantalla y por acción, incluyendo la asimetría `operator`.

**Non-Goals:**

- Cambios en backend, schema o seed (todo está implementado).
- Historial/auditoría de movimientos de stock (no existe tabla `stock_movements`).
- Edición masiva (bulk) de productos o stock.
- Importación del catálogo legacy desde la UI (sigue siendo proceso manual documentado).
- Sugerencia de `sat_product_code` contra el catálogo SAT oficial (solo validación de formato `^\d{8}$`).
- Persistencia cross-sesión de la sucursal seleccionada en inventario (estado local de la pantalla).

## Decisions

### Decisión 1 — Productos vive bajo `/catalogs/products`, no en una ruta top-level

Productos es conceptualmente un catálogo más (SKUs), por lo que se integra al grupo `/catalogs/*` para consistencia: el flyout del rail apunta a `/catalogs/products`, el hub gana una sexta tarjeta, y la lista reutiliza `CatalogShell`/`CatalogToolbar`/`CatalogPagination`. 

**Alternativa descartada**: ruta top-level `/products` en el rail primario. Rompería la simetría con los otros 5 catálogos y duplicaría iconografía/jerarquía. Inventario sí va top-level porque es operacional (lo consume el operador en su día a día), no de configuración.

### Decisión 2 — Detalle de producto en ruta dedicada `/catalogs/products/[id]` con tabs, no modales anidados

Precios y dosificaciones son **colecciones** con su propio CRUD. Gestionarlas dentro del modal de edición del producto obligaría a modales anidados (mala UX, foco/scroll problemáticos). En su lugar: la fila de producto tiene una acción "Gestionar" que navega a `/catalogs/products/[id]`, una página con 3 tabs:

- **General**: datos del producto (mismo formulario que el modal create, pero embebido), con botón "Guardar cambios" (diff submit).
- **Precios**: tabla de `ProductPrice` + modal create/edit + delete (hard). Badge "Default" en la fila default.
- **Dosificaciones**: tabla de `ProductDosification` + modal create/edit + soft delete. Muestra `computedUnitPrice` o el aviso "Requiere precio default" cuando `requiresDefaultPrice === true`.

La **creación** de un producto sí usa un modal en el listado (como los otros catálogos), porque al crear aún no hay sub-recursos. Tras crear, se puede navegar al detalle para añadir precios/dosificaciones.

**Alternativa descartada**: todo en el listado con drawer lateral. El drawer no escala a 3 secciones con tablas internas.

### Decisión 3 — `departmentId` como `<select>` poblado desde el catálogo de departamentos

El producto exige `department_id` (FK obligatoria a un departamento **activo**). El modal de producto y el filtro del listado necesitan la lista de departamentos. Se añade un hook `useDepartmentsOptions()` en el `_logic/` de products que consume `GET /api/v1/admin/departments?pageSize=100&includeInactive=false` una sola vez y cachea el resultado a nivel de módulo (los departamentos son pocos y cambian rara vez). El `<select>` muestra `name` y envía `id`.

**Alternativa descartada**: input de texto libre con el `departmentId`. Inseguro (UUID a mano) y rompe la UX. **Alternativa descartada**: typeahead server-side; sobreingeniería para un catálogo de pocas decenas de filas.

### Decisión 4 — IVA/IEPS se muestran y capturan como porcentaje; el backend normaliza

El `ProductDto` devuelve `ivaRate`/`iepsRate` como decimal `0–1` o `null`. El backend acepta porcentaje (`16`) y normaliza dividiendo entre 100 los valores `> 1`. La UI:

- **Muestra**: multiplica el decimal por 100 → `"16%"`; `null` → `"—"` ("No aplica").
- **Captura**: input numérico con sufijo `%`, rango 0–100; envía el valor tal cual (porcentaje). El backend lo normaliza. Para enviar 0% explícito se captura `0`; para "no aplica" se deja vacío → `null`.

Esto mantiene la captura intuitiva (la gente piensa en "16%", no en "0.16") y delega la normalización al backend que ya la implementa.

### Decisión 5 — Inventario en `/inventory` con selector de sucursal en estado local

La pantalla `/inventory` arranca con un `<select>` de sucursales activas (poblado igual que los departamentos, vía `useBranchesOptions()`). Al elegir sucursal se hace fetch de `GET /api/v1/admin/branches/:id/inventory`. La sucursal seleccionada vive en estado local del orquestador (no en URL ni sessionStorage) — simple y suficiente para v1. Sin sucursal seleccionada → estado vacío "Selecciona una sucursal".

**Alternativa descartada**: ruta anidada `/inventory/[branchId]` con la sucursal en la URL. Más "correcto" para deep-linking, pero añade routing/params sin valor inmediato; se difiere.

### Decisión 6 — Ajuste (delta) y edición (absoluto) como dos modales distintos

El backend tiene dos endpoints de escritura con semántica distinta: PATCH (set absoluto de `quantity`/`reservedQuantity`/`reorderPoint`) y POST `/adjust` (delta atómico con `reason`). La UI los expone como dos acciones separadas:

- **"Ajustar stock"** (acción primaria, frecuente): modal con un input de delta (`+/-`), un campo `reason` opcional, y una vista previa "Stock resultante: N". Llama a `/adjust`. Si el resultado sería negativo, el backend responde 409 `Negative stock not allowed` → error inline "El ajuste dejaría el stock en negativo".
- **"Editar registro"** (acción secundaria, correctiva): modal con set absoluto de `quantity`, `reservedQuantity`, `reorderPoint`. Llama a PATCH.

Separarlos evita el modo ambiguo "¿este número es un delta o un total?" que causa errores de captura de stock.

### Decisión 7 — `available = quantity − reservedQuantity` calculado en cliente

El `BranchInventoryDto` trae `quantity` y `reservedQuantity` pero no el disponible. La tabla muestra una columna "Disponible" calculada en cliente (`quantity - reservedQuantity`). `reservedQuantity` es de solo lectura aquí (lo gestionará el POS futuro); el modal de edición lo permite ajustar solo como corrección manual.

### Decisión 8 — Gating de permisos por pantalla y por acción, respetando la asimetría operator

- `/catalogs/products` y `/catalogs/products/[id]`: lectura gateada por `products:read`; toda acción de escritura (Nuevo, Editar, Eliminar, gestionar precios/dosificaciones) gateada por `products:write`.
- `/inventory`: lectura gateada por `inventory:read`; acciones (Asignar, Ajustar, Editar, Quitar) gateadas por `inventory:write`.
- Como `operator` tiene `products:read` + `inventory:write`, en el detalle de producto verá las tablas de precios/dosificaciones en modo solo-lectura (sin botones de escritura) pero podrá operar el inventario plenamente. La UI no asume correlación entre ambos permisos.

### Decisión 9 — Errores tipados por feature, espejo del patrón providers-ui

Cada feature define su `_logic/errors.ts` y mapea respuestas HTTP a errores tipados que los modales convierten en mensajes inline:

- products: `ProductNotFoundError` (404), `ProductCodeAlreadyInUseError` (409), `ProductDepartmentInvalidError` (400 con "Department not found or inactive"), `DuplicatePriceNameError` (409), `DuplicateDefaultPriceError` (409 "already has a default price"), `DuplicateDosificationNameError` (409).
- inventory: `InventoryRecordNotFoundError` (404), `InventoryAlreadyExistsError` (409), `NegativeStockNotAllowedError` (409), `InventoryTargetInvalidError` (400, branch/product inexistente o inactivo).

Los servicios aceptan `fetchImpl?` inyectable para tests y convierten `createdAt`/`updatedAt` a `Date`.

## Risks / Trade-offs

- **[Carga de departamentos/sucursales para los selects]** → Si un admin tiene cientos de departamentos, `pageSize=100` podría truncar. Mitigación: los catálogos del cliente son de pocas decenas; si crecen, migrar a typeahead server-side en un change posterior. Se documenta el límite.
- **[Asimetría de permisos confusa para operadores]** → Un operator podría esperar editar productos y solo ver lectura. Mitigación: las tablas de precios/dosificaciones muestran un caption "Solo lectura — requiere products:write" cuando falta el permiso de escritura.
- **[Ajuste de stock concurrente]** → Dos operadores ajustando el mismo producto pueden ver un "stock resultante" previo desactualizado. Mitigación: el backend hace el delta atómico en BD (`UPDATE ... WHERE quantity + delta >= 0`); la UI re-fetcha tras cada ajuste y la vista previa es solo orientativa, no autoritativa.
- **[Default price único]** → Marcar un precio como default desactiva el anterior atómicamente en backend (PATCH). La UI debe re-fetchar la tabla de precios tras editar `isDefault` para reflejar el cambio del default previo. Riesgo de tabla desincronizada si no se re-fetcha → se especifica refresh obligatorio.
- **[Dosificación sin precio default]** → `computedUnitPrice` es `null` y `requiresDefaultPrice` es `true`. La UI debe comunicar claramente que hay que definir un precio default antes de que la dosificación tenga precio, sin bloquear la creación de la dosificación (que sí está permitida).

## Migration Plan

No aplica migración de datos ni de schema (backend ya desplegado). Despliegue puramente de frontend:

1. Implementar `_logic/` y bloques de `products-ui` (incluye detalle con tabs).
2. Implementar `_logic/` y bloques de `inventory-ui`.
3. Conectar NavigationRail (`products` en flyout, `inventory` re-etiquetado) y la tarjeta del hub.
4. Tests unitarios de servicios, hooks y bloques bajo `tests/unit/ui/`.
5. Verificación manual end-to-end en navegador con un usuario `admin` y uno `operator` para validar el gating asimétrico.

Rollback: revertir el commit de frontend; el backend no se ve afectado.

## Open Questions

- ¿La sucursal seleccionada en `/inventory` debería persistir entre sesiones (sessionStorage) para operadores que trabajan siempre en la misma sucursal? Se difiere; v1 usa estado local. Reevaluar tras feedback de operadores.
- ¿El detalle de producto debería permitir reordenar precios (drag) o basta con el badge default? v1 solo badge default; reordenamiento se difiere.
