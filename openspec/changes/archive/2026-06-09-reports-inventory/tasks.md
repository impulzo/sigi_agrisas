## 1. Dependencias y configuración

- [x] 1.1 Instalar `@react-pdf/renderer` como dependencia runtime: `npm install @react-pdf/renderer`
- [x] 1.2 Verificar que el `package.json` lo registra en `dependencies` (NO en `devDependencies`) — el render se hace en runtime Next
- [x] 1.3 Confirmar que `tsconfig.json` permite JSX server-side; si el `jsx` del compilerOptions no soporta el `.tsx` del renderer, ajustar o aislar el componente en su propio `tsconfig` no es necesario porque Next compila `.tsx` por default

## 2. RBAC: nuevo permiso `reports:inventory_read`

- [x] 2.1 Editar `prisma/seed.ts`: agregar `{ key: "reports:inventory_read", description: "Leer reportes de inventario" }` al array `PERMISSIONS`
- [x] 2.2 Editar `prisma/seed.ts`: agregar `"reports:inventory_read"` al array de permisos del rol `admin`
- [x] 2.3 Editar `prisma/seed.ts`: agregar `"reports:inventory_read"` al array de permisos del rol `operator`
- [x] 2.4 Editar `prisma/seed.ts`: agregar `"reports:inventory_read"` al array de permisos del rol `viewer`
- [x] 2.5 Ejecutar `npm run seed` localmente y verificar que el permiso aparece en `permissions` y que los tres roles lo tienen vía `prisma studio` o `psql`

## 3. Dominio del módulo `reports`

- [x] 3.1 Crear `src/modules/reports/domain/value-objects/StockReportFilters.ts` — value object con `branchId?: string | null`, `departmentId?: string | null`, `includeZeroStock: boolean`
- [x] 3.2 Crear `src/modules/reports/domain/value-objects/StockSummary.ts` — value object para subtotales (`productCount: number`, `totalQuantity: Decimal`)
- [x] 3.3 Crear `src/modules/reports/domain/errors/ReportInvalidFiltersError.ts` — error de dominio (instanceof Error)
- [x] 3.4 Verificar que ningún archivo bajo `src/modules/reports/domain/` importa Prisma, Next, o cualquier dependencia de `infrastructure/`

## 4. Aplicación: port, DTOs, use case

- [x] 4.1 Crear `src/modules/reports/application/ports/InventoryReportRepository.ts` con la interfaz `findStockGrouped(filters: StockReportFilters): Promise<RawStockRow[]>` (donde `RawStockRow` incluye `branchId`, `branchCode`, `branchName`, `isHeadquarters`, `departmentId`, `departmentCode`, `departmentName`, `productId`, `code`, `name`, `unit`, `quantity`, `reservedQuantity`, `reorderPoint`)
- [x] 4.2 Crear `src/modules/reports/application/dto/GetStockReportRequest.ts` con tipos para los inputs del use case (`branchId?: string | null`, `departmentId?: string | null`, `includeZeroStock: boolean`, `generatedBy: { userId, email }`)
- [x] 4.3 Crear `src/modules/reports/application/dto/StockReportResponseDto.ts` con la forma JSON definida en el requirement "Stock report JSON DTO" (`branches[]`, `departments[]`, `products[]`, `subtotal`, `totals`, `generatedAt`, `generatedBy`, `filters`)
- [x] 4.4 Crear `src/modules/reports/application/use-cases/GetInventoryStockReportUseCase.ts` que invoca el repo, agrupa por sucursal → departamento → productos, calcula `availableQuantity` (`quantity - reservedQuantity`) e `isBelowReorder` (`quantity < reorderPoint`) por producto, computa subtotales y totales, aplica `includeZeroStock` antes de agregar subtotales
- [x] 4.5 Asegurar que el use case devuelve los `Decimal` serializados como `string` (preserva precisión) — convertir con `.toFixed(4)` o `.toString()` antes de retornar

## 5. Infraestructura: repositorios

- [x] 5.1 Crear `src/modules/reports/infrastructure/repositories/PrismaInventoryReportRepository.ts` que implementa `InventoryReportRepository.findStockGrouped` con `prisma.branchInventory.findMany({ where, include: { product: { include: { department: true } }, branch: true }, orderBy: [{ branch: { name: "asc" } }, { product: { department: { name: "asc" } } }, { product: { name: "asc" } }] })` y mapea a `RawStockRow[]`
- [x] 5.2 El `where` del repo respeta `branchId?` y `departmentId?` cuando no son `null`; cuando `branchId` es `null`, no filtra por sucursal (devuelve todas)
- [x] 5.3 Crear `src/modules/reports/infrastructure/repositories/InMemoryInventoryReportRepository.ts` con un constructor que recibe `rows: RawStockRow[]` y filtra en memoria; útil para tests unitarios del use case

## 6. PDF renderer

- [x] 6.1 Crear `src/modules/reports/infrastructure/pdf/pdfStyles.ts` exportando un `StyleSheet.create({...})` con estilos para `page`, `header`, `section`, `branchTitle`, `departmentTitle`, `tableHeader`, `tableRow`, `cell`, `subtotal`, `totals`, `footer` (vía `@react-pdf/renderer`)
- [x] 6.2 Crear `src/modules/reports/infrastructure/pdf/InventoryStockReportPdf.tsx` que recibe `data: StockReportResponseDto` y renderiza `<Document><Page>...</Page></Document>` con: header (título "Reporte de Stock", `generatedAt`, `generatedBy.email`, filtros aplicados), una sub-sección por sucursal con código + nombre + flag "Matriz" si HQ, tablas por departamento con columnas Code/Producto/Unidad/Stock/Reservado/Disponible/Reorden/Estado ("Bajo" si `isBelowReorder`), subtotales por nivel, totales globales y footer con paginación
- [x] 6.3 Si `data.branches.length === 0`, el PDF debe mostrar header normal y un mensaje "Sin datos para los filtros aplicados" en el cuerpo
- [x] 6.4 No importar `next/dynamic` ni nada del cliente; el componente es puro server-render

## 7. HTTP controller + DI

- [x] 7.1 Crear `src/modules/reports/infrastructure/http/ReportsController.ts` con el método `getInventoryStockReport(req: NextRequest): Promise<NextResponse>` que: (a) llama a `requirePermission(req, "reports:inventory_read")`, (b) parsea+valida con Zod los query params (`branchId?` UUID, `departmentId?` UUID, `includeZeroStock?` boolean → default `true`, `format?` enum `"json"|"pdf"` → default `"json"`), (c) aplica branch scoping vía `resolveScopedBranchId(req, parsed.branchId)` o `enforceBranchScope(req, parsed.branchId)` según el caso, (d) invoca `GetInventoryStockReportUseCase` con los filtros resueltos + `generatedBy: { userId, email }` del header, (e) ramifica por `format`: JSON → `NextResponse.json(dto)`; PDF → `renderToBuffer(<InventoryStockReportPdf data={dto}/>)` + `new NextResponse(buffer, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": ... } })`
- [x] 7.2 El nombre del archivo PDF se deriva de `generatedAt`: `stock-YYYY-MM-DD.pdf` (UTC)
- [x] 7.3 Cubrir los códigos de error: 400 por validación Zod (UUID/boolean/enum), 401 por falta de `x-user-id` (lo emite `requirePermission`), 403 por falta de permiso o branch scope violation (lo emiten los helpers), 500 por errores inesperados con `console.error` y body genérico
- [x] 7.4 Crear `src/modules/reports/infrastructure/di/container.ts` que importa el `prisma` singleton de `src/shared/infrastructure/prisma/client`, el `authorizationService` del módulo `rbac/di`, instancia `PrismaInventoryReportRepository`, `GetInventoryStockReportUseCase` y `ReportsController`, y exporta `reportsController`
- [x] 7.5 Verificar que no hay import circular con `rbac/di`; si lo hay, instanciar localmente el `AuthorizationService` o el `Prisma...Repository` que se necesite (patrón ya usado en `pos/di` con `quotes`)

## 8. Route handler Next

- [x] 8.1 Crear `app/api/v1/admin/reports/inventory/stock/route.ts` que importa `reportsController` y exporta `export async function GET(req: NextRequest) { return reportsController.getInventoryStockReport(req); }`
- [x] 8.2 NO declarar `export const runtime = "edge"` — confirmar que el archivo queda en runtime Node por default
- [x] 8.3 Verificar que `middleware.ts` (raíz) no necesita cambios: el matcher `"/((?!_next/static|_next/image|favicon.ico).*)"` ya cubre `/api/v1/admin/reports/...`

## 9. Tests unitarios

- [x] 9.1 Crear `tests/unit/modules/reports/application/use-cases/GetInventoryStockReportUseCase.test.ts` con casos: agregación correcta (1 sucursal × 1 departamento × N productos), múltiples sucursales y departamentos, filtro por `departmentId`, `includeZeroStock=false` excluye productos en cero y departamentos/sucursales vacíos, producto con `quantity` negativa se incluye y `isBelowReorder===true`, `branches: []` con totales en cero
- [x] 9.2 Crear `tests/unit/modules/reports/infrastructure/repositories/InMemoryInventoryReportRepository.test.ts` con casos para el filtrado (`branchId`, `departmentId`)
- [x] 9.3 Crear `tests/unit/modules/reports/infrastructure/http/ReportsController.test.ts` con casos: 401 sin `x-user-id`; 403 sin `reports:inventory_read`; 403 por branch scope cross-branch sin bypass; 400 por UUID inválido en `branchId`/`departmentId`; 400 por `?format=csv`; 400 por `?includeZeroStock=maybe`; 200 JSON con la forma del DTO; 200 PDF con `Content-Type` y `Content-Disposition` correctos
- [x] 9.4 NO testear el contenido visual del PDF; basta con verificar `Content-Type === "application/pdf"`, `Content-Disposition` matchea `^attachment; filename="stock-\d{4}-\d{2}-\d{2}\.pdf"$`, y el body es un `Buffer` con bytes `%PDF-` al inicio

## 11. Dominio: tipos para el reporte de abonos

- [x] 11.1 Crear `src/modules/reports/domain/value-objects/PaymentReportFilters.ts` — value object con `branchId?: string | null`, `customerId?: string | null`, `startDate?: Date | null`, `endDate?: Date | null`
- [x] 11.2 Crear `src/modules/reports/domain/value-objects/PaymentSummary.ts` — value object con `totalPayments: number`, `totalAmount: Decimal`, `cancelledPayments: number`, `cancelledAmount: Decimal`, `netAmount: Decimal`

## 12. Aplicación: port, DTOs y use case de historial de abonos

- [x] 12.1 Crear `src/modules/reports/application/ports/PaymentReportRepository.ts` con la interfaz `findPayments(filters: PaymentReportFilters): Promise<RawPaymentRow[]>` donde `RawPaymentRow` incluye `paymentId`, `folioNumber`, `saleId`, `saleFolioNumber`, `customerId`, `customerCode`, `customerName`, `branchId`, `branchCode`, `amount`, `paymentDate`, `status`, `registeredBy`, `registeredByEmail`, `cancelledAt?`, `cancellationReason?`
- [x] 12.2 Crear `src/modules/reports/application/dto/GetPaymentHistoryReportRequest.ts` — inputs del use case (`branchId?`, `customerId?`, `startDate?`, `endDate?`, `generatedBy: { userId, email }`)
- [x] 12.3 Crear `src/modules/reports/application/dto/PaymentHistoryReportResponseDto.ts` con la forma JSON definida en el requirement "Payment history report JSON DTO"
- [x] 12.4 Crear `src/modules/reports/application/use-cases/GetPaymentHistoryReportUseCase.ts` que invoca el repo, calcula `summary` (`totalPayments`/`totalAmount` de los `completed`, `cancelledPayments`/`cancelledAmount` de los `cancelled`, `netAmount = totalAmount - cancelledAmount`), serializa `Decimal` como `string` con 4 decimales y devuelve el DTO

## 13. Infraestructura: repositorios de abonos

- [x] 13.1 Crear `src/modules/reports/infrastructure/repositories/PrismaPaymentReportRepository.ts` que implementa `PaymentReportRepository.findPayments` consultando `prisma.customerPayment.findMany({ where, include: { sale: ..., customer: ..., branch: ..., user: ... } })`, respeta filtros `branchId`/`customerId`/`startDate`/`endDate` y mapea a `RawPaymentRow[]`
- [x] 13.2 La query filtra por `branchId` cuando no es `null`; filtra por `customerId` cuando no es `null`; filtra por `createdAt >= startDate` y `createdAt <= endDate(23:59:59)` cuando los rangos están presentes
- [x] 13.3 Crear `src/modules/reports/infrastructure/repositories/InMemoryPaymentReportRepository.ts` con constructor que recibe `rows: RawPaymentRow[]` y filtra en memoria por los mismos criterios; usado en tests del use case

## 14. PDF renderer de abonos

- [x] 14.1 Crear `src/modules/reports/infrastructure/pdf/PaymentHistoryReportPdf.tsx` que recibe `data: PaymentHistoryReportResponseDto` y renderiza `<Document><Page>...</Page></Document>` con: header (título, `generatedAt`, `generatedBy.email`, filtros activos), tabla de abonos (Folio Recibo / Folio Venta / Cliente / Sucursal / Monto / Fecha / Estado), sección de totales y footer con paginación
- [x] 14.2 Si `data.payments.length === 0`, renderizar header normal + texto "Sin abonos para los filtros aplicados"
- [x] 14.3 Reutilizar los estilos de `pdfStyles.ts` existentes; agregar variantes si se necesitan estilos específicos para la tabla de abonos

## 15. Controller y route handler del reporte de abonos

- [x] 15.1 Añadir el método `getPaymentHistoryReport(req: NextRequest): Promise<NextResponse>` a `src/modules/reports/infrastructure/http/ReportsController.ts`: (a) `requirePermission(req, "payments:report_read")`, (b) parsear+validar con Zod `branchId?` (UUID), `customerId?` (UUID), `startDate?` (regex `^\d{4}-\d{2}-\d{2}$` + conversión a `Date`), `endDate?` (ídem), `format?` (`"json"|"pdf"`, default `"json"`), (c) `resolveScopedBranchId` para branch scoping, (d) invocar `GetPaymentHistoryReportUseCase`, (e) ramificar por `format`
- [x] 15.2 El nombre del archivo PDF: `payments-YYYY-MM-DD.pdf` (fecha UTC del `generatedAt`)
- [x] 15.3 Añadir `GetPaymentHistoryReportUseCase` y `PrismaPaymentReportRepository` al DI container en `src/modules/reports/infrastructure/di/container.ts`
- [x] 15.4 Crear `app/api/v1/admin/reports/payments/history/route.ts` que importa `reportsController` y exporta `export async function GET(req: NextRequest) { return reportsController.getPaymentHistoryReport(req); }` — sin `export const runtime = "edge"`

## 16. Tests unitarios del reporte de abonos

- [x] 16.1 Crear `tests/unit/modules/reports/application/use-cases/GetPaymentHistoryReportUseCase.test.ts` con casos: cálculo correcto de `summary` con mix de `completed`/`cancelled`; filtro por `customerId`; filtro por rango de fechas; `payments: []` con `summary` en cero; `netAmount = totalAmount - cancelledAmount`
- [x] 16.2 Añadir a `tests/unit/modules/reports/infrastructure/repositories/InMemoryPaymentReportRepository.test.ts` los casos de filtrado por `branchId`, `customerId`, `startDate`, `endDate`
- [x] 16.3 Añadir a `tests/unit/modules/reports/infrastructure/http/ReportsController.test.ts`: 401 sin `x-user-id`; 403 sin `payments:report_read`; 403 branch scope; 400 UUID inválido en `customerId`; 400 fecha inválida; 200 JSON con forma del DTO; 200 PDF con `Content-Type` y `Content-Disposition` correctos

## 10. Documentación y verificación manual

- [x] 10.1 Correr `npm test -- tests/unit/modules/reports` → todos los tests pasan
- [x] 10.2 Correr `npm run build` → sin errores TS en el módulo `reports` (verificado con `npx tsc --noEmit`)
- [x] 10.3 Levantar `npm run dev`, autenticarse, y `curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/v1/admin/reports/inventory/stock"` → `200 application/json` con la estructura agrupada
- [x] 10.4 Repetir con `?branchId=<uuid>` y `?departmentId=<uuid>` → filtra correctamente
- [x] 10.5 Repetir con `?includeZeroStock=false` → excluye productos en cero y departamentos/sucursales vacíos
- [x] 10.6 Generar PDF: `curl -o /tmp/stock.pdf "http://localhost:3000/api/v1/admin/reports/inventory/stock?format=pdf" -H "Authorization: Bearer <token>"` y verificar `file /tmp/stock.pdf` → "PDF document"; abrir y revisar layout
- [x] 10.7 Probar branch scoping: login como `operator` con sucursal A, pedir `?branchId=<uuid-de-B>` → `403`
- [x] 10.8 Probar permiso ausente: crear un usuario con un rol que NO tiene `reports:inventory_read` → `403`
- [x] 10.9 Probar idempotencia del seed: re-ejecutar `npm run seed` → exit 0, sin duplicados, `reports:inventory_read` sigue presente en los tres roles
- [x] 10.10 Smoke test reporte de abonos JSON: `curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/v1/admin/reports/payments/history"` → `200 application/json` con `summary` y `payments[]`
- [x] 10.11 Smoke test con filtros: `?customerId=<uuid>&startDate=2026-06-01&endDate=2026-06-07` → filtra correctamente
- [x] 10.12 Generar PDF de abonos: `curl -o /tmp/payments.pdf ".../reports/payments/history?format=pdf" -H "Authorization: Bearer <token>"` → `file /tmp/payments.pdf` muestra "PDF document"; abrir y revisar layout
- [x] 10.13 Probar branch scoping en abonos: login como `operator` con sucursal A, `?branchId=<uuid-de-B>` → `403`
- [x] 10.14 Probar permiso ausente: usuario sin `payments:report_read` → `403`
