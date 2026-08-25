## Context

`useSaleSubmission.ts`/`useQuoteSubmission.ts` deciden encolar offline de forma puramente local: si `!isOnline()` o el `createSale`/`createQuote` lanza `NetworkError`, llaman `enqueueSale`/`enqueueQuote` con `ownerBranchId: draft.branchId` — la sucursal seleccionada en el formulario del POS/Cotizaciones, sin consultar el contexto `useOfflineSync()` (que expone `offlineEnabled`, `ownerBranchId`, `fixWorkingBranch`, montado en `app/(private)/layout.tsx` vía `OfflineSyncProvider`, así que está disponible en cualquier hook/componente bajo `(private)/`). `PosHeader.tsx` ya tiene el flujo "Fijar sucursal offline" (`handleFixWorkingBranch`) implementado y funcional a nivel de bloqueo (`fixWorkingBranch` en `branchScope.ts` lanza si hay outbox pendiente de la sucursal anterior), pero el `await fixWorkingBranch(...)` no está envuelto en `try/catch` — el error queda como unhandled rejection. Ver `proposal.md` - Why para el detalle de cómo se encontró esto (verificación manual Playwright contra `offline-sync`).

No hay componente de toast/snackbar global en el repo (`grep -rln "toast|Toast"` no encuentra ninguno bajo `app/_components`); el patrón existente para errores es mensaje inline junto al control relevante (ej. errores 409 en modales de catálogo).

## Goals / Non-Goals

**Goals:**
- Cerrar el gap de Historia 1: nunca encolar una venta/cotización offline cuando `offlineEnabled` es `false`, ni cuando la sucursal seleccionada en el formulario diverge de la sucursal de trabajo fijada.
- Hacer visible al usuario el error de `fixWorkingBranch` (Historia 2).
- Mantener el comportamiento actual sin cambios para el caso mayoritario (cajero regular, `branchId` de sesión) — el fix sólo afecta el camino de usuarios `branches:access_all`.

**Non-Goals:**
- No se toca el motor de sincronización (`syncEngine.ts`), IndexedDB (`db.ts`), ni el service worker — esos ya funcionan correctamente (verificado manualmente).
- No se introduce un sistema de toast/notificaciones global — se reutiliza el patrón de mensaje inline ya presente en el repo.
- No se cambia ningún endpoint ni contrato HTTP; el fix es 100% cliente-side.

## Decisions

**1. `useSaleSubmission`/`useQuoteSubmission` consumen `useOfflineSync()` directamente, en vez de recibir `offlineEnabled`/`ownerBranchId` como parámetros del caller.**
Ambos hooks ya se usan exclusivamente bajo `(private)/`, donde `OfflineSyncProvider` siempre está montado — no hace falta cambiar la firma de `submit()` ni tocar los callers (`PosPage.tsx`, `QuoteCreatePage.tsx`) para pasar estos datos. Alternativa descartada: pasar `offlineEnabled`/`ownerBranchId` como argumentos de `submit(draft)` — más invasivo (cambia la firma pública del hook y todos sus callers) sin beneficio real, ya que el contexto ya es accesible vía hook de React estándar.

**2. Condición de bloqueo: `offlineEnabled && ownerBranchId === draft.branchId` (no sólo `offlineEnabled`).**
Cubre el edge case de Historia 1 (bypass con sucursal fijada A, pero formulario mostrando sucursal B): si sólo se chequeara `offlineEnabled` sin comparar contra `draft.branchId`, un bypass con cualquier sucursal fijada podría vender offline "para" una sucursal distinta de la fijada, reintroduciendo el mismo problema de scope divergente que motivó este fix. Para cajeros regulares esta comparación es trivialmente cierta siempre (su `branchId` de sesión es tanto `ownerBranchId` como el único valor posible de `draft.branchId`), así que no cambia su comportamiento.

**3. `enqueueOffline()` usa `ownerBranchId` del contexto como clave de scope del registro (no `draft.branchId`), pero el `payload.branchId` enviado al sincronizar sigue siendo `draft.branchId`.**
Por la Decisión 2, en cualquier punto donde `enqueueOffline()` efectivamente se ejecuta, `ownerBranchId === draft.branchId` ya está garantizado — son el mismo valor. Se usa explícitamente `ownerBranchId` del contexto (no `draft.branchId`) como fuente de verdad del campo de scope por defensa en profundidad y claridad de intención (el índice de IndexedDB que lee `SyncQueuePanel`/`countPending` es `ownerBranchId`, así que debe ser inequívocamente la misma fuente que ese código usa para consultar). El `payload.branchId` (lo que ve el servidor al sincronizar) no cambia — sigue siendo el `branchId` real de la venta.

**4. Nuevo estado de resultado en el hook (`"offline-disabled"`) en vez de reusar `"failed"`.**
`"failed"` ya se usa para errores de negocio del `createSale`/`createQuote` (4xx/5xx online) y su UI muestra el error tal cual venga del backend. El caso "no puedes vender offline sin fijar sucursal" es un estado distinto y predecible (no un error de servidor) — necesita su propio mensaje fijo y su propia UI (probablemente deshabilitar el botón proactivamente en vez de dejar que el usuario intente y falle). Se agrega `"offline-disabled"` a `SubmitStatus`, con un mensaje de error fijo en `error`.

**5. Defensa en dos capas: disable proactivo en la UI + guard dentro del hook.**
`PosHeader`/`PosPage`/`QuoteCreatePage` ya tienen acceso a `useOfflineSync()` (`isOnline`, `offlineEnabled`) — pueden deshabilitar "Finalizar venta"/"Crear cotización" proactivamente cuando `!isOnline && !offlineEnabled` (evita el intento inútil). Pero el guard dentro de `enqueueOffline()` (Decisión 2) se mantiene igual como defensa en profundidad: si la conexión cae exactamente en el instante del submit (antes de que el disable-proactivo pueda reaccionar), el hook igual rechaza el encolado en vez de dejarlo pasar bajo un scope divergente.

**6. Error de `fixWorkingBranch` se muestra con estado local de componente (`useState<string | null>`) en `PosHeader`, no con un sistema de toast nuevo.**
Consistente con el Non-Goal de no introducir infraestructura de notificaciones nueva. El mensaje ya viene descriptivo desde `branchScope.ts`; sólo falta capturarlo (`try/catch` alrededor de `fixWorkingBranch`) y renderizarlo inline junto al botón/selector de sucursal, limpiándolo en el siguiente intento (exitoso o no).

## Risks / Trade-offs

- **[Riesgo] Un usuario bypass legítimamente quiere vender "para" otra sucursal offline sin re-fijar cada vez.** → Mitigación: no es un caso soportado hoy ni antes de este fix (Historia 6 de `offline-sync` ya definía que el offline es de una sola sucursal por sesión); este fix sólo cierra un bypass no intencional de esa regla, no reduce funcionalidad legítima existente.
- **[Riesgo] Mensaje "offline-disabled" no debe confundirse con un error de red real.** → Mitigación: texto explícito y accionable ("fija tu sucursal de trabajo antes de vender/cotizar offline"), distinto de los mensajes de `NetworkError`/fallos 4xx-5xx ya existentes.
- **[Trade-off] El disable proactivo del botón depende de `isOnline` del contexto, que puede tener una latencia pequeña de detección (poll 30s + evento `online`/`offline` + señal oportunista de `authFetch`, per `offline-sync`/design.md).** → Aceptado: el guard dentro del hook (Decisión 5) cubre la ventana de esa latencia; el disable proactivo es sólo optimización de UX, no la única línea de defensa.

## Migration Plan

Cambio puramente aditivo/correctivo en cliente, sin migración de datos ni de API. Deploy estándar (build + release); no requiere pasos de rollback especiales — revertir el commit basta si aparece una regresión, ya que no hay cambios de esquema ni de contrato HTTP involucrados.
