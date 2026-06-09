## Context

El módulo `auth` ya provee identificación (login, registro, refresh, logout) y un middleware que verifica el access token JWT en `/api/v1/**` y en páginas privadas. Pero hoy **autenticación ≠ autorización**: una vez que el usuario tiene un token válido, puede invocar cualquier endpoint protegido. Para soportar perfiles distintos del negocio agrícola (administrador, operador de campo, agrónomo, visor) necesitamos un mecanismo de autorización tipado, persistido y testeable.

El stack vigente es Next.js 14 App Router + TypeScript estricto + Prisma 5 + Supabase Postgres + Jest. La autenticación es **custom JWT** (HS256), no Supabase Auth, así que tampoco usamos RLS de Postgres como mecanismo de gating — el control vive en la capa de aplicación. La arquitectura hexagonal del módulo `auth` (puertos en `application/`, adaptadores en `infrastructure/`) es el patrón que replicaremos.

El modelo elegido es **RBAC clásico** (`users → roles → permissions`, sin scopes ni atributos dinámicos), por simplicidad y porque cubre todos los escenarios actuales y previsibles a corto plazo. ABAC se evaluará si aparece un requisito que RBAC no pueda expresar.

## Goals / Non-Goals

**Goals:**
- Modelar `Role`, `Permission` y sus relaciones (`role_permissions`, `user_roles`) en el dominio y en Postgres.
- Exponer un puerto `AuthorizationService` con un método `userCan(userId, permissionKey)` que sea la *única* fuente de verdad de autorización.
- Cargar los roles del usuario en el JWT (`roles: string[]`) para gating grueso en UI, manteniendo los permisos finos fuera del token (consulta en backend con caché en memoria).
- Proveer un guard reutilizable `requirePermission(req, "resource:action")` que los route handlers invocan al inicio.
- Permitir asignar/revocar roles a usuarios y permisos a roles vía API administrativa.
- Seed inicial determinístico (`admin`, `operator`, `viewer`) para que el sistema tenga roles base en cualquier entorno tras la migración.
- Tests unitarios de dominio + use cases y tests de integración que cubran el flujo `asignar rol → request autorizada/denegada`.

**Non-Goals:**
- UI de administración de roles/permisos (queda para `add-rbac-ui`).
- ABAC, scopes por recurso (ej. "edita SOLO la finca X"), permisos condicionales o políticas dinámicas.
- Row-Level Security de Postgres (no aplica porque la auth es custom JWT).
- Revocación inmediata global (los tokens emitidos siguen siendo válidos hasta expirar; el cambio de rol surte efecto en el próximo refresh — aceptado por TTL corto de 15 min).
- Auditoría histórica de cambios de permisos (suficiente con `created_at`/`updated_at` en este iteración).
- Cache distribuido (Redis): el cache de permisos vive en memoria por proceso. Suficiente para el deploy monolítico actual.

## Decisions

### D1 — Módulo hexagonal `rbac` paralelo a `auth`

**Decisión**: Crear `src/modules/rbac/` como módulo independiente, hermano de `src/modules/auth/`. El módulo `auth` queda como dueño de la identidad (quién eres); `rbac` queda como dueño de la autorización (qué puedes hacer). Comunicación entre ambos vía puertos: `auth.RegisterUseCase` depende del puerto `RoleAssigner` (definido en `rbac/application/ports/`), no de la implementación.

```
src/modules/rbac/
├── domain/
│   ├── entities/
│   │   ├── Role.ts
│   │   └── Permission.ts
│   ├── value-objects/
│   │   ├── RoleName.ts            # snake_case, [a-z_]{2,32}
│   │   └── PermissionKey.ts       # resource:action, ej. "users:read"
│   └── errors/
│       ├── RoleNotFoundError.ts
│       ├── PermissionNotFoundError.ts
│       ├── RoleAlreadyAssignedError.ts
│       └── PermissionAlreadyGrantedError.ts
├── application/
│   ├── ports/
│   │   ├── RoleRepository.ts             # findById, findByName, list, save
│   │   ├── PermissionRepository.ts       # findById, findByKey, list, save
│   │   ├── UserRoleRepository.ts         # assign, revoke, listByUser
│   │   ├── RolePermissionRepository.ts   # grant, revoke, listByRole
│   │   ├── AuthorizationService.ts       # userCan(userId, permissionKey), listUserPermissions(userId)
│   │   └── RoleAssigner.ts               # consumido por auth.RegisterUseCase
│   ├── use-cases/
│   │   ├── AssignRoleToUserUseCase.ts
│   │   ├── RevokeRoleFromUserUseCase.ts
│   │   ├── GrantPermissionToRoleUseCase.ts
│   │   ├── RevokePermissionFromRoleUseCase.ts
│   │   ├── ListUserPermissionsUseCase.ts
│   │   ├── ListRolesUseCase.ts
│   │   ├── ListPermissionsUseCase.ts
│   │   └── CheckUserPermissionUseCase.ts
│   ├── dto/
│   │   ├── AssignRoleRequest.ts
│   │   ├── GrantPermissionRequest.ts
│   │   └── PermissionListResponse.ts
│   └── mappers/
│       ├── RoleMapper.ts
│       └── PermissionMapper.ts
└── infrastructure/
    ├── repositories/
    │   ├── RolePrismaRepository.ts
    │   ├── PermissionPrismaRepository.ts
    │   ├── UserRolePrismaRepository.ts
    │   └── RolePermissionPrismaRepository.ts
    ├── services/
    │   ├── PrismaAuthorizationService.ts  # implementa AuthorizationService con caché
    │   └── PrismaRoleAssigner.ts          # implementa RoleAssigner
    ├── http/
    │   ├── RbacController.ts              # delega a use cases
    │   └── requirePermission.ts           # guard reutilizable
    └── di/
        └── container.ts                   # instancia repos + services + use cases
```

**Alternativa considerada**: Meter `rbac` dentro de `src/modules/auth/`. Rechazada porque acopla identidad con autorización y crece el módulo `auth` con responsabilidades distintas. Mantenerlos separados permite, p.ej., reemplazar `auth` por OIDC en el futuro sin tocar `rbac`.

**Rationale**: La regla de capas se respeta: `auth/application/use-cases/RegisterUseCase` depende de **un puerto** `RoleAssigner` cuya interfaz vive en `rbac/application/ports/`. La inyección del adaptador concreto (`PrismaRoleAssigner`) ocurre en el contenedor DI del lado infraestructura. Ningún archivo de dominio importa de otro módulo.

---

### D2 — Modelo de datos: 4 tablas + seed determinístico

**Decisión**: Cuatro tablas en `public` (Postgres):

```sql
-- roles: catálogo de roles
CREATE TABLE public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(32) NOT NULL UNIQUE,         -- snake_case
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX roles_name_idx ON public.roles (name);

-- permissions: catálogo de permisos
CREATE TABLE public.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(64) NOT NULL UNIQUE,         -- formato resource:action
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX permissions_key_idx ON public.permissions (key);

-- role_permissions: M:N entre roles y permisos
CREATE TABLE public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)        ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id)  ON DELETE CASCADE,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX role_permissions_permission_idx ON public.role_permissions (permission_id);

-- user_roles: M:N entre usuarios y roles
CREATE TABLE public.user_roles (
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX user_roles_role_idx ON public.user_roles (role_id);
```

**Schema Prisma equivalente** (extracto):

```prisma
model Role {
  id          String   @id @default(uuid())
  name        String   @unique @db.VarChar(32)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  permissions RolePermission[]
  users       UserRole[]

  @@index([name])
  @@map("roles")
}

model Permission {
  id          String   @id @default(uuid())
  key         String   @unique @db.VarChar(64)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  roles RolePermission[]

  @@index([key])
  @@map("permissions")
}

model RolePermission {
  roleId       String @map("role_id")
  permissionId String @map("permission_id")
  grantedAt    DateTime @default(now()) @map("granted_at")

  role       Role       @relation(fields: [roleId],       references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId     String @map("user_id")
  roleId     String @map("role_id")
  assignedAt DateTime @default(now()) @map("assigned_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
  @@map("user_roles")
}
```

El modelo `User` existente gana la relación inversa `roles UserRole[]`.

**Seed inicial** (`prisma/seed.ts`, idempotente — usa `upsert` por `name`/`key`):

| Rol | Permisos |
|---|---|
| `admin`    | `users:read`, `users:write`, `roles:read`, `roles:write` |
| `operator` | `users:read`, `roles:read` |
| `viewer`   | `users:read` |

**Alternativa considerada**: Un único permiso `permissions text[]` en la tabla `roles` (sin tabla intermedia). Rechazada por pérdida de integridad referencial y de capacidad de auditar `granted_at` por permiso.

**Rationale**: Cuatro tablas con FKs `ON DELETE CASCADE` es el patrón estándar de RBAC; permite consultas eficientes (`SELECT key FROM permissions p JOIN role_permissions rp ON ... JOIN user_roles ur ON ... WHERE ur.user_id = $1`) con índices apropiados, y delega la integridad a Postgres.

---

### D3 — JWT lleva `roles` (nombres), no permisos

**Decisión**: El access token incluye un nuevo claim `roles: string[]` con los **nombres** de los roles del usuario al momento de emitir el token. Los **permisos finos NO viajan en el JWT**.

```ts
// TokenPayload (puerto)
export interface TokenPayload {
  sub: string;
  email: string;
  roles?: string[];   // nuevo, opcional para retro-compatibilidad
}
```

**Por qué nombres de roles y no permisos**:
- Tamaño del token: roles ≤ 5 strings cortas; permisos pueden ser docenas.
- Estabilidad: los permisos asignados a un rol cambian con más frecuencia que los roles asignados a un usuario.
- UI gating: la UI necesita "este usuario es admin" o "este usuario puede ver lo de operador" — granularidad de rol es suficiente.
- Decisiones finas: el backend resuelve `userCan(userId, "users:write")` consultando Postgres con cache, no el token. Eso garantiza que **revocar un permiso de un rol surte efecto al expirar la cache (60s)**, no al expirar el token.

**Verificación**: `JwtTokenService.verifyAccessToken` devuelve `TokenPayload` con `roles: string[]` si está presente, `[]` si no (tokens viejos).

**Alternativa considerada (1)**: Meter permisos en el token. Rechazada por las razones de tamaño y staleness arriba.

**Alternativa considerada (2)**: No tocar el JWT en absoluto y resolver siempre por backend. Rechazada porque la UI tendría que hacer un round-trip extra al cargar para saber "qué menús mostrar". Con `roles` en el token, el menú lateral se gating-ea sin red.

**Rationale**: Tokens cortos + permisos resolvidos server-side = mejor balance entre staleness, tamaño y UX.

---

### D4 — Cache en memoria de `userId → Set<permissionKey>` con TTL 60s

**Decisión**: `PrismaAuthorizationService` mantiene un `Map<string, { permissions: Set<string>; expiresAt: number }>` en memoria por proceso Node. TTL fijo de 60 segundos.

```ts
async userCan(userId: string, key: string): Promise<boolean> {
  const cached = this.cache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.permissions.has(key);

  const permissions = await this.fetchUserPermissions(userId); // query SQL
  this.cache.set(userId, { permissions, expiresAt: now + 60_000 });
  return permissions.has(key);
}
```

**Invalidación**:
- `AssignRoleToUserUseCase`, `RevokeRoleFromUserUseCase`, `GrantPermissionToRoleUseCase` y `RevokePermissionFromRoleUseCase` exponen un hook `cache.invalidate(userId | role.userIds)` que se llama tras persistir el cambio.
- En cluster (multi-proceso) hay drift máximo de 60s. **Aceptado** para esta iteración; cuando escalemos a múltiples instancias se cambia a Redis con pub/sub para invalidación cross-proceso.

**Alternativa considerada**: Sin cache, query a Postgres en cada request protegida. Rechazada por latencia y carga innecesaria — un dashboard con 20 calls por carga golpearía Postgres 20 veces.

**Rationale**: 60s es el sweet-spot: corto para staleness aceptable, largo para amortizar el costo del query. La SQL del fetch es una sola consulta con dos JOINs sobre tablas pequeñas (`permissions`, `role_permissions`, `user_roles`).

---

### D5 — Guard `requirePermission` en los route handlers, no en el middleware

**Decisión**: El middleware Next.js **NO valida permisos**. Solo valida autenticación y propaga `x-user-id`, `x-user-email`, `x-user-roles`. La autorización fina la hace cada route handler al inicio:

```ts
// app/api/v1/admin/users/[id]/roles/route.ts
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { rbacController } from "@/modules/rbac/infrastructure/di/container";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission(req, "roles:write");
  if (guard) return guard;     // 403 ya construido
  return rbacController.assignRole(req, params.id);
}
```

`requirePermission(req, key)`:
1. Lee `x-user-id` del header propagado por el middleware.
2. Llama `authorizationService.userCan(userId, key)`.
3. Devuelve `null` si autorizado, `NextResponse.json({ error: "Forbidden" }, { status: 403 })` si no.

**Por qué no en el middleware**:
- El middleware corre en Edge runtime (limitado, sin `@prisma/client`). Hoy ya usa `jose` por esa razón. Meter `PrismaAuthorizationService` en el middleware significaría exponer una API HTTP interna o duplicar la lógica.
- La granularidad ruta → permiso varía: `/api/v1/users/[id]` puede requerir `users:read` para GET y `users:write` para PATCH. Modelar eso como tabla de routing en el middleware es frágil.
- Tener la decisión en el handler hace el flujo explícito y testeable: el test del handler verifica que el guard se invoca con la key correcta.

**Trade-off**: Cada handler debe acordarse de llamar al guard. Mitigación: helper `withPermission(key, handler)` que envuelve el handler para hacerlo declarativo, y un lint rule (futuro) que detecte rutas en `/api/v1/admin/**` sin guard.

**Rationale**: Edge-friendly, granularidad fina, fácil de testear.

---

### D6 — `RegisterUseCase` asigna rol por defecto vía puerto `RoleAssigner`

**Decisión**: `auth.RegisterUseCase` recibe un nuevo puerto `RoleAssigner` (definido en `rbac/application/ports/`) y lo invoca tras `userRepo.save(user)`:

```ts
await this.userRepo.save(user);
await this.roleAssigner.assignDefaultRole(user.id);  // → asigna "viewer"
```

`PrismaRoleAssigner.assignDefaultRole(userId)`:
- Busca el rol cuyo nombre es el de `process.env.RBAC_DEFAULT_ROLE` (default: `viewer`).
- Inserta en `user_roles`. Idempotente (PK compuesta + `ON CONFLICT DO NOTHING`).

**Rationale**: La regla "todo usuario nuevo es viewer" es una **decisión de negocio**, no de infraestructura. Vivir en un puerto permite cambiarla (a `operator`, o a "sin rol") sin tocar la entidad `User` ni el use case.

**Configuración**: `RBAC_DEFAULT_ROLE=viewer` en `.env.local` y `.env.example`. Si la variable apunta a un rol que no existe, el registro falla al inicio (fail-fast en boot del contenedor DI).

---

### D7 — Endpoints administrativos versionados `/api/v1/admin/**`

**Decisión**: Las APIs de gestión quedan bajo `/api/v1/admin/` para separarlas semánticamente de las APIs de negocio y aplicar la lista pública del middleware con prefijos claros.

| Endpoint | Permiso requerido | Acción |
|---|---|---|
| `GET    /api/v1/admin/roles`                              | `roles:read`  | Listar roles |
| `GET    /api/v1/admin/roles/:id/permissions`              | `roles:read`  | Listar permisos del rol |
| `POST   /api/v1/admin/roles/:id/permissions`              | `roles:write` | Conceder permiso al rol (body: `{ permissionKey }`) |
| `DELETE /api/v1/admin/roles/:id/permissions/:permId`      | `roles:write` | Revocar permiso del rol |
| `GET    /api/v1/admin/permissions`                        | `roles:read`  | Listar permisos disponibles |
| `POST   /api/v1/admin/users/:id/roles`                    | `users:write` | Asignar rol a usuario (body: `{ roleName }`) |
| `DELETE /api/v1/admin/users/:id/roles/:roleId`            | `users:write` | Revocar rol de usuario |
| `GET    /api/v1/admin/users/:id/permissions`              | `users:read`  | Listar permisos efectivos del usuario |

Todos validados con Zod en `RbacController` antes de delegar al use case.

---

## Risks / Trade-offs

- **[Riesgo] Token stale tras cambio de rol** → El access token sigue siendo válido hasta expirar (15 min). Mitigación: refresh corto + cache de permisos de 60s en backend (las decisiones server-side son frescas). Cambio de rol surte efecto inmediato para permisos finos, hasta 15 min de retraso para gating UI.
- **[Riesgo] Cache en memoria pierde consistencia en cluster** → Drift máximo 60s entre procesos. Aceptado para deploy monolítico actual. Mitigación futura: Redis con pub/sub.
- **[Trade-off] Roles como nombres en JWT vs IDs** → Nombres son legibles y estables; IDs son únicos pero crípticos. Se elige nombres porque la UI los muestra y porque renombrar roles ya implica migración explícita.
- **[Riesgo] Seed se ejecuta accidentalmente en prod** → Mitigación: el seed usa `upsert` por `name`/`key`, así que es idempotente. Si alguien renombra `admin` → `super_admin` en seed, no destruye datos (crea el nuevo, deja el viejo).
- **[Riesgo] El guard `requirePermission` no se invoca en algún handler nuevo** → Test E2E catch-all que enumera rutas bajo `/api/v1/admin/**` y verifica que cada una devuelve 403 cuando el JWT no tiene el rol correcto. Futuro: lint rule.
- **[Trade-off] RBAC ≠ ABAC** → No soportamos "edita SOLO la finca X". Si aparece ese requisito se evalúa migración a CASL o Casbin; por ahora YAGNI.
- **[Riesgo] Migración Prisma fallida en Supabase remoto** → Mitigación: `prisma migrate dev` local primero, revisar SQL generado, ejecutar `prisma migrate deploy` en CI/CD con `DIRECT_URL`. Seed corre como script TS separado (`npm run seed`), no como parte de la migración.
- **[Riesgo] Cascade delete borra `user_roles` al borrar un `User`** → Deseable: si el usuario se elimina, sus asignaciones desaparecen. Sin embargo, no hay soft-delete de usuarios en este iteración; cuando se añada, revisar la cascada.
