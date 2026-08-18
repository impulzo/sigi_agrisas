## Context

`NavigationRail` ya soporta un array tipado `RailItem[]` para `secondaryItems` (`app/_components/organisms/NavigationRail/items.ts`), pero a diferencia de `primaryItems` (que sí filtra por `can(requires)` vía `visiblePrimaryItems`), el render de `secondaryItems` en `NavigationRail.tsx` hoy itera el array sin ninguna lógica de permisos — porque hasta ahora sus dos únicos miembros (`support`, `account`) nunca lo necesitaron. El módulo de configuración (Historia #1) ya está completo end-to-end; sólo falta el punto de entrada visual, y ese punto de entrada debe estar gateado igual que el resto de destinos administrables del rail.

## Goals / Non-Goals

**Goals:**
- Exponer `/settings` como destino navegable desde el rail, gateado por `settings:read` igual que `users`, `roles`, `catalogs` y el resto de items administrativos.
- Extender `secondaryItems` para que soporte items opcionalmente gateados sin romper el comportamiento actual de `support`/`account`.

**Non-Goals:**
- No se toca backend, seed, ni `SettingsPage` (ya validan `settings:read`/`settings:write` correctamente).
- No se introduce un mecanismo de permisos nuevo — se reutiliza exactamente el mismo patrón `can(requires)` que ya usa `visiblePrimaryItems`.

## Decisions

**Decisión 1 — `settings` declara `requires: "settings:read"`.** Responde a la fila #1 de la tabla (Criterios de Seguridad: "El item del rail SÍ declara `requires: 'settings:read'`"). Consistencia: todos los destinos que exponen un módulo administrable (`users:read`, `roles:read`, `catalogs` children, etc.) están gateados en el rail — dejar `settings` como excepción sin permiso rompería ese patrón y sería inconsistente con el resto del catálogo documentado en el requirement "Navigation rail item catalogue". Redundancia con el gate de `SettingsPage`/API es intencional (defensa en profundidad, mismo patrón que cualquier otro módulo: el rail oculta, la página re-valida, la API re-valida). Alternativa descartada (versión previa de este design): sin `requires`, tratando `settings` como `support`/`account` — se descarta porque esos dos son utilitarios universales sin módulo de datos detrás, mientras `settings` sí expone datos de negocio (ticket, pricing) igual que cualquier otro módulo administrable.

**Decisión 2 — extender el filtrado de permisos a `secondaryItems`.** Hoy `NavigationRail.tsx` no tiene ningún filtro para ese grupo. Se agrega `visibleSecondaryItems` con la misma lógica que `visiblePrimaryItems`: `!item.requires → true`; si tiene `requires`, visible cuando `can(requires)` es `true` o `"loading"` (optimista, evita layout shift), oculto cuando es `false`. `support`/`account` (sin `requires`) no cambian de comportamiento — siguen siempre visibles. Alternativa descartada: filtrar sólo el item `settings` con un `if` ad-hoc — se prefiere el filtro genérico porque es el mismo patrón ya validado para `primaryItems` y deja el grupo preparado para futuros items secundarios gateados sin duplicar lógica.

**Decisión 3 — ícono `settings` de Material Symbols.** Ya existe en `IconName`/`icons.ts` (verificado) — sin cambios necesarios.

## Risks / Trade-offs

- **[Riesgo]** Ninguno de fondo — hoy los 3 roles seedeados (admin/operator/viewer) tienen `settings:read`, así que el comportamiento visible no cambia en el corto plazo; el gate es defensivo/futuro-proof (si algún rol nuevo se crea sin ese permiso, el item ya se oculta correctamente sin cambios adicionales). → **Mitigación**: no aplica, es el comportamiento deseado.
- **[Riesgo]** El nuevo filtro de `secondaryItems` es código nuevo (no sólo dato estático) — pequeño riesgo de regresión en `support`/`account` si el filtro se implementa mal. → **Mitigación**: reutilizar literalmente la misma función/lógica que `visiblePrimaryItems` ya usa y probada; cubrir con test que `support`/`account` siguen visibles sin `can()` mockeado.

## Migration Plan

No aplica (sin datos, sin flags, sin rollback especial — revertir el commit basta).

## Open Questions

Ninguna.
