## 1. Backend — use cases

- [x] 1.1 Confirmar nombre exacto del error de email duplicado en `src/modules/users/domain/errors/` (leyendo `UpdateUserUseCase`/`CreateUserUseCase`) y reusarlo — no crear uno nuevo si ya existe.
- [x] 1.2 Crear `src/modules/auth/application/use-cases/ChangeOwnPasswordUseCase.ts`: input `{ userId, currentPassword, newPassword }`; `userRepo.findById` → `PasswordNotSetError` si hash nulo → `hasher.compare(currentPassword, hash)` → `InvalidCredentialsError` si falla → `Password.create(newPassword)` → `hasher.hash` → `userRepo.updatePasswordHash`.
- [x] 1.3 Crear `src/modules/users/application/use-cases/UpdateOwnProfileUseCase.ts`: input `{ id, name?, email? }`, sin guard `SelfModificationError`; reusa `AdminUserRepository.update` y el error de email duplicado confirmado en 1.1.

## 2. Backend — controller y rutas HTTP

- [x] 2.1 Extender `AuthController` (`src/modules/auth/infrastructure/http/AuthController.ts`) con `me(req)` (GET, delega a `GetUserUseCase` con id de `x-user-id`, devuelve `{id, name, email, avatarUrl}`).
- [x] 2.2 Extender `AuthController` con `updateMe(req)` (PATCH, Zod `{name?: string.min(1), email?: string.email()}` con ≥1 campo, delega a `UpdateOwnProfileUseCase` con id de `x-user-id`).
- [x] 2.3 Extender `AuthController` con `changePassword(req)` (POST, Zod `{currentPassword: string.min(1), newPassword: string.min(8)}`, delega a `ChangeOwnPasswordUseCase` con userId de `x-user-id`).
- [x] 2.4 Mapear errores a HTTP: `InvalidCredentialsError`→400 (`{error:"InvalidCurrentPassword"}`), `PasswordNotSetError`→400, error de validación Zod→400, email duplicado→409, `UserNotFoundError`→404. **Corregido durante verificación E2E**: originalmente mapeado a 401, pero `authFetch` (cliente) trata CUALQUIER 401 como sesión expirada y fuerza logout automático — una contraseña actual incorrecta es un rechazo de negocio con sesión válida, no un problema de sesión. Ver `tests/unit/modules/auth/infrastructure/http/AuthController.changePassword.test.ts`.
- [x] 2.5 Crear `app/api/v1/auth/me/route.ts` — exporta `GET` y `PATCH`, sin `requirePermission`, delega a `authController.me`/`authController.updateMe`.
- [x] 2.6 Crear `app/api/v1/auth/change-password/route.ts` — exporta `POST`, sin `requirePermission`, delega a `authController.changePassword`.

## 3. Backend — DI

- [x] 3.1 En `src/modules/auth/infrastructure/di/container.ts`, instanciar `AdminUserRepository` (Prisma) localmente (patrón POS/Payments) para construir `GetUserUseCase` y `UpdateOwnProfileUseCase` sin importar el DI container de `users`.
- [x] 3.2 Instanciar `ChangeOwnPasswordUseCase` reusando los singletons `userRepo`/`hasher` ya existentes en el mismo archivo.
- [x] 3.3 Ampliar la firma del constructor de `AuthController` para recibir los 3 use cases nuevos y actualizar la instanciación de `authController`.

## 4. Backend — tests unitarios

- [x] 4.1 `tests/unit/modules/auth/application/use-cases/ChangeOwnPasswordUseCase.test.ts` con `InMemoryUserRepository`: contraseña actual incorrecta (rechazo sin mutar hash), nueva contraseña <8 caracteres (rechazo), caso exitoso (hash actualizado y verificable), usuario sin passwordHash / inexistente.
- [x] 4.2 `tests/unit/modules/users/application/use-cases/UpdateOwnProfileUseCase.test.ts` con repositorio fake: email duplicado (rechazo), actualización parcial sólo con campos provistos, sin campos (rechazo), caso exitoso.

## 5. Frontend — módulo `app/(private)/account/`

- [x] 5.1 Verificar si `NavigationRail` ya tiene wireado el `href` a `/account` (según referencia en `CLAUDE.md`) — si falta, agregarlo.
- [x] 5.2 Crear `app/(private)/account/layout.tsx` y `page.tsx` (Server Component, `metadata`, lee cookies, renderiza `<AccountPage/>`), siguiendo convención de `app/(private)/users/`.
- [x] 5.3 Crear `_logic/types/api.ts`, `_logic/errors.ts` (tipos: email duplicado, credencial inválida, password débil).
- [x] 5.4 Crear `_logic/services/getOwnProfile.ts`, `updateOwnProfile.ts`, `changeOwnPassword.ts` — todos vía `authFetch`, aceptan `fetchImpl?: typeof fetch`, normalizan errores HTTP a los tipos de 5.3.
- [x] 5.5 Crear `_logic/schemas/updateProfile.schema.ts` (Zod: `name` min 1, `email` válido) y `changePassword.schema.ts` (Zod: `currentPassword` min 1, `newPassword` min 8, `confirmNewPassword` con `.refine` de coincidencia).
- [x] 5.6 Crear `_logic/hooks/useOwnProfile.ts` (GET al montar, loading/error) y `useAccountMutations.ts` (diff-gated para perfil; reset de formulario tras éxito para contraseña).
- [x] 5.7 Crear `_blocks/ProfileForm.tsx` — campos nombre/correo, botón guardar deshabilitado sin diff, error inline por campo (incluye 409 en correo).
- [x] 5.8 Crear `_blocks/ChangePasswordForm.tsx` — 3 campos, validación de coincidencia client-side, error inline (400 `InvalidCurrentPassword`, ver 2.4) en "contraseña actual", limpia campos tras éxito.
- [x] 5.9 Crear `_blocks/AccountPage.tsx` — orquestador `"use client"`, compone `PageShell` + 2 `Card` (Datos de cuenta / Cambiar contraseña) con `ProfileForm`/`ChangePasswordForm`, usando primitivas existentes (`FormField`, `Input`, `Button`) conforme a `designer.md`.

## 6. Frontend — tests

- [x] 6.1 Test RTL `tests/unit/ui/(private)/account/ProfileForm.test.tsx` — diff-gating, validación de correo inválido, error 409 inline.
- [x] 6.2 Test RTL `tests/unit/ui/(private)/account/ChangePasswordForm.test.tsx` — validación de confirmación, error de credencial inválida inline (400), limpieza de campos tras éxito.
- [x] 6.3 (post-verify) Test `tests/unit/ui/(private)/account/useAccountMutations.test.ts` — diff vacío no llama al servicio, diff parcial, error de perfil, éxito/error de cambio de contraseña.
- [x] 6.4 (post-verify) Caso `profile.name === undefined` agregado a `ProfileForm.test.tsx` (Risk 3 de `design.md`).

## 7. Verificación

- [x] 7.1 Correr suite completa (`npm test`) y confirmar verde. Nota: fallos intermitentes de `products-crud`/`inventory-crud` (tests de integración contra DB real, paralelismo de workers) son pre-existentes y no relacionados — confirmado pasan en aislado y cero archivos tocados en `products`/`inventory`.
- [x] 7.2 Correr `npm run build` para verificar tipos con las rutas nuevas. `Compiled successfully`, rutas `/account`, `/api/v1/auth/me`, `/api/v1/auth/change-password` generadas.
- [x] 7.3 Verificación manual E2E (Playwright, script descartable): login con `admin@example.com`/`admin1234` → `/account` → editar nombre (diff-gated, persiste tras reload) → cambiar contraseña (mensaje éxito, formulario se limpia) → logout → re-login con la nueva contraseña exitoso → intento con contraseña actual incorrecta muestra error inline SIN desloguear (regresión real encontrada y corregida, ver 2.4) → contraseña revertida a `admin1234` → login final confirma credencial restaurada. Todas las aserciones pasaron.
- [x] 7.4 Confirmar que `/users` (admin) sigue bloqueando auto-edición (`SelfModificationError` intacto) — sin regresión. No se tocó `UpdateUserUseCase`/`DeleteUserUseCase`/`SelfModificationError`; cobertura existente (`UpdateUserUseCase.test.ts`, `tests/integration/modules/users/admin-users-crud.test.ts`) sigue verde.

## 8. Bugfix post-release — manejo de error en carga de perfil

Reportado por usuario en producción/QA: "Mensaje de error al cargar el sistema, no tiene detalles" + "No se ve la UI el apartado para editar perfil". Causa raíz: `getOwnProfile.ts` descartaba el detalle de cualquier respuesta HTTP no-ok y lo colapsaba en el `NetworkError` genérico compartido (`"Network error"`, sin info útil); `AccountPage.tsx` reemplazaba TODA la página (incluido `ChangePasswordForm`, que no depende del perfil) por un `EmptyState` sin acción de reintento ante cualquier fallo de la carga inicial.

- [x] 8.1 Agregar `AccountLoadError` a `app/(private)/account/_logic/errors.ts` — error tipado que conserva el mensaje real del backend.
- [x] 8.2 `app/(private)/account/_logic/services/getOwnProfile.ts` — en `!res.ok`, parsear `{error}` del body y lanzar `AccountLoadError(message)` en vez del `NetworkError` genérico (mismo patrón de status-handling ya usado en `updateOwnProfile.ts`).
- [x] 8.3 `app/(private)/account/_blocks/AccountPage.tsx` — acotar loading/error al bloque de `ProfileForm` (con `EmptyState` + acción "Reintentar" que llama `refresh()`); `ChangePasswordForm` se renderiza siempre, independiente del estado del perfil.
- [x] 8.4 Tests nuevos: `tests/unit/ui/(private)/account/getOwnProfile.test.ts` (detalle del backend, fallback en español, `NetworkError` en fallo real de fetch) y `tests/unit/ui/(private)/account/AccountPage.test.tsx` (loading, error con detalle + retry funcional, `ChangePasswordForm` siempre visible, éxito).
- [x] 8.5 `npm test -- account` y `npm run build` verdes; sin regresión en `ProfileForm.test.tsx`/`ChangePasswordForm.test.tsx`/`useAccountMutations.test.ts` existentes.

## 9. Corrección de alcance — contraseña propia pasa de cambio directo a enlace por correo

Usuario aclaró que la decisión tomada al aprobar el spec original de la Historia 2 era reusar el flujo de enlace/token por correo ya existente (`SendSetPasswordEmailUseCase`), no crear un cambio directo con contraseña actual+nueva. Se corrige: se elimina por completo el flujo directo (use case, endpoint, formulario, tests) y se reemplaza por un botón único que dispara el mismo mecanismo de correo que ya usa el admin.

**Backend — eliminado:**
- [x] 9.1 Borrar `src/modules/auth/application/use-cases/ChangeOwnPasswordUseCase.ts` y su test.
- [x] 9.2 Borrar `app/api/v1/auth/change-password/route.ts`.
- [x] 9.3 Borrar `tests/unit/modules/auth/infrastructure/http/AuthController.changePassword.test.ts`.
- [x] 9.4 `AuthController.ts` — quitar `changePassword`/`changePasswordSchema`/import de `ChangeOwnPasswordUseCase`; `container.ts` — quitar su instanciación.

**Backend — nuevo (100% reuso):**
- [x] 9.5 `AuthController.sendMyPasswordLink(req)` (POST) — `userId` de `x-user-id`, delega a `sendSetPasswordEmailUseCase.execute(userId)` (el mismo singleton ya exportado en `container.ts`, ya usado por `UsersController`). Mapea `UserNotFoundError`(auth)→404, `SetPasswordEmailSendFailedError`→502 `EmailDeliveryFailed`, igual que `UsersController.resendSetPasswordEmail`.
- [x] 9.6 `container.ts` — constructor de `AuthController` recibe `sendSetPasswordEmailUseCase` (ya instanciado) en vez de `changeOwnPasswordUseCase`.
- [x] 9.7 Crear `app/api/v1/auth/send-password-link/route.ts` — exporta `POST`, sin `requirePermission`, delega a `authController.sendMyPasswordLink`.
- [x] 9.8 Test nuevo `tests/unit/modules/auth/infrastructure/http/AuthController.sendMyPasswordLink.test.ts` (200+sentTo, 404, 502). Actualizar constructor de `AuthController` en `AuthController.register.test.ts`/`AuthController.errorLeakage.test.ts`/`AuthController.refresh.test.ts` (último parámetro pasa a `{} as SendSetPasswordEmailUseCase`).

**Frontend — eliminado:**
- [x] 9.9 Borrar `_blocks/ChangePasswordForm.tsx`, `_logic/schemas/changePassword.schema.ts`, `_logic/services/changeOwnPassword.ts`, su test RTL, y los errores `InvalidCurrentPasswordError`/`WeakPasswordError` de `_logic/errors.ts`.

**Frontend — nuevo:**
- [x] 9.10 `_logic/errors.ts` — agregar `PasswordLinkSendError`. `_logic/types/api.ts` — `SendMyPasswordLinkResponse` reemplaza `ChangeOwnPasswordBody`.
- [x] 9.11 Crear `_logic/services/sendMyPasswordLink.ts` — POST sin body a `/api/v1/auth/send-password-link`, 502→`PasswordLinkSendError`, resto no-ok→`NetworkError`.
- [x] 9.12 `_logic/hooks/useAccountMutations.ts` — reemplazar estado/función de `changePassword` por `sendPasswordLink`/`isSendingPasswordLink`/`passwordLinkError`/`passwordLinkSentTo`/`clearPasswordLinkStatus`.
- [x] 9.13 Crear `_blocks/SendPasswordLinkCard.tsx` — sin inputs; botón único "Enviarme link de cambio de contraseña", muestra `sentTo` en éxito o error inline.
- [x] 9.14 `_blocks/AccountPage.tsx` — reemplazar `<ChangePasswordForm/>` por `<SendPasswordLinkCard/>`.
- [x] 9.15 Tests nuevos: `sendMyPasswordLink.test.ts` (200, 502→`PasswordLinkSendError`, otro no-ok→`NetworkError`, fallo real de fetch), `SendPasswordLinkCard.test.tsx` (dispara `sendPasswordLink`, muestra `sentTo`, muestra error). Actualizar `AccountPage.test.tsx` (mock de `SendPasswordLinkCard` en vez de `ChangePasswordForm`) y `useAccountMutations.test.ts` (casos `sendPasswordLink` en vez de `changePassword`).

**Verificación:**
- [x] 9.16 `grep` repo-wide sin resultados para `ChangeOwnPasswordUseCase`/`changeOwnPassword`/`ChangePasswordForm`/`InvalidCurrentPasswordError`/`WeakPasswordError`/`/api/v1/auth/change-password` — cero referencias colgantes.
- [x] 9.17 `npm test` completo verde (547/549 suites, 2 skips pre-existentes no relacionados — integración products/inventory contra DB real).
- [x] 9.18 `npm run build` verde; ruta `/api/v1/auth/send-password-link` generada, `/api/v1/auth/change-password` ya no existe.
- [x] 9.19 Verificación visual (Playwright, script descartable): login → `/account` → sección "Cambiar contraseña" muestra copy explicativo + botón único, sin campos de contraseña. Cero errores de consola/hydration. No se hizo click real en el botón para no disparar un correo real (SMTP configurado en `.env.local`) — cobertura del envío queda en tests unitarios con mailer mockeado.

## 10. Corrección de auditoría post-PR#66 (2026-09-04)

Contexto: auditoría de todo lo agregado después de PR#66 (versión productiva) encontró que las afirmaciones de verificación de 9.16-9.18 eran incompletas y varios defectos reales en el flujo. Corregido en esta sesión:

- [x] 10.1 `ProfileForm.test.tsx` conservaba el mock del flujo directo de contraseña eliminado en la sección 9 (`isChangingPassword`, `passwordError`, `changePassword`, etc.), causando 5 errores TS2345 en `tsc --noEmit` — no detectados por `npm test`/`npm run build` porque ninguno de los dos typechequea ese archivo. Reescrito para reflejar el shape real de `useAccountMutations`.
- [x] 10.2 `getOwnProfile.ts`, `updateOwnProfile.ts`, `sendMyPasswordLink.ts` colapsaban `UnauthenticatedError`/`ForbiddenError` (lanzados por `authFetch` en 401/403) en un `NetworkError` genérico — causa raíz del bug "mensaje de error sin detalle" que el bugfix de la sección 8 no corrigió porque atacó la rama equivocada. Los tres services ahora re-lanzan esos errores, igual que `listUsers.ts` en el módulo `users`.
- [x] 10.3 `POST /api/v1/auth/send-password-link` no tenía rate limit — cualquier sesión podía disparar envíos SMTP ilimitados, encadenable con `PATCH /me` (que acepta cualquier email sin verificar propiedad) para entregar correos con branding Agrisas a terceros. Agregado rate limit de 60s por usuario (`src/shared/infrastructure/http/rateLimit.ts`), 429 `TooManyRequests` mapeado a `PasswordLinkRateLimitedError` en el frontend. La verificación de propiedad del correo (double opt-in) queda fuera de alcance — ver `design.md` Risks.
- [x] 10.4 `_logic/schemas/updateProfile.schema.ts` existía sin uso; `ProfileForm.tsx` definía su propio Zod inline (viola la regla de `_blocks/` sin validación inline). Extraído `emailFieldSchema` del schema y usado en `ProfileForm`.
- [x] 10.5 El AC de la Historia 1 exige que el 409 (correo duplicado) se muestre inline en el campo correo; se mostraba en el banner genérico. `useAccountMutations` ahora distingue `EmailAlreadyInUseError` en `profileFieldErrors.email`; `ProfileForm` lo pasa al `FormField` de correo y lo limpia al reeditar.
- [x] 10.6 `ProfileForm` y `SendPasswordLinkCard` llamaban `useAccountMutations()` cada uno por su cuenta (dos instancias, la mitad del estado de cada una muerta). `AccountPage` ahora es el único llamador; ambos bloques volvieron a ser presentational puros (props en vez de hooks propios).
- [x] 10.7 El change contradecía `openspec/specs/panel-shell/spec.md` (secundarios del NavigationRail "únicamente `/settings`") sin declarar `Modified Capabilities`. Agregado `specs/panel-shell/spec.md` con el requirement actualizado y `proposal.md` ahora declara la capability modificada.
- [x] 10.8 Copy desactualizado tras la corrección de alcance de la sección 9 ("nombre, correo y contraseña" cuando ya no hay edición directa de contraseña): corregido en `spec.md` Purpose y en `AccountPage.tsx`.
- [x] 10.9 Tests nuevos: `updateOwnProfile.test.ts` (409→`EmailAlreadyInUseError`, sesión expirada), casos de sesión expirada agregados a `getOwnProfile.test.ts`/`sendMyPasswordLink.test.ts`, `AuthController.me.test.ts` (nuevo, cubre `me`/`updateMe`), casos de rate limit en `AuthController.sendMyPasswordLink.test.ts`.
- [x] 10.10 Nota en la UI (`ProfileForm.tsx`) avisando que el cambio de correo se refleja al volver a iniciar sesión — mitigación parcial de que `RefreshTokenUseCase` no invalida la sesión activa al cambiar el correo (fuera de alcance corregir el use case, ver `design.md`).

**Corrección a las afirmaciones de 9.16-9.18** (para que no se tomen por ciertas sin matiz): el grep de 9.16 no cubrió `ProfileForm.test.tsx` (10.1). "npm test completo verde" (9.17) y "npm run build verde" (9.18) fueron ciertos para jest/Next, pero `tsc --noEmit` no se ejecutó en esa verificación y sí fallaba — ni jest (`isolatedModules: true`) ni el build de Next typechequean archivos de test fuera del grafo de la app.
