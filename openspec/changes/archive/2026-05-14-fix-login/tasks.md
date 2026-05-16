## 1. Base de datos — Prisma

- [x] 1.1 Añadir `name String?` al modelo `User` en `prisma/schema.prisma`
- [x] 1.2 Ejecutar `npx prisma migrate dev --name add-user-name` para generar la migración
- [x] 1.3 Ejecutar `npx prisma generate` para regenerar el Prisma Client

## 2. Dominio — Entidad User

- [x] 2.1 Añadir `name?: string` a `UserProps` en `src/modules/auth/domain/entities/User.ts`
- [x] 2.2 Actualizar el constructor de `User` para aceptar y almacenar `name`
- [x] 2.3 Exponer `get name()` como getter público en la entidad `User`

## 3. Aplicación — DTO, Use Case y Mapper

- [x] 3.1 Añadir `name: string` a `RegisterRequest` en `src/modules/auth/application/dto/RegisterRequest.ts`
- [x] 3.2 Actualizar `RegisterUseCase` en `src/modules/auth/application/use-cases/RegisterUseCase.ts` para propagar `name` al crear la entidad `User`
- [x] 3.3 Actualizar `UserMapper` en `src/modules/auth/application/mappers/UserMapper.ts`: mapear `prismaUser.name` → `entity.name` y viceversa
- [x] 3.4 Actualizar el DTO de respuesta / serialización en `AuthController` para incluir `name` en el objeto `user` de la respuesta

## 4. Infraestructura — Repositorio y Controller HTTP

- [x] 4.1 Actualizar `UserPrismaRepository.save()` en `src/modules/auth/infrastructure/repositories/UserPrismaRepository.ts` para incluir `name` en el `upsert` de Prisma
- [x] 4.2 Actualizar el schema Zod de registro en `AuthController` (`src/modules/auth/infrastructure/http/AuthController.ts`): añadir `name: z.string().min(1)` al schema de `register`
- [x] 4.3 Verificar que `AuthController.register()` serializa `{ id, name, email }` en la respuesta 201

## 5. Frontend — Schemas Zod

- [x] 5.1 Cambiar `z.string().min(6, "Mínimo 6 caracteres")` por `z.string().min(8, "Mínimo 8 caracteres")` en `app/(public)/auth/_logic/schemas/login.schema.ts`
- [x] 5.2 Cambiar `z.string().min(6, "Mínimo 6 caracteres")` por `z.string().min(8, "Mínimo 8 caracteres")` en `app/(public)/auth/_logic/schemas/register.schema.ts`

## 6. Tests — Backend

- [x] 6.1 Actualizar `tests/unit/modules/auth/application/use-cases/RegisterUseCase.test.ts`: incluir `name` en los fixtures de `RegisterRequest`; verificar que la entidad creada tenga `name` correcto
- [x] 6.2 Actualizar `InMemoryUserRepository` si construye `User` directamente con fixtures sin `name`
- [x] 6.3 Actualizar `tests/unit/modules/auth/domain/entities/User.test.ts` si los fixtures construyen `User` sin `name`
- [x] 6.4 Actualizar `tests/unit/modules/auth/application/mappers/UserMapper.test.ts` para cubrir el campo `name` en la conversión bidireccional
- [x] 6.5 Ejecutar `npm test` (entorno `node`) y confirmar que todos los tests de backend pasan

## 7. Tests — Frontend (UI)

- [x] 7.1 Actualizar `tests/unit/ui/(public)/auth/_logic/hooks/useRegisterForm.test.ts`: los fixtures de submit deben incluir `name`; verificar que `register` se llama con `{ name, email, password }`
- [x] 7.2 Actualizar `tests/unit/ui/(public)/auth/_logic/services/register.test.ts`: el mock de respuesta 201 debe incluir `user.name`
- [x] 7.3 Actualizar `tests/unit/ui/(public)/auth/_logic/hooks/useLoginForm.test.ts` si algún fixture usa contraseña de 6-7 chars (ahora inválida por el schema)
- [x] 7.4 Regenerar snapshots afectados con `npx jest --updateSnapshot` para `LoginForm`, `RegisterForm` y cualquier otro que muestre mensajes de error de contraseña
- [x] 7.5 Ejecutar `npm test` (entorno `jsdom`) y confirmar que todos los tests de UI pasan

## 8. Verificación end-to-end

- [x] 8.1 Arrancar el servidor de desarrollo (`npm run dev`) y registrar un nuevo usuario con nombre, email y contraseña de ≥8 caracteres; verificar que el usuario se crea con `name` en Supabase (via `npx prisma studio`)
- [x] 8.2 Verificar que intentar enviar una contraseña de 6-7 chars muestra "Mínimo 8 caracteres" en el formulario de login y registro sin llegar al servidor
- [x] 8.3 Intentar registrar con `name` vacío; verificar que el backend responde 400
- [x] 8.4 Ejecutar `npm run build` y confirmar que no hay errores de TypeScript
