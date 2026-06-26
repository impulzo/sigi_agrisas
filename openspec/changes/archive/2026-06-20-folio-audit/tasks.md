## 1. Backend — Repositorio

- [x] 1.1 Agregar método `findAuditSequence(folioId: string): Promise<AuditSequenceRaw[]>` en `PrismaFolioRepository` usando `$queryRaw` con UNION sobre `sales`, `quotes`, `customer_payments`; filtrar `folio_number IS NOT NULL`; `LIMIT 10001`.
- [x] 1.2 Definir tipo `AuditSequenceRaw { number: number; documentType: 'sale'|'quote'|'payment'; documentId: string; status: string; issuedAt: Date }` en `src/modules/folios/application/dto/FolioAuditDto.ts`.
- [x] 1.3 Agregar método al port `FolioRepository` en `src/modules/folios/application/ports/FolioRepository.ts`.

## 2. Backend — Use Case

- [x] 2.1 Crear `AuditFolioSequenceUseCase` en `src/modules/folios/application/use-cases/AuditFolioSequenceUseCase.ts`.
- [x] 2.2 Lógica: buscar folio por id (404 si no existe), llamar `findAuditSequence`, detectar gaps iterando `[1..currentNumber]`, retornar `FolioAuditResultDto` con `truncated: sequence.length > 10000`.
- [x] 2.3 Definir `FolioAuditResultDto` con todos los campos del response (`folioId`, `code`, `prefix`, `currentNumber`, `totalIssued`, `gaps`, `truncated`, `sequence`).

## 3. Backend — Controller y Route

- [x] 3.1 Agregar método `audit(req, id)` en `FoliosController` — valida UUID (400), llama `requirePermission(req, 'folios:read')`, ejecuta use case, serializa.
- [x] 3.2 Registrar `AuditFolioSequenceUseCase` en el contenedor DI de folios (`src/modules/folios/infrastructure/di/container.ts`).
- [x] 3.3 Crear route handler `app/api/v1/admin/folios/[id]/audit/route.ts` — `GET` delega a `foliosController.audit`.

## 4. Frontend — Servicio

- [x] 4.1 Agregar función `auditFolio(id: string): Promise<FolioAuditResult>` en `app/(private)/catalogs/folios/_logic/services/listFolios.ts`.
- [x] 4.2 Definir tipos `FolioAuditResult`, `AuditSequenceItem` en `app/(private)/catalogs/folios/_logic/types/domain.ts`.

## 5. Frontend — Modal

- [x] 5.1 Crear `FolioAuditModal` en `app/(private)/catalogs/folios/_blocks/FolioAuditModal.tsx` — props `{ folioId: string; open: boolean; onClose: () => void }`.
- [x] 5.2 Implementar fetch al montar (cuando `open=true`), estados loading/error.
- [x] 5.3 Renderizar resumen: `totalIssued`, `currentNumber`, badge verde/rojo según `gaps.length`.
- [x] 5.4 Renderizar tabla de secuencia con columnas Número, Tipo, Estado, Fecha; paginación client-side 50 items.
- [x] 5.5 Mostrar banner de truncamiento cuando `truncated: true` y ocultar tabla.

## 6. Frontend — Tabla de folios

- [x] 6.1 Agregar estado `auditFolioId: string | null` en `FoliosPage` (o `FoliosTable`).
- [x] 6.2 Agregar botón "Auditar" (icono `policy`) en columna Acciones de `FoliosTable`; `onClick` setea `auditFolioId`.
- [x] 6.3 Montar `FolioAuditModal` con `folioId={auditFolioId}` en `FoliosPage`; `onClose` limpia el estado.
