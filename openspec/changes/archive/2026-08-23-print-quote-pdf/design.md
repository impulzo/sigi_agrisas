## Context

El módulo `quotes` cubre todo el ciclo de vida de una cotización pero no tiene forma de entregarla como documento fuera del panel (historia #1 de `proposal.md`). El proyecto ya resolvió el mismo problema — "generar un documento server-side y descargarlo como PDF" — tres veces antes: `billing` (`InvoiceDocumentPdf.tsx` + `BillingController.previewPdf`), `payments` (`PaymentHistoryPdf.tsx` + `?format=pdf` en `/payments/history`) e `inventory/kardex` (`KardexReportPdf.tsx` + `?format=pdf` en `/inventory/kardex`). La única librería de PDF en el proyecto es `@react-pdf/renderer`; no hay `dompdf`/`puppeteer`/`jsPDF`. El flujo `window.print()` de `PrintableTicket.tsx` es un patrón distinto (ticket térmico) y no aplica — la feature pide explícitamente PDF.

Restricción de arquitectura hexagonal (`CLAUDE.md`): el dominio no puede importar infraestructura; los route handlers no llevan lógica; la validación Zod vive en el controller. Restricción de capas frontend: `_blocks/` es presentacional (sin `fetch`), la lógica de descarga vive en `_logic/hooks/` y `_logic/services/`.

## Goals / Non-Goals

**Goals:**
- Extender `GET /quotes/:id` con `?format=pdf` reutilizando exactamente el patrón de `payments/history` e `inventory/kardex` (mismo enum Zod, misma forma de respuesta).
- Generar el PDF con los mismos datos que ya expone `QuoteDetailDto` vía JSON — sin nuevos campos, sin nuevo use case de lectura.
- Resolver el emisor (`businessName`/`businessRfc`/`businessAddress`/`businessPhone`) desde `TicketSettings`, la única fuente real de datos fiscales de la empresa en este proyecto (no el emisor hardcoded `"Agrisas"` que usa `billing`).
- Hacer "Imprimir PDF" disponible en cualquier estado de la cotización (criterio de aceptación #1 de la historia), lo que obliga a reestructurar los `return` tempranos de `QuoteActionsBar`.

**Non-Goals:**
- No se agrega preview modal (la historia y el plan ya descartaron esa UX a favor de descarga directa, como kardex).
- No se agrega sello digital/UUID/cadena original/QR — eso es exclusivo de CFDI fiscal (`billing`), una cotización no es un documento fiscal.
- No se modifica el schema de Prisma ni se agregan migraciones — el PDF es una vista distinta del mismo `QuoteDetailDto` ya persistido.
- No se agregan permisos RBAC nuevos — se reutiliza `quotes:read`.

## Decisions

**1. `format=pdf` como query param sobre `GET /quotes/:id`, no una ruta `/pdf` dedicada.**
Sigue el precedente de `payments/history` (`?format=json|pdf`) e `inventory/kardex` (mismo enum). Ya confirmado con el usuario. Alternativa descartada: ruta dedicada al estilo `billing/preview/pdf` — se prefirió el patrón de query param porque `getById` ya carga el `dto` completo una sola vez y branch scoping/404/UUID validation quedan compartidos entre ambos formatos sin duplicar código.

**2. Issuer desde `TicketSettings` vía `GetTicketSettingsUseCase`, con reuso cross-módulo en la DI de `quotes`.**
`quotes/infrastructure/di/container.ts` ya importa `PrismaSaleRepository`/`PrismaPosLookupService` de `pos` — el mismo patrón de "importar un repositorio/use case Prisma de otro módulo directamente en el container" se replica para `settings`. Alternativa descartada: hardcodear el nombre de la empresa como hace `billing` (`issuer: { name: "Agrisas", ... }`) — se descarta porque ya existe una fuente real (`TicketSettings`) consumida por el ticket impreso, y duplicarla generaría dos "verdades" del emisor divergentes entre el ticket y la cotización.
Esto satisface el criterio de seguridad de la historia: "los datos del emisor se leen server-side... nunca desde input del cliente" — `TicketSettings` se resuelve enteramente en el backend, el cliente no puede influir en el emisor del documento.

**3. Reutilizar el guard existente `requirePermission(req, "quotes:read")` de `app/api/v1/admin/quotes/[id]/route.ts` para ambos formatos.**
El route handler no cambia — sigue delegando a `quotesController.getById(req, params.id)`, que ahora lee `format` de `req.url` internamente. Esto satisface el criterio de seguridad "el endpoint reutiliza el guard quotes:read ya existente... no se introduce ningún permiso RBAC nuevo" y "el branch scoping aplica igual para format=pdf que para format=json" — ambos derivan del mismo `enforceBranchScope(req, branchId)` ya presente en `getById`, ejecutado antes del branch `if (format === "pdf")`.

**4. Botón "Imprimir PDF" fuera de los `if (status === ...)` tempranos de `QuoteActionsBar`.**
Hoy el componente hace `return null` para `cancelled` y sólo devuelve el link "Ver venta generada" para `converted`, sin oportunidad de agregar más botones en esas ramas. Se reestructura para que esas ramas devuelvan su contenido específico (banner / link) y el botón de imprimir se agregue siempre, en vez de duplicar el árbol de returns. No requiere gating de permiso adicional: `quotes:read` ya es requisito para ver la pantalla completa (`app/(private)/quotes/[id]/page.tsx`).

**5. Hook hermano `useQuoteExport` en vez de extender `useQuoteDetail`.**
Seguir el mismo criterio ya usado en el módulo (`useQuoteDetail` = fetch, `useQuoteMutations` = mutaciones) evita mezclar la responsabilidad de "traer el detalle" con "exportar a PDF". Modelado 1:1 en `useKardex.exportPdf`/`triggerDownload`/`isExporting` (mismo `try/finally` sin `catch` local — el error se propaga, igual que en kardex, no se introduce un manejo de errores nuevo que kardex tampoco tiene).

## Risks / Trade-offs

- **[Riesgo] `TicketSettings` puede no estar configurado (fila singleton vacía/default) →** el PDF mostraría campos de emisor vacíos o con el default de fábrica. Mitigación: mismo comportamiento que ya tiene el ticket impreso hoy (`PrintableTicket.tsx` ya maneja `ticketSettings === null` con fallback a `null`/omitir el campo) — no es una regresión nueva, es consistente con el resto del sistema.
- **[Riesgo] Cotizaciones con muchas líneas podrían generar un PDF de varias páginas mal paginado** — `@react-pdf/renderer` pagina automáticamente `<Page>`, pero no se ha probado con cotizaciones grandes. Mitigación: fuera de alcance de este cambio (no hay límite de líneas hoy en `CreateQuoteUseCase`/`UpdateQuoteUseCase`); si se detecta en verificación manual, se ajustan estilos de tabla, no la arquitectura.
- **[Trade-off] Reestructurar `QuoteActionsBar` toca las 6 combinaciones de estado ya cubiertas por tests/specs existentes (`quotes-ui`)** → riesgo de romper un caso ya probado. Mitigación: los escenarios existentes de `quotes-ui/spec.md` se preservan sin cambio semántico (mismo `if/else` por estado), sólo se agrega el botón nuevo fuera de esa lógica — cubierto explícitamente en la delta spec (`specs/quotes-ui/spec.md`) de este cambio.

## Migration Plan

No aplica — no hay datos que migrar, no hay flag de rollout. El cambio es aditivo (nuevo query param con default que preserva el comportamiento actual, nuevo botón de UI); rollback es revertir el commit/PR sin pasos adicionales.

## Open Questions

Ninguna — las tres decisiones de alcance (endpoint, UX de descarga, uso de OpenSpec) ya fueron confirmadas explícitamente por el usuario antes de este artefacto.
