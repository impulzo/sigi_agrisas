# sales-screens-padding — Design

## Context

Ver proposal.md — Why. Estado actual relevante:

- El área de contenido de rutas privadas es `app/(private)/layout.tsx:24` → `<main className="pl-[80px] pt-16 h-full overflow-y-auto">`. El `pt-16` (64px) es el espacio que reserva la `TopAppBar` fija de 64px; el contenido empieza inmediatamente después, sin separación adicional.
- Cada pantalla del módulo de ventas define su propio contenedor raíz:
  - `SalesListPage` → `CatalogShell` con `flex flex-col gap-6` (SalesListPage.tsx:94).
  - `SaleDetailPage` → `max-w-4xl mx-auto space-y-6` (SaleDetailPage.tsx:108).
  - `TicketPreviewPage` → `w-full max-w-lg mx-auto space-y-4` (TicketPreviewPage.tsx:66).
  - `PosPage` → `flex flex-col h-[calc(100vh-64px)]` (PosPage.tsx:278).
  - `EditSalePage` → `flex flex-col h-[calc(100vh-64px)]` (EditSalePage.tsx:191).
- Logos con `next/image` `fill` sin `sizes`: `NavigationRail.tsx:155` (contenedor `w-12 h-12`, es decir 48px) y `TopAppBar.tsx:19` (contenedor `w-10 h-10`, es decir 40px). Ambos disparan el warning de consola.

## Goals / Non-Goals

**Goals:**
- Separar 10px el contenido de las 5 pantallas de ventas del borde superior de `main` (fila 1).
- Eliminar el warning `sizes` de los logos de marca (fila 2).

**Non-Goals:**
- No cambiar espaciado interno entre secciones de cada pantalla (solo el offset superior).
- No rediseñar el módulo de ventas ni el `main` global del layout (el `pt-16` sigue intacto; el `pt-2.5` va en los contenedores de página, no en `main`, para no afectar otros módulos).
- No tocar backend, RBAC ni branch scoping.

## Decisions

**D1 — Padding de 10px en el contenedor raíz de cada pantalla de ventas, no en `main`.** Se agrega `pt-2.5` (10px) al contenedor raíz de cada una de las 5 pantallas. Alternativa considerada: agregar `pt-[74px]` en `main` del layout — descartada porque afectaría a TODOS los módulos privados, no solo ventas, y rompería el offset exacto de la topbar. Otra alternativa: wrapper `<div>` en cada página — descartada (más nodes y sin beneficio); el `pt-2.5` directo en el root existente es suficiente.

**D2 — Pantallas full-height con altura fija (`h-[calc(100vh-64px)]`).** En `PosPage` y `EditSalePage` el root usa altura fija calculada. Se agrega `pt-2.5` **manteniendo** el `h-[calc(100vh-64px)]`: Tailwind preflight aplica `box-sizing: border-box`, por lo que el `padding-top: 10px` se resta del height en vez de sumarse — el área de contenido llena exactamente el espacio bajo la topbar (64px) menos los 10px de separación, sin overflow. Alternativa considerada: `h-[calc(100vh-74px)]` — descartada porque con `border-box` duplicaría la resta (el height ya incluye el padding). Verificado en browser: POS y edit sin scroll vertical extra.

**D3 — Prop `sizes` en los logos según el contenedor.** En `next/image` con `fill`, `sizes` indica el ancho de render para elegir el srcset correcto. Valores: `NavigationRail` (contenedor `w-12 h-12` = 48px) → `sizes="48px"`; `TopAppBar` (contenedor `w-10 h-10` = 40px) → `sizes="40px"`. Sin cambios visuales.

## Risks / Trade-offs

- **[`pt-2.5` en pantallas `h-[calc(100vh-64px)]`]** → Riesgo de 10px de overflow vertical; mitigado en D2 restando 10px al `calc`. La regla Tailwind `pt-2.5` existe por defecto (10px) — verificable.
- **[Doble render de `PrintableTicket` (detalle y ticket)]** → Ajeno al cambio; no afecta el padding.
- **[JSDOM y warning `sizes`]** → JSDOM no evalúa `next/image` real; el warning se verifica en Playwright (browser) revisando `console messages`, no en unit test.
