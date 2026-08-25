## 1. Hook `useSaleSubmission` (venta)

- [x] 1.1 `app/(private)/pos/_logic/hooks/useSaleSubmission.ts`: importar y llamar `useOfflineSync()` (ya disponible vía `OfflineSyncProvider` montado en `app/(private)/layout.tsx`) para leer `offlineEnabled` y `ownerBranchId`.
- [x] 1.2 Agregar `"offline-disabled"` a `SubmitStatus`.
- [x] 1.3 En `enqueueOffline()`: si `!offlineEnabled || ownerBranchId !== draft.branchId`, NO llamar `enqueueSale` — en su lugar `setError(new Error("Fija tu sucursal de trabajo antes de vender offline."))` y `setStatus("offline-disabled")`.
- [x] 1.4 Cuando sí se encola (`offlineEnabled && ownerBranchId === draft.branchId`), pasar `ownerBranchId` (del contexto) como `ownerBranchId` a `enqueueSale(...)`, no `draft.branchId` (ver design.md - Decisión 3; en este punto ambos valores son iguales, se usa `ownerBranchId` del contexto por claridad/defensa en profundidad).

## 2. Hook `useQuoteSubmission` (cotización)

- [x] 2.1 `app/(private)/quotes/_logic/hooks/useQuoteSubmission.ts`: mismo patrón que 1.1–1.4 — `useOfflineSync()`, nuevo estado `"offline-disabled"`, guard `!offlineEnabled || ownerBranchId !== draft.branchId` antes de `enqueueQuote`, usar `ownerBranchId` del contexto como clave de scope.

## 3. Disable proactivo del submit en POS (venta y cotización-en-POS)

- [x] 3.1 `app/(private)/pos/_logic/lib/canSubmitCart.ts`: agregar parámetros `isOnline: boolean`, `offlineEnabled: boolean`, `ownerBranchId: string | null` a `CanSubmitCartArgs`; la función retorna `false` si `!isOnline && (!offlineEnabled || ownerBranchId !== selectedBranchId)`.
- [x] 3.2 `app/(private)/pos/_blocks/PosPage.tsx`: leer `useOfflineSync()` (`isOnline`, `offlineEnabled`, `ownerBranchId`) y pasarlos a la llamada existente de `canSubmitCart(...)` (línea ~101).
- [x] 3.3 `PosPage.tsx`: `status === "offline-disabled"` ya queda cubierto sin código adicional — ningún `useEffect` de modal reacciona a ese status (sólo a `"succeeded"`/`"queued-offline"`), y `submitError` (línea ~286/426) ya renderiza cualquier `error` no nulo genéricamente, incluido el nuevo mensaje.
- [x] 3.4 **Hallazgo durante `npm test`**: `CartPanel.tsx` (no `PosPage.tsx`) es quien realmente calcula el `disabled` del botón "Finalizar venta"/"Crear cotización" — tiene su propia llamada a `canSubmitCart` (línea ~84), independiente de la de `PosPage.tsx` (que sólo alimenta el atajo de teclado Ctrl+Enter vía `usePosKeyboard`). Sin este ajuste, `isOnline`/`offlineEnabled`/`ownerBranchId` llegaban `undefined` a `CartPanel` y el botón quedaba deshabilitado siempre, incluso online — regresión detectada por `CartPanel.test.tsx` existente. Corregido: `CartPanelProps` extendida con los 3 campos, pasados desde `PosPage.tsx` al `<CartPanel .../>`.

## 4. Disable proactivo del submit en Cotizaciones (`/quotes/new`)

- [x] 4.1 `app/(private)/quotes/_blocks/QuoteEmitPanel.tsx`: prop `offlineBlocked?: boolean` (default `false`, para no afectar `mode="edit"` que no la pasa); extendida la condición `canSubmit` con `&& !offlineBlocked`. Componente sigue presentational — no lee `useOfflineSync()`.
- [x] 4.2 `app/(private)/quotes/_blocks/QuoteCreatePage.tsx`: lee `useOfflineSync()`, calcula `offlineBlocked`, lo pasa a `QuoteEmitPanel`. **Hallazgo durante implementación**: a diferencia de `PosPage.tsx`, el banner de error aquí estaba gateado a `status === "failed"` (línea 227) — no se habría mostrado nunca para `"offline-disabled"`. Corregido: `status === "failed" || status === "offline-disabled"`.

## 5. Feedback visible del error de `fixWorkingBranch`

- [x] 5.1 `app/(private)/pos/_blocks/PosHeader.tsx`: agregado `const [fixBranchError, setFixBranchError] = useState<string | null>(null)`.
- [x] 5.2 `handleFixWorkingBranch`: `try/catch` alrededor de `fixWorkingBranch(selectedBranchId)` — éxito limpia el error, `catch` lo guarda.
- [x] 5.3 Renderizado inline (`text-error`, `role="alert"`) junto al botón "Fijar sucursal offline"; se limpia solo en el próximo intento exitoso.

## 6. Tests

- [x] 6.1 `useSaleSubmission.test.ts`: 4 casos — bloqueo por `offlineEnabled=false`, bloqueo por `ownerBranchId!==draft.branchId`, encolado normal usando `ownerBranchId` del contexto, y mismo gating cuando el bloqueo viene de un `NetworkError` en `createSale` (no sólo de `!isOnline()` previo).
- [x] 6.2 `useQuoteSubmission.test.ts`: mismos 4 casos que 6.1, adaptados a cotizaciones.
- [x] 6.3 `canSubmitCart.test.ts`: 4 casos — online sin verse afectado por offline, bloqueo sin `offlineEnabled`, bloqueo con `ownerBranchId` distinto, permitido sin regresión cuando coincide.
- [x] 6.4 `PosHeader.test.tsx`: 2 casos nuevos — mensaje de error visible tras rechazo de `fixWorkingBranch`, mensaje limpiado tras intento exitoso posterior. Mock de `useOfflineSync` convertido a objeto mutable para soportar ambos escenarios sin duplicar el mock module-level.
- [x] 6.5 `QuoteEmitPanel.test.tsx` (nuevo, 2 casos): botón habilitado sin `offlineBlocked`, deshabilitado con `offlineBlocked=true`. `QuoteCreatePage.test.tsx` (extendido, 2 casos): `offlineBlocked` fluye correctamente a `QuoteEmitPanel` según `isOnline`/`offlineEnabled`. **Requirió agregar el mock de `useOfflineSync` que faltaba en `QuoteCreatePage.test.tsx`** (el test existente no lo tenía porque `QuoteCreatePage` no consumía ese contexto antes de este cambio — sin el mock, el test hubiera roto). `CartPanel.test.tsx` (extendido, 2 casos nuevos + `baseProps` actualizado con los 3 campos nuevos, requeridos ahora por `CartPanelProps`): deshabilitado offline sin `offlineEnabled`, habilitado offline con `ownerBranchId` coincidente. **Regresión real detectada por el test suite existente** de `CartPanel.test.tsx` (ver 3.4) — sin actualizar `baseProps`, los tests preexistentes de "botón habilitado" fallaban porque `isOnline`/`offlineEnabled`/`ownerBranchId` llegaban `undefined`.

## 7. Verificación final

- [x] 7.1 Suites `pos`/`quotes`/`sales` (unit UI): 43/43 suites, 347/347 tests en verde. Cero regresión sobre lo existente.
- [x] 7.2 `npx tsc --noEmit`: sólo quedan 8 errores pre-existentes no relacionados con este cambio (confirmado con `git status` — ninguno de esos archivos fue tocado; `UseBranchesOptionsResult.refresh` faltante en tests de reports, `ProductDto.unit` en purchases, etc.). **Hallazgo adicional durante esta verificación**: `app/(private)/sales/_blocks/EditSalePage.tsx` (reusa `CartPanel` para editar ventas completadas, sólo HQ) también necesitó `isOnline`/`offlineEnabled`/`ownerBranchId` — agregado vía `useOfflineSync()`, con su test (`EditSalePage.padding.test.tsx`) actualizado con el mock correspondiente.
- [x] 7.3 Repetido manualmente (Playwright) contra `npm run dev`: (a) admin bypass con `meta.ownerBranchId` reseteado a `null` (nunca fijó sucursal), carrito armado, offline real (`setOffline(true)`) → **"Finalizar venta" queda deshabilitado** (antes de este cambio quedaba habilitado y encolaba bajo scope divergente). (b) Sucursal Matriz fijada, ítem `failed` inyectado en su outbox, intento de cambiar a una segunda sucursal (creada ad-hoc vía API para la prueba) → **mensaje "No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar." visible en el DOM**, cambio bloqueado. **Nota de la sesión de prueba**: un Service Worker + caches (`agrisas-shell-v1`/`agrisas-static-v1`) de una prueba PWA anterior en el mismo perfil de browser sirvió bundle stale y produjo un falso negativo en el primer intento — se detectó por ausencia de nuevas líneas "Compiling" en el log del dev server pese a los cambios de código, se resolvió desregistrando el SW y limpiando caches. No relacionado con la lógica de este cambio.
