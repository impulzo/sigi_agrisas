## 1. Base de datos y Prisma

- [x] 1.1 Agregar modelo `TaxRate` a `prisma/schema.prisma`: `id String @id @default(uuid())`, `code String @unique @db.VarChar(32)`, `name String @db.VarChar(100)`, `description String? @db.Text`, `rate Decimal @db.Decimal(5,4)`, `isActive Boolean @default(true) @map("is_active")`, `createdAt/updatedAt`. Índices en `code`.
- [x] 1.2 Agregar campo `taxRateId String? @map("tax_rate_id")` y relación `taxRate TaxRate? @relation(...)` en modelo `Product`. FK `ON DELETE SET NULL`.
- [x] 1.3 Ejecutar `npx prisma migrate dev --name add_tax_rates_table` y verificar migración generada.
- [x] 1.4 Ejecutar `npx prisma generate` para regenerar el cliente.

## 2. Seed

- [x] 2.1 Crear `prisma/seeds/taxRates.ts` con upsert idempotente para `IVA_16` (0.1600), `IEPS_8` (0.0800), `IVA_0` (0.0000).
- [x] 2.2 Registrar `seedTaxRates()` en `prisma/seed.ts`.
- [x] 2.3 Agregar `tax_rates:read` y `tax_rates:write` al array de permisos en `prisma/seeds/rbac.ts`; asignar `tax_rates:read` a `viewer`, `admin`, `operator`; `tax_rates:write` a `admin`, `operator`.

## 3. Módulo hexagonal `tax-rates` — Dominio

- [x] 3.1 Crear `src/modules/tax-rates/domain/entities/TaxRate.ts` — entity pura con campos y método `isUsableBy(product)`.
- [x] 3.2 Crear `src/modules/tax-rates/domain/errors.ts` — `TaxRateNotFoundError`, `TaxRateCodeAlreadyInUseError`, `TaxRateInUseByProductsError`.

## 4. Módulo hexagonal `tax-rates` — Application

- [x] 4.1 Crear port `src/modules/tax-rates/application/ports/TaxRateRepository.ts` con métodos `list`, `findById`, `findByCode`, `create`, `update`, `findActiveProductCount(id)`.
- [x] 4.2 Crear DTOs en `src/modules/tax-rates/application/dto/TaxRateDto.ts`.
- [x] 4.3 Crear use cases: `ListTaxRatesUseCase`, `GetTaxRateUseCase`, `CreateTaxRateUseCase`, `UpdateTaxRateUseCase`, `DeactivateTaxRateUseCase`.

## 5. Módulo hexagonal `tax-rates` — Infraestructura

- [x] 5.1 Crear `PrismaTaxRateRepository` en `src/modules/tax-rates/infrastructure/repositories/PrismaTaxRateRepository.ts`.
- [x] 5.2 Crear `TaxRatesController` en `src/modules/tax-rates/infrastructure/http/TaxRatesController.ts` con handlers `list`, `getById`, `create`, `update`, `deactivate`.
- [x] 5.3 Crear DI container `src/modules/tax-rates/infrastructure/di/container.ts` que exporta `taxRatesController`.

## 6. Routes API

- [x] 6.1 Crear `app/api/v1/admin/tax-rates/route.ts` — GET (list), POST (create).
- [x] 6.2 Crear `app/api/v1/admin/tax-rates/[id]/route.ts` — GET (detail), PATCH (update), DELETE (deactivate).

## 7. Módulo `products` — Backend

- [x] 7.1 Agregar `taxRateId?: string | null` al DTO de creación y actualización de productos en `src/modules/products/application/`.
- [x] 7.2 Validar en controller que `taxRateId` referencia una tasa activa (consulta `PrismaTaxRateRepository.findById` o join en el repositorio de productos).
- [x] 7.3 Actualizar `PrismaProductRepository.list` para incluir `taxRateId` y `taxRateCode` (join con `tax_rates`).
- [x] 7.4 Actualizar `PrismaProductRepository.findById` para incluir `taxRate: { id, code, name, rate } | null`.
- [x] 7.5 Actualizar el mapper de `Product` → `ProductDto` con los nuevos campos.

## 8. Frontend — Tax Rates

- [x] 8.1 Crear tipos y servicios: `app/(private)/catalogs/tax-rates/_logic/types/domain.ts`, `api.ts`, `services/taxRates.ts` (list, create, update, deactivate).
- [x] 8.2 Crear hook `useTaxRatesList` en `app/(private)/catalogs/tax-rates/_logic/hooks/`.
- [x] 8.3 Crear `TaxRatesTable` en `app/(private)/catalogs/tax-rates/_blocks/TaxRatesTable.tsx`.
- [x] 8.4 Crear `TaxRateEditModal` en `app/(private)/catalogs/tax-rates/_blocks/TaxRateEditModal.tsx` — campos Código, Nombre, Descripción, Tasa %.
- [x] 8.5 Crear `TaxRatesPage` en `app/(private)/catalogs/tax-rates/_blocks/TaxRatesPage.tsx` con CatalogShell, toolbar, paginación, modal.
- [x] 8.6 Crear `app/(private)/catalogs/tax-rates/page.tsx` (Server Component, metadata, monta `TaxRatesPage`).

## 9. Frontend — Hub y navegación

- [x] 9.1 Agregar tarjeta "Tasas de impuesto" a `CatalogsHubPage` con ruta `/catalogs/tax-rates` e ícono `percent` (gated en `tax_rates:read`).

## 10. Frontend — Products integración

- [x] 10.1 Crear hook `useTaxRatesOptions` en `app/_hooks/useTaxRatesOptions.ts` (fetch de tasas activas, caché 60 s, análogo a `usePaymentMethodsOptions`).
- [x] 10.2 Agregar `TaxRateCombobox` en `ProductGeneralTab` usando `useTaxRatesOptions`; campo opcional.
- [x] 10.3 Actualizar `ProductEditModal` para incluir `taxRateId` en el payload de create/edit; calcular diff correctamente.
- [x] 10.4 Agregar columna "Tasa" en `ProductsTable` (después de "Departamento") mostrando `taxRateCode` o "—".
- [x] 10.5 Actualizar tipos de dominio frontend de productos: `taxRateId`, `taxRateCode` en `ProductListItem`; `taxRate` en `ProductDetail`.
