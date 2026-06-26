## Why

La legislación fiscal mexicana exige consecutividad en la numeración de documentos; los tickets cancelados deben conservar su folio (ya implementado) y el sistema debe exponer un endpoint de auditoría para que el administrador pueda validar la integridad de la secuencia y detectar huecos accidentales. HU-001 confirma el comportamiento existente; HU-002 agrega visibilidad operativa sobre la secuencia.

## What Changes

- Nuevo use case `AuditFolioSequenceUseCase` en `src/modules/folios/` — consulta via `$queryRaw` con UNION sobre `sales`, `quotes`, `customer_payments` para construir la secuencia de documentos emitidos bajo un folio.
- Nuevo endpoint `GET /api/v1/admin/folios/:id/audit` (requiere `folios:read`) — devuelve `{ folioId, code, prefix, currentNumber, totalIssued, gaps, sequence }`.
- Nuevo bloque UI `FolioAuditModal` en `app/(private)/catalogs/folios/_blocks/` — muestra resumen de integridad, lista de gaps y tabla de secuencia paginada.
- Botón "Auditar" en `FoliosTable` que abre el modal.

## Capabilities

### New Capabilities
- `folio-audit`: Auditoría de secuencia de folios — endpoint de lectura + UI modal que expone la consecutividad y detecta huecos en la numeración de documentos fiscales.

### Modified Capabilities
- `admin-folios`: Agrega endpoint `GET /:id/audit` y actualiza la tabla UI con acción "Auditar".

## Impact

- `src/modules/folios/application/` — nuevo use case y port opcional
- `src/modules/folios/infrastructure/repositories/PrismaFolioRepository.ts` — nuevo método `findSequence`
- `src/modules/folios/infrastructure/http/FoliosController.ts` — nuevo handler `audit`
- `app/api/v1/admin/folios/[id]/audit/route.ts` — nuevo route handler
- `app/(private)/catalogs/folios/_blocks/FolioAuditModal.tsx` — nuevo componente
- `app/(private)/catalogs/folios/_blocks/FoliosTable.tsx` — botón Auditar
- `app/(private)/catalogs/folios/_logic/services/listFolios.ts` — nueva función `auditFolio`
- Sin migraciones de base de datos.
