## Context

El sistema ya garantiza que los folios no se reutilizan al cancelar documentos (`allocateFolio` incrementa atómicamente `current_number`; la cancelación no decrementa). La numeración vive en tres tablas: `sales.folio_number`, `quotes.folio_number`, `customer_payments.folio_number`. Un folio puede usarse en los tres tipos de documento (según su `scope`). La auditoría requiere un UNION de las tres tablas filtrado por `folio_id`.

## Goals / Non-Goals

**Goals:**
- Endpoint `GET /api/v1/admin/folios/:id/audit` que devuelve la secuencia completa de documentos emitidos bajo un folio.
- Detección de huecos (`gaps`) entre `1` y `current_number` que no aparezcan en ninguna de las tres tablas.
- UI modal con resumen de integridad y tabla de secuencia (50 items por página, client-side sobre los datos ya descargados).

**Non-Goals:**
- No modifica la lógica de asignación de folios (ya correcta).
- No exporta PDF de auditoría.
- No agrega paginación server-side en el endpoint de auditoría (los folios en uso real raramente superan 10 000 documentos; si `totalIssued > 10 000` se devuelve `{ truncated: true }` y la UI avisa).

## Decisions

**D1 — UNION con `$queryRaw`**
Los documentos viven en tres tablas sin FK entre sí. Un `$queryRaw` con UNION ALL es la forma más directa; evita tres consultas separadas y mantiene el orden por número. Alternativa: tres repositorios separados y merge en JS — descartado por overhead de I/O.

```sql
SELECT folio_number AS num, 'sale' AS doc_type, id AS doc_id,
       status, created_at AS issued_at
FROM sales WHERE folio_id = $1 AND folio_number IS NOT NULL

UNION ALL

SELECT folio_number, 'quote', id, status, created_at
FROM quotes WHERE folio_id = $1 AND folio_number IS NOT NULL

UNION ALL

SELECT folio_number, 'payment', id, status, created_at
FROM customer_payments WHERE folio_id = $1 AND folio_number IS NOT NULL

ORDER BY num ASC
```

Note: `customer_payments` uses the real `status` column (values: `completed` | `cancelled`) rather than a hardcoded literal. This correctly surfaces cancelled payments in the audit sequence.

**D2 — Detección de gaps en capa de aplicación**
Después del UNION se itera la secuencia `[1..currentNumber]`; los números no presentes en el resultado son gaps. Con < 10 000 items esto es O(n) en memoria y no requiere CTE recursivo en Postgres.

**D3 — Paginación client-side**
El modal descarga todos los items y pagina en cliente (50/página). Simplifica el endpoint; para volúmenes reales de POS pequeño/mediano es aceptable. Con `truncated: true` se omite la tabla y se muestra solo el resumen + gaps.

**D4 — Use case en capa de aplicación**
`AuditFolioSequenceUseCase` recibe `folioId: string` y devuelve el DTO. El repositorio expone `findAuditSequence(folioId)`. El controller llama al use case y serializa; no hay lógica de gaps en el repositorio.

## Risks / Trade-offs

- **Folios con decenas de miles de documentos**: la query UNION puede ser lenta. → Mitigación: índice existente en `sales(folio_id)`, `quotes(folio_id)`, `customer_payments` (verificar que exista); `LIMIT 10001` para detectar truncamiento.
- **`folio_number` nullable**: los documentos creados antes de la feature de folios podrían no tener número. → El UNION filtra `folio_number IS NOT NULL`; se expone `withoutFolioNumber` en el DTO si hay registros sin número.
- **Sincronización UI**: el modal abre con loading y descarga de una vez; no hay polling.
