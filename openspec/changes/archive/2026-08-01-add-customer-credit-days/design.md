## Context

`src/modules/customers/` es un módulo hexagonal completo (domain/application/infrastructure) que ya expone CRUD vía `CustomersController`. La columna `credit_days` ya existe en Postgres (migración `20260726000001_add_sale_due_date`, default `30`) y ya es leída directamente por `PrismaSaleRepository` (fuera de este módulo) para calcular `dueDate` en ventas a crédito. Este cambio es puramente de "cablear" un campo que ya existe en la BD a través de las capas de `customers-api` que aún no lo conocen: entidad, DTOs, use cases, repositorios (Prisma + InMemory) y validación Zod del controller. Ver `proposal.md` — Why/What Changes para el detalle completo del gap y la tabla de Historia de Usuario para los criterios exactos.

## Goals / Non-Goals

**Goals:**
- Exponer `creditDays` (lectura y escritura) en los 4 endpoints de `customers-api` (list, get, create, update), satisfaciendo las 3 historias de usuario de la propuesta (crear con plazo custom/default, actualizar plazo, leer plazo).
- Mantener el comportamiento actual de `PrismaSaleRepository` intacto (sigue leyendo `credit_days` directo de la tabla `customers`; no se toca ese módulo).
- Validación server-side estricta (`customers:write` + Zod entero `>= 0`), sin tope superior, según lo confirmado con el usuario.

**Non-Goals:**
- No se construye ninguna UI en este change (eso corresponde a `add-customers-catalog-ui`, que depende de este).
- No se modifica `CustomerQuickAddModal` del POS ni ningún consumidor de `pos-api`/`quotes-api`/`billing-api`.
- No se introduce migración Prisma nueva — la columna ya existe.
- No se activa `InactiveCustomerError` (sigue sin uso, fuera de alcance de este cambio).

## Decisions

**1. Default de `creditDays` se aplica en `CreateCustomerUseCase`, no en Zod ni en Prisma.**
Alternativa considerada: usar sólo `.default(30)` de Zod en el controller. Se descarta como única fuente de verdad porque `InMemoryCustomerRepository` (usado en tests unitarios de use cases) no pasa por el controller — el use case debe garantizar el default de forma independiente del transporte HTTP, igual que el resto de módulos del repo (ej. `folios`, `payment-methods`). El schema Zod además pone `default(30)` como defensa en profundidad para el caso en que el use case reciba `undefined` directamente.
- Responde a AC1a (Historia 1: default 30 al omitir el campo).

**2. `updateBodySchema` incorpora `creditDays` al `.refine()` de "al menos un campo".**
Es el mismo patrón mecánico ya usado para `creditLimit`/`name`/etc. en ese mismo refine — sin alternativa real, es la única forma de que un PATCH que sólo trae `creditDays` no falle con 400 "At least one updatable field must be provided".
- Responde a AC2c (Historia 2).

**3. Rango de validación: `z.coerce.number().int().min(0)`, sin `.max()`.**
Alternativa considerada: tope superior 365 (propuesto inicialmente). Se descarta tras confirmación explícita del usuario — no hay caso de negocio conocido que exija limitar el plazo máximo, y agregar un tope arbitrario sin respaldo de negocio violaría la regla del proyecto de "no validar escenarios que no pueden pasar". `min(0)` sí se mantiene porque un plazo negativo no tiene sentido de dominio (cubre AC1c/AC2b).

**4. `PrismaCustomerRepository.update()` sólo incluye `creditDays` en el `data` de Prisma si `"creditDays" in data`, igual que el resto de campos opcionales del repo.**
Evita el bug clásico de sobrescribir con `undefined` (que Prisma interpretaría como "no tocar" de todos modos, pero se mantiene consistencia explícita con el resto del archivo, que ya usa este patrón condicional para `creditLimit`, `legalName`, etc.).

**5. No se toca `PrismaSaleRepository`.**
Ya lee `tx.customer.findUnique({ select: { creditDays: true } })` directo de Prisma, sin pasar por `CustomerRepository` (puerto del módulo customers). Es un acceso de lectura cross-módulo ya existente y fuera del alcance de este cambio — el nuevo campo administrable simplemente hace que el valor que esa consulta lee deje de estar fijo en 30.
- Responde a la AC de consumo interno (Historia 1, último bullet).

## Risks / Trade-offs

- **[Riesgo] Clientes existentes creados antes de este cambio ya tienen `credit_days = 30` en BD (default de columna), por lo que no requieren backfill.** → Mitigación: ninguna acción necesaria; se verifica en el scenario "Detail includes creditDays for customers created before this change" del spec.
- **[Riesgo] Sin tope superior en `creditDays`, un valor absurdamente alto (ej. `999999999`) podría causar overflow en el cálculo de `dueDate` (`addDays`) en `pos-api`.** → Mitigación: fuera de alcance de este change (decisión explícita del usuario); si se detecta un caso real de abuso, se puede agregar `.max()` en un change posterior sin romper compatibilidad (es un endurecimiento, no un cambio breaking).
- **[Trade-off] No se agrega value object `CreditDays` en el dominio (validación queda sólo en Zod del controller).** → Consistente con el resto de la entidad `Customer`, que ya delega toda la validación de formato a la capa HTTP y mantiene el dominio como contenedor de datos sin lógica de validación propia.

## Migration Plan

No aplica migración de base de datos (columna ya existe). Despliegue es un cambio de código sin downtime: los endpoints siguen aceptando requests sin `creditDays` (default 30) durante y después del despliegue, por lo que no hay ventana de incompatibilidad con clientes HTTP existentes (POS quick-add, etc. que no envían el campo).
