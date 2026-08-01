## 1. Dominio

- [x] 1.1 Agregar `creditDays: number` a `CustomerProps` y a la clase `Customer` en `src/modules/customers/domain/entities/Customer.ts`

## 2. Aplicación (DTOs, puertos, use cases)

- [x] 2.1 Agregar `creditDays: number` a `CustomerDto` en `src/modules/customers/application/dto/CustomerDto.ts`
- [x] 2.2 Agregar `creditDays?: number` a `CreateCustomerRequest` en `src/modules/customers/application/dto/CreateCustomerRequest.ts`
- [x] 2.3 Agregar `creditDays?: number` a `UpdateCustomerRequest` en `src/modules/customers/application/dto/UpdateCustomerRequest.ts`
- [x] 2.4 Mapear `creditDays` en `toCustomerDto` (`src/modules/customers/application/mappers/toCustomerDto.ts`)
- [x] 2.5 Agregar `creditDays?: number` a `CreateCustomerData` y `UpdateCustomerData` en el puerto `CustomerRepository` (`src/modules/customers/application/ports/CustomerRepository.ts`)
- [x] 2.6 `CreateCustomerUseCase` aplica default `30` cuando `creditDays` no viene en el request (`src/modules/customers/application/use-cases/CreateCustomerUseCase.ts`)

## 3. Infraestructura (repositorios)

- [x] 3.1 `PrismaCustomerRepository.toCustomer()` mapea `creditDays` desde la fila de Prisma
- [x] 3.2 `PrismaCustomerRepository.create()` incluye `creditDays` en el `data` de Prisma (default `30` si no viene)
- [x] 3.3 `PrismaCustomerRepository.update()` incluye `creditDays` en el `data` de Prisma sólo si `"creditDays" in data`
- [x] 3.4 `InMemoryCustomerRepository.create()` aplica el mismo default `30`
- [x] 3.5 `InMemoryCustomerRepository.update()` aplica el mismo tratamiento condicional que el resto de campos opcionales

## 4. HTTP (controller y validación)

- [x] 4.1 `createBodySchema` en `CustomersController.ts` agrega `creditDays: z.coerce.number().int().min(0).default(30)`
- [x] 4.2 `updateBodySchema` en `CustomersController.ts` agrega `creditDays: z.coerce.number().int().min(0).optional()` y lo suma a la condición del `.refine()` de "al menos un campo actualizable"

## 5. Tests

- [x] 5.1 Test unitario de `CreateCustomerUseCase` (con `InMemoryCustomerRepository`): sin `creditDays` → default 30
- [x] 5.2 Test unitario de `CreateCustomerUseCase`: con `creditDays: 45` → persiste 45
- [x] 5.3 Test unitario de `UpdateCustomerUseCase`: `{ creditDays: 60 }` como único campo → no lanza error de "campo requerido" y persiste el nuevo valor
- [x] 5.4 Test de `CustomersController` (o integración si existe suite): `creditDays: -1` en create y update → 400
- [x] 5.5 Test de `CustomersController`: `creditDays: 10.5` en create → 400

## 6. Verificación manual

- [x] 6.1 `npm test` pasa sin regresiones en `tests/unit/modules/customers/**` (46/46 tests unitarios OK)
- [x] 6.2 Verificado contra BD real vía `tests/integration/modules/customers/customers-crud.test.ts` (14/14 OK): creación sin `creditDays` → default 30 persistido y leído correctamente
- [x] 6.3 Confirmado por inspección: `PrismaSaleRepository` no fue modificado (`git diff` sin cambios) y sigue leyendo `creditDays` directo de Prisma (`select: { creditDays: true }`, `dueDate = addDays(completedAt, cust?.creditDays ?? 30)`), comportamiento intacto

## 7. Documentación

- [x] 7.1 Actualizar `CLAUDE.md` — sección "Capacidades CRUD admin admin" / notas de `customers-api` para mencionar `creditDays` junto a `creditLimit`/`currentBalance`
