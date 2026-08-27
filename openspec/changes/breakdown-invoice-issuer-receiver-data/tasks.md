## 1. Migración y esquema

- [x] 1.1 Agregar a `prisma/schema.prisma`, modelo `Invoice`: `issuerRfc String?`, `issuerLegalName String?`, `issuerFiscalRegime String?`, `issuerZipCode String?` (mapear a columnas `snake_case` con `@map`, igual que los campos `receiver*` existentes).
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add_invoice_issuer_snapshot` y verificar que la migración generada es puramente aditiva (sin `NOT NULL`, sin default forzado, sin tocar filas existentes). (Nota: `migrate dev` falló por modo no-interactivo + drift preexistente no relacionado en PKs de `users`/`roles`/etc; se creó la migración manualmente con solo `ADD COLUMN` sobre `invoices` y se aplicó con `prisma migrate deploy`.)
- [x] 1.3 `npx prisma generate`.

## 2. Dominio y DTO (backend)

- [x] 2.1 `src/modules/billing/domain/entities/Invoice.ts`: agregar `issuerRfc: string | null`, `issuerLegalName: string | null`, `issuerFiscalRegime: string | null`, `issuerZipCode: string | null` a `InvoiceProps` y a la clase `Invoice` (declaración + no requiere lógica adicional en `create`).
- [x] 2.2 `src/modules/billing/application/dto/InvoiceDto.ts`: agregar los mismos 4 campos (`string | null`) a `InvoiceDto`.
- [x] 2.3 `src/modules/billing/application/mappers/toInvoiceDto.ts`: mapear los 4 campos nuevos de `Invoice` → `InvoiceDto`.
- [x] 2.4 `src/modules/billing/application/ports/InvoiceRepository.ts`: agregar los 4 campos a `CreateInvoiceData`.

## 3. Persistencia (backend)

- [x] 3.1 `src/modules/billing/infrastructure/repositories/PrismaInvoiceRepository.ts`: `mapInvoice` lee `row.issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode` de la fila Prisma; `createStamped` los incluye en el `data` del `prisma.invoice.create`.
- [x] 3.2 `src/modules/billing/infrastructure/repositories/InMemoryInvoiceRepository.ts`: `makeInvoice` propaga los mismos 4 campos desde `CreateInvoiceData` (para que los tests del use case puedan verificarlos).

## 4. Resolución del emisor al timbrar (backend)

- [x] 4.1 `src/modules/billing/application/use-cases/StampInvoiceUseCase.ts`: en `stampFromSale` y en `stampStandalone`, antes de construir `CreateInvoiceData`, llamar `getEmitterFiscalSettings()` (import de `@/shared/infrastructure/emitter/emitterFiscalSettingsStore`) y mapear el resultado (`rfc`/`legalName`/`fiscalRegime`/`zipCode`, cada uno `?? null`) a `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode` en el objeto pasado a `invoiceRepo.createStamped`. No bloquear ni lanzar error si `getEmitterFiscalSettings()` devuelve `null` o campos incompletos — persistir `null` en los correspondientes.
- [x] 4.2 Test unitario (`tests/unit/modules/billing/StampInvoiceUseCase.test.ts` o el archivo de test existente del use case): agregar casos para (a) `EmitterFiscalSettings` completo → snapshot correcto en la invoice creada, (b) `EmitterFiscalSettings` inexistente/incompleto → invoice se crea igual con los campos `issuer*` en `null`, para `stampFromSale` y `stampStandalone`.

## 5. Endpoint de lectura ligera del emisor fiscal (backend)

- [x] 5.1 Nuevo use case `src/modules/billing/application/use-cases/GetEmitterFiscalSettingsUseCase.ts`: `execute()` llama `getEmitterFiscalSettings()` y devuelve `{ rfc: string | null, legalName: string | null, fiscalRegime: string | null, zipCode: string | null }` (normalizando `undefined` → `null`). Sin dependencia de `FacturamaGateway`.
- [x] 5.2 `src/modules/billing/infrastructure/http/BillingController.ts`: nuevo método `getEmitterFiscalSettings(req)` — `requirePermission(req, "billing:write", this.authz)`, llama al use case, retorna `NextResponse.json(...)` con HTTP 200.
- [x] 5.3 `src/modules/billing/infrastructure/di/container.ts`: instanciar `GetEmitterFiscalSettingsUseCase` e inyectarlo al `BillingController`.
- [x] 5.4 Nueva ruta `app/api/v1/admin/billing/emitter-fiscal-settings/route.ts` — `export const GET` delega a `billingController.getEmitterFiscalSettings(req)`, mismo patrón que `app/api/v1/admin/billing/csd/route.ts`.
- [x] 5.5 Test de integración o unitario del nuevo endpoint/use case: 200 con los 4 campos (completos e incompletos), 403 sin `billing:write`, y verificar que NO se invoca ningún método de `FacturamaGateway` (mock/spy).

## 6. Preview PDF endpoint — resolución server-side del emisor (backend)

- [x] 6.1 Ubicar el handler de `POST /api/v1/admin/invoices/preview/pdf` en `BillingController` (método existente, ver spec `billing-api` "Invoice preview PDF endpoint"). Junto a la resolución existente de `logoUrl` vía `GetTicketSettingsUseCase`, agregar la resolución de `getEmitterFiscalSettings()` (vía `GetEmitterFiscalSettingsUseCase`, en paralelo con `Promise.all`) y construir el objeto `issuer` pasado a `InvoiceDocumentPdf` ignorando cualquier `rfc`/`fiscalRegime`/`zipCode` que venga en `body.issuer`.
- [x] 6.2 Test: request con `issuer.rfc`/`issuer.fiscalRegime`/`issuer.zipCode` falsos en el body → el PDF generado (o los datos pasados a `InvoiceDocumentPdf`, si el test mockea el render) usan los valores de `EmitterFiscalSettings`, no los del body.

## 7. `InvoiceDocumentPdf` — desglose de emisor (PDF real y preview)

- [x] 7.1 `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx`: extender `InvoiceDocumentPdfData["issuer"]` con `rfc?: string | null`, `fiscalRegime?: string | null`, `zipCode?: string | null` (además de `name`/`branchName`/`logoUrl` ya existentes).
- [x] 7.2 Reemplazar el bloque de header simple del emisor (`s.issuerRow`/`s.issuerBlock`/`s.issuerName`/`s.issuerMeta`) por una sección con título "Emisor" y grid (`s.receiverGrid`/`s.receiverField`/`s.receiverLabel`/`s.receiverValue`, reutilizando los estilos ya existentes de "Receptor") con 4 campos: RFC, Razón social (= `issuer.name`), Régimen fiscal, Código postal — cada uno mostrando "—" si es `null`/vacío. El header conserva el logo (`PdfLogo`) + nombre + `branchName` como subtítulo (dato de sucursal, no de `EmitterFiscalSettings`); el RFC se retiró del header (vive ahora sólo en la sección "Emisor", evita mostrarlo dos veces).
- [x] 7.3 Verificar que el layout no rompe con textos largos (razón social larga) — reutiliza exactamente los mismos estilos (`s.receiverGrid`/etc.) que ya maneja wrap para "Receptor", sin estilos nuevos.
- [x] 7.4 No existe ningún test de render/snapshot directo de PDFs en este repo (`InvoiceDocumentPdf`, `QuotePdf`, etc. no tienen `*.test.ts` propio) — la convención existente cubre el contenido del PDF indirectamente a nivel de controller, verificando los props pasados al elemento con `renderToBuffer` mockeado. Cobertura de la sección "Emisor" agregada en ese mismo nivel (`BillingControllerCsd.test.ts`, tests de la tarea 6.2).

## 8. Mock de Facturama — shape del emisor

- [x] 8.1 `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`: actualizar `FALLBACK_INVOICE_DATA.issuer` y `toInvoiceDocumentPdfData()` para incluir `rfc`/`fiscalRegime`/`zipCode` (valores mock realistas, ej. los mismos que ya usa el resto del mock: `rfc: "AGR010101AB1"`, régimen y CP de prueba).
- [x] 8.2 En `download(format: "pdf", ...)`, además de inyectar `logoUrl` desde `getTicketSettingsUseCase`, inyectar `rfc`/`fiscalRegime`/`zipCode` desde `getEmitterFiscalSettings()` (mismo patrón que el paso 6.1, para que el PDF mock descargado ya refleje datos reales de emisor cuando existan; fallback a los valores del mock si `EmitterFiscalSettings` no está poblado). Se agregó mock de `emitterFiscalSettingsStore` en `FakeFacturamaGateway.test.ts` para no golpear la BD real (mismo patrón ya usado en otros tests de `billing`).

## 9. Frontend — tipos

- [x] 9.1 `app/(private)/billing/_logic/types/api.ts`: agregar `issuerRfc`, `issuerLegalName`, `issuerFiscalRegime`, `issuerZipCode` (`string | null`) al tipo `InvoiceDto`.
- [x] 9.2 `app/(private)/billing/_logic/types/domain.ts`: agregar los mismos 4 campos a la interfaz `Invoice`; el mapper `_mappers.ts` ya usa `...dto` (spread) — los propaga sin cambios.
- [x] 9.3 `app/(private)/billing/_logic/types/preview.ts`: extender `InvoicePreviewData["issuer"]` con `rfc?: string | null`, `fiscalRegime?: string | null`, `zipCode?: string | null`.

## 10. Frontend — resolución del emisor para preview

- [x] 10.1 Nuevo servicio `app/(private)/billing/_logic/services/getEmitterFiscalSettings.ts`: `authFetch("/api/v1/admin/billing/emitter-fiscal-settings")`, parsea `{ rfc, legalName, fiscalRegime, zipCode }`, acepta `fetchImpl?: typeof fetch`.
- [x] 10.2 `app/(private)/billing/_logic/hooks/useInvoicePreview.ts` (flujo `StampSaleForm`): resuelve el emisor en paralelo (`Promise.all`) a `getInvoicePreviewSource`, con `.catch()` inline que retorna nulls si falla — no bloquea ni propaga como `loadError`. Para `PartialInvoiceForm` (que no pasa por este hook), se creó `useEmitterFiscalSettings()` (nuevo hook, `_logic/hooks/useEmitterFiscalSettings.ts`) que resuelve una vez al montar el componente y expone `{ rfc, fiscalRegime, zipCode }` con fallback silencioso a `null` en error — usado directamente en `PartialInvoiceForm.tsx`.
- [x] 10.3 `app/(private)/billing/_logic/lib/buildInvoicePreview.ts`: aceptar `issuer.rfc`/`issuer.fiscalRegime`/`issuer.zipCode` en `BuildInvoicePreviewInput["issuer"]` y propagarlos a `InvoicePreviewData` (ya se propagaban por referencia, sólo se extendió el tipo).
- [x] 10.4 `getInvoicePreviewSource.ts` no se tocó — sigue resolviendo sólo venta+cliente; el emisor se resuelve por una llamada separada (`getEmitterFiscalSettings`) en paralelo, evitando acoplar una fuente de datos no relacionada (venta) con otra (identidad fiscal de la empresa, global y no ligada a la venta).

## 11. Frontend — UI de desglose

- [x] 11.1 `app/(private)/billing/_blocks/InvoiceMetaPanel.tsx`: agregar sección "Datos del emisor" (mismo grid `dl`/`dt`/`dd` que "Datos del receptor"), con 4 campos (RFC, Razón social, Régimen fiscal, CP), mostrando `"—"` cuando el valor sea `null`. Colocada antes de "Datos del receptor" (orden lógico: quién emite, luego a quién).
- [x] 11.2 `app/(private)/billing/_blocks/InvoicePreviewModal.tsx`: agregada sección "Datos del emisor" (mismo estilo que "Datos del receptor") con los 4 campos, mostrando `"—"` para `null`/ausente. Agregado el campo "Código postal" (`taxZipCode`) a la sección "Datos del receptor" existente.
- [x] 11.3 Verificado manualmente con Playwright: (a) `/billing/[id]` de la factura pre-existente (pre-migración, `issuer*` todos `null`) muestra "Datos del emisor" con guiones en los 4 campos; (b) con `EmitterFiscalSettings` poblado temporalmente para la prueba, `/billing/new` → Factura parcial → Vista previa muestra "Datos del emisor" y "Datos del receptor" (con CP) completos en el modal; (c) "Descargar PDF" del preview genera un PDF real con sección "Emisor" simétrica a "Receptor", sin RFC duplicado en el header. Dato de prueba de `EmitterFiscalSettings` eliminado al terminar (estado de BD restaurado a como estaba antes de la verificación).

## 12. Specs y verificación

- [x] 12.1 Specs de la propuesta revisadas contra lo implementado: alineadas, sin ajustes necesarios (el único detalle no anticipado — el endpoint ligero de emisor y su gating `billing:write` — ya estaba contemplado en el `design.md` original).
- [x] 12.2 Suite completa (`npx jest`): 3707/3708 tests pasan; el único fallo (`RolesPage.test.tsx`) es preexistente y no relacionado (archivo sin diff, módulo `roles` no tocado por este cambio). `npx tsc --noEmit`: 0 errores nuevos (16 preexistentes sin relación, confirmado con `git stash`). `npm run build`: compila sin errores, incluye la ruta nueva `/api/v1/admin/billing/emitter-fiscal-settings`.
- [x] 12.3 `/opsx:verify` ejecutado dos veces, más las 2 SUGGESTION aplicadas a pedido explícito del usuario. Ronda 1 cerró 2 WARNING: `useEmitterFiscalSettings.test.ts` (hook nuevo sin test) y 3 casos en `InvoicePreviewModal.test.tsx` (sección "Datos del emisor", fallback "—", CP receptor). Ronda 2 cerró un WARNING más: `useInvoicePreview.test.ts` (flujo `StampSaleForm`, resolución paralela del emisor + "issuer lookup failure does not block the preview"). SUGGESTION 1 cerrada: `InvoiceMetaPanel.test.tsx` nuevo (4 casos: emisor, receptor, guiones en snapshot pre-migración, banner de cancelación). SUGGESTION 2 cerrada: nuevo test en `StampInvoiceUseCase.test.ts` ("issuer fiscal data changes later — existing invoice keeps the snapshot from when it was stamped") que timbra dos facturas standalone con `EmitterFiscalSettings` distinto entre ambas y confirma vía `repo.findById` que la primera factura no se ve afectada por el cambio posterior. Suite completa final: 517/517 suites, 3743/3743 tests.

---

# RONDA 2 — ajustes post-verify (a pedido explícito del usuario, antes de archivar)

Ver `proposal.md` (sección "Ronda 2") y `design.md` (sección "Ronda 2 — ajustes post-verify") para el contexto y las decisiones de diseño de todo lo que sigue.

## 13. Migración adicional (dirección del emisor)

- [x] 13.1 `prisma/schema.prisma`: agregar `EmitterFiscalSettings.address String? @db.Text` y `Invoice.issuerAddress String? @map("issuer_address") @db.Text`.
- [x] 13.2 Migración manual (mismo patrón que la ronda 1 — `migrate dev` no es viable en este entorno por el drift preexistente en PKs de `users`/`roles`): `ALTER TABLE "emitter_fiscal_settings" ADD COLUMN "address" TEXT; ALTER TABLE "invoices" ADD COLUMN "issuer_address" TEXT;` en una carpeta nueva de `prisma/migrations/`, aplicada con `prisma migrate deploy`.
- [x] 13.3 `npx prisma generate`.

## 14. Cascada de resolución del emisor (backend)

- [x] 14.1 Nueva función pura `src/modules/billing/application/services/resolveIssuerFiscalData.ts`: recibe `FacturamaGateway`, implementa la cascada de 3 niveles — CSD en vivo (`gateway.getCsdStatus()`, sólo aporta `rfc`/`legalName`) → `EmitterFiscalSettings` (aporta `fiscalRegime`/`zipCode`/`address` siempre, y `rfc`/`legalName` si el paso 1 no resolvió) → `TEST_FALLBACK_ISSUER` (constante exportada, mismos valores que `FALLBACK_INVOICE_DATA` + `address` de prueba). Captura cualquier error de `getCsdStatus()` y continúa la cascada sin propagar la excepción. Devuelve `{ rfc, legalName, fiscalRegime, zipCode, address }`, los 5 campos SIEMPRE `string` no vacío.
- [x] 14.2 `StampInvoiceUseCase.resolveIssuerSnapshot()`: reemplazada la llamada directa a `getEmitterFiscalSettings()` por `resolveIssuerFiscalData(this.gateway)`, mapeado a `issuerRfc`/`issuerLegalName`/`issuerFiscalRegime`/`issuerZipCode`/`issuerAddress`. Propagado `issuerAddress` por todo el pipeline: `Invoice`/`InvoiceProps`, `InvoiceDto`, `toInvoiceDto`, `CreateInvoiceData`, `PrismaInvoiceRepository`, `InMemoryInvoiceRepository`, y los tipos frontend `types/api.ts`/`types/domain.ts`.
- [x] 14.3 `GetEmitterFiscalSettingsUseCase`: recibe `FacturamaGateway` en el constructor, `execute()` delega a `resolveIssuerFiscalData`; devuelve los 5 campos.
- [x] 14.4 `BillingController.previewPdf`: sin cambios de código — ya usaba `emitter.rfc/fiscalRegime/zipCode` del use case inyectado, que ahora automáticamente resuelve vía la cascada (address/descripciones se añaden en tareas 17/19).
- [x] 14.5 `di/container.ts`: `GetEmitterFiscalSettingsUseCase(gateway)`.
- [x] 14.6 `StampInvoiceUseCase.test.ts`: mock de `emitterFiscalSettingsStore` sin cambios (ya existía); agregados 2 casos nuevos — CSD cargado (rfc/legalName del certificado, resto de settings) y CSD falla (fallback completo a settings) — y reescritos los 2 casos "incomplete" para esperar `TEST_FALLBACK_ISSUER` en vez de `null` (nuevo comportamiento: nunca más `null` en facturas nuevas). `FakeFacturamaGateway.getCsdStatus()` ahora lanza `FacturamaCsdError` si no se llamó `uploadCsd()` antes (mismo comportamiento que Facturama real sin CSD cargado) — necesario para que los tests existentes (que no suben CSD) seguían cayendo a `EmitterFiscalSettings` como antes.

## 15. CSD management — campo dirección

- [x] 15.1 `UploadCsdUseCase`/`UploadCsdRequest`: agregado `address?: string` opcional, persistido en `upsertEmitterFiscalSettings`.
- [x] 15.2 `GetCsdStatusUseCase`/`CsdStatusWithFiscalData`: agregado `address: string | null` a la respuesta fusionada.
- [x] 15.3 `emitterFiscalSettingsStore.ts`: `EmitterFiscalData`/`PartialEmitterFiscalData` ganan `address`; `getEmitterFiscalSettings`/`upsertEmitterFiscalSettings` lo leen/escriben con la misma semántica partial-upsert que los otros 3 campos (hecho en la tarea 14, dependencia dura de `resolveIssuerFiscalData.ts`).
- [x] 15.4 `BillingController.uploadCsd`: `csdSchema` (Zod) gana `address: z.string().max(500).optional()`.
- [x] 15.5 `CsdManagerPage.tsx`: nuevo campo "Dirección" (textarea), prellenado desde `GET /billing/csd`, incluido en el `POST /billing/csd`. Propagado por `useCsdManager.upload()`, `types/api.ts` (`UploadCsdRequest`/`CsdStatusDto`).
- [x] 15.6 Tests actualizados/agregados: `UploadCsdUseCase.test.ts` (4 campos, persiste/no-overwrite con `address`), `GetCsdStatusUseCase.test.ts` (`address` en merge y en `null`), `CsdManagerPage.test.tsx` (renderiza/prellena/envía "Dirección").

## 16. Catálogo compartido de forma/método de pago

- [x] 16.1 `src/shared/domain/catalogs/satPaymentCatalogs.ts` (puro, sin I/O): `SAT_PAYMENT_FORMS`/`SAT_PAYMENT_METHODS` (`{code, description}[]`, consolidados desde los valores ya usados en ambos forms) + `describePaymentForm(code)`/`describePaymentMethod(code)`.
- [x] 16.2 `StampSaleForm.tsx`/`PartialInvoiceForm.tsx`: arrays locales `PAYMENT_FORMS`/`PAYMENT_METHODS` ahora derivados del catálogo compartido (`.map` a `{value,label}` para no tocar el JSX de los `<select>`). Confirmado que el valor por defecto de `paymentForm`/`paymentMethod` en `usePartialInvoiceForm` está hardcodeado ("03"/"PUE"), no depende del orden del array — reordenar la lista es seguro.
- [x] 16.3 `tests/unit/modules/shared/domain/catalogs/satPaymentCatalogs.test.ts`: código conocido, fallback a código crudo, catálogos no vacíos.

## 17. Resolución de descripciones SAT (régimen fiscal / uso CFDI) — backend

- [x] 17.1 `di/container.ts` de `billing`: instanciados `PrismaSatTaxRegimeRepository`/`PrismaSatCfdiUseRepository` + `SearchSatTaxRegimesUseCase`/`SearchSatCfdiUsesUseCase` (reutilizando los use cases YA existentes del módulo `sat-codes` en vez de reimplementar acceso a los repos — menos acoplamiento, un solo import cross-módulo hacia application layer).
- [x] 17.2 `src/modules/billing/infrastructure/services/resolveSatDescription.ts`: recibe cualquier objeto `{execute(query): Promise<{items}>}` (duck-typed contra `SearchSatTaxRegimesUseCase`/`SearchSatCfdiUsesUseCase`), llama `execute(code)` y devuelve `"<code> - <description>"` si hay match EXACTO (`items.find(i => i.code === code)`, no solo `items[0]` — evita falso positivo si el catálogo devuelve otro código como primer resultado de un `contains`), o el código crudo si no. Código vacío devuelve el código sin llamar al use case.
- [x] 17.3 `BillingController.getById`: agregado `issuerFiscalRegimeLabel` (null si `issuerFiscalRegime` es null, factura pre-migración), `receiverFiscalRegimeLabel`, `receiverCfdiUseLabel` al JSON de respuesta (spread de `toInvoiceDto(invoice)` + los 3 campos nuevos) — se optó por enriquecer en el controller en vez de en `toInvoiceDto.ts` para no volver async/DB-dependiente un mapper puro reusado por múltiples use cases.
- [x] 17.4 `InvoiceDocumentPdf.tsx`: `issuer`/`receiver` ganan `fiscalRegimeLabel?`/`cfdiUseLabel?` (ya resueltos por el caller, con fallback al código crudo si ausentes — retrocompatible); forma/método de pago ahora 2 filas separadas vía `describePaymentForm`/`describePaymentMethod` (antes era 1 fila combinada con códigos crudos). De paso (mismo archivo, ver tarea 19.3): header cambia de mostrar el nombre de la empresa a texto fijo "Factura" + logo; grid de "Emisor" gana campo "Dirección".
- [x] 17.5 `BillingController.previewPdf`: resuelve `issuerFiscalRegimeLabel`/`receiverFiscalRegimeLabel`/`receiverCfdiUseLabel` server-side vía `resolveSatDescription`, más `emitter.address`, antes de armar los props de `InvoiceDocumentPdf` — el cliente sólo controla `issuer.name`/`branchName`, todo lo demás se resuelve/ignora server-side.
- [x] 17.6 Tests agregados: `resolveSatDescription.test.ts` (match exacto, fallback código crudo, guard contra falso-positivo de `contains`, código vacío no llama al use case); nuevo describe "BillingController — getById resolves SAT catalog descriptions" en `BillingControllerCsd.test.ts` (3 casos: catálogo con match, emisor null en factura pre-migración, código desconocido → crudo); nuevo caso en el describe de `previewPdf` verificando que los labels llegan a los props de `InvoiceDocumentPdf`. `BillingControllerScoping.test.ts` actualizado con los 2 nuevos parámetros del constructor (`SearchSatTaxRegimesUseCase`/`SearchSatCfdiUsesUseCase` con repos `InMemory` vacíos).

## 18. Resolución de descripciones SAT — frontend

- [x] 18.1 Nuevo `app/(private)/billing/_logic/services/resolveSatDescription.ts`: `resolveFiscalRegimeDescription(code)`/`resolveCfdiUseDescription(code)` reutilizan `GET /api/v1/admin/sat-codes/regimen-fiscal|uso-cfdi?search=<code>` (match exacto vía `items.find(i => i.code === code)`, no `items[0]`); nunca lanzan — cualquier error (red, 4xx) se traga internamente y devuelve el código crudo, consistente con el criterio "no bloquea el preview".
- [x] 18.2 `InvoicePreviewModal.tsx`: nuevo estado `labels` resuelto en `useEffect` (con `cancelled` flag para evitar setState tras unmount) en paralelo para `issuer.fiscalRegime`/`receiver.fiscalRegime`/`receiver.cfdiUse`, con fallback al código crudo mientras resuelve o si falla. De paso (mismo archivo, ver tarea 19.2): título del header cambia de `{data?.issuer.name ?? "Agrisas"}` a texto fijo "Factura"; sección "Datos del emisor" gana campo "Dirección". Propagado `issuer.address`/`receiver` (sin cambios) por toda la cadena: `types/preview.ts`, `buildInvoicePreview.ts`, `useEmitterFiscalSettings.ts`, `useInvoicePreview.ts`, `getEmitterFiscalSettings.ts` (servicio y tipo `EmitterFiscalSettingsDto`).
- [x] 18.3 Tests: 2 casos nuevos en `InvoicePreviewModal.test.tsx` (header "Factura" + no aparece "Agrisas" como heading + "Dirección" visible; descripciones resueltas mostrando "código - descripción"), más mock del nuevo servicio agregado al top del archivo para no disparar `authFetch` real en los tests ya existentes.

## 19. UI — dirección, descripciones y header "Factura"

- [x] 19.1 `InvoiceMetaPanel.tsx`: campo "Dirección" agregado a "Datos del emisor"; `issuerFiscalRegimeLabel`/`receiverFiscalRegimeLabel`/`receiverCfdiUseLabel` (con `??` fallback al código crudo) reemplazan los códigos en emisor, receptor y "Datos de pago CFDI" (el `cfdiUse` de esa sección reutiliza `receiverCfdiUseLabel` — son el mismo valor por construcción en `StampInvoiceUseCase`, verificado en código); `paymentForm`/`paymentMethod` vía `describePaymentForm`/`describePaymentMethod`. Tipos `InvoiceDto`/`Invoice` (frontend) ganan los 3 campos `*Label` opcionales. Tests agregados: descripciones presentes, fallback a código crudo (DTO legado).
- [x] 19.2 `InvoicePreviewModal.tsx`: hecho en la tarea 18.2 (mismo archivo) — "Dirección" en "Datos del emisor", descripciones de régimen fiscal (ambos)/uso CFDI (receptor), header cambiado a "Factura".
- [x] 19.3 `InvoiceDocumentPdf.tsx`: hecho en la tarea 17.4 (mismo archivo) — "Dirección" en grid de "Emisor", `fiscalRegimeLabel`/`cfdiUseLabel` con fallback al código crudo, header cambiado a texto fijo "Factura" (logo + `branchName` como subtítulo se mantienen).
- [x] 19.4 Verificado visualmente en `/billing/new` (preview): "601 - General de Ley Personas Morales" hace wrap a 2 líneas dentro de la celda del grid sin romper layout, tanto en emisor como receptor (screenshot de la tarea 20.3).

## 20. Tests y verificación final (ronda 2)

- [x] 20.1 Fixtures/mocks actualizados en todos los archivos afectados por el cambio de shape (`address`, labels `*Label`, cascada CSD): `StampInvoiceUseCase.test.ts`, `BillingControllerCsd.test.ts`, `BillingControllerScoping.test.ts`, `GetCsdStatusUseCase.test.ts`, `UploadCsdUseCase.test.ts`, `CsdManagerPage.test.tsx`, `InvoiceMetaPanel.test.tsx`, `InvoicePreviewModal.test.tsx`, `useEmitterFiscalSettings.test.ts`, `useInvoicePreview.test.ts`, `CancelInvoiceUseCase.test.ts`, `DownloadInvoiceFileUseCase.test.ts`, `SendInvoiceEmailUseCase.test.ts`, `SaleInvoicesSection.test.tsx`, `services.test.ts`.
- [x] 20.2 Suite completa: 518/519 suites, 3760/3762 tests — único fallo `RolesPage.test.tsx` (flaky preexistente, confirmado sin diff, ya visto en la verificación de ronda 1). `npx tsc --noEmit`: mismos 16 errores preexistentes sin relación (confirmado contra baseline de la tarea 12.2). `npm run build`: compila sin errores.
- [x] 20.3 Verificación manual con Playwright — ver detalle abajo.
- [x] 20.4 `/opsx:verify` ejecutado sobre esta ronda — ver reporte al final de este archivo.

### Detalle de la verificación manual (20.3)

**Entorno**: el dev server tuvo varios episodios de inestabilidad ajenos al código del feature — procesos `next dev` duplicados corriendo simultáneamente contra el mismo puerto (build manifests desincronizados → chunks 404), un HMR corrupto tras `rm -rf .next` en caliente ("missing required error components"), y un loop de fondo de sync de precios de catálogo (`/api/v1/admin/products/*/prices`, ~1s/request) ralentizando el servidor de un solo hilo. Ninguno era un defecto del código de esta feature. Resuelto con: matar todos los procesos `next`/`next-server` (`pkill -9`), `rm -rf .next`, reinicio limpio, y usar una pestaña de browser nueva en vez de reutilizar una con runtime de webpack obsoleto.

**Verificado en `/billing/new` (Facturar venta) contra servidor limpio, con sesión admin real**:
- Combos "Forma de pago" / "Método de pago" ya muestran `código - descripción` (catálogo compartido `satPaymentCatalogs.ts` correctamente consumido en frontend).
- Venta sin cliente asociado → `Vista previa` muestra el guard existente ("Esta venta no tiene cliente asociado...") y el modal ya con el header nuevo: título "Factura" (sin nombre de empresa), badge BORRADOR, folio pendiente.
- Venta con cliente → `Vista previa` renderiza correctamente:
  - **Datos del emisor**: RFC, Razón social, Régimen fiscal como "601 - General de Ley Personas Morales" (descripción resuelta, no código crudo), Código postal, y **Dirección en campo separado** ("Av. Álvaro Obregón 123, Culiacán, Sinaloa").
  - **Datos del receptor**: RFC, Nombre, Uso CFDI como "G03 - Gastos en general." (descripción resuelta), Régimen fiscal resuelto, Código postal.
  - Línea de concepto, subtotal/impuestos/total correctos.
- No se llegó a timbrar (crearía una factura real en BD sin necesidad); el detalle de factura (`/billing/[id]`) y el PDF descargable heredan la misma resolución de labels ya cubierta por tests de `BillingControllerCsd.test.ts` (`getById resuelve descripciones del catálogo SAT`) y no requería repetir en browser.
- Dato de prueba en `emitter_fiscal_settings` (RFC `AGR010101AB1` / "Agrisas SA de CV" / dirección de prueba) — borrado. Emisor cae a fallback fijo (tier 3 de la cascada) hasta que se cargue CSD real o se capture settings de nuevo en `/billing/csd`.
