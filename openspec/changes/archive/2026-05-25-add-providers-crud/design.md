## Context

El proyecto ya tiene 5 CRUDs admin previos siguiendo arquitectura hexagonal estricta: `admin-users-crud` (2026-05-18) y los 4 catálogos de `crud-settings-models` (2026-05-20: `payment-methods`, `folios`, `departments`, `branches`). Este change replica exactamente ese patrón para una nueva entidad de negocio: `Provider`.

A diferencia de los catálogos simples (`payment-methods`, `departments`, etc.), los proveedores tienen un componente fiscal con reglas mexicanas específicas. La regla del usuario es clara: **solo el RFC es obligatorio dentro de los datos fiscales**. El resto de campos fiscales (régimen, CFDI, código postal fiscal, razón social) son opcionales y se completan cuando el admin tenga la constancia de situación fiscal disponible.

El módulo `rbac` ya proporciona `requirePermission(req, "resource:action")` y un seed idempotente. No hay UI involucrada en este change; el frontend consumirá estos endpoints en un change posterior (`providers-ui` análogo a `users-ui`).

## Goals / Non-Goals

**Goals:**

- Un CRUD REST completo (`GET list` con búsqueda, `GET detail`, `POST create`, `PATCH update`, `DELETE` soft).
- Módulo hexagonal aislado bajo `src/modules/providers/`.
- Soft delete: `DELETE` marca `isActive = false`; los listados ocultan inactivos por defecto y `?includeInactive=true` los muestra; reactivar vía `PATCH { "isActive": true }`.
- Permisos RBAC granulares (`providers:read` y `providers:write`), sembrados de forma idempotente.
- Validación Zod en el controller, incluyendo regex de RFC mexicano; el dominio no conoce HTTP ni Zod.
- Búsqueda case-insensitive por `name`, `tradeName` o `rfc` vía `?search=` (server-side).
- Tests unitarios con repositorio in-memory + un test de integración contra Supabase Postgres.

**Non-Goals:**

- UI (ningún componente React; se entregará en un change `providers-ui` posterior).
- Validación contra el SAT (no se consultan endpoints externos para verificar el RFC).
- Lista de contactos múltiples por proveedor (un solo `contactName` y un solo `email`/`phone` por ahora).
- Histórico de cambios fiscales (un proveedor puede cambiar su RFC; se sobrescribe sin auditoría).
- Cuentas bancarias del proveedor (se modelarán en un change separado si surge la necesidad).
- Documentos adjuntos (constancia de situación fiscal en PDF, etc.).
- Importación masiva CSV/Excel.
- Multi-tenant scoping (todos los proveedores son globales).

## Decisions

### Decisión 1 — Tabla y módulo independientes (no dentro de `catalogs`)

`Provider` vive en `src/modules/providers/` con su propia tabla `providers`. No se mezcla con los catálogos de configuración (`payment_methods`, `folios`, …) porque conceptualmente un proveedor es una entidad de negocio que crece (puede ganar contactos, cuentas bancarias, documentos), mientras que los catálogos son referencias estáticas.

**Alternativa descartada:** añadir `Provider` al change `crud-settings-models`. Rompería la cohesión del módulo (que es solo catálogos de configuración) y obligaría a mezclar reglas fiscales con reglas de configuración interna.

### Decisión 2 — Campos del modelo `Provider`

Mínimo obligatorio (decisión del usuario + consistencia arquitectónica):

- `code: string` — clave de negocio inmutable (consistente con los demás catálogos del sistema)
- `name: string` — nombre comercial (lo que el usuario reconoce)
- `rfc: string` — RFC mexicano (único obligatorio fiscal)

Opcionales (datos fiscales y de contacto):

- `legalName: string | null` — razón social (denominación legal según constancia SAT)
- `taxRegime: string | null` — régimen fiscal SAT (3 dígitos, ej. `601`, `612`, `626`)
- `cfdiUse: string | null` — uso CFDI por defecto (ej. `G01`, `G03`)
- `taxZipCode: string | null` — código postal del domicilio fiscal (5 dígitos)
- `email: string | null` — email de contacto
- `phone: string | null` — teléfono
- `address: string | null` — dirección postal libre
- `contactName: string | null` — nombre del contacto principal
- `notes: string | null` — notas internas

Sistema:

- `isActive: boolean` (default `true`) — soft delete
- `createdAt: DateTime` / `updatedAt: DateTime`

**Alternativa descartada:** añadir `bankAccount` / `clabe` en este change. Sale del alcance "alta mínima"; se modelará cuando se implemente el módulo de pagos.

### Decisión 3 — `code` y `rfc` ambos UNIQUE; `code` inmutable, `rfc` editable

`code` se mantiene como clave de negocio inmutable (mismo patrón que los catálogos). `rfc` también es único en la BD (no puede haber dos proveedores con el mismo RFC) pero SÍ es editable vía PATCH — un proveedor puede corregir su RFC si se capturó mal. Ambos índices únicos se crean en la migración.

**Alternativa descartada:** RFC no único. Causaría duplicados al recibir CFDIs y dificultaría la conciliación.

**Alternativa descartada:** RFC inmutable como `code`. Castigaría capturas humanas erróneas — un typo en el RFC obligaría a desactivar y recrear el proveedor.

### Decisión 4 — Validación del RFC con regex permisivo

El RFC se valida con:

```
^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$
```

Esto cubre:

- Persona Moral: 12 caracteres (3 letras + 6 dígitos + 3 alfanuméricos)
- Persona Física: 13 caracteres (4 letras + 6 dígitos + 3 alfanuméricos)
- Genérico extranjero: `XEXX010101000` (encaja en el patrón)
- Genérico nacional al público en general: `XAXX010101000` (encaja en el patrón)

El RFC se normaliza a mayúsculas antes de persistir y validar. No se valida el cálculo del dígito verificador (homoclave) — eso sería un nivel de validación que aporta poco valor y bloquea casos legítimos de RFCs antiguos.

### Decisión 5 — Régimen fiscal y uso CFDI como strings libres validados con regex

`taxRegime` se valida como `^\d{3}$` (3 dígitos) si está presente. No se mantiene un catálogo enumerado en BD porque el SAT actualiza la lista periódicamente y mantener un seed sincronizado es un costo recurrente. El frontend puede ofrecer un dropdown estático con los valores comunes.

`cfdiUse` se valida como `^[A-Z]\d{2}$` (1 letra + 2 dígitos) si está presente (ej. `G01`, `G03`, `P01`, `S01`).

`taxZipCode` se valida como `^\d{5}$` (5 dígitos).

**Alternativa descartada:** tablas `tax_regimes` y `cfdi_uses` con catálogos enumerados. Sobreingeniería para el momento actual; el dominio no se beneficia de FKs aquí.

### Decisión 6 — Soft delete por campo `isActive` (consistente con catálogos)

`DELETE` marca `isActive = false`. `GET list` filtra `isActive = true` por defecto y acepta `?includeInactive=true`. `GET detail` siempre devuelve la entidad. Reactivar vía `PATCH { "isActive": true }` (no se expone endpoint `/restore` dedicado).

### Decisión 7 — `PATCH` parcial con "al menos un campo obligatorio"

Sigue el patrón establecido. Body vacío → HTTP 400. Campos no presentes no se tocan; `null` explícito en un campo opcional lo borra (lo setea a `null` en BD). El campo `code` en el body se ignora silenciosamente (no se rechaza, para mantener idempotencia).

### Decisión 8 — Búsqueda por `name`, `legalName` o `rfc` vía `?search=`

A diferencia de los catálogos previos, los proveedores se buscan por texto: `GET /api/v1/admin/providers?search=acme` hace un `OR ILIKE '%acme%'` en `name`, `legalName` y `rfc` (case-insensitive). La búsqueda se evalúa server-side, no client-side, porque la lista de proveedores puede crecer a miles de registros (a diferencia de los catálogos pequeños).

`search` es trimmed; si está vacío o solo whitespace se ignora. Búsquedas menores a 2 caracteres se rechazan (HTTP 400) para evitar `LIKE '%a%'` que devuelve toda la tabla.

### Decisión 9 — Repositorio Prisma con manejo de errores tipados

`PrismaProviderRepository.create` convierte:

- `P2002` con `target` que contiene `code` → `ProviderCodeAlreadyInUseError`
- `P2002` con `target` que contiene `rfc` → `ProviderRfcAlreadyInUseError`
- `P2025` (record not found) → `ProviderNotFoundError`

Esto se hace en el repositorio (no en el use case) para mantener la pureza del dominio.

### Decisión 10 — Permisos: `viewer` y `operator` reciben `:read`, `admin` recibe ambos

Mismo criterio que los catálogos: cualquier usuario autenticado con un rol base puede consultar el catálogo de proveedores; solo `admin` puede modificar. Esto facilita que un futuro módulo de compras (rol `operator`) pueda listar proveedores para seleccionarlos sin necesidad de un permiso adicional.

### Decisión 11 — Paginación offset con defaults conservadores

`?page=1&pageSize=20`, `pageSize` máx 100. Respuesta `{ items: ProviderDto[], total, page, pageSize }`. Mismo patrón que el resto del sistema.

### Decisión 12 — `rfc` se normaliza a mayúsculas y trim antes de persistir

El controller hace `body.rfc = body.rfc.trim().toUpperCase()` antes de pasar al use case. Esto garantiza que la unicidad case-insensitive funcione (un usuario que escribe `xaxx010101000` no debería poder crear un duplicado de `XAXX010101000`). Mismo tratamiento para `code` y `taxRegime`/`cfdiUse`.

## Risks / Trade-offs

- **RFC sin validación del dígito verificador (homoclave)** → Trade-off aceptado por simplicidad. Documentado en design. Un RFC con formato correcto pero dígito verificador incorrecto se acepta y se persiste; el operador humano es responsable de capturar bien.
- **`taxRegime` y `cfdiUse` sin catálogo enumerado** → Riesgo: el admin puede introducir valores inválidos (ej. `999`). Mitigación: el frontend mostrará un dropdown con valores válidos; el backend solo valida formato. Si en el futuro se necesita validar contra el SAT, se añadirán catálogos.
- **Soft delete sin restauración explícita** → Mitigación: reactivar vía `PATCH { "isActive": true }`. Consistente con catálogos.
- **`rfc` editable** → Riesgo: cambiar el RFC de un proveedor histórico podría confundir reportes futuros. Aceptado: el caso de corrección de errores es más común que el de cambio legítimo de RFC.
- **Sin auditoría de cambios** → Aceptado en este change; se añadirá un módulo `audit-log` transversal cuando sea necesario en otros módulos también.

## Migration Plan

Este change incluye una migración: `add_providers_table` que crea la tabla `providers` con índice único en `code` y en `rfc`.

Deploy:

1. `npm run build` — verifica tipos.
2. `npx prisma migrate deploy` — aplica la migración usando `DIRECT_URL`.
3. `npm run seed` — siembra los 2 nuevos permisos y los asigna a los roles base (idempotente vía `upsert`).
4. Deploy normal. Los nuevos endpoints estarán disponibles automáticamente.

Rollback:

1. Revertir el commit/deploy de código.
2. Migración de rollback manual `DROP TABLE providers;` y eliminar los 2 permisos nuevos. Como ningún módulo existente referencia esta tabla, el rollback es seguro.

## Open Questions

- ¿Validar que `taxZipCode` sea un código postal mexicano válido (rango 01000–99999)? → Por ahora solo se valida `^\d{5}$`. El SAT acepta cualquier CP de 5 dígitos en sus formatos; validar el rango aporta poco.
- ¿Permitir múltiples proveedores con el mismo `rfc` si uno está inactivo? → No. La restricción única en BD es global; si se necesita reusar un RFC se debe reactivar el proveedor existente vía PATCH.
- ¿`DELETE` devuelve `204 No Content` o `200`? → `204` para consistencia con `admin-users-crud` y `crud-settings-models`.
