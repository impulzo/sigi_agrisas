## Context

Los 13 documentos PDF del sistema (`billing`, `quotes`, `payments`, `inventory`, `reports`) usan `@react-pdf/renderer` v4.5.1 sin ninguna infraestructura compartida — cada módulo define su propio `pdfStyles.ts` con colores hex arbitrarios, ninguno renderiza logo, y hay duplicación confirmada de fragmentos de estilo, lógica de fila alterna y formateo de moneda entre módulos. Este change es el primero de una secuencia de 4 (`add-pdf-design-system` → `unify-payments-inventory-pdf` → `unify-billing-pdf` → `unify-reports-pdf`): construye la infraestructura compartida sin consumidores, y la valida migrando `quotes` end-to-end como piloto de bajo riesgo (sin watermark fiscal, sin complejidad de múltiples documentos como `reports`).

Restricciones del proyecto (`agrisas_panel/CLAUDE.md`): `src/shared/infrastructure/` es infraestructura pura (sin lógica de dominio, sin acceso directo a Prisma desde el módulo compartido de PDF); las capas hexagonales existentes (`domain`/`application`/`infrastructure`) no cambian; RBAC y branch scoping en `QuotesController.ts` no se tocan ni se mueven a ningún helper nuevo.

## Goals / Non-Goals

**Goals:**
- Crear `src/shared/infrastructure/pdf/` con tema de colores de marca, estilos base componibles, resolución de logo, tipo/mapper de issuer y helper de fila alterna — sin ningún consumidor todavía (Historia 1).
- Crear `formatPdfCurrency` compartido y aplicarlo en los 4 sitios duplicados existentes, incluidos 3 archivos fuera de `quotes` (solo esa línea, sin tocar el resto de esos archivos) (Historia 1).
- Migrar `quotes/infrastructure/pdf/{QuotePdf.tsx,pdfStyles.ts}` y `QuotesController.ts` para consumir toda la infraestructura nueva: logo, colores de marca, moneda compartida, fila alterna (Historias 2-4).

**Non-Goals:**
- No se toca `billing`, `payments`, `inventory` ni `reports` más allá del único reemplazo mecánico de `formatPdfCurrency` en 3 archivos puntuales — su migración completa de estilos/logo es objeto de los changes 2-4.
- No se crea ningún endpoint nuevo ni se cambia el contrato HTTP de `GET /quotes/:id?format=pdf` (mismo filename, mismo `Content-Disposition`, mismo `format=json` sin cambios).
- No se modifica `QuoteTotalsCalculator` ni ninguna lógica de cálculo de negocio.
- No se agrega testing de snapshot visual de PDFs (fuera de alcance del proyecto hoy); la verificación es manual/visual, documentada en `tasks.md`.

## Decisions

**1. Colores como constantes planas (`pdfTheme.ts`), no `StyleSheet.create`.** — `@react-pdf/renderer`'s `StyleSheet.create` necesita valores literales; los tokens de Tailwind no son consumibles ahí. Se portan los hex exactos de `tailwind.config.ts` (primary `#0d631b`, tertiary `#445963`, outline `#707a6c`, outlineVariant `#bfcaba`, surfaceContainer `#eeeeec`, surfaceContainerHigh `#e8e8e6`, surfaceContainerLow `#f4f4f2`, onSurface `#1a1c1b`, onSurfaceVariant `#40493d`, error `#ba1a1a`, errorContainer `#ffdad6`). Responde a Historia 1 y 4. **Alternativa descartada**: mantener `#c00` — se descarta porque es un rojo huérfano sin relación documentada con la paleta de marca, y el objetivo explícito del feature es homogenizar colores (decisión ya validada con el usuario en Plan Mode).

**2. Un objeto plano `pdfBaseStyles.ts` (no un `StyleSheet.create` en sí mismo), spreadeado dentro del `StyleSheet.create` de cada módulo.** — Permite que cada módulo siga teniendo su propio `pdfStyles.ts` (aislando el "blast radius" de un cambio de `billing` respecto a `quotes`) mientras comparte page/tableHeader/tableRow/tableRowAlt/totales/footer/badge/bordes. **Alternativa descartada**: un único `pdfStyles.ts` global para los 13 documentos — se descarta porque acoplaría el historial de edición de módulos de negocio no relacionados (factura fiscal vs. cotización), aumentando el riesgo de romper reglas específicas de un módulo al tocar otro (requisito explícito del usuario: "sin romper las reglas de cada pdf").

**3. Resolución de logo: URL https pasa directo, fallback local vía ruta absoluta o Buffer, nunca ruta relativa.** — `resolvePdfLogoSource(logoUrl)` devuelve la URL de Supabase sin cambios si es un `https://...` válido (react-pdf la fetchea nativo), o resuelve `public/logo.png` vía `path.join(process.cwd(), "public", "logo.png")`/`fs.readFileSync` si `logoUrl` es `null`/vacío. **Alternativa descartada**: reusar literalmente `/logo.png` como en `PrintableTicket.tsx` (patrón browser) — se descarta porque no resuelve del lado servidor donde corre `renderToBuffer()`; se valida empíricamente durante la implementación cuál de las dos vías (ruta string vs. Buffer) es confiable en el runtime de Next.js route handlers.

**4. `toPdfIssuer`/`PdfIssuer` viven en `shared/infrastructure/pdf/`, no en `settings/`.** — Aunque el tipo deriva de `TicketSettings` (entidad de `settings/domain`), el mapper es consumido por `billing` y `quotes` (y luego `payments`/`inventory`/`reports`), módulos no relacionados con `settings/`. Ponerlo dentro de `settings/` crearía una dependencia inversa (un módulo de dominio de negocio conociendo necesidades de presentación de otros módulos). Responde al Criterio de Seguridad de Historia 3 (no se agrega ningún endpoint nuevo; solo se relee `TicketSettings` ya expuesto por `GetTicketSettingsUseCase`).

**5. `rowStyle(index, base, alt)` es una función pura, no un componente `<PdfTableRow>`.** — Cada uno de los 13 documentos tiene un número/ancho de columnas distinto; forzar un componente genérico con children arbitrarios por columna sería una abstracción más riesgosa que el beneficio de deduplicación. Se prefiere el helper mínimo.

**6. El único cambio fuera de `quotes` en este change es el formateador de moneda (3 archivos, 1 línea cada uno).** — Se incluye aquí porque es puramente mecánico y de bajísimo riesgo (verificado que las 4 implementaciones son comportacionalmente idénticas antes de reemplazar), y evita dejar el helper compartido sin un segundo consumidor que confirme que generaliza bien. No se toca ningún otro estilo/color/logo de esos 3 archivos — eso queda para sus changes correspondientes (`unify-billing-pdf`, `unify-reports-pdf`).

## Risks / Trade-offs

- **[Riesgo] El fallback de logo local no resuelve correctamente en el runtime de despliegue (serverless/edge) si `process.cwd()` no apunta a donde se espera `public/`.** → Mitigación: validar empíricamente con una generación real del PDF de cotización en dev antes de dar por cerrado el change; si la ruta string falla, usar la variante `Buffer` (leída una vez por render) documentada como alternativa en `resolvePdfLogoSource.ts`.
- **[Riesgo] `formatPdfCurrency` colapsa 4 implementaciones que podrían tener una diferencia sutil de comportamiento (moneda default, decimales).** → Mitigación: diff literal de las 4 funciones antes de reemplazar (tarea explícita en `tasks.md`); si alguna difiere, preservar el parámetro `currency` opcional en vez de hardcodear.
- **[Riesgo] El logo en el header de `QuotePdf.tsx` desplaza o compite visualmente con el bloque de datos del emisor (nombre/RFC/sucursal).** → Mitigación: verificación visual manual del PDF migrado contra una versión "antes" guardada localmente, confirmando que ningún dato de negocio se oculta o reposiciona.
- **[Trade-off] Mantener `pdfStyles.ts` por módulo en vez de un archivo único reduce la deduplicación total posible, a cambio de menor blast radius por módulo.** → Aceptado explícitamente como parte de la Decisión 2, alineado con el requisito de "no romper las reglas de cada PDF".
- **[Riesgo] Cambiar `#c00` → `#ba1a1a` en los 3 archivos de moneda no aplica (ese cambio de color no toca esos archivos en este change) — pero si algún reviewer asume que sí, podría confundirse el alcance.** → Mitigación: `tasks.md` deja explícito que en este change los 3 archivos externos a `quotes` SOLO reciben el cambio de formateador de moneda, ningún cambio de color/estilo.

## Migration Plan

1. Crear los 6 archivos nuevos de `src/shared/infrastructure/pdf/` y `formatPdfCurrency.ts` sin modificar ningún consumidor — confirmar que el build compila (nada los importa aún).
2. Reemplazar el formateador de moneda en los 4 sitios duplicados (`QuotePdf.tsx`, `InvoiceDocumentPdf.tsx`, `AnticipoReceiptPdf.tsx`, `DepartmentPriceListReportPdf.tsx`) tras diff literal de comportamiento.
3. Migrar `quotes/pdfStyles.ts` para componer `pdfBaseStyles`/`pdfTheme`.
4. Extender `QuotePdfIssuer` con `logoUrl`, renderizar `<PdfLogo>` en `QuotePdf.tsx`, actualizar `QuotesController.ts` para pasar `logoUrl` vía `toPdfIssuer`.
5. Reemplazar `idx % 2 === 0 ? ... : ...` en `QuotePdf.tsx` por `rowStyle`.
6. Verificación manual: generar PDF de cotización real (dev/seed), comparar visualmente contra versión pre-cambio; confirmar filename/Content-Disposition sin cambios; confirmar escenario "cliente general" (customerId null) sigue renderizando igual.

**Rollback**: revertir el commit/PR de este change — no hay migración de datos ni cambios de schema, es reversible sin efectos secundarios.

## Open Questions

Ninguna pendiente — decisiones de color, alcance de logo (todos los PDFs, chico en reportes internos) y secuencia de 4 changes ya fueron validadas explícitamente con el usuario antes de este proposal.
