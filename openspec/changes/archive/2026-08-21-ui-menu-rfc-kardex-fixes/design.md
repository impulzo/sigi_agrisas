## Context

Tres ajustes de UI/UX independientes, agrupados por área tocada, sin cambios de arquitectura ni de dominio. Referencian las historias 1-2 (menú), 3-4 (RFC quick-add) y 5 (Kardex) de `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Quitar del menú (`NavigationRail` + `TopAppBar`) los accesos sin funcionalidad real detrás: "Inicio", "Support", "Account", ícono de notificaciones (historias 1-2).
- Igualar la regla de `rfc` opcional entre catálogos (`Clientes`/`Proveedores`) y los modales de alta rápida usados desde POS y Compras (historias 3-4).
- Alinear el spacing de `KardexPage` al patrón `PageShell` ya usado por el resto de pantallas de reporte (historia 5).

**Non-Goals:**
- No se toca backend (`src/modules/customers/`, proveedores) — ya acepta `rfc` opcional.
- No se elimina la página `/dashboard`, solo su entrada en el menú.
- No se rediseña el contenido interno del Kardex (filtros, tabla, tarjetas) — solo el wrapper de layout.
- No se crea ninguna spec nueva en `openspec/specs/` — no hay requisito de negocio documentado que cambie (ver "Modified Capabilities" en proposal.md, vacío).

## Decisions

**D1 — Remover ítems de menú en la fuente de datos (`items.ts`), no ocultarlos condicionalmente.**
`primaryItems`/`secondaryItems` es un array estático sin `requires` para "dashboard"/"support"/"account" — no hay gating por permiso que preservar. Eliminar las entradas es más simple y correcto que envolverlas en una condición siempre-falsa. Alternativa descartada: ocultar vía CSS/flag — añadiría código muerto sin beneficio (nadie reactivará estos ítems sin volver a tocar código).

**D2 — El ícono de notificaciones se elimina, no se deshabilita.**
`IconButton icon="notifications"` no tiene `onClick` ni estado — es un placeholder visual sin funcionalidad. Deshabilitarlo (opacity/disabled) dejaría un elemento inerte en la barra; quitarlo es la limpieza correcta ya que no hay plan de implementarlo en este cambio (historia 2 no lo requiere).

**D3 — Replicar el patrón `optionalRfc` existente, no reescribir validación desde cero.**
`catalogs/customers/_logic/schemas/customer.schema.ts` ya resolvió este problema con `z.string().regex(rfcRegex).nullable().optional()`. Se aplica el mismo patrón (regex + `.optional()`) a `customerQuickAdd.schema.ts` y `providerQuickAdd.schema.ts`, y se replica el envío condicional (`...(form.rfc.trim() ? { rfc: ... } : {})`) que ya usan `legalName`/`taxRegime`/etc. en ambos modales. Evita divergencia de reglas de validación de RFC entre catálogo y quick-add (mismo regex SAT en los 3 lugares).

**D4 — Kardex adopta `PageShell` en vez de definir su propio spacing.**
`PageShell` (`app/_components/organisms/PageShell/PageShell.tsx`) ya encapsula `px-gutter py-lg mx-auto max-w-screen-2xl` + `PageHeader` con `backHref`. `KardexPage` reimplementaba ese header a mano sin las clases de contenedor. Se sigue el mismo perfil que `SalesCutPage` (reporte de detalle, sin `toolbar`, filtros en `children`) en vez de inventar un layout nuevo. Los 2 early-returns (`loading`/`sin acceso`) quedan fuera de `PageShell`, igual que en `SalesCutPage` (usan `PageLoading`/`EmptyState` sueltos, patrón ya establecido).

## Riesgos / Trade-offs

- [Riesgo] Tests unitarios de `NavigationRail`/`TopAppBar` que asertan la presencia de "Inicio"/"Support"/"Account"/"Notificaciones" romperán → Mitigación: actualizar esos tests en la misma tarea (tasks.md lo cubre explícitamente).
- [Riesgo] `.optional()` en Zod cambia el tipo inferido de `CustomerQuickAddSchema`/`ProviderQuickAddSchema` (`rfc` pasa de `string` a `string | undefined`) → Mitigación: `createCustomer`/`createProvider` ya aceptan DTOs con `rfc?: string | null` en el backend; verificar con `npm run build` que no haya error de tipos en los services que consumen el resultado del `safeParse`.
- [Riesgo] Alguien navega directo a `/support` o `/account` tras quitarlos del menú → Fuera de alcance: estas rutas no forman parte de este cambio (no se tocan páginas, solo el menú); si no existen como página, ya devolvían 404 antes de este cambio también.
