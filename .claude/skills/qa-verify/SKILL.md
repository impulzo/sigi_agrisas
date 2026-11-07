---
name: qa-verify
description: Verifica un PR o diff de agrisas-panel contra las reglas transversales de CLAUDE.md (arquitectura hexagonal, Atomic Design, sistema de diseño, RBAC/branch scoping, Prisma) y los Requirements/Scenarios de la(s) spec(s) openspec afectadas, y entrega un checklist pass/fail con evidencia file:line. Úsala SIEMPRE que el usuario pida "revisar este PR", "verificar que cumple las specs", "QA de este cambio", "¿esto cumple los criterios de aceptación?", antes de aprobar/mergear un PR hacia develop, o al cerrar un change de openspec (opsx:verify complementario, no sustituto). No es un cazador de bugs genérico (para eso existe la skill code-review) — esta skill audita CONFORMIDAD con reglas y specs ya escritas, no corrección general del código.
---

# QA Verify — agrisas-panel

Esta skill no mantiene su propia copia de las reglas del proyecto. Las reglas viven en `CLAUDE.md` (raíz del repo) y en `openspec/specs/*/spec.md`, y cambian con frecuencia — duplicarlas aquí garantizaría que se desactualicen. En su lugar, esta skill es un **procedimiento**: detecta qué tocó el diff, localiza las reglas y specs que aplican a esas áreas, y arma el checklist en el momento, siempre contra el estado actual del repo.

## Paso 1 — Resolver el alcance

Determina qué se está revisando:

- PR de GitHub (número o URL) → `gh pr diff <n>` y `gh pr diff <n> --name-only`.
- Branch o rango → `git diff develop...<branch> --stat` y `git diff develop...<branch>`.
- Working tree sin commitear → `git status` + `git diff`.

Lee el diff completo, no sólo los nombres de archivo — el checklist necesita citar líneas concretas.

## Paso 2 — Clasificar el diff por área

Agrupa los archivos tocados en las áreas que aparecen en la tabla de `references/areas.md`. Cada área apunta a:
1. La(s) sección(es) exacta(s) de `CLAUDE.md` que hay que releer (son encabezados estables del archivo — vuelve a leerlos ahora, no de memoria, porque CLAUDE.md se edita seguido).
2. El comando de verificación automatizada asociado, si aplica.

Un mismo diff normalmente toca 2-4 áreas (ej. un endpoint nuevo toca "Arquitectura Hexagonal" + "RBAC/branch scoping" + "Tests").

## Paso 3 — Ubicar la(s) spec(s) openspec afectadas

Para cada módulo/feature tocado, resuelve su capability con la heurística de `references/areas.md` (`src/modules/<x>` → suele mapear a `<x>-api`; `app/(private)/<feature>` → `<feature>-ui`; cambios de tokens/paleta/componentes bajo `app/` → `design-system`). Luego:

1. Mira primero `openspec/changes/<nombre>/specs/<capability>/spec.md` — si existe una carpeta de change activo (no archivado) para esa capability, esa es la versión vigente del requirement, por encima de la spec archivada.
2. Si no hay change activo, lee `openspec/specs/<capability>/spec.md`.
3. Si no encuentras ninguna spec que cubra el área tocada, no lo ocultes: repórtalo como hallazgo ("sin spec — cobertura no verificable") en vez de omitir la categoría.

Extrae sólo los Requirements + Scenarios que el diff puede violar o que está implementando — no copies la spec entera al reporte, cita el nombre del Requirement/Scenario y el veredicto.

## Paso 4 — Checklist de reglas transversales

Para cada área detectada en el Paso 2, construye ítems de checklist concretos citando la regla de CLAUDE.md y la evidencia en el diff. No inventes categorías que CLAUDE.md no respalda — si una sección no aplica al diff (ej. el PR no toca Prisma), omítela del reporte en vez de forzar un N/A relleno.

Estas son las comprobaciones que casi siempre vale la pena intentar cuando el área correspondiente aparece en el diff (el texto exacto de la regla sal siempre de CLAUDE.md, esto es sólo el recordatorio de qué buscar):

- **Capas backend**: dominio sin imports de Prisma/Next; use cases reciben ports, no implementaciones concretas; route handler delega a controller sin lógica; Zod corre en el controller antes del use case; en rutas scoped por sucursal, el orden es Zod(400) → `enforceBranchScope`(401/403) → use case.
- **Capas frontend**: `_components`/`_blocks` sin `fetch`/`sessionStorage`/`localStorage`/`useRouter().push|replace`/validación inline; `_hooks` global sin imports de `(private)`/`(public)`; `_logic/services` nunca devuelve `Response` cruda y acepta `fetchImpl?`; páginas `page.tsx` son Server Components (sin `"use client"`) y exportan `metadata`.
- **Sistema de diseño** (cualquier archivo bajo `app/`): el autor leyó `designer.md` antes de tocar el archivo (pregúntate si el diff es consistente con sus primitivas); nada de hex crudo, clases tipográficas fuera de los 16 tokens M3, `bg-gray-*`, `rounded-2xl`/`rounded-3xl`, ni `<button>`/`<table>`/`<select>` crudos nuevos — corre el guardarraíl automatizado (ver Paso 5).
- **RBAC / branch scoping**: todo endpoint nuevo bajo `app/api/v1/admin/**` llama `requirePermission` con el permiso correcto; todo recurso con `branchId` aplica `enforceBranchScope`/`resolveScopedBranchId`; el JWT no carga permisos, sólo `roles[]`.
- **Snapshot y totales** (si el diff toca Sale/Quote/Return/ReturnItem): los campos snapshot (`productCodeSnapshot`, `priceNameSnapshot`, `unitPrice`, `discountPct`/`discountAmount`, `ivaRate`, `iepsRate`, …) están presentes y no se re-resuelven desde catálogo; el cálculo de totales pasa por el calculador puro de dominio (no reimplementa la fórmula inline).
- **Reglas CRUD admin comunes** (si el módulo es un catálogo): `code` inmutable tras creación con su regex; soft delete vía `isActive`; `pageSize` tope 100; `PATCH` exige ≥1 campo; usa `parseListQuery`.
- **Prisma/Supabase**: FKs nuevas son `TEXT` salvo que referencien `users` (excepción confirmada `@db.Uuid`); ninguna migración corre contra `DIRECT_URL` de prod ni seeds fuera de dev/test.
- **Proceso OpenSpec**: si el diff es un cambio no trivial, existe un `openspec/changes/<nombre>/` correspondiente con `proposal.md`/`tasks.md` — si falta, es un hallazgo de proceso, no sólo de código.

## Paso 5 — Verificación automatizada

Corre sólo lo que el alcance detectado justifica (no la suite completa si el diff es chico):

```bash
npm run build                 # type-check completo + prisma generate
npm test -- <pattern>         # proyecto "backend" o "ui" según el área; usa --listTests si dudas del patrón
npm run lint
npm test -- tests/unit/ui/design-system/tokens.test.ts   # si el diff toca app/
```

Registra pass/fail de cada comando corrido, no lo que "debería" pasar.

## Paso 6 — Reporte

Usa exactamente esta estructura (adapta títulos de sección a lo que de verdad aplicó):

```markdown
## QA Verify — <PR #n / branch / diff>

### Alcance detectado
- Áreas: <lista de Paso 2>
- Specs consultadas: <capability> (archivada|activa en openspec/changes/<nombre>)

### Checklist

#### <Área>
- [✅|❌|⚠️ sin spec] <criterio citando la regla> — `archivo:línea`

#### OpenSpec — <capability>
- [✅|❌] Requirement "<nombre>" / Scenario "<nombre>" — `archivo:línea`

### Verificación automatizada
- Build: <pass|fail>
- Tests (`<comando>`): <pass|fail — n/N>
- Lint: <pass|fail>
- Guardarraíl diseño: <pass|fail|n/a>

### Resumen
- Cumplidos: n/N
- Bloqueantes (❌): <lista, o "ninguno">
- Gaps de cobertura (⚠️ sin spec): <lista, o "ninguno">
```

Un ❌ es bloqueante para merge; un ⚠️ es cobertura no verificable que vale la pena señalar pero no bloquea por sí solo — déjaselo claro al usuario para que decida.

## Qué NO hacer

- No marcar ✅ un criterio que no se pudo verificar (archivo no leído, comando no corrido) — usa ⚠️ y dilo.
- No ejecutar `prisma migrate deploy`, seeds, ni nada que mute datos como parte de la verificación — esto es un chequeo de lectura.
- No archivar el change de openspec ni aprobar/mergear el PR — eso lo decide el usuario explícitamente.
- No repetir el texto completo de CLAUDE.md o de la spec en el reporte — cita nombre de regla/Requirement y evidencia, no el párrafo entero.
