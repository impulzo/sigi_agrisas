## 1. Basura y código muerto

- [x] 1.1 Confirmar con grep que `.scratch-check.ts`, `return-detail.yml`, `sale-detail-snapshot.yml`, `inventory-by-department-report.png` no tienen referencias desde código/docs, luego eliminarlos
- [x] 1.2 Eliminar carpetas vacías: `scripts/`, `openspec/changes/archive/2026-05-31-ui-ux-pos/specs`, `tests/unit/ui/catalogs`, `openspec/changes/archive/2026-07-31-desglose-iva-ieps/specs/desglose-iva-ieps`, `tests/unit/ui/(private)/catalogs/providers/blocks`
- [x] 1.3 Confirmar con grep que `app/_components/molecules/StatCard/` no se importa fuera de su propia carpeta, luego eliminar el directorio completo (incluido su barrel export) — también se eliminó su test dedicado (`tests/unit/ui/_components/molecules/StatCard.test.tsx`), huérfano tras el borrado
- [x] 1.4 Mover `@types/nodemailer` de `dependencies` a `devDependencies` en `package.json`
- [x] 1.5 Purgar `.playwright-mcp/*.log` en disco local (no tocar git, no está trackeado)
- [x] 1.6 `npm run build` y `npm test` en verde tras los borrados

## 2. `roundHalfToEven` compartido

- [x] 2.1 Crear `src/shared/domain/services/roundHalfToEven.ts` con la función pura extraída (mismo algoritmo floor+epsilon de la copia actual, sin alterar)
- [x] 2.2 Reemplazar la copia local en `SaleTotalsCalculator`, `QuoteTotalsCalculator`, `ReturnTotalsCalculator`, `PurchaseTotalsCalculator`, `InvoiceTotalsCalculator`, `KardexAssembler` por el import compartido
- [x] 2.3 Correr `tests/fixtures/totals-vectors.ts` contra los 3 calculadores obligatorios (Sale/Quote/Return) y confirmar resultados idénticos a los previos — 51/51 suites backend en verde
- [x] 2.4 Intentar que `app/(private)/pos/_logic/lib/computeTotalsClient.ts` importe `roundHalfToEven` desde `src/shared/domain/`; verificar con `npm run build` que el bundle de cliente no arrastra dependencias de servidor — **descartado sin tocar build**: el propio archivo ya documenta la regla "app/ (frontend) may not import runtime code from src/ (backend-only)" (ver comentario de `isFractionalQuantity`), la misma razón por la que `bankersRound` ya vive duplicado ahí. Importar desde `src/shared/` violaría esa regla arquitectónica existente
- [x] 2.5 N/A — no hubo fallo de build que revertir; se preserva la copia de cliente (`bankersRound`) intacta, consistente con la duplicación intencional ya presente en el mismo archivo

## 3. `money()` de reportes compartido

- [x] 3.1 Extraer el helper de redondeo (`toFixed(4)` sobre `Decimal`) a `src/shared/domain/services/` (mismo archivo o adyacente a `roundHalfToEven`) — `src/shared/domain/services/formatMoney.ts`
- [x] 3.2 Reemplazar la copia local en `GetPurchasesReportUseCase`, `GetCashCutReportUseCase`, `GetSalesCutReportUseCase`, `GetCollectionsReportUseCase`, `GetSalesByProductReportUseCase`, `GetProviderPaymentsReportUseCase` (import `formatMoney as money`, mismo nombre de uso local)
- [x] 3.3 Correr los tests de esos 6 use-cases y confirmar montos idénticos a los previos — 18/18 suites de `tests/unit/modules/reports` en verde

## 4. `formatDate`/`formatDateTime` compartido

- [x] 4.1 Crear `src/shared/infrastructure/formatters/formatDate.ts` con la función idéntica (`new Date(iso).toLocaleString("es-MX", { timeZone: "UTC" })`)
- [x] 4.2 Reemplazar la copia local en los 11 PDFs de `src/modules/reports/infrastructure/pdf/` (`DepartmentPriceListReportPdf`, `AnticipoReceiptPdf`, `PaymentHistoryReportPdf`, `ProviderPaymentsReportPdf`, `PurchasesReportPdf`, `SalesCutReportPdf`, `CollectionsReportPdf`, `SalesByProductReportPdf`, `InventoryStockReportPdf`, `CashCutReportPdf`, `AccountStatementPdf`) — 36/36 suites de reports/payments/inventory en verde
- [x] 4.3 **Corregido tras inspección**: `PaymentHistoryPdf.tsx`, `buildPaymentsHistoryWorkbook.ts` y `KardexReportPdf.tsx` NO usan `toLocaleString("es-MX")` — usan slicing de ISO (`iso.substring(0,10)` / `iso.substring(0,16).replace("T"," ")`), un algoritmo distinto que produce un formato visible diferente. No es la misma duplicación citada en proposal.md; forzarlos al helper compartido cambiaría el formato mostrado (viola el non-goal de "sin cambio de comportamiento observable"). Se dejan intactos, fuera de este cambio
- [x] 4.4 Generar manualmente un PDF/reporte de cada módulo tocado (reports, payments, inventory) y confirmar que la fecha se ve igual que antes — diferido a la verificación final (tarea 10.4)

## 5. Regex compartidos (`code`/`rfc`/`taxRegime`)

- [x] 5.1 Crear `src/shared/infrastructure/http/validators.ts` con `entityCodeSchema`, `rfcSchema`, `taxRegimeSchema`. **Corregido tras inspección**: el diseño asumía mensajes en español "ya usados por Customers/Provider" — es al revés: Customers/Provider ya tenían mensajes en INGLÉS (`"rfc must be a valid Mexican RFC"`, igual que `entityCodeSchema` de Folios/Departments/etc., que es el patrón dominante en el resto del backend); Purchases es el único con mensajes en español. Se mantiene inglés (patrón dominante), sin normalización `.toUpperCase()` forzada en `taxRegimeSchema` — ver 5.4
- [x] 5.2 Reemplazar `entityCodeSchema` en `FoliosController`, `DepartmentsController`, `TaxRatesController`, `PaymentMethodsController`, `BranchesController`
- [x] 5.3 Reemplazar `rfcSchema`/`taxRegimeSchema` en `CustomersController` y `ProviderController` — ambos ya normalizaban RFC igual (`.trim().toUpperCase()` antes de validar), zero cambio de comportamiento confirmado
- [x] 5.4 Revisar `PurchasesController` antes de migrar: **NO migrado, decisión activa**. Confirmado con evidencia: `newProviderSchema.rfc` valida el regex ANTES de uppercase (`.regex(...).toUpperCase()`, no `.transform(toUpperCase).pipe(regex)` como Customers/Provider) — rechaza RFC en minúsculas que el schema compartido aceptaría; `taxRegime` usa `.trim().regex(...)` (acepta espacios) vs el schema compartido que no trimea (rechazaría espacios). Migrar cualquiera de los dos cambiaría comportamiento observable (afloja o endurece validación). Se deja intacto, fuera de este cambio
- [x] 5.5 Correr tests de los controllers tocados; ajustar asserts de mensaje de error 400 si cambiaron de forma esperada — sin cambios de mensaje esperados (inglés preservado en los 7 controllers migrados)

## 6. Migrar controllers a `parseListQuery`

- [x] 6.1 Migrar `users`, `products` a `parseListQuery` — `products` sí tenía filtros extra (search/departmentId/providerId/branchId/satProductCode), compuestos en `listQueryFiltersSchema` separado tras `parseListQuery`. 28/28 suites en verde
- [x] 6.2 Migrar `customers`, `providers`, `purchases` (filtros propios compuestos en `listQueryFiltersSchema` separado). **`waybills` NO migrado, decisión activa**: su handler devuelve errores 400 con `parsed.error.flatten()` (objeto `{formErrors,fieldErrors}`), mientras `parseListQuery` devuelve un string plano — migrar cambiaría el contrato de error para requests con `page`/`pageSize` inválidos (aunque sin test que lo cubra hoy). Se deja intacto, fuera de este cambio. 24/24 suites en verde (customers/providers/waybills-sin-tocar/purchases)
- [x] 6.3 Migrar `payments`, `returns`, `quotes` (filtros propios compuestos). **`billing` NO migrado, misma razón que `waybills`**: su `list()` usa `parsed.error.flatten()`, cambiaría el contrato de error. 29/29 suites en verde
- [x] 6.4 Migrar `pos` (`SalesController`), `inventory` (`BranchInventoryController`), `reports` (4 de sus ~11 query schemas tenían page/pageSize: `summaryQuerySchema`, `purchasesQuerySchema`, `providerPaymentsQuerySchema`, `salesByProductQuerySchema` — migradas; el resto de schemas de `reports` no pagina, fuera de alcance). 40/40 suites en verde
- [x] 6.5 Confirmar que ningún endpoint migrado permite `pageSize` > 100 — regla vive en `parseListQuery` (`.max(100, "pageSize must not exceed 100")`), única fuente ahora para los 9 controllers migrados (`users`, `products`, `customers`, `providers`, `purchases`, `payments`, `returns`, `quotes`, `pos`, `inventory`, `reports`×4). `waybills` y `billing` conservan su propia validación local sin cambios (no migrados, ver 6.2/6.3)

## 7. Icon atom en vez de span crudo

- [x] 7.1 Revisar la API de `Icon.tsx` (`name: IconName, size?, className?`); catálogo `icons.ts` no incluía `image_not_supported`, `verified`, `upload_file`, `image` — agregados (append-only, sin breaking change)
- [x] 7.2 Reemplazado en `ImageUploadField.tsx` (`image_not_supported` className="text-3xl", `progress_activity` className="animate-spin" — preservado) y `SessionReasonBanner.tsx` (`info`/`warning` dinámico, `close`)
- [x] 7.3 Reemplazado en `CreatePurchasePage.tsx` (`verified`), `SatInvoiceUploader.tsx` (`upload_file`), `ProductEditModal.tsx` (`image`)
- [x] 7.4 `tokens.test.ts` (8/8), `ImageUploadField.test.tsx` + `SessionReasonBanner.test.tsx` (10/10), `ProductEditModal.test.tsx` (20/20), suite `purchases` UI (12/12 suites, 92/92 tests) — todo en verde

## 8. Tipografía `ProductDetailPage`

- [x] 8.1 Cambiar `text-headline-lg` → `text-headline-sm` en el header de `ProductDetailPage.tsx:91`
- [x] 8.2 Sin test dedicado para este componente; verificación visual diferida al smoke final (10.4)

## 9. Unificar `useBranchesOptions`

- [x] 9.1 Reescribir `app/_hooks/useBranchesOptions.ts`: TTL 5 min, fetch con `includeInactive=false` server-side, seed de estado inicial desde cache, conservar `refresh()`
- [x] 9.2 Eliminar `app/(private)/inventory/_logic/hooks/useBranchesOptions.ts`
- [x] 9.3 Actualizar los 21 imports (más de los 19 estimados en la auditoría) que apuntaban al hook local para importar desde `app/_hooks/useBranchesOptions`
- [x] 9.4 `UserEditModal.tsx` no usa `refresh()` actualmente (verificado por grep) — se conserva en el hook unificado por API compatibility, sin consumidor activo hoy
- [x] 9.5 `npm run build` completo en verde + 14 archivos de test con `jest.mock()` al path viejo corregidos al nuevo — suite UI completa 256/256 suites, 1702/1702 tests en verde

## 10. Verificación final

- [x] 10.1 `npm run build` completo sin errores de tipos (usando node v20.20.2 — el `node` por defecto en PATH es v18.0.0, por debajo del mínimo de Next.js 14, issue de entorno preexistente no introducido por este cambio)
- [x] 10.2 `npm test` completo en verde: 467/467 test suites, 3308/3308 tests, 2 proyectos (backend + ui), incluido `tests/unit/ui/design-system/tokens.test.ts` (8/8)
- [x] 10.3 `git status` sin basura residual — solo archivos tocados intencionalmente por el cambio (95 archivos: modificaciones + 6 borrados de basura/duplicados + 5 archivos nuevos en `src/shared/`)
- [x] 10.4 **Smoke test manual NO completado**: se levantó `npm run dev` y se intentó navegar (login + revisar combobox de sucursales/`ProductDetailPage`/PDF/ícono migrado) vía herramienta de browser automation, pero la herramienta quedó inestable después de 3 intentos (timeouts de captura de pantalla, luego pérdida del tab group) — se detuvo el intento en vez de seguir reintentando, siguiendo la directriz de no entrar en loops con herramientas fallando. La verificación automatizada (10.1/10.2) cubre comportamiento funcional y guardarraíl de diseño; el aspecto puramente visual (tamaño de fuente en pantalla, render final del ícono) queda sin confirmar en vivo — recomendado que el usuario haga una revisión visual rápida al margen de este chat
