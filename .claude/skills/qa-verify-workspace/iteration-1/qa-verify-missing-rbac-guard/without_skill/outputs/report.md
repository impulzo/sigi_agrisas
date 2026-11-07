# QA — `POST /api/v1/admin/vehicles/[id]/documents`

**Veredicto: BLOQUEANTE. No abrir PR contra `develop` en este estado.**

Diff analizado (no aplicado al repo, revisado como texto contra el estado actual de `develop`): `app/api/v1/admin/vehicles/[id]/documents/route.ts` (archivo nuevo, 33 líneas).

## 1. Bloqueantes (rompen build / runtime)

**1.1 `VehicleDocument` no existe en el schema de Prisma.** `prisma.vehicleDocument.create(...)` referencia un modelo que no existe en `prisma/schema.prisma`. Sólo existe `model Vehicle` (schema.prisma:242-259); no hay `VehicleDocument` ni migración `add_vehicle_documents`. Esto no compila (Prisma Client no tiene esa propiedad) y, aunque compilara, la tabla no existe en DB. Falta migración Prisma + modelo + `npx prisma generate`.

**1.2 Bucket de Supabase Storage no confirmado.** El diff sube a `storage.from("vehicle-documents")`. No hay evidencia de que ese bucket exista (los buckets confirmados en el repo son `expense-photos` y análogos de products/settings).

## 2. Violaciones de arquitectura hexagonal (CLAUDE.md: "Reglas de capas (backend)")

El diff viola simultáneamente las tres reglas de capas: "route handlers no contienen lógica", "validación Zod en el controller", "use cases reciben ports, nunca implementaciones concretas".

- **Lógica de negocio en el route handler**: llama directo a `prisma.vehicle.findUnique`, hace `import()` dinámico del `storageClient`, y llama `prisma.vehicleDocument.create`, todo dentro del `POST`. Ya existe el módulo hexagonal completo `src/modules/vehicles/` (domain/application/infrastructure) y el diff lo ignora por completo: no agrega use-case, no agrega port, no toca `VehiclesController` ni el DI container (`src/modules/vehicles/infrastructure/di/container.ts`).
- **Sin Zod**: no valida `label` ni el archivo (tipo/tamaño). Compárese con `VehiclesController` (líneas 14-59), que valida todo con Zod antes de los use cases.
- **Acoplamiento directo a Prisma y Supabase SDK** en vez de port + implementación inyectada. El patrón ya existe en el repo para este caso exacto (foto/documento adjunto): `ExpensePhotoStoragePort` + `SupabaseExpensePhotoStorage` (`src/modules/expenses/infrastructure/services/SupabaseExpensePhotoStorage.ts`) + `UploadExpensePhotoUseCase` (`src/modules/expenses/application/use-cases/UploadExpensePhotoUseCase.ts`). El endpoint de documentos de vehículos debería seguir el mismo molde.

## 3. RBAC — falta guard de permiso (hallazgo central)

Ningún otro endpoint admin del repo omite `requirePermission`. Ejemplos directamente comparables:

```ts
// app/api/v1/admin/expenses/[id]/photo/route.ts
const guard = await requirePermission(req, "expenses:write");
if (guard) return guard;
return expensesController.uploadPhoto(req, params.id);
```
```ts
// app/api/v1/admin/vehicles/[id]/route.ts (ya existente en el repo)
const guard = await requirePermission(req, "vehicles:write");
if (guard) return guard;
return vehiclesController.update(req, params.id);
```

El diff nuevo **no llama `requirePermission` en ningún punto**. El middleware global sólo garantiza token válido (401), no autorización por recurso. Resultado: cualquier usuario autenticado — incluido rol `viewer` — puede subir/crear documentos de vehículos. Esto contradice el patrón RBAC de CLAUDE.md y los escenarios "Unauthorized user (write)" de `openspec/specs/admin-vehicles/spec.md`. Falta decidir (vía proposal) si reutiliza `vehicles:write` o crea un permiso nuevo, pero en cualquier caso el guard está ausente, no es un detalle menor.

## 4. Seguridad / validación de archivo

- Sin whitelist de `contentType`/extensión ni límite de tamaño (comparar con `UploadExpensePhotoUseCase`: `ALLOWED_MIMES`, `MAX_BYTES = 2MB`, errores tipados → 413/415). Aquí se acepta cualquier archivo de cualquier tamaño.
- `path = \`vehicle-documents/${params.id}/${file.name}\`` usa el nombre de archivo del cliente sin sanitizar — riesgo de colisión/sobrescritura y de inyección de path en la key del bucket. `SupabaseExpensePhotoStorage` usa `randomUUID()` en el key precisamente para evitar esto.
- `params.id` no se valida como UUID explícito antes de usarlo en Prisma (el resto del módulo usa `uuidSchema` en el controller).

## 5. Otros gaps

- `Vehicle` no tiene `branchId` en el schema, así que branch scoping no aplica aquí (verificado, no es una omisión real).
- Sólo hay `POST`, no `GET`/`DELETE` para los documentos — puede ser alcance intencional, pero conviene confirmarlo.
- Manejo de errores genérico (500 para todo); sin tests (ni unit ni integración).

## 6. Proceso — OpenSpec

CLAUDE.md exige `opsx:propose` → aprobación → `opsx:apply` → `opsx:verify` antes de implementar cualquier feature nueva. No existe `openspec/changes/.../` para esto ni actualización a `openspec/specs/admin-vehicles/spec.md`. El diff es código ya escrito sin proposal previo.

## Resumen

| # | Hallazgo | Severidad |
|---|---|---|
| 1 | `VehicleDocument` no existe en Prisma (no compila/no hay tabla) | Bloqueante |
| 2 | Bucket `vehicle-documents` no confirmado | Bloqueante (verificar) |
| 3 | Lógica de negocio en route handler; ignora módulo hexagonal existente | Alto — arquitectura |
| 4 | Sin Zod | Alto — arquitectura |
| 5 | **Sin `requirePermission` — cualquier rol autenticado puede escribir** | **Crítico — seguridad** |
| 6 | Sin whitelist tipo/tamaño de archivo | Alto — seguridad |
| 7 | `file.name` sin sanitizar en storage path | Alto — seguridad |
| 8 | `params.id` sin validación UUID explícita | Medio |
| 9 | Sin tests | Alto — calidad |
| 10 | Falta proposal OpenSpec previo | Proceso |

**Recomendación**: no abrir el PR. Rehacer siguiendo el molde `expenses` (port + servicio Supabase + use case con validación mime/tamaño + método en `VehiclesController` + entrada DI), agregar modelo/migración `VehicleDocument`, agregar `requirePermission`, sanitizar el nombre de archivo, y correr `opsx:propose` antes de continuar.
