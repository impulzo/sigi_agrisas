## Context

`add-pdf-design-system` (change 1, ya implementado) creó `src/shared/infrastructure/pdf/` (tema de colores, estilos base, logo, issuer, moneda, fila alterna) y migró `quotes` como piloto. Este change (2 de 4) extiende esa infraestructura a `payments` (`PaymentHistoryPdf`) e `inventory` (`KardexReportPdf`), cuyos `pdfStyles.ts` fueron confirmados casi idénticos en el research inicial (mismo `page/title/subtitle/table/tableHeader/tableRow/tableRowEven/headerCol/footer/emptyMsg`, incluyendo el mismo azul arbitrario `#1565C0` copiado literalmente entre ambos).

A diferencia de `quotes` (documento cara-a-cliente), estos dos son reportes internos (historial de abonos, kardex de inventario) — por decisión ya validada con el usuario en Plan Mode, reciben logo pero en tamaño reducido/secundario.

## Goals / Non-Goals

**Goals:**
- Fusionar las claves genuinamente idénticas de `payments/pdfStyles.ts` e `inventory/pdfStyles.ts` en `src/shared/infrastructure/pdf/simpleListPdfStyles.ts`, componiendo `pdfBaseStyles`/`pdfTheme`.
- Agregar logo chico a `PaymentHistoryPdf` y `KardexReportPdf`.
- Reemplazar `#1565C0` y los grises sueltos (`#ccc`, `#666`, `#888`) por la paleta de marca.

**Non-Goals:**
- No se toca `billing` ni `reports` (changes 3 y 4).
- No se cambia la lógica de agrupación por venta (`groupBySale`) ni el cálculo de saldo del kardex.
- No se cambia ningún query param, filename ni `Content-Disposition` de los endpoints.

## Decisions

**1. Fusión real (no solo composición) porque ya se confirmó duplicación genuina.** — A diferencia de `quotes`/`billing` (que se mantienen separados por tener reglas de negocio propias), `payments` e `inventory` no tienen ninguna regla de negocio divergente en sus claves compartidas — es duplicación pura de copy-paste. Se crea `simpleListPdfStyles.ts` con las claves compartidas (`page`, `title`, `subtitle`, `table`, `tableHeader`, `tableRow`, `tableRowEven`, `headerCol`, `footer`, `emptyMsg`) y cada módulo mantiene su `pdfStyles.ts` local solo para anchos de columna y extras propios (`filtersSection`/`chip`/`ticketHeader` en payments; `headerSection`/`headerCard*` en inventory). **Verificación previa obligatoria**: diff literal de ambos archivos antes de fusionar, confirmando cero divergencia de comportamiento en las claves fusionadas.

**2. Color de header: `pdfTheme.tertiary` (`#445963`) en vez de `#1565C0`.** — Es el tono azul-grisáceo más cercano semánticamente al azul original dentro de la paleta de marca, evitando saltar directo a `primary` (verde), que ya se usará de forma más prominente en documentos cara-a-cliente (billing/quotes). Mantiene diferenciación visual entre "documento fiscal/cliente" (verde) y "reporte interno" (azul-gris de marca) sin introducir un tercer color fuera de la paleta.

**3. Logo chico (`<PdfLogo size={32}>`) junto al título, no en un bloque de header separado.** — Estos PDFs no tienen un bloque "issuer" como `quotes`/`billing`; se inserta el logo como un elemento visual secundario junto al `title` existente, sin reestructurar el layout del reporte.

**4. `GetTicketSettingsUseCase` se instancia localmente en cada DI container (`payments/infrastructure/di/container.ts`, `inventory/infrastructure/di/container.ts`), igual que ya hace `quotes/infrastructure/di/container.ts`.** — Consistente con el patrón existente; no se comparte una instancia entre módulos (cada módulo arma su propio grafo de dependencias, es una operación de lectura barata sin estado).

## Risks / Trade-offs

- **[Riesgo] Fusión asume "sin divergencia de negocio" sin verificar primero.** → Mitigación: diff literal como primer paso de implementación (tarea explícita), no se fusiona a ciegas.
- **[Riesgo] Nueva dependencia (`GetTicketSettingsUseCase`) en `PaymentsController`/`InventoryMovementsController` podría insertarse en el punto equivocado respecto al branch scoping ya existente.** → Mitigación: la llamada se agrega inmediatamente antes de `renderToBuffer`, después de todos los checks RBAC/branch-scope existentes — nunca antes.
- **[Riesgo] Cambio de color de header (`#1565C0` → `tertiary`) es una decisión de diseño no trivial (elección de qué color de marca usar).** → Mitigación: documentada explícitamente aquí como decisión revisable; de no gustar, es un cambio de una constante, fácilmente revertible.
- **[Trade-off] A diferencia de `quotes`, aquí sí se fusiona en un archivo compartido entre 2 módulos** (contrario a la recomendación general de "un `pdfStyles.ts` por módulo" de change 1) — aceptado explícitamente porque la duplicación ya fue confirmada como copy-paste sin lógica de negocio divergente, caso distinto al de `quotes`/`billing`.

## Migration Plan

1. Diff literal de `payments/pdfStyles.ts` vs `inventory/pdfStyles.ts`, confirmar cero divergencia en las claves a fusionar.
2. Crear `simpleListPdfStyles.ts` componiendo `pdfBaseStyles`/`pdfTheme`.
3. Reconstruir ambos `pdfStyles.ts` de módulo para importar `simpleListPdfStyles` + sus extras propios.
4. Agregar `logoUrl` a las props de `PaymentHistoryPdf`/`KardexReportPdf`, renderizar `<PdfLogo size={32}>`.
5. Wireear `GetTicketSettingsUseCase` en ambos DI containers y controllers, en el punto correcto (después de RBAC/branch-scope).
6. Verificación manual + `npm test`/`npx tsc --noEmit`.

**Rollback**: revertir el commit — sin migración de datos, reversible sin efectos secundarios.

## Open Questions

Ninguna pendiente.
