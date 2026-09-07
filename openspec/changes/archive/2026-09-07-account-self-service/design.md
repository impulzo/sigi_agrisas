## Context

Ver `proposal.md` — "Why" y "Historia de Usuario" para motivación. Piezas ya existentes en el repo, confirmadas por exploración de código antes de este diseño:

- `AdminUserRepository.update` y `GetUserUseCase` — ya existen en `src/modules/users/`, usados hoy por el flujo admin.
- `UpdateUserUseCase` (admin) bloquea auto-edición con `SelfModificationError` (Historia 1 de la tabla exige justamente lo contrario: permitir editar el propio perfil) — por eso no se reusa ese use case, se crea uno paralelo.
- `SendSetPasswordEmailUseCase` + `IssuePasswordSetupTokenUseCase` (`src/modules/auth/application/use-cases/`) — ya existen y ya usa el flujo admin (`UsersController.resendSetPasswordEmail`, y al crear un usuario nuevo). Emite un token de un solo uso (hash en BD, 24h TTL, invalida enlaces previos) y envía el correo con el link a `/auth/set-password?token=...`. Historia 2 (corregida) reusa esto tal cual para el propio usuario — cero código de dominio nuevo para contraseña.
- JWT trae `email` en claims pero no `name` ni `avatarUrl` → GET propio es necesario para poblar el formulario de perfil.
- Middleware raíz ya exige token válido en toda ruta no pública y propaga `x-user-id` — no hace falta `requirePermission` en las rutas nuevas, sólo estar autenticado.

## Goals / Non-Goals

**Goals:**
- Habilitar a cualquier usuario autenticado a leer y editar su propio `name`/`email` (Historia 1), y a solicitar su propio enlace de cambio de contraseña (Historia 2).
- Reusar el máximo de infraestructura existente (`AdminUserRepository`, `GetUserUseCase`, `SendSetPasswordEmailUseCase`, `IssuePasswordSetupTokenUseCase`) sin duplicar lógica.
- Mantener el flujo admin (`UserEditModal`, `SendSetPasswordEmailUseCase`, guard `SelfModificationError`) sin ningún cambio de comportamiento — el self-service de contraseña usa exactamente el mismo use case, no uno paralelo.

**Non-Goals:**
- No se agrega edición de `avatarUrl`, `branchId` ni `roles` desde `/account` (fuera de alcance, tabla de historias no lo pide).
- **No existe cambio directo de contraseña** (contraseña actual + nueva) en ningún punto del flujo self-service — decisión explícita del usuario: la contraseña propia siempre se cambia vía enlace de correo, igual que el flujo admin. (Ver nota de corrección de alcance en `proposal.md` — la primera implementación de esta historia sí lo hizo directo con un `ChangeOwnPasswordUseCase` nuevo; se eliminó por completo tras la aclaración.)
- No se crea un módulo de dominio nuevo (`account`) — el análisis de código confirmó que toda la lógica encaja en `auth` (envío de enlace, ya existente) y `users` (perfil) sin justificar un módulo aparte.

## Decisions

**1. Ubicación de los use cases: `users` para perfil — no un módulo `account` nuevo. Contraseña no tiene use case propio: reusa `SendSetPasswordEmailUseCase` (`auth`) tal cual.**
`UpdateOwnProfileUseCase` vive en `src/modules/users/application/use-cases/` porque opera sobre `AdminUserRepository`, ya residente ahí. Para contraseña no se crea ningún use case nuevo — `AuthController.sendMyPasswordLink` delega directo a `sendSetPasswordEmailUseCase.execute(userId)`, el mismo singleton que ya usa `UsersController` para el flujo admin. Alternativa descartada: módulo hexagonal nuevo `account/` — se descarta porque no hay lógica de dominio propia que no sea composición de lo que ya existe en `auth`/`users`; crear un módulo nuevo sólo para exponer 3 endpoints violaría la regla del proyecto de no diseñar para abstracciones no necesarias.

**2. `UpdateOwnProfileUseCase` es un use case nuevo, no una reutilización de `UpdateUserUseCase` con flag.**
`UpdateUserUseCase` lanza `SelfModificationError` precisamente cuando `requesterId === id` — es el guard opuesto al que necesita self-service. Añadir un flag tipo `bypassSelfGuard` degradaría la claridad del use case admin (mezclaría dos políticas de autorización opuestas en un solo lugar). Un use case separado, más pequeño, es más legible y no arriesga aflojar el guard admin por accidente.

**3. Endpoints nuevos bajo `/api/v1/auth/` (`me`, `send-password-link`), no bajo `/api/v1/admin/users/`.**
Los endpoints admin viven bajo `/admin/users/:id` y exigen permiso `users:write`/`users:read`. Self-service no requiere ningún permiso RBAC (Criterio de Seguridad de ambas historias: "basta con estar autenticado") — colocarlo bajo `/admin/` sería semánticamente incorrecto y arriesgaría que alguien le agregue `requirePermission` por convención de carpeta. `/api/v1/auth/` ya aloja rutas sin `requirePermission` salvo `register` (`login`, `logout`, `refresh`, `set-password`), es el lugar consistente.

**4. Identidad del recurso siempre desde `x-user-id` (header propagado por middleware desde el JWT), nunca desde body/URL.**
Refleja directamente el Criterio de Seguridad de ambas historias ("el `id`/`userId` viene sólo del token, nunca del body"). `AuthController.me/updateMe/sendMyPasswordLink` leen `req.headers.get("x-user-id")` igual que `UsersController.updateUser` ya hace para `requesterId` — mismo patrón, ningún campo de identidad se acepta del cliente.

**5. Composición cross-módulo (`auth` llamando código de `users`) se resuelve instanciando el repositorio Prisma localmente en el DI de `auth`, no importando el DI container de `users`.**
Mismo patrón ya usado en el repo para evitar imports circulares (POS y Payments instancian `PrismaSaleRepository` localmente en vez de importar `pos/di`). `src/modules/auth/infrastructure/di/container.ts` instancia `AdminUserRepository` (Prisma) localmente para construir `GetUserUseCase`/`UpdateOwnProfileUseCase`, sin importar `src/modules/users/infrastructure/di/`.

**6. (Revertida) Password de confirmación / cambio directo con contraseña actual.**
La versión original de esta decisión describía un formulario de 3 campos (actual/nueva/confirmar) con `confirmNewPassword` validado sólo client-side. Esa historia se corrigió por completo (ver Non-Goals) — no hay ningún campo de contraseña en `/account`, sólo un botón que dispara el envío del correo.

**7. Frontend: perfil mantiene el patrón diff-gated de `useUserMutations`; contraseña es un botón único sin formulario.**
Perfil: PATCH sólo si `name`/`email` cambiaron, igual que `saveUserDiff`. Contraseña: `SendPasswordLinkCard` no tiene inputs — un botón llama a `sendMyPasswordLink()` y muestra el `sentTo` devuelto por el backend o el error, sin estado de "formulario" que limpiar.

## Risks / Trade-offs

- **[Riesgo] Duplicar validación de email único entre `UpdateUserUseCase` (admin) y `UpdateOwnProfileUseCase` (self)** → Mitigación: reusar el mismo error de dominio (`EmailAlreadyInUseError` o el que exista hoy en `users/domain/errors/`, confirmar nombre exacto en `tasks.md`/implementación) y, si la comprobación de unicidad vive en el repositorio (constraint de BD + catch en `AdminUserRepository.update`), ambos use cases la heredan gratis sin duplicar lógica.
- **[Riesgo] Cross-módulo `auth → users` (instanciar `AdminUserRepository` en el DI de `auth`) acopla un módulo que hoy es independiente** → Mitigación: es el mismo patrón ya aceptado en el proyecto (POS/Payments → Sales), y el acoplamiento es unidireccional y sólo a nivel de DI, no de dominio.
- **[Riesgo] Un usuario sin `name` seteado (si el modelo lo permite nullable) rompe el formulario de perfil al precargar** → Mitigación: `AdminUser.name` ya es opcional según el DTO existente (`GetUserUseCase`/`AdminUser` entity) — el formulario debe tratar `name` vacío como estado inicial válido, sin criterio nuevo de la tabla que lo contradiga.
- **[Riesgo — hallado en auditoría post-implementación] `PATCH /api/v1/auth/me` acepta cualquier email sintácticamente válido sin verificar que el usuario controle esa dirección, encadenable con `POST /send-password-link` para entregar un correo con branding Agrisas a un tercero** → Mitigación aplicada: rate limit de 60s por usuario en `send-password-link` (`src/shared/infrastructure/http/rateLimit.ts`, aplicado en `AuthController.sendMyPasswordLink`) acota el volumen de abuso. Mitigación completa (verificación de correo vía double opt-in) queda **fuera de alcance** — es una feature nueva que toca `token-management`; la UI de `/account` muestra una nota indicando que el cambio de correo se refleja al volver a iniciar sesión.
- **[Riesgo — hallado en auditoría post-implementación] Cambiar el email no invalida ni refresca la sesión activa** → `RefreshTokenUseCase` re-firma el mismo payload del refresh token sin releer la BD, así que `x-user-email`/`TopAppBar` siguen mostrando el correo anterior hasta que el usuario vuelve a iniciar sesión. Fuera de alcance corregirlo aquí (toca `token-management`); mitigado con la misma nota en la UI.

## Open Questions

- Nombre exacto del error de dominio para email duplicado en `users` (`EmailAlreadyInUseError` u otro) — no bloquea el diseño ni las specs, se confirma leyendo `UpdateUserUseCase`/`CreateUserUseCase` al implementar `tasks.md`.
