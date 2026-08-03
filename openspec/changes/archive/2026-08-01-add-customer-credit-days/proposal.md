## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador | Como Administrador, quiero poder enviar `creditDays` al crear un cliente para definir el plazo de crédito autorizado desde el alta | Evitar que todo cliente quede fijo en 30 días por defecto sin posibilidad de personalizar el plazo comercial pactado | - `POST /customers` sin `creditDays` en el body crea el cliente con `creditDays=30` (default)<br>- `POST /customers` con `creditDays: 45` persiste ese valor y lo devuelve en la respuesta 201<br>- `POST /customers` con `creditDays: -5` responde 400 con mensaje de validación<br>- `POST /customers` con `creditDays` no entero (ej. `10.5`) responde 400<br>- El valor persistido es consumido sin cambios por `PrismaSaleRepository` para calcular `dueDate` en ventas a crédito (no se altera su lógica actual) | - Requiere permiso `customers:write` (mismo guard ya existente en el endpoint)<br>- Validación server-side vía Zod (`z.coerce.number().int().min(0)`), no confiar en validación de cliente<br>- No introduce ninguna nueva superficie de escritura fuera del contrato ya autorizado del recurso `customers` |
| 2 | Administrador | Como Administrador, quiero poder actualizar `creditDays` de un cliente existente vía `PATCH /customers/:id` para ajustar su plazo de crédito cuando cambien las condiciones comerciales | Los plazos de crédito se renegocian con el tiempo (ej. cliente mejora su historial de pago y se le amplía el plazo) | - `PATCH /customers/:id` con `{ creditDays: 60 }` actualiza sólo ese campo y lo refleja en el `GET` posterior<br>- `PATCH /customers/:id` con `creditDays` fuera de rango (negativo o no entero) responde 400<br>- `creditDays` cuenta como campo válido para satisfacer la regla "al menos un campo" del `.refine()` de `updateBodySchema` (un PATCH que sólo trae `creditDays` no debe fallar con "At least one updatable field must be provided")<br>- `PATCH /customers/:id` a un cliente inexistente sigue devolviendo 404 sin relación al nuevo campo | - Requiere permiso `customers:write`<br>- `code` y `currentBalance` siguen ignorados en el PATCH aunque vengan en el body (no debe abrirse una vía indirecta de mutarlos junto con `creditDays`)<br>- `creditDays` no se expone como campo mutable desde ningún otro módulo (ej. POS/Quotes) — sólo desde `customers-api` |
| 3 | Cualquier rol con `customers:read` | Como usuario con `customers:read`, quiero ver `creditDays` en las respuestas de `GET /customers` y `GET /customers/:id` para conocer el plazo de crédito vigente de cada cliente | Sin visibilidad del dato, ningún consumidor (UI, reportes, futuro catálogo) puede mostrar ni auditar el plazo de crédito pactado | - `GET /customers/:id` incluye `creditDays` en el JSON de respuesta para todo cliente, incluyendo los creados antes de este cambio (deben reflejar el default 30 ya persistido en BD)<br>- `GET /customers` (listado paginado) incluye `creditDays` en cada item del array | - Respeta el guard `customers:read` ya existente, sin nueva exposición de datos sensibles (el campo es un plazo numérico, no dato fiscal/financiero crítico adicional) |

## Why

El campo `creditDays` (plazo de crédito en días) ya existe en la columna `credit_days` de la tabla `customers` desde la migración `20260726000001_add_sale_due_date`, con default 30, y `PrismaSaleRepository` ya lo consume internamente para calcular `dueDate` en ventas a crédito. Pero está completamente ausente de la capa de aplicación del módulo `customers`: no está en la entidad `Customer`, ni en los DTOs, ni en la validación Zod del `CustomersController`, ni documentado en `openspec/specs/customers-api/spec.md`. El resultado es que hoy es imposible administrar este plazo por cliente vía API — todo cliente queda fijo en 30 días salvo que alguien lo edite directamente en la base de datos. Esto bloquea, entre otras cosas, la futura UI de gestión de clientes que necesita permitir capturar y editar este dato junto con el resto de datos de crédito (`creditLimit`).

## What Changes

- Agregar `creditDays: number` a `CustomerProps` (dominio) y a la clase `Customer`.
- Agregar `creditDays: number` a `CustomerDto` (salida) y `creditDays?: number` a `CreateCustomerRequest`/`UpdateCustomerRequest`.
- Mapear `creditDays` en `toCustomerDto`.
- Agregar `creditDays?: number` a `CreateCustomerData`/`UpdateCustomerData` en el puerto `CustomerRepository`.
- `CreateCustomerUseCase` aplica default 30 cuando no se especifica.
- `PrismaCustomerRepository`: seleccionar/mapear `creditDays` en `toCustomer()`, incluirlo en `create()` (default 30) y `update()` (sólo si viene en el payload).
- `InMemoryCustomerRepository`: mismo tratamiento para paridad de tests.
- `CustomersController`: `createBodySchema` agrega `creditDays: z.coerce.number().int().min(0).default(30)`; `updateBodySchema` agrega el mismo campo como opcional y lo suma a la condición del `.refine()` de "al menos un campo actualizable".
- No requiere migración Prisma nueva — la columna `credit_days` ya existe en BD.
- Actualizar `openspec/specs/customers-api/spec.md` (delta) con el campo en el DTO documentado y un nuevo requisito "Customer credit days" con los escenarios de creación/actualización/lectura/rechazo por valor inválido.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `customers-api`: se agrega el campo `creditDays` al DTO de cliente y su validación en create/update; nuevo requisito de negocio sobre el plazo de crédito administrable por cliente.

## Impact

- **Código afectado**: `src/modules/customers/domain/entities/Customer.ts`, `src/modules/customers/application/dto/{CustomerDto,CreateCustomerRequest,UpdateCustomerRequest}.ts`, `src/modules/customers/application/mappers/toCustomerDto.ts`, `src/modules/customers/application/ports/CustomerRepository.ts`, `src/modules/customers/application/use-cases/CreateCustomerUseCase.ts`, `src/modules/customers/infrastructure/repositories/{PrismaCustomerRepository,InMemoryCustomerRepository}.ts`, `src/modules/customers/infrastructure/http/CustomersController.ts`.
- **APIs**: `POST /api/v1/admin/customers`, `PATCH /api/v1/admin/customers/:id`, `GET /api/v1/admin/customers`, `GET /api/v1/admin/customers/:id` — todas ganan/exponen el campo `creditDays` sin cambio de forma de URL ni de permisos.
- **Dependencias**: ninguna nueva; no se toca `PrismaSaleRepository` (sigue leyendo `credit_days` directo de la tabla, comportamiento sin cambios).
- **Consumidores futuros**: habilita el change `add-customers-catalog-ui` (UI de gestión de clientes) a mostrar/editar este campo.
