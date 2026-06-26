## Why

El change `sigi-back-folios` introdujo `Folio.scope` y el error de dominio `FolioScopeMismatch` (HTTP 400) en backend, pero los servicios y componentes frontend nunca se actualizaron para parsearlo: los 4 flujos afectados (crear venta, crear cotización, convertir cotización, registrar abono) muestran mensajes genéricos o silenciosos cuando el backend devuelve `{"error":"FolioScopeMismatch",...}`. Adicionalmente, la tabla de folios muestra valores raw del enum en inglés ("POS", "INVENTORY", "OPERATIONS") mientras el modal ya usa etiquetas legibles en español.

## What Changes

- **`FolioScopeMismatchError`** — nueva clase de error frontend en los 3 módulos afectados (`pos`, `quotes`, `payments`), con propiedades `expected` y `actual` (no importa nada de `src/`).
- **Servicios frontend** — 4 servicios detectan `err.error === "FolioScopeMismatch"` en la respuesta HTTP 400 y lanzan `FolioScopeMismatchError(expected, actual)` en lugar de `NetworkError` o un genérico.
- **Componentes UI** — `ConvertQuoteModal` y `RegisterPaymentModal` agregan rama en su catch chain para `FolioScopeMismatchError` con mensaje inline claro. `PosPage` ya muestra `submitError.message` en un toast, que queda correcto automáticamente con el mensaje del error tipado.
- **`FoliosTable` scope badge** — muestra etiqueta legible en español en lugar del valor raw del enum. Se extrae constante `SCOPE_LABEL` compartida entre `FolioEditModal` y `FoliosTable` dentro del módulo `_logic/` de folios.

## Capabilities

### New Capabilities

*(ninguna)*

### Modified Capabilities

- `payments-ui`: manejo de `FolioScopeMismatch` en `RegisterPaymentModal`; `registerPayment` service parsea el error del backend.
- `quotes-ui`: manejo de `FolioScopeMismatch` en `ConvertQuoteModal`; servicios `createQuote` y `convertQuote` parsean el error.
- `catalogs-ui`: badge de scope en `FoliosTable` muestra etiqueta legible; constante `SCOPE_LABEL` extraída como utilidad compartida del módulo.

## Impact

- `app/(private)/pos/_logic/errors.ts` — nueva clase.
- `app/(private)/pos/_logic/services/createSale.ts` — parsear `FolioScopeMismatch`.
- `app/(private)/quotes/_logic/errors.ts` — nueva clase.
- `app/(private)/quotes/_logic/services/createQuote.ts` — parsear `FolioScopeMismatch`.
- `app/(private)/quotes/_logic/services/convertQuote.ts` — parsear `FolioScopeMismatch`.
- `app/(private)/quotes/_blocks/ConvertQuoteModal.tsx` — catch chain.
- `app/(private)/payments/_logic/errors.ts` — nueva clase.
- `app/(private)/payments/_logic/services/registerPayment.ts` — parsear `FolioScopeMismatch`.
- `app/(private)/payments/_blocks/RegisterPaymentModal.tsx` — catch chain.
- `app/(private)/catalogs/folios/_logic/scopeLabels.ts` — **nuevo** archivo con `SCOPE_LABEL`.
- `app/(private)/catalogs/folios/_blocks/FoliosTable.tsx` — usar `SCOPE_LABEL`.
- `app/(private)/catalogs/folios/_blocks/FolioEditModal.tsx` — reusar `SCOPE_LABEL` en lugar de duplicar etiquetas.
- Sin cambios de backend ni de schema Prisma.
