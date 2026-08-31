## 1. Prisma / base de datos

- [x] 1.1 `prisma/schema.prisma`: cambiar `User.passwordHash` de `String` a `String?`.
- [x] 1.2 `prisma/schema.prisma`: agregar modelo `PasswordSetupToken` (`id`, `userId` FK cascade, `tokenHash` único, `expiresAt`, `consumedAt` nullable, `createdAt`, índice en `userId`, `@@map("password_setup_tokens")`) y la relación inversa `passwordSetupTokens PasswordSetupToken[]` en `User`.
- [x] 1.3 Correr `npx prisma migrate dev --name add_password_setup_tokens` y verificar que la migración aplica limpio contra la base de dev. (migración escrita a mano y aplicada con `migrate deploy` porque `migrate dev` requiere shell interactivo; incluyó fix de tipo `UUID` en `user_id` para matchear `users.id`)
- [x] 1.4 `npx prisma generate`.
- [x] 1.5 Agregar `APP_URL` a `.env.example` (ej. `http://localhost:3000`) con comentario explicando su uso para construir el link del correo. (también agregado a `.env.local` para dev)

## 2. Backend — módulo `auth`: puertos, entidad, errores

- [x] 2.1 `src/modules/auth/domain/entities/User.ts`: `passwordHash: string | null`.
- [x] 2.2 `src/modules/auth/application/ports/UserRepository.ts`: agregar `updatePasswordHash(userId: string, passwordHash: string): Promise<void>`.
- [x] 2.3 `src/modules/auth/infrastructure/repositories/UserPrismaRepository.ts`: implementar `updatePasswordHash`; ajustar mapeo de `passwordHash` a nullable donde corresponda.
- [x] 2.4 `src/modules/auth/infrastructure/repositories/InMemoryUserRepository.ts`: implementar `updatePasswordHash` (test double).
- [x] 2.5 Nuevo puerto `src/modules/auth/application/ports/PasswordSetupTokenRepository.ts`: `create({userId, tokenHash, expiresAt}): Promise<{id, userId, expiresAt}>`, `findValidByHash(tokenHash): Promise<{id, userId, expiresAt, consumedAt} | null>` (solo no consumidos), `markConsumed(id): Promise<void>`, `invalidateAllForUser(userId): Promise<void>`.
- [x] 2.6 Nuevos errores en `src/modules/auth/domain/errors/`: `PasswordSetupTokenInvalidError`, `PasswordSetupTokenExpiredError`, `PasswordNotSetError`, `SetPasswordEmailSendFailedError`.

## 3. Backend — módulo `auth`: infraestructura de token

- [x] 3.1 `src/modules/auth/infrastructure/repositories/PrismaPasswordSetupTokenRepository.ts`: implementa el puerto contra `password_setup_tokens`; `findValidByHash` filtra `consumedAt IS NULL` (la expiración se valida en el caso de uso, no en la query, para poder distinguir "expirado" de "inválido").
- [x] 3.2 `src/modules/auth/infrastructure/repositories/InMemoryPasswordSetupTokenRepository.ts` (test double, mismo patrón que `InMemoryUserRepository.ts`).

## 4. Backend — módulo `auth`: casos de uso

- [x] 4.1 `src/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase.ts`: genera token crudo (`crypto.randomBytes(32).toString("hex")`), calcula `sha256` para `tokenHash`, `expiresAt = now + 24h`, llama `invalidateAllForUser(userId)` antes de `create`, retorna `{ rawToken, expiresAt }`.
- [x] 4.2 `src/modules/auth/application/use-cases/SendSetPasswordEmailUseCase.ts`: recibe `userId`, resuelve email/nombre vía `UserRepository`, invoca `IssuePasswordSetupTokenUseCase`, arma el link `${process.env.APP_URL}/auth/set-password?token=<rawToken>`, llama `mailer.send(...)`; lanza `SetPasswordEmailSendFailedError` si `mailer.send` falla (no atrapa el error — el caller decide).
- [x] 4.3 `src/modules/auth/application/use-cases/CompletePasswordSetupUseCase.ts`: input `{token, password}` → hashea el token con sha256 → `findValidByHash`; `null` → `PasswordSetupTokenInvalidError`; `expiresAt < now` → `PasswordSetupTokenExpiredError`; valida `password` con `Password.create()`; hashea con `PasswordHasher`; `userRepo.updatePasswordHash`; `tokenRepo.markConsumed`; emite access+refresh tokens vía `TokenService` (mismos claims que `LoginUseCase`); retorna `{accessToken, refreshToken, user}`.
- [x] 4.4 `src/modules/auth/application/use-cases/LoginUseCase.ts`: antes de `hasher.compare`, si `user.passwordHash === null` → `throw new PasswordNotSetError()`.

## 5. Backend — módulo `auth`: HTTP y DI

- [x] 5.1 `src/modules/auth/infrastructure/http/AuthController.ts`: nuevo método `completeSetPassword(req)` — Zod `{ token: z.string().min(1), password: z.string().min(8) }`, llama `CompletePasswordSetupUseCase`, mapea `PasswordSetupTokenInvalidError`/`PasswordSetupTokenExpiredError`/validación a 400 con códigos distinguibles, éxito setea cookie `refreshToken` (reusar `cookieOptions.ts`) y responde `{accessToken, user}`.
- [x] 5.2 `AuthController`: en el método de login existente, mapear `PasswordNotSetError` a HTTP 403 `{"error": "PasswordNotSet"}`.
- [x] 5.3 Ruta `app/api/v1/auth/set-password/route.ts` (`POST`) → delega a `authController.completeSetPassword`.
- [x] 5.4 `src/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter.ts`: agregar `/api/v1/auth/set-password` a las rutas públicas exactas de API.
- [x] 5.5 `middleware.ts` / lista de rutas públicas de página: agregar `/auth/set-password`.
- [x] 5.6 `src/modules/auth/infrastructure/di/container.ts`: wirear `PrismaPasswordSetupTokenRepository`, instanciar y exportar `sendSetPasswordEmailUseCase` (para que el DI de `users` lo importe), instanciar `completePasswordSetupUseCase` para `AuthController`.

## 6. Backend — módulo `users`: crear sin password

- [x] 6.1 `src/modules/users/application/dto/CreateUserRequest.ts`: quitar `password`.
- [x] 6.2 `src/modules/users/application/ports/AdminUserRepository.ts`: `AdminUserCreateData` deja de requerir `passwordHash` (el repo lo fija a `null` internamente en creación).
- [x] 6.3 `src/modules/users/application/use-cases/CreateAdminUserUseCase.ts`: quitar dependencia de `PasswordHasher`; crear con `passwordHash: null`.
- [x] 6.4 `src/modules/users/infrastructure/repositories/PrismaAdminUserRepository.ts`: `create()` persiste `passwordHash: null` explícito.
- [x] 6.5 `src/modules/users/infrastructure/di/container.ts`: quitar wiring de `BcryptPasswordHasher` en `CreateAdminUserUseCase`; importar `sendSetPasswordEmailUseCase` del container de `auth`; wirear en `UsersController`.

## 7. Backend — módulo `users`: endpoints

- [x] 7.1 `src/modules/users/infrastructure/http/UsersController.ts`: `createUserBodySchema` quita `password`.
- [x] 7.2 `UsersController.createUser`: tras crear con éxito, llamar `sendSetPasswordEmailUseCase.execute(newUser.id)` envuelto en `try/catch` con `console.error` (fire-and-forget) — no debe poder fallar la respuesta 201.
- [x] 7.3 `UsersController`: nuevo método `resendSetPasswordEmail(req, id)` — carga el usuario (404 si no existe), llama `sendSetPasswordEmailUseCase.execute(id)` **sin** atrapar el error de envío; captura `SetPasswordEmailSendFailedError` → 502 `{"error": "EmailDeliveryFailed"}`; éxito → 200.
- [x] 7.4 Ruta `app/api/v1/admin/users/[id]/resend-set-password-email/route.ts` (`POST`, requiere `users:write`, mismo guard que el resto de `users`).

## 8. Frontend — modal de usuario

- [x] 8.1 `app/(private)/users/_blocks/UserEditModal.tsx`: quitar el bloque "Password (create only)", el state `password`, `password` del prop `onSave`, `ValidationErrors.password`, y la condición de longitud en `isCreateValid`; agregar copy informativo en `create`.
- [x] 8.2 `UserEditModal.tsx`: nueva sección "Contraseña" en modo `edit` con botón "Enviar correo para establecer/restablecer contraseña", confirmado con `ConfirmDialog` (molecule existente, mismo patrón que `CancelReturnModal`), estado de envío y mensaje inline de éxito/error; nuevo prop `onResendSetPasswordEmail: (userId: string) => void` (o similar, expuesto por el padre).
- [x] 8.3 `app/(private)/users/_logic/schemas/createUser.schema.ts`: quitar `password`.
- [x] 8.4 `app/(private)/users/_logic/types/api.ts`: `CreateUserBody` sin `password`.
- [x] 8.5 `app/(private)/users/_logic/services/createUser.ts`: no enviar `password` en el body.

## 9. Frontend — acción de reenvío

- [x] 9.1 Nuevo `app/(private)/users/_logic/services/resendSetPasswordEmail.ts` (mismo patrón que `updateUser.ts`: `authFetch`, errores tipados incl. `EmailDeliveryFailedError`, `fetchImpl?`) → `POST /api/v1/admin/users/:id/resend-set-password-email`.
- [x] 9.2 `app/(private)/users/_logic/hooks/useUserMutations.ts`: nueva acción `resendSetPasswordEmail(userId)` con estado de carga/error; quitar `password` de `createNewUser`.
- [x] 9.3 `app/(private)/users/_blocks/UsersPage.tsx`: pasar el nuevo handler a `UserEditModal`.

## 10. Frontend — página pública de establecer contraseña

- [x] 10.1 Nueva página `app/(public)/auth/set-password/page.tsx` (Server Component wrapper que lee `?token=` de `searchParams`) + bloque cliente `SetPasswordForm.tsx` (form contraseña + confirmación, min 8 caracteres, validación Zod espejo del backend).
- [x] 10.2 Nuevo servicio de auth para el POST `/api/v1/auth/set-password` (mismo patrón de servicios existentes de `auth`), maneja los 3 casos de error (token inválido, token expirado, password corta) con mensajes distintos.
- [x] 10.3 Éxito: guardar `accessToken` en `sessionStorage` igual que el login (replicar el mecanismo exacto de `app/(public)/auth/login/_logic`) y redirigir a `/dashboard`.
- [x] 10.4 Login: manejar el nuevo caso `403 {"error":"PasswordNotSet"}` en la lógica de login existente (mismo lugar donde se maneja `?reason=inactivity|session_lost`), mostrando banner: "Debes establecer tu contraseña. Revisa tu correo o pide al administrador reenviarlo."

## 11. Tests

- [x] 11.1 `tests/unit/modules/users/application/use-cases/CreateAdminUserUseCase.test.ts`: actualizado — crea sin `passwordHash` en la request, ya no depende de `PasswordHasher`.
- [x] 11.2 `tests/unit/modules/auth/application/use-cases/LoginUseCase.test.ts`: nuevo caso — `passwordHash: null` → `PasswordNotSetError`, sin llamar a `hasher.compare`.
- [x] 11.3 `tests/unit/modules/auth/application/use-cases/CompletePasswordSetupUseCase.test.ts`: éxito con auto-login, token expirado, token inexistente/consumido, no modifica password si el token es inválido.
- [x] 11.4 `tests/unit/modules/auth/application/use-cases/IssuePasswordSetupTokenUseCase.test.ts`: emitir invalida tokens previos del mismo usuario (no afecta a otros usuarios); el token crudo nunca coincide con lo persistido (solo el hash); expiración ~24h.
- [x] 11.4b (extra, no listada originalmente) `SendSetPasswordEmailUseCase.test.ts`: cubre los dos estilos de manejo de error del design (propaga `SetPasswordEmailSendFailedError`); actualizados también `UsersController.test.ts`, `AuthController.refresh.test.ts` (nuevo 5º arg `completePasswordSetupUseCase`), `InMemoryUserRepository.test.ts` (`updatePasswordHash`), `admin-users-crud.test.ts` (integración), `UserEditModal.test.tsx`, `UsersPage.test.tsx`, `useUserMutations.test.ts` (UI) para reflejar las nuevas firmas/UI.
- [x] 11.5 Correr `npm test` completo: **3860 tests en verde**, 0 fallas reales (1 crash SIGSEGV de un worker de Jest en `register.test.ts`, no relacionado — reproducido en verde al aislarlo).

## 12. Verificación manual (Playwright)

- [x] 12.1 Crear usuario en `/users` (Playwright, admin sembrado) sin campo password visible; confirmó 201 y usuario listado en la tabla.
- [x] 12.2 Confirmado con SMTP real configurado en `.env.local` (Ethereal) pero con credenciales caducadas: la creación devolvió 201 igual (el error de envío solo se logueó server-side, `[UsersController.createUser] failed to send set-password email: SetPasswordEmailSendFailedError`), y el reenvío explícito desde edición sí mostró "Failed to deliver the set-password email" inline al admin (502). Caso más representativo que "sin SMTP_HOST": SMTP configurado pero fallando en runtime.
- [x] 12.3 Verificado en BD real (Supabase, `execute_sql`) que se creó la fila en `password_setup_tokens` tras crear el usuario (`passwordHash: null`, token con `expiresAt` ~24h, `consumedAt: null`).
- [x] 12.4 Probado `/auth/set-password?token=...` (token sembrado manualmente vía SQL, ya que la entrega real de correo falla en este entorno): password corta → error inline "Mínimo 8 caracteres"; password válida → auto-login (accessToken + cookie) y redirect a `/dashboard` (que a su vez redirigió a `/pos` por regla preexistente de `dashboard/page.tsx` para no-admins, comportamiento correcto); reintentar el mismo token → "Este enlace ya no es válido...". Adicionalmente se confirmó en BD que reemitir el token (acción de reenvío del admin) invalida cualquier token previo sin consumir del mismo usuario, incluido el emitido automáticamente en la creación.
- [x] 12.5 Confirmada regresión: login de `admin@example.com` (password ya establecida, seed) sigue funcionando sin cambios tras cerrar sesión del usuario de prueba.

Limpieza: usuario y tokens de prueba (`playwright-qa@test.local`) eliminados de la BD real al finalizar; dev server detenido.
