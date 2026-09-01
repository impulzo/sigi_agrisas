## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Desarrollador del equipo agrisas_panel | Como desarrollador, quiero un hook compartido `useBypassBranchOptions` en `app/_hooks/` para eliminar la lógica duplicada de "cargar sucursales para admin bypass / usar sucursal propia" repetida en `PosPage.tsx`, `QuoteCreatePage.tsx` y `NewInvoicePage.tsx` | Reducir a un solo punto de cambio la lógica de resolución de sucursal-por-permiso, evitando que un fix o cambio de comportamiento futuro se aplique en 3 sitios de forma inconsistente | - Nuevo hook en `app/_hooks/useBypassBranchOptions.ts`, mismo patrón que `useBranchesOptions.ts` vecino (`"use client"`, sin importar de `app/(private)/(public)`)<br>- Los 3 call sites (`PosPage.tsx`, `QuoteCreatePage.tsx`, `NewInvoicePage.tsx`) consumen el hook y eliminan su `useState`/`useEffect` local duplicado<br>- Caso sin bypass + `ownBranchId` presente: `branches` = `[{id: ownBranchId, code:"", name:"Mi sucursal", isHeadquarters:false}]` y auto-selección, igual que hoy<br>- Caso bypass: fetch de lista completa vía `GET /api/v1/admin/branches?pageSize=100&includeInactive=false`, sin auto-selección, igual que hoy<br>- Caso `isBypass === "loading"`: no dispara fetch, igual que el comportamiento implícito actual<br>- `npm test` (pos/quotes/billing UI) y `npm run build` pasan sin cambios de aserciones | - El hook es puramente cliente: no reemplaza ni debilita el enforcement de `branches:access_all` en backend — ese gate sigue viviendo en el servidor, el hook sólo decide qué pedir<br>- No debe hacer fetch de la lista completa de sucursales antes de que `isBypass` tenga un valor definitivo (`true`/`false`), para no filtrar de más mientras el permiso está `"loading"` |
| 2 | Desarrollador/arquitecto del módulo `billing` | Como desarrollador, quiero mover `resolveSatDescription.ts` de `infrastructure/services/` a `application/services/` dentro de `src/modules/billing/` y actualizar sus 5 imports, para eliminar la violación de capas donde `DownloadInvoiceFileUseCase.ts` (application) importa directo de `infrastructure` | Cumplir la regla arquitectónica obligatoria del proyecto ("el dominio/application no importa infraestructura, los use cases reciben ports") — el archivo ya es 100% puro (interfaz + función sin I/O), sólo está mal ubicado | - Archivo movido con contenido idéntico (interfaz `SatCodeSearchUseCase` + función `resolveSatDescription`)<br>- Imports actualizados sin cambio de lógica en: `DownloadInvoiceFileUseCase.ts`, `BillingController.ts`, `FakeFacturamaGateway.ts`, `resolveSatDescription.test.ts`, `FakeFacturamaGateway.test.ts`<br>- `grep -rn "infrastructure/services/resolveSatDescription"` no arroja resultados tras el cambio<br>- `npm test -- resolveSatDescription FakeFacturamaGateway` y `npm run build` pasan sin modificar aserciones existentes | - No se toca la lógica de resolución de catálogo SAT (`resolveSatDescription` sigue recibiendo el port `SatCodeSearchUseCase` inyectado, nunca instancia un adapter concreto) — se preserva el patrón puerto/adaptador, sin riesgo de exponer datos fiscales resueltos incorrectamente |

Nota: alcance acotado a estos 2 items por decisión explícita del usuario tras una exploración previa (Explore agent) sobre el área activa (billing/sales/pos/branches, últimos 5 commits de `feat/billing-partial-invoice-branch-selector`). Esa exploración no encontró archivos huérfanos, violaciones de design-system, ni otros issues SOLID — sólo estos dos hallazgos concretos.

## Why

El commit `cd17af0` ("add branch selector to Factura Parcial") replicó — de forma consciente, según su propio mensaje ("Replicates the branch selector pattern already proven in PosPage") — la lógica de "resolver sucursal según bypass admin" en un tercer sitio (`NewInvoicePage.tsx`), llevando a 3 copias casi idénticas de `useState`+`useEffect`+`authFetch` en `PosPage.tsx`, `QuoteCreatePage.tsx` y `NewInvoicePage.tsx`. Cualquier ajuste futuro a esa lógica (ej. cambiar el fallback "Mi sucursal", el endpoint, o el criterio de auto-selección) requeriría tocar los 3 sitios en sincronía, con alto riesgo de divergencia silenciosa. Ya existe un hook hermano (`app/_hooks/useBranchesOptions.ts`) para "traer sucursales", pero no cubre el patrón bypass/single-branch, así que ninguno de los 3 sitios lo reutiliza — sentando la base para consolidar en un hook nuevo.

Por separado, `src/modules/billing/application/use-cases/DownloadInvoiceFileUseCase.ts` importa `resolveSatDescription`/`SatCodeSearchUseCase` directo desde `infrastructure/services/`, violando la regla de capas del proyecto ("el dominio no importa nada de infraestructura... los use cases reciben ports, nunca implementaciones concretas"). El archivo en sí no tiene ningún acoplamiento a infraestructura real (sin Prisma, sin Next.js, sólo una interfaz + una función pura) — es un caso de mala ubicación, no de mal diseño, corregible con un simple `mv` + actualización de imports.

## What Changes

- Se crea `app/_hooks/useBypassBranchOptions.ts`: hook que encapsula la resolución de `branches`/`selectedBranchId`/`setSelectedBranchId` según `isBypass` (permiso `branches:access_all`) y `ownBranchId`, reemplazando la lógica duplicada.
- `app/(private)/pos/_blocks/PosPage.tsx`, `app/(private)/quotes/_blocks/QuoteCreatePage.tsx` y `app/(private)/billing/_blocks/NewInvoicePage.tsx` se refactorizan para consumir el hook nuevo, eliminando su estado y efecto local equivalentes. Sin cambio de comportamiento observable (mismo endpoint, mismo fallback, misma auto-selección).
- Se mueve `src/modules/billing/infrastructure/services/resolveSatDescription.ts` → `src/modules/billing/application/services/resolveSatDescription.ts` (contenido sin cambios).
- Se actualizan los 5 imports que apuntan a la ruta anterior: `DownloadInvoiceFileUseCase.ts`, `BillingController.ts`, `FakeFacturamaGateway.ts`, y los 2 tests unitarios correspondientes.

## Capabilities

### New Capabilities
_Ninguna — refactor interno sin nueva capability observable._

### Modified Capabilities
_Ninguna — no cambia ningún requirement de spec existente. Ver `skip_specs: true` en `.openspec.yaml` de este change._

## Impact

- **Frontend**: `app/_hooks/useBypassBranchOptions.ts` (nuevo), `app/(private)/pos/_blocks/PosPage.tsx`, `app/(private)/quotes/_blocks/QuoteCreatePage.tsx`, `app/(private)/billing/_blocks/NewInvoicePage.tsx`.
- **Backend (módulo billing, hexagonal)**: `src/modules/billing/application/services/resolveSatDescription.ts` (nuevo, movido), `src/modules/billing/infrastructure/services/resolveSatDescription.ts` (eliminado), `src/modules/billing/application/use-cases/DownloadInvoiceFileUseCase.ts`, `src/modules/billing/infrastructure/http/BillingController.ts`, `src/modules/billing/infrastructure/services/FakeFacturamaGateway.ts`.
- **Tests**: `tests/unit/modules/billing/resolveSatDescription.test.ts`, `tests/unit/modules/billing/FakeFacturamaGateway.test.ts` (imports actualizados, sin cambio de aserciones).
- **APIs / contratos externos**: sin cambios. **Sin BREAKING changes.**
