## 1. Investigación previa (no destructiva)

- [x] 1.1 Grep/Explore de referencias externas a `cash-cut/_blocks/*`, `customer-collections/_blocks/*`, `CashCutPage`, `CustomerCollectionsPage`, `useCashCut`, `useCustomerCollectionsReport` fuera de sus propios `page.tsx` (para confirmar que el patrón `_blocks` privado se cumple y el rename es seguro).
- [x] 1.2 Localizar tests existentes bajo `tests/unit/ui/` que referencien rutas o imports de `reports/cash-cut` o `reports/customer-collections`.

## 2. Mover árbol "Global" (ex cash-cut)

- [x] 2.1 Mover `app/(private)/reports/cash-cut/_blocks/{CashCutFilters,TotalsCards,PaymentMethodBreakdownTable,CollectionsRowsTable}.tsx` a `app/(private)/reports/collections/_blocks/global/`, ajustando rutas relativas de import (`../../../../_components/...` etc. según nueva profundidad).
- [x] 2.2 Mover `app/(private)/reports/cash-cut/_blocks/CashCutPage.tsx` a `app/(private)/reports/collections/_blocks/global/GlobalCollectionsView.tsx`, renombrando el export y eliminando el wrapper `<PageShell>` + el bloque `if (canRead === "loading"/false)` (ese gating sube a `CollectionsPage.tsx`, ver tarea 4).
- [x] 2.3 Mover `app/(private)/reports/cash-cut/_logic/` completo a `app/(private)/reports/collections/_logic/global/`, sin modificar contenido de `hooks/useCashCut.ts`, `services/index.ts`, `types/{api,domain}.ts`.
- [x] 2.4 Actualizar imports internos de `global/GlobalCollectionsView.tsx` y sus tablas/filtros para apuntar a `../../_logic/global/...`.

## 3. Mover árbol "Por Cliente" (ex customer-collections)

- [x] 3.1 Mover `app/(private)/reports/customer-collections/_blocks/{CollectionsFilters,ByCustomerTable,ByTicketTable}.tsx` a `app/(private)/reports/collections/_blocks/by-customer/`, ajustando imports relativos.
- [x] 3.2 Mover `app/(private)/reports/customer-collections/_blocks/CustomerCollectionsPage.tsx` a `app/(private)/reports/collections/_blocks/by-customer/ByCustomerCollectionsView.tsx`, renombrando el export y eliminando el wrapper `<PageShell>` + el bloque `if (canRead === "loading"/false)`.
- [x] 3.3 Mover `app/(private)/reports/customer-collections/_logic/` completo a `app/(private)/reports/collections/_logic/by-customer/`, sin modificar contenido de `hooks/useCustomerCollectionsReport.ts`, `services/index.ts`, `types/{api,domain}.ts`.
- [x] 3.4 Actualizar imports internos de `by-customer/ByCustomerCollectionsView.tsx` y sus tablas/filtros para apuntar a `../../_logic/by-customer/...`.

## 4. Contenedor de tabs y gating (Historia 1, Historia 2)

- [x] 4.1 Crear `app/(private)/reports/collections/_blocks/CollectionsPage.tsx`: resuelve `canGlobal = can("reports:cash_cut_read")` y `canByCustomer = can("reports:customer_collections_read")`.
- [x] 4.2 Implementar regla de gating: ambos `false` → `EmptyState` "Sin acceso"; solo uno en `true` → forzar esa vista sin `SegmentedButton`; ambos en `true` → `SegmentedButton<View>` visible con "Global" por defecto. Tratar `"loading"` de forma optimista (no bloquear ni parpadear a "Sin acceso").
- [x] 4.3 Envolver en `<PageShell title="Cobranza" backHref="/reports">` y renderizar `<GlobalCollectionsView />` / `<ByCustomerCollectionsView />` según la vista efectiva.
- [x] 4.4 Crear `app/(private)/reports/collections/page.tsx` (Server Component, `metadata` con título "Cobranza · Agrisas") que renderiza `<CollectionsPage />`.
- [x] 4.5 Eliminar `app/(private)/reports/cash-cut/page.tsx` y `app/(private)/reports/customer-collections/page.tsx` (y las carpetas vacías resultantes).

## 5. Hub de reportes (Historia 3)

- [x] 5.1 En `app/(private)/reports/_blocks/ReportsHubPage.tsx`, reemplazar las tarjetas "Corte de Caja (Cobranza)" y "Cobranza por Cliente" por una sola tarjeta "Cobranza" (`icon="payments"`, `href="/reports/collections"`, descripción que cubra ambas vistas, `canAccess={can("reports:cash_cut_read") || can("reports:customer_collections_read")}`, tooltip mencionando ambos permisos).

## 6. Tests

- [x] 6.1 Mover/actualizar los tests localizados en 1.2 a las rutas nuevas (`collections/...`), ajustando imports y, si testeaban gating de permiso por página completa, adaptarlos al nuevo gating por tab.
- [x] 6.2 Agregar/adaptar test de gating: usuario con un solo permiso ve solo su tab forzada sin `SegmentedButton`; usuario con ambos ve el `SegmentedButton` con "Global" por defecto; usuario sin ninguno ve `EmptyState`.
- [x] 6.3 Correr `npm test` sobre `tests/unit/ui/` afectados y confirmar verde.

## 7. Verificación manual

- [x] 7.1 Verificado con Playwright, sesión admin real: `/reports` renderiza 1 sola tarjeta "Cobranza" → `/reports/collections`. **Bug encontrado y corregido en esta verificación**: `ReportsHubPage.tsx` conservaba también la tarjeta vieja "Cobranza por Cliente" → `/reports/customer-collections` (ruta ya eliminada) porque el reemplazo original solo tocó la tarjeta de cash-cut; se eliminó el bloque sobrante.
- [x] 7.2 Verificado con Playwright: tab "Global" activa por defecto con datos reales (totales, desglose, filas). Cambié fecha "Desde" en Global, cambié a "Por Cliente" y de vuelta — el filtro de "Por Cliente" mantuvo su propio default (2026-08-01) sin heredar el cambio de Global, confirmando estado independiente por tab (cada vista se monta/desmonta al cambiar de tab, sin bleed de estado).
- [x] 7.3 Verificado con Playwright: "Exportar PDF" en tab Por Cliente descargó `customer-collections-2026-08-01_2026-08-14.pdf`; "Exportar Excel" en tab Global descargó `cash-cut-2026-08-01_2026-08-14.xlsx` — cada botón exporta el endpoint correcto de su propia tab.
- [x] 7.4 No probado con una cuenta real de un solo permiso (los 3 roles seed —admin/operator/viewer— tienen ambos permisos; crear un rol ad-hoc mutaría datos de un entorno compartido). Cubierto por `CollectionsPage.test.tsx` (unit, hooks mockeados): matriz completa ninguno/solo-global/solo-cliente/ambos/loading, todas verdes.
- [x] 7.5 Verificado con Playwright, sesión admin real: `/reports/cash-cut` y `/reports/customer-collections` devuelven "404: This page could not be found." (HTTP 404 Not Found).

## 8. Documentación

- [x] 8.1 Revisar si `CLAUDE.md` del proyecto menciona explícitamente `/reports/cash-cut` o `/reports/customer-collections` fuera del listado de módulos genérico; actualizar si aplica.
