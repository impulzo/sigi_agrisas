## Context

`Return.reason` ya existe como campo TEXT NOT NULL con validación 3–500 chars. La HU-004 solicita formalizar su obligatoriedad, visibilidad y restricción de edición. La edición del motivo por Admin es el único gap funcional real; se decide diferirlo.

## Goals / Non-Goals

**Goals:**
- Confirmar y formalizar en spec que `reason` es requerido, 3–500 chars, visible en detalle e historial
- Documentar que `reason` es inmutable post-creación en V1

**Non-Goals:**
- Implementar edición de motivo por Admin (requiere endpoint `PATCH /returns/:id/reason`, nuevo permiso `returns:admin_edit`, auditLog) — diferido
- Cambios de código

## Decisions

### D-1: Solo documental para V1

No hay cambios de código. La change actualiza las specs `returns-api` y `returns-ui` para documentar explícitamente el comportamiento existente y el out-of-scope de edición Admin.

## Risks / Trade-offs

- **[Riesgo] Expectativa de cliente**: CS-3 promete edición por Admin. Al diferir, debe comunicarse claramente al stakeholder.

## Migration Plan

Sin migración. Sin cambios de código.

## Open Questions

- ¿Se necesita una columna `reason` en el listado (`/returns`) o solo en el detalle? (Recomendado: solo en detalle — el listado ya es ancho; el motivo es largo)
