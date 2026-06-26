## 1. Error class — módulo POS

- [x] 1.1 Agregar `FolioScopeMismatchError` a `app/(private)/pos/_logic/errors.ts` con `constructor(public expected: string, public actual: string)` y mensaje en español: `"El folio seleccionado es de tipo ${actual}, pero este flujo requiere uno de tipo ${expected}."`

## 2. Error class — módulo Quotes

- [x] 2.1 Agregar `FolioScopeMismatchError` a `app/(private)/quotes/_logic/errors.ts` con la misma signatura y mensaje que en POS (clase independiente, no importar desde pos)

## 3. Error class — módulo Payments

- [x] 3.1 Agregar `FolioScopeMismatchError` a `app/(private)/payments/_logic/errors.ts` con la misma signatura y mensaje

## 4. Servicio `createSale` (POS)

- [x] 4.1 En `app/(private)/pos/_logic/services/createSale.ts`: importar `FolioScopeMismatchError` desde `../errors`
- [x] 4.2 En el bloque `if (res.status === 400)`, antes del `mapErrorMessage`, verificar `if (errBody.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(errBody.expected as string, errBody.actual as string)` (el body ya se parsea como `{ error?: string; expected?: string; actual?: string }`)

## 5. Servicio `createQuote` (Quotes)

- [x] 5.1 En `app/(private)/quotes/_logic/services/createQuote.ts`: importar `FolioScopeMismatchError` desde `../errors`
- [x] 5.2 En el bloque `if (res.status === 400)`, agregar como primera verificación: `if (err.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(err.expected as string, err.actual as string)`

## 6. Servicio `convertQuote` (Quotes)

- [x] 6.1 En `app/(private)/quotes/_logic/services/convertQuote.ts`: importar `FolioScopeMismatchError` desde `../errors`
- [x] 6.2 En el bloque `if (res.status === 400)`, agregar como primera verificación: `if (err.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(err.expected as string, err.actual as string)`

## 7. Servicio `registerPayment` (Payments)

- [x] 7.1 En `app/(private)/payments/_logic/services/registerPayment.ts`: importar `FolioScopeMismatchError` desde `../errors`
- [x] 7.2 En el bloque `if (res.status === 400)`, antes del `throw new Error(data.message ?? ...)`, verificar `if (data.error === "FolioScopeMismatch") throw new FolioScopeMismatchError(data.expected as string, data.actual as string)`. Actualizar el tipo del body parseado para incluir `expected?: string; actual?: string`

## 8. Componente `ConvertQuoteModal`

- [x] 8.1 En `app/(private)/quotes/_blocks/ConvertQuoteModal.tsx`: importar `FolioScopeMismatchError` desde `../_logic/errors`
- [x] 8.2 Agregar rama en el catch de `handleSubmit`: `else if (err instanceof FolioScopeMismatchError) { setInlineError(err.message); }` (antes del catch-all)

## 9. Componente `RegisterPaymentModal`

- [x] 9.1 En `app/(private)/payments/_blocks/RegisterPaymentModal.tsx`: importar `FolioScopeMismatchError` desde `../_logic/errors`
- [x] 9.2 Agregar rama en el catch de `handleSubmit`: `else if (err instanceof FolioScopeMismatchError) { setFormError(err.message); }` (antes del catch-all `else if (err instanceof Error)`)

## 10. Helper de etiquetas `scopeLabels.ts`

- [x] 10.1 Crear `app/(private)/catalogs/folios/_logic/scopeLabels.ts` con:
  ```ts
  import type { FolioScope } from "./types/domain";
  export const SCOPE_LABEL: Record<FolioScope, string> = {
    POS: "Punto de Venta",
    INVENTORY: "Inventario",
    OPERATIONS: "Operaciones",
  };
  ```
- [x] 10.2 En `FoliosTable.tsx`: importar `SCOPE_LABEL` y reemplazar `{item.scope}` por `{SCOPE_LABEL[item.scope] ?? item.scope}`
- [x] 10.3 En `FolioEditModal.tsx`: importar `SCOPE_LABEL` y reemplazar el array `SCOPE_OPTIONS` hardcoded por uno derivado de `SCOPE_LABEL`:
  ```ts
  import { SCOPE_LABEL } from "../_logic/scopeLabels";
  const SCOPE_OPTIONS = (Object.entries(SCOPE_LABEL) as [FolioScope, string][]).map(
    ([value, label]) => ({ value, label })
  );
  ```

## 11. Verificación

- [x] 11.1 `npm run build` pasa sin errores de TypeScript en `app/` y `src/` (errores pre-existentes en tests no relacionados)
- [x] 11.2 Verificar cadena POS: `createSale` detecta `err.error==="FolioScopeMismatch"` → lanza `FolioScopeMismatchError(expected,actual)` → `PosPage` renderiza `submitError.message` ("El folio seleccionado es de tipo OPERATIONS, pero este flujo requiere uno de tipo POS."). Trazado confirmado por grep + test suite (71 tests ✓).
- [x] 11.3 Verificar cadena `ConvertQuoteModal`: `convertQuote` lanza `FolioScopeMismatchError` → catch `instanceof FolioScopeMismatchError → setInlineError(err.message)`. Trazado confirmado; modal no se cierra.
- [x] 11.4 Verificar cadena `RegisterPaymentModal`: `registerPayment` lanza `FolioScopeMismatchError` → catch `instanceof FolioScopeMismatchError → setFormError(err.message)`. Trazado confirmado.
- [x] 11.5 Verificar `FoliosTable` badges: BD tiene INVENTORY→"Inventario", OPERATIONS→"Operaciones", POS→"Punto de Venta". `SCOPE_LABEL` coincide exactamente; `FoliosTable` usa `SCOPE_LABEL[item.scope] ?? item.scope`. Confirmado vía Supabase MCP + grep.
