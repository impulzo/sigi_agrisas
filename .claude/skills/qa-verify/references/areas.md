# Áreas del diff → sección CLAUDE.md + capability openspec

Tabla de referencia para el Paso 2/3 de `SKILL.md`. No es exhaustiva de los 85 `openspec/specs/*` — es la heurística para resolver cualquier ruta tocada. Si una ruta no encaja en ninguna fila, búscala por nombre de carpeta en `openspec/specs/` antes de reportarla como "sin spec".

## Backend (`src/modules/<x>/...`)

| Carpeta tocada | Sección CLAUDE.md a releer | Capability típica |
|---|---|---|
| `src/modules/<x>/domain/` | "Arquitectura Hexagonal" (regla: dominio sin Next/Prisma) | `<x>-api` |
| `src/modules/<x>/application/` | "Arquitectura Hexagonal" (ports, use cases) | `<x>-api` |
| `src/modules/<x>/infrastructure/http/` | "Arquitectura Hexagonal" + "Autorización (RBAC)" + "Branch scoping" | `<x>-api` |
| `src/modules/<x>/infrastructure/repositories/Prisma*` | "Prisma y Supabase" | `<x>-api` |
| `src/modules/rbac/**` | "Autorización (RBAC)" | `rbac` |
| `src/modules/pos/**`, `src/modules/quotes/**` | "POS y Cotizaciones (Backend)" | `pos-api`, `quotes-api` |
| `src/modules/returns/**` | "Devoluciones (Backend)" | `returns-api` |
| `src/modules/payments/**` | "Abonos (Backend)" | `payments-api` |
| `src/modules/expenses/**` | "Gastos (Backend)" | `expenses-api` |
| `prisma/schema.prisma`, `prisma/migrations/**` | "Prisma y Supabase" + "Ambientes: PROD vs dev/test" | `database-persistence` |
| `prisma/seeds/**` | "Ambientes: PROD vs dev/test" (seeds sólo dev/test) | `data-seeding` |

El mapeo `<x>` → nombre de carpeta en `src/modules/` es literal (`src/modules/returns` → capability `returns-api`), salvo los módulos de catálogo simple (`branches`, `departments`, `providers`, `folios`, `payment-methods`) cuya capability lleva prefijo `admin-` (`admin-branches`, `admin-departments`, etc. — ver tabla "Capacidades CRUD admin" de CLAUDE.md).

## Frontend (`app/...`)

| Carpeta tocada | Sección CLAUDE.md a releer | Capability típica |
|---|---|---|
| `app/_components/`, `app/(private)/**/_blocks/` | "Arquitectura Frontend" (regla: presentational, sin fetch/storage/router) + "Sistema de diseño" | `design-system` + `<feature>-ui` |
| `app/_hooks/` | "Arquitectura Frontend" (hooks globales) | el/los módulo(s) que lo consumen |
| `app/(private)/<feature>/_logic/hooks|services|schemas|types/` | "Arquitectura Frontend" (`_logic/` por feature) | `<feature>-ui` |
| `app/(private)/<feature>/page.tsx` | "Arquitectura Frontend" (Server Components, metadata) | `<feature>-ui` |
| `tailwind.config.ts`, `app/_lib/cn.ts`, cualquier clase `text-*`/`bg-*`/`rounded-*` nueva | "Sistema de diseño" completa | `design-system` |
| `middleware.ts` | "Middleware de autenticación" | `auth-middleware` |
| `app/_lib/authFetch.ts`, `app/_hooks/useCurrentUser.ts` | "Cliente HTTP autenticado y RBAC en UI" | `rbac`, `user-auth` |

Nombres de feature → capability `-ui` (carpeta `app/(private)/pos/` → `pos-ui`; `app/(private)/catalogs/products/` → `products-ui`; `app/(private)/inventory/kardex/` → `inventory-kardex-ui`). Cuando la feature vive bajo `catalogs/<sub>` usa `<sub>-ui` directo (no `catalogs-<sub>-ui`), salvo el propio hub (`catalogs-ui`).

## Changes activos (anular la spec archivada si tocan la misma capability)

Antes de leer `openspec/specs/<capability>/spec.md`, revisa `ls openspec/changes/` (excluyendo `archive/`) — cualquier carpeta ahí con `specs/<capability>/spec.md` es la versión vigente para esa capability mientras el change no se archive. Esta lista cambia constantemente; no la asumas de memoria, vuelve a listar el directorio en cada corrida de la skill.

## Comandos de verificación por tipo de archivo

| Si tocó... | Corre |
|---|---|
| Cualquier `.ts`/`.tsx` | `npm run build` (type-check + prisma generate) |
| `src/modules/<x>/**` | `npm test -- tests/unit/modules/<x>` |
| `app/(private)/<feature>/**` o `app/_components\|_hooks\|_lib` | `npm test -- tests/unit/ui` (filtra por feature si el patrón lo permite) |
| `app/**` (cualquier archivo) | `npm test -- tests/unit/ui/design-system/tokens.test.ts` |
| Cualquiera | `npm run lint` |
| `prisma/migrations/**` | NO ejecutar la migración como parte del QA — sólo leer el SQL generado y confirmar que coincide con `schema.prisma` |
