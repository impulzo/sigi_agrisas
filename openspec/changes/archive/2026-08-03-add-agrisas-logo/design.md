## Context

`public/logo.png` ya existe en el repo. Cuatro puntos de la UI referencian placeholders/branding genérico: `NavigationRail.tsx` (span "A"), `TopAppBar.tsx` (sólo texto "Agrisas"), `app/(public)/auth/layout.tsx` (SVG agrícola sin logo), y `app/layout.tsx` (sin `metadata.icons`, favicon por defecto de Next.js). Ver `proposal.md - Why` y la tabla `## Historia de Usuario` para motivación completa.

## Goals / Non-Goals

**Goals:**
- Reemplazar el placeholder "A" del `NavigationRail` por `logo.png` (historia #1).
- Reemplazar el texto "Agrisas" en `TopAppBar` por el logo (no coexisten) (historia #1).
- Reemplazar la ilustración SVG, el título "Agrisas" y el subtítulo del panel izquierdo del layout de auth por únicamente el logo, aclarando el gradiente de fondo para que se distinga, sin romper el layout responsive existente (historia #2).
- Declarar `metadata.icons` en `app/layout.tsx` para favicon global (historia #2).

**Non-Goals:**
- No se toca el logo configurable de tickets (`ticketSettings.logoUrl`, módulo `settings`) — feature separada, por sucursal.
- No se generan variantes del asset (PNG optimizado, múltiples resoluciones de favicon `.ico`/`.png`) — se usa `logo.png` directamente en todos los puntos.
- No hay cambios de API, BD ni RBAC — el logo es visible para todos los roles sin gating.

## Decisions

- **`next/image` para el `NavigationRail` y `TopAppBar`**: usa el optimizador de imágenes de Next.js (lazy loading, tamaño fijo evita CLS). Alternativa descartada: `<img>` plano — más simple pero pierde optimización automática; no justificado rechazarlo salvo por consistencia con el resto del código, que ya usa `<img>` en `PrintableTicket` para el logo de ticket (contexto de impresión, no aplica aquí).
- **`app/(public)/auth/layout.tsx` se mantiene Server Component**: el logo se agrega como `<img>`/`next/image` estático, sin lógica cliente — no rompe el requirement existente "Layout es Server Component" (`auth-ui` spec).
- **Gradiente `.leftPanel` más claro**: se sustituyen los stops `#1a4d42`/`#2a6b5f` por `#2a6b5f`/`#5fae97` (dentro de la misma familia verde de marca, sin introducir un color ajeno), suficiente contraste para que el logo `logo.png` no se funda con el fondo oscuro original.
- **Favicon vía `metadata.icons` en `app/layout.tsx`** (App Router, no `app/favicon.ico`): evita crear un archivo especial adicional; `logo.png` funciona como icono vía metadata (Next.js soporta JPEG en `icons`). Alternativa descartada: copiar el asset a `app/favicon.ico` — requeriría conversión de formato (jpeg→ico) fuera de alcance de este cambio.
- **Tamaño del logo en `NavigationRail`**: se ajusta a los 80px de ancho del rail (contenedor ya fijo `w-[80px]`), usando `object-contain` para no distorsionar el aspect ratio original del jpeg.

## Risks / Trade-offs

- [El jpeg puede no tener fondo transparente y verse con recuadro en fondos oscuros/coloreados] → Mitigación: usar el asset tal cual (fuera de alcance retocar el archivo); si el contraste es malo se reporta como seguimiento, no bloquea este cambio.
- [`next/image` requiere dimensiones conocidas o `fill` + contenedor con `position: relative`] → Mitigación: usar `fill` con contenedor dimensionado explícitamente en cada punto de uso (rail header, top bar, auth panel).
