## Context

Ver `proposal.md` — `## Why` y `## Historia de Usuario`. Estado actual verificado en código:

- `Invoice`/`InvoiceProps` (dominio) y la tabla `invoices` ya snapshotean receptor (`receiverRfc`, etc.) pero no tienen ningún campo de emisor.
- `EmitterFiscalSettings` (singleton, tabla ya existente) tiene `rfc`/`legalName`/`fiscalRegime`/`zipCode`, todos nullable, leídos hoy vía la función pura `getEmitterFiscalSettings()` (`src/shared/infrastructure/emitter/emitterFiscalSettingsStore.ts`) — sin repositorio ni puerto DI, sin inyección de dependencias.
- `GET /api/v1/admin/billing/csd` ya devuelve estos 4 campos (fusionados con el status del CSD vía `GetCsdStatusUseCase`), pero está gateado por `billing:manage_csd` (solo `admin`) y además dispara `gateway.getCsdStatus()`, una llamada real a Facturama.
- `StampInvoiceUseCase.stampFromSale`/`stampStandalone` nunca leen `EmitterFiscalSettings` hoy — Facturama arma su propio nodo `Emisor` a partir del CSD ya cargado en la cuenta al timbrar una factura Ingreso (confirmado en el change archivado `emitter-fiscal-settings`).
- `POST /api/v1/admin/invoices/preview/pdf` ya resuelve `logoUrl` server-side vía `GetTicketSettingsUseCase`, ignorando cualquier valor del body — es el patrón a replicar para el emisor fiscal.
- `InvoicePreviewModal` renderiza su propio grid HTML de "Datos del receptor" ANTES de generar cualquier PDF — el comentario en `InvoiceDocumentPdf.tsx` ("WYSIWYG parity with InvoicePreviewModal") confirma que ambos deben mantenerse visualmente equivalentes.

## Goals / Non-Goals

**Goals:**
- Snapshotear el emisor por factura (Historia #3), simétrico al receptor.
- Desglosar emisor en detalle de factura (Historia #1), PDF real y vista previa (Historia #2), con el mismo estilo de grid ya usado para receptor.
- Resolver el emisor para operadores sin `billing:manage_csd` (Historia #2) sin ampliar ese permiso ni llamar a Facturama en cada apertura de preview.

**Non-Goals:**
- No se cambia cómo Facturama arma su propio nodo `Emisor` al timbrar (sigue infiriéndolo del CSD cargado en la cuenta) — el snapshot local es solo para presentación/auditoría, no se envía a Facturama.
- No se migra `FacturamaRestGateway` de `billing` a leer `EmitterFiscalSettings` (eso ya se evaluó y se descartó en el change archivado `emitter-fiscal-settings`: "se confirmó en código que billing's FacturamaRestGateway.stamp() nunca... construye un nodo Emisor").
- No se toca `waybills` (Carta Porte) — ese módulo ya consume `EmitterFiscalSettings` para su propio flujo, sin relación con facturas.
- No se introduce un repositorio/puerto DI nuevo para `EmitterFiscalSettings` — se reutiliza la función existente `getEmitterFiscalSettings()` directamente desde el use case y desde el nuevo endpoint, igual patrón que `GetCsdStatusUseCase`/`UploadCsdUseCase` ya hacen.

## Decisions

### 1. Snapshot en migración aditiva, nullable, sin backfill
Cuatro columnas nuevas en `invoices`: `issuer_rfc`, `issuer_legal_name`, `issuer_fiscal_regime`, `issuer_zip_code` (mapeo Prisma `issuerRfc`/etc.), todas `String?`. Facturas existentes quedan `null` — no hay forma de reconstruir retroactivamente qué emisor estaba vigente cuando se timbraron. Responde a Historia #3 y a los criterios de aceptación de "factura ya existente antes de esta migración".

Alternativa descartada: backfill con el valor actual de `EmitterFiscalSettings` — rechazada porque sería incorrecto para cualquier factura timbrada antes de que el emisor tuviera el valor de hoy (violaría la garantía de "exactitud histórica" que es la motivación misma del snapshot).

### 2. Endpoint de lectura nuevo, no reutilizar `GET /billing/csd`
Se agrega `GET /api/v1/admin/billing/emitter-fiscal-settings`, gateado por `billing:write`, que llama directamente a `getEmitterFiscalSettings()` sin tocar `FacturamaGateway`. No se reutiliza `GET /billing/csd` porque:
- Ese endpoint exige `billing:manage_csd` (solo `admin`), y el flujo de preview lo necesitan también los `operator` (Historia #2, criterio de seguridad explícito: "no ampliar `billing:manage_csd` a más roles").
- Ese endpoint dispara `gateway.getCsdStatus()`, una llamada de red real a Facturama — innecesaria y potencialmente costosa/lenta si se dispara cada vez que alguien abre una vista previa de factura.

Alternativa descartada: ampliar `billing:manage_csd` a `operator` — rechazada porque ese permiso controla la gestión del certificado criptográfico (CSD), una operación sensible sin relación con simplemente previsualizar una factura; ampliarlo mezclaría dos niveles de sensibilidad distintos.

Alternativa descartada: exponer `EmitterFiscalSettings` sin autenticación — rechazada, aunque los datos no son secretos, no hay necesidad de exponerlos fuera del panel administrativo.

### 3. Resolución server-side en el use case de timbrado y en el endpoint de preview, nunca desde el cliente
Tanto `StampInvoiceUseCase` como el controller de `POST /invoices/preview/pdf` llaman `getEmitterFiscalSettings()` directamente (no vía el nuevo endpoint HTTP — ambos ya corren server-side) e ignoran cualquier `rfc`/`fiscalRegime`/`zipCode` que el cliente intente mandar bajo `issuer`. Esto es el mismo patrón que `logoUrl` ya usa en el endpoint de preview. `issuer.name`/`issuer.branchName` siguen siendo responsabilidad del cliente porque son datos de presentación (nombre comercial / sucursal), no fiscales, y no viven en `EmitterFiscalSettings`.

### 4. `InvoicePreviewModal` resuelve el emisor con una llamada adicional propia, independiente de `StampSaleForm`/`PartialInvoiceForm`
En vez de forzar a cada formulario a incluir el fetch de emisor en su propia lógica de armado de preview (`buildInvoicePreview`, `getInvoicePreviewSource`), la resolución del emisor (`GET /emitter-fiscal-settings`) se dispara una vez al abrir el modal (o en el hook `useInvoicePreview`, ver `Impact` en proposal.md), desacoplada de si el preview viene de venta o de standalone — ambos flujos necesitan el mismo dato de la misma fuente. Si falla, no bloquea nada (ver spec: "Issuer lookup failure does not block the preview") porque el emisor real que termina en el PDF de verdad se resuelve otra vez, correctamente, en el servidor.

### 5. Símil visual exacto con "Receptor": misma estructura de grid, mismo componente reutilizado donde sea posible
`InvoiceMetaPanel`, `InvoicePreviewModal` e `InvoiceDocumentPdf.tsx` usan la misma forma de grid `dl`/`dt`/`dd` (UI) o `View`/`Text` con `s.receiverField`/`s.receiverLabel`/`s.receiverValue` (PDF, reutilizando esos mismos estilos para "Emisor" en vez de crear `s.issuerField`/etc. duplicados) que ya existen para "Receptor" — mantiene el sistema de diseño (`designer.md`) y evita introducir un segundo patrón visual para el mismo tipo de dato.

## Risks / Trade-offs

- **[Riesgo]** Un admin podría cambiar el régimen fiscal/CP del emisor en `CsdManagerPage` sin volver a subir CSD (edición de datos fiscales y re-subida de CSD ya son independientes, según el change archivado `emitter-fiscal-settings`), y las próximas facturas quedarían con el nuevo dato mientras las viejas conservan el anterior — comportamiento esperado y deseado (es la exactitud histórica que motiva el snapshot), pero puede sorprender a un admin que espere ver el dato "corregido" retroactivamente en facturas ya timbradas. → Mitigación: ninguna acción de código; se documenta explícitamente en la spec ("Issuer fiscal data changes later, existing invoices unaffected") para que sea comportamiento contractual, no un bug.
- **[Riesgo]** Doble resolución del emisor en el flujo de preview: una vez en el cliente (para el modal HTML, vía el nuevo endpoint) y otra vez en el servidor (para el PDF real, vía `getEmitterFiscalSettings()` directo) — hay una ventana muy corta donde ambas lecturas podrían no coincidir si un admin edita `EmitterFiscalSettings` entre la apertura del modal y el clic en "Descargar PDF". → Mitigación: aceptable, es un borrador ("BORRADOR — no válido fiscalmente") sin efecto fiscal real; el PDF final del timbrado de verdad usa el snapshot ya persistido en `Invoice`, no esta ruta de preview.
- **[Trade-off]** Se agrega un endpoint HTTP nuevo en vez de exponer `EmitterFiscalSettings` completo vía el ya existente `GET /billing/csd` con un permiso más laxo — más superficie de API, pero separa claramente "gestionar CSD" (sensible, admin) de "leer identidad fiscal para mostrarla" (no sensible, cualquiera con `billing:write`).

## Ronda 2 — ajustes post-verify (decisiones adicionales)

Contexto adicional confirmado con el usuario (2 rondas de `AskUserQuestion`): la Decisión #2 de la ronda 1 ("no llamar a Facturama desde el endpoint ligero") queda **parcialmente revertida** — el usuario pidió explícitamente que el emisor se resuelva primero desde el CSD en vivo, aceptando el trade-off de latencia/dependencia de red. Se documenta abajo como decisión nueva, y se marca la Decisión #2 original como superada en ese punto específico (el endpoint sigue existiendo y sigue gateado por `billing:write`, sólo cambia qué hace internamente).

### 6. Cascada de resolución del emisor: CSD en vivo → `EmitterFiscalSettings` → datos de prueba
Tanto `GetEmitterFiscalSettingsUseCase` (endpoint ligero de preview) como `StampInvoiceUseCase` (snapshot al timbrar) resuelven el emisor en este orden, sin excepción:
1. `FacturamaGateway.getCsdStatus()` — si responde con `rfc`/`issuer` (nombre) del certificado cargado en la cuenta, se usa eso. `fiscalRegime`/`zipCode`/`address` NO vienen de esta llamada (Facturama no los expone en el status del CSD) — para esos 3 campos se sigue al paso 2 aunque el paso 1 haya respondido.
2. Si el paso 1 falla (sin CSD cargado, error de red, timeout) o deja campos sin resolver, se completa con `EmitterFiscalSettings` (local, incluye `address` nuevo).
3. Si ni 1 ni 2 tienen un campo, se usa un valor de prueba fijo (mismo diccionario que `FALLBACK_INVOICE_DATA` ya usa en `FakeFacturamaGateway`, extendido con una `address` de prueba) — nunca se persiste/muestra `null` para el emisor a partir de esta ronda.

Alternativa descartada (era la recomendada en la ronda 1): `EmitterFiscalSettings` primero, CSD en vivo solo si falta esa fila — más rápida y sin dependencia de red en el camino feliz, pero el usuario prefirió priorizar el dato del certificado real sobre el capturado manualmente, aceptando el costo.

Implementación: se extrae la lógica de cascada a una función pura reusable, ej. `resolveIssuerFiscalData(gateway, emitterSettings, testFallback)` en `src/modules/billing/application/services/` (o similar), consumida por ambos puntos de uso — evita duplicar la lógica de 3 niveles en 2 lugares.

### 7. `issuerAddress`: mismo patrón de snapshot que los otros 4 campos, `address` nuevo en `EmitterFiscalSettings`
Migración aditiva más: `EmitterFiscalSettings.address` (nullable, texto libre) y `Invoice.issuerAddress` (nullable, snapshot). Capturado en `CsdManagerPage` junto a los otros 3 campos opcionales, con la misma semántica de "partial upsert" (campo vacío al editar no borra el valor guardado). El receptor NO gana un campo de dirección — fuera de alcance (los clientes ya tienen su propio modelo de direcciones, sin relación con este change).

### 8. Catálogo compartido puro para forma/método de pago (sin tabla SAT propia en este proyecto)
`paymentForm`/`paymentMethod` no tienen tabla `Sat*` en este proyecto (a diferencia de régimen fiscal y uso CFDI) — hoy son arrays hardcoded pequeños, duplicados con leve inconsistencia entre `StampSaleForm.tsx` y `PartialInvoiceForm.tsx`. Se consolidan en `src/shared/domain/catalogs/satPaymentCatalogs.ts` (puro, sin I/O, mismo patrón de `InvoiceTotalsCalculator`/`ReturnTotalsCalculator`: reusable tanto por `app/` en cliente como por `src/modules/billing/infrastructure/pdf/InvoiceDocumentPdf.tsx` en servidor). Los dos formularios existentes se actualizan para importar de ahí en vez de mantener su copia local (limpieza menor, mecánica, bajo riesgo).

### 9. Descripciones de régimen fiscal / uso CFDI: reutilizar catálogos `sat-codes` ya existentes, no duplicar datos
`SatTaxRegime` y `SatCfdiUse` (tablas ya pobladas, expuestas hoy sólo como búsqueda con mínimo 2 caracteres vía `SearchSatTaxRegimesUseCase`/`SearchSatCfdiUsesUseCase`) se reutilizan para resolver código→descripción:
- **Server-side** (detalle de factura vía `toInvoiceDto`, render de `InvoiceDocumentPdf`, endpoint de preview PDF): se inyectan los repos `SatTaxRegimeRepository`/`SatCfdiUseRepository` ya existentes en el DI de `billing` y se llama `.search(code, 1)` — dado que los códigos son de longitud fija (3 para régimen, 4 para uso CFDI) y `search` usa `contains` sobre ese campo, pasar el código exacto como query produce efectivamente una búsqueda exacta (ningún otro código de la misma longitud puede "contener" el código buscado salvo que sea igual). No se agrega un método `findByCode` nuevo — se reutiliza `search` tal cual para evitar tocar los puertos de un módulo ajeno más de lo necesario.
- **Client-side** (`InvoicePreviewModal`, antes de timbrar, sin invoice persistida): se reutilizan los endpoints YA EXPUESTOS `GET /api/v1/admin/sat-codes/regimen-fiscal?search=<code>` y `.../uso-cfdi?search=<code>` (sin gating de permiso adicional, ya públicos para cualquier autenticado) — mismo truco de query=código exacto. No se crea ningún endpoint nuevo para esto.
- Si el código no existe en el catálogo (dato legado, typo, o un código SAT real pero no seedeado en la tabla local), se muestra el código crudo sin descripción — nunca se bloquea el render ni se lanza error por esto.

### 10. Header de PDF y modal: "Factura" en vez del nombre de la empresa
`InvoiceDocumentPdf.tsx` (header actual: logo + `issuerBlock` con `issuer.name`) e `InvoicePreviewModal.tsx` (header actual: logo + `<h2>{issuer.name}</h2>`) cambian el texto de título fijo a "Factura" — el nombre/razón social de la empresa se sigue mostrando, pero sólo dentro de la sección "Datos del emisor" (ya implementada en ronda 1, campo "Razón social"), no duplicado como título grande junto al logo. `branchName` dejar de mostrarse en el header también se evalúa aquí: se mantiene como subtítulo bajo "Factura" (dato de sucursal, sigue sin venir de `EmitterFiscalSettings`).

## Risks / Trade-offs (ronda 2, adicionales a los ya documentados arriba)

- **[Riesgo]** La cascada ahora llama a Facturama (`getCsdStatus()`) en cada apertura de preview y en cada timbrado, incluso para operadores sin `billing:manage_csd` — introduce latencia de red y un punto de falla externo en un flujo que antes era 100% local. → Mitigación: la llamada tiene timeout/catch ya existente en el gateway; si falla, la cascada sigue a `EmitterFiscalSettings` sin bloquear. Aceptado explícitamente por el usuario tras advertencia.
- **[Riesgo]** `getCsdStatus()` no expone `fiscalRegime`/`zipCode`/`address` — sólo `rfc`/`issuer` (nombre). Esto significa que, aun con CSD cargado, la mayoría de los campos del emisor seguirán viniendo de `EmitterFiscalSettings` en la práctica — la cascada de 3 niveles solo cambia el resultado real para `rfc`/nombre cuando CSD y `EmitterFiscalSettings` no coinciden. → Sin mitigación necesaria, es el comportamiento esperado y documentado en la Decisión #6.
- **[Trade-off]** Se introduce una dependencia nueva de `sat-codes` dentro de `billing` — es el primer import backend cross-módulo de `sat-codes` desde otro módulo (verificado: `customers`/`providers` sólo consumen el catálogo desde el frontend, vía el endpoint HTTP de búsqueda, no importan sus repos/ports en su capa de aplicación). Se acepta como acoplamiento de sólo-lectura hacia un módulo de catálogo puro, sin ciclo (billing → sat-codes, nunca al revés).

## Migration Plan

1. Migración Prisma aditiva (`npx prisma migrate dev --name add_invoice_issuer_snapshot`) — 4 columnas nullable, sin downtime, sin backfill.
2. Deploy de backend (dominio, DTO, mapper, repositorio, use case, nuevo endpoint) — invocable de inmediato tras la migración; facturas nuevas empiezan a snapshotear el emisor, facturas viejas siguen leyendo `null` sin romper nada (columnas nullable, DTOs con `| null`).
3. Deploy de frontend (UI de detalle, PDF, preview) — puede desplegarse en el mismo release o uno posterior; al ser campos adicionales opcionales en los tipos, no rompe si el backend aún no los expone (aunque se recomienda desplegar junto, no hay dependencia estricta de orden salvo que el backend debe ir primero para que el frontend tenga datos que mostrar).
4. Rollback: si algo falla, revertir el deploy de frontend/backend por separado es seguro (columnas nullable no bloquean rollback de schema; un `prisma migrate reset`/`down` no es necesario salvo que se quiera eliminar las columnas, lo cual tampoco rompe nada porque son aditivas).

## Ronda 3 — pivote: eliminar el fallback fijo, sumar TicketSettings como fuente real

Reporte en producción-menos-un-día: "Datos del emisor" mostraba el fallback fijo inventado (Decisión de ronda 2, tier 3: `TEST_FALLBACK_ISSUER`, ej. "Agrisas"/"AGR010101AB1"/dirección de prueba) en vez de datos reales, en un entorno donde nunca se cargó CSD ni se llenó `EmitterFiscalSettings`, pero SÍ había datos reales de la empresa ya capturados en `Configuración > Ticket de venta` (`ticket_settings.business_name`/`business_rfc`/`business_address`/`business_tax_regime`). El usuario ordenó explícitamente: sólo 2 fuentes reales — CSD (incluida su captura local `EmitterFiscalSettings`) y `ticket_settings` — **nunca inventar datos ni código duro**.

Cambio de decisión respecto a ronda 2: el tier 3 (`TEST_FALLBACK_ISSUER`) se **elimina** del código de producción; en su lugar se inserta un tier 3 real (`TicketSettings`) antes de caer a `null`. `IssuerFiscalData` pasa de "todos los campos garantizados no-vacíos" a `string | null` por campo. Ver tarea 23 en `tasks.md` para el detalle de implementación; specs `billing-api`/`billing-ui` actualizadas para reflejar el comportamiento nuevo (ya no describen un fallback fijo).

Efecto colateral encontrado en el camino: `useInvoicePreview.ts` (frontend) tenía `issuer.name` (razón social) hardcodeado al literal `"Agrisas"` desde ronda 1, nunca corregido a leer `emitterFiscal.legalName` — nadie lo notó porque el fallback fijo de ronda 2 coincidía por casualidad con el literal. Corregido en la misma pasada (tarea 23.4).
