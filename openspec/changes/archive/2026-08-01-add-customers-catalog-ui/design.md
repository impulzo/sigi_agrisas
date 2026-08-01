## Context

El backend `customers-api` ya expone un CRUD completo con búsqueda server-side (`?search=`, mín. 2 caracteres) y `creditDays` será expuesto por el change `add-customer-credit-days`. El patrón de catálogo admin ya está probado y replicado 6 veces (`payment-methods`, `folios`, `departments`, `branches`, `providers`, `products`); `providers` es la referencia más cercana por compartir datos fiscales (rfc, taxRegime, cfdiUse, taxZipCode). Ver `proposal.md` — Why para el detalle del gap de UX que motiva este change.

## Goals / Non-Goals

**Goals:**
- Replicar el patrón de catálogo de `providers` para `customers`, agregando la sección de crédito (`creditLimit`, `creditDays`) que providers no tiene.
- Dar descubribilidad real: tarjeta en el hub + item en el rail, ambos gateados por `customers:read` (Historia 5).
- Mantener `_logic/` de customers completamente aislado de `pos/_logic/` — nueva carpeta propia, sin imports cruzados en ninguna dirección (Historia 1-4 dependen de esto para no acoplar el catálogo admin al flujo de venta).

**Non-Goals:**
- No se resuelve la deuda de que `CustomerPicker`/`CustomerQuickAddModal` vivan físicamente en `pos/_blocks/` pese a ser importados por `quotes`/`billing` — eso es un refactor de ubicación de archivos fuera de alcance, ya que tocar esos imports cruzados arriesga romper flujos de venta en producción sin beneficio para este change.
- No se agrega paginación configurable distinta a la ya estandarizada (10/20/50 en UI, máx. 100 en backend).
- No se implementa exportación, importación masiva, ni historial de cambios de cliente.

## Decisions

**1. Nuevo `_logic/` propio en `app/(private)/catalogs/customers/_logic/`, sin reutilizar `pos/_logic/`.**
Alternativa considerada: extender los services/types que ya existen en `pos/_logic/` (services/createCustomer.ts, types/api.ts, etc.) para que sirvan a ambos consumidores. Se descarta porque acoplaría el catálogo admin (que necesita `creditLimit`, `creditDays`, list, update, soft-delete) al `_logic/` de un módulo de venta que sólo necesita create + search ligero — cualquier cambio futuro al catálogo admin arriesgaría romper el flujo de POS. Se opta por duplicar el tipo `CustomerDto`/errores en la nueva carpeta (mismo patrón que ya existe entre `pos/_logic` y el propio backend: no hay un `_hooks`/`_lib` global para tipos de dominio de un módulo específico). Responde a la restricción de Historia 1-4 de mantener el catálogo independiente, y al criterio de seguridad implícito de no ampliar la superficie de un módulo (`pos`) que no necesita los campos de crédito.

**2. `CustomerEditModal` reutiliza la estructura de `ProviderEditModal` (3 secciones, diff-based PATCH, `code` disabled en edit) pero agrega una cuarta agrupación conceptual de crédito dentro de "Contacto y crédito".**
Alternativa considerada: sección separada "Crédito" (4ta sección). Se descarta por ser sólo 2 campos (`creditLimit`, `creditDays`); una sección propia de 2 campos añadiría scroll/complejidad visual sin beneficio — se agrupan al final de "Contacto" siguiendo el mismo criterio de agrupación por densidad ya usado en providers.

**3. `creditDays` vacío en el formulario de creación NO se envía como `0` ni se fuerza a `30` client-side; se omite del body si el usuario no lo toca.**
Esto delega el default al backend (`add-customer-credit-days`), evitando duplicar la regla de negocio "default 30" en dos capas. Responde directamente al AC de Historia 2 ("Omitir `creditDays` deja al backend aplicar el default 30").

**4. Búsqueda server-side (no client-side) porque el backend ya lo soporta con `?search=` (igual que providers/products), a diferencia de los 4 catálogos más antiguos (payment-methods/folios/departments/branches) que filtran client-side sobre la página cargada.**
Se seguirá el mismo `searchScope="server"` de `CatalogToolbar` ya implementado para providers — no se requiere ningún cambio al componente compartido.

**5. La tarjeta "Clientes" se agrega como 8va entrada (después de `tax-rates`), y el rail agrega `customers` como último child de `catalogs`.**
Orden por fecha de introducción del módulo, consistente con cómo se fueron agregando `providers`/`products`/`tax-rates` — no hay guía de negocio para un orden alfabético o por frecuencia de uso, y alterar el orden existente de las 7 tarjetas ya en producción no aporta valor y sí introduce un diff más grande de lo necesario.

## Risks / Trade-offs

- **[Riesgo] Este change depende de que `add-customer-credit-days` esté aplicado; si se implementa este catálogo primero, el campo `creditDays` no existiría aún en las respuestas del backend.** → Mitigación: orden de ejecución explícito en `proposal.md`/plan aprobado (backend primero); el formulario/tabla pueden desarrollarse en paralelo usando el tipo `CustomerDto` actualizado como contrato, pero no se prueban contra el backend real hasta que el otro change esté mergeado.
- **[Riesgo] Duplicar tipos/errores entre `pos/_logic` y `catalogs/customers/_logic` puede desincronizarse si el backend cambia el DTO en el futuro (ej. agrega un campo nuevo).** → Mitigación: aceptado como trade-off consciente (ver Decisión 1); ambos módulos ya son consumidores independientes del mismo endpoint HTTP, exactamente igual que hoy `quotes`/`billing` dependen del `_logic` de `pos` por import cruzado — este change no empeora la situación, sólo evita agrandarla.
- **[Trade-off] No se mueve `CustomerPicker`/`CustomerQuickAddModal` a una ubicación neutral (ej. `app/_components`) pese a que técnicamente pertenecen más a "customers" que a "pos".** → Aceptado explícitamente como fuera de alcance (ver Non-Goals); mover archivos con imports cruzados activos desde 3 módulos de venta es un riesgo de regresión no justificado por el objetivo de este change (dar de alta/gestionar clientes).

## Migration Plan

Sin migración de datos. Despliegue es agregar código nuevo (nueva ruta, nuevos componentes) más dos ediciones pequeñas y aisladas (`NavigationRail/items.ts`, `CatalogsHubPage.tsx`). Sin downtime. Rollback trivial: revertir el commit no afecta ningún flujo existente (POS/Quotes/Billing no importan nada de la carpeta nueva).
