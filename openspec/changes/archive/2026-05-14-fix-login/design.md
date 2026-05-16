## Context

El backend de autenticación sigue la arquitectura hexagonal estricta: `domain → application → infrastructure`. La entidad `User` en dominio no conoce Prisma; el repositorio `UserPrismaRepository` es la única capa que convierte entre el modelo Prisma y la entidad de dominio. Esta separación debe mantenerse intacta.

Estado actual:
- `prisma/schema.prisma`: modelo `User` sin columna `name`.
- `User.ts` (entidad): `UserProps = { email, passwordHash, createdAt, updatedAt }`.
- `RegisterRequest` DTO: `{ email, password }`.
- `AuthController` Zod: `password: z.string().min(8)`.
- Frontend Zod: `password: z.string().min(6)`.
- El frontend envía `name` al backend; el backend descarta el campo silenciosamente.

## Goals / Non-Goals

**Goals:**
- Persitir el campo `name` del usuario en Prisma y devolverlo en la respuesta del endpoint de registro.
- Alinear la validación de longitud mínima de contraseña a `min(8)` en el cliente y en el servidor.
- Mantener la separación hexagonal intacta: dominio sin dependencias de infraestructura.
- Actualizar todos los tests afectados para que la suite quede verde.

**Non-Goals:**
- Cambiar el campo `name` de nullable a required retroactivamente (existe una fila de usuario ya creada; se usa nullable para compatibilidad).
- Permitir actualizar el `name` después del registro (fuera del scope de este change).
- Internacionalización de mensajes de error.
- Renombrar la constante `PUBLIC_PATHS` (cosmético diferido).

## Decisions

**1. Columna `name` nullable en Prisma**

Se declara `name String?` (opcional) en lugar de `String` (requerido). Razón: la migración debe aplicarse sobre la tabla existente que ya puede tener filas sin `name`. Si se declara requerida, Prisma exigirá un valor default o fallará la migración con datos preexistentes. Al ser nullable en BD, la capa de dominio puede tratarla como `name?: string` y la UI la marca como obligatoria con su propia validación.

Alternativa descartada: `String @default("")` — semánticamente incorrecto; un string vacío es distinto a un nombre no capturado.

**2. `name` como propiedad opcional en la entidad `User`**

`UserProps` añade `name?: string`. El constructor de `User` lo acepta pero no lo exige como value object (no merece validación de dominio más allá de "no vacío", que ya hace el schema Zod del adaptador HTTP). Si en el futuro se quiere enriquecer la validación de nombre (longitud máxima, caracteres permitidos), se puede promover a un value object `FullName`.

Alternativa descartada: value object `FullName` desde el inicio — sobre-ingeniería para el scope actual.

**3. Flujo de propagación de `name` por capas**

```
AuthController (Zod valida name: z.string().min(1))
  → RegisterRequest DTO { name, email, password }
    → RegisterUseCase (crea User con name)
      → UserPrismaRepository.save() (escribe name en BD)
        → AuthController serializa { id, name, email } en la respuesta
```

El mapper `UserMapper` se encarga de la traducción `PrismaUser ↔ User entity`. Añadir `name` solo requiere un cambio en el mapper, no en los use cases de login ni refresh (que no necesitan `name` para emitir tokens).

**4. Alineación de `min(8)` en el frontend**

Cambio de una línea en cada schema (`login.schema.ts`, `register.schema.ts`): `min(6)` → `min(8, "Mínimo 8 caracteres")`. El mensaje también se actualiza para ser explícito. Los snapshots de `LoginForm` y `RegisterForm` que capturen mensajes de error deberán regenerarse (`jest -u`).

Alternativa descartada: manejar el error 400 del backend y mostrar el mensaje — añade complejidad y latencia de red para un error que debe prevenirse en cliente.

**5. Respuesta del endpoint de registro**

El endpoint de registro devuelve `{ accessToken, user: { id, name, email } }`. Se añade `name` al objeto `user` que antes solo tenía `id` y `email`. El `refreshToken` se envía como cookie HttpOnly. La emisión de tokens en registro fue implementada por el change `emit-token-on-register`, que se aplicó en paralelo a este change.

## Risks / Trade-offs

- **[Migración con datos existentes]** → `name` nullable evita fallos en producción; registros previos tendrán `name: null`. El frontend seguirá mostrando el campo como requerido para nuevos registros.
- **[Snapshots de tests se rompen]** → Los tests de snapshot de `RegisterForm` y mensajes de error necesitarán `jest -u`. Cambio intencional — documentar en el PR.
- **[`name` llega al backend como string vacío si el usuario sortea la validación Zod del cliente]** → El Zod del `AuthController` (`z.string().min(1)`) lo rechazará con 400. Comportamiento correcto.
- **[Tests de `RegisterUseCase` y `InMemoryUserRepository` requieren actualización]** → Cualquier construcción de `User` sin `name` seguirá siendo válida (campo opcional), pero los fixtures que construyen `RegisterRequest` deben incluir `name` para los tests de flujo completo.
