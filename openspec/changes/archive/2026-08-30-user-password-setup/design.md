## Context

Ver `proposal.md` — `## Why` y `## Historia de Usuario` para la motivación. Puntos de partida verificados en el repo (dos exploraciones paralelas, ver conversación de planning):

- `users.password_hash` es `String` no nulable en `prisma/schema.prisma:15`; no existe ninguna tabla ni mecanismo de token de un solo uso en todo el repo (ni `crypto.randomBytes`, ni `PasswordResetToken`/`InviteToken`).
- `MailerPort` (`src/shared/application/ports/MailerPort.ts`) + `NodemailerMailer` ya existen y tienen dos estilos de manejo de error ya establecidos en el código:
  - **Propagar** (`SendInvoiceEmailUseCase`): el caso de uso lanza un error propio si `mailer.send` falla; el caller decide si lo atrapa.
  - **Silenciar** (`AdminNotificationService`): atrapa el error internamente y solo hace `console.error`, fire-and-forget.
- `BcryptPasswordHasher` (puerto `PasswordHasher`) y el VO `Password` (min 8 caracteres) ya viven en `src/modules/auth/` y ya son reusados hoy por `src/modules/users/` para hashear en creación.
- `LoginUseCase.execute` llama `hasher.compare(req.password, user.passwordHash)` asumiendo que `passwordHash` siempre es un hash bcrypt real — con `passwordHash: null` esa llamada rompe si no se intercepta antes.
- No existe `APP_URL`/`BASE_URL` en ningún `.env*` — se necesita para construir el link del correo.

## Goals / Non-Goals

**Goals:**
- El admin nunca captura, ve, ni edita una contraseña de usuario, ni al crear ni al editar (Historias 1 y 3).
- El usuario controla su propia contraseña de punta a punta vía un enlace de un solo uso, con expiración dura (Historia 2).
- Reutilizar toda la infraestructura de correo/hash/token-JWT ya existente sin nuevas dependencias externas.

**Non-Goals:**
- No se implementa un flujo de "olvidé mi contraseña" autoservicio disparado por el propio usuario desde `/auth/login` (sin sesión, sin admin de por medio) — el único disparador de un nuevo enlace es: (a) creación de usuario, o (b) el admin pulsando "reenviar" en edición. Se puede agregar después como extensión del mismo mecanismo de token; queda fuera de esta change.
- No se cambia `POST /api/v1/auth/register` (registro público autoservicio) — ese flujo sigue pidiendo password directamente porque el propio usuario se registra a sí mismo, no hay admin de por medio.
- No se implementa revocación/blacklist de refresh tokens existentes al cambiar contraseña (fuera de alcance, ya es una limitación conocida y documentada del `auth` actual — `LogoutUseCase` es un placeholder).

## Decisions

**Token de un solo uso vive en el módulo `auth`, no en un módulo nuevo.**
Alternativa considerada: módulo nuevo `password-setup` en `src/modules/`. Se descarta porque el 90% de sus dependencias (`PasswordHasher`, `TokenService`, `UserRepository`, `Password` VO) ya son del módulo `auth`, y crear un módulo aparte solo agregaría wiring cross-módulo sin beneficio (ver el `## Impact` de la propuesta: el capability openspec `password-setup` es una unidad de spec, no obliga a un módulo de código separado). El módulo `users` solo pierde su dependencia de `PasswordHasher` en creación y gana una llamada al caso de uso de `auth` para reenviar el correo — mismo patrón ya usado en el repo ("importar directo del container de otro módulo cuando no hay ciclo", como en pagos/devoluciones).

**Token crudo de alta entropía (`crypto.randomBytes(32)`) + hash sha256 para el lookup, no JWT.**
Alternativa: reusar `JwtTokenService` con un tercer tipo de token de acción. Se descarta porque los JWT de este proyecto son *stateless* (no hay tabla de revocación) — un "action token" JWT no se podría invalidar al reemitir uno nuevo ni marcar como consumido, lo cual es un requisito explícito (Historia 2, Historia 3: "invalidar tokens previos", "de un solo uso"). Se necesita estado persistido, así que un token opaco respaldado por tabla es la opción correcta. Se hashea con sha256 (no bcrypt) porque el propósito es una búsqueda determinística por igualdad, no una comparación lenta anti-fuerza-bruta sobre un secreto de baja entropía como una contraseña — el token ya trae 256 bits de entropía propios.

**Manejo de error de envío de correo: dos casos de uso comparten `SendSetPasswordEmailUseCase`, difieren solo en si el caller atrapa el error.**
Igual que el patrón ya existente en el repo (`SendInvoiceEmailUseCase` propaga, `AdminNotificationService` traga). En creación de usuario (Historia 1, AC "el envío nunca bloquea la creación"), el controller de `users` llama al caso de uso envuelto en `try/catch` con `console.error`. En el reenvío explícito del admin (Historia 3, AC "el admin sí ve un error claro"), el controller deja que el error se propague y lo mapea a 502. Un único caso de uso, sin flags de comportamiento — la diferencia vive en el call site, no en el caso de uso.

**`passwordHash` nullable en vez de un hash "sentinel" inválido.**
Alternativa: crear el usuario con un hash placeholder imposible de matchear (ej. string vacío hasheado) para no tocar el schema. Se descarta: es implícito y frágil (cualquier futuro cambio en el largo/formato de hash de bcrypt podría volver el sentinel "matcheable" por accidente), y oscurece la intención — `passwordHash: null` es explícito y permite que `LoginUseCase` lo chequee con un simple `if (!user.passwordHash)` en vez de comparar contra un valor mágico.

**`POST /api/v1/auth/set-password` hace auto-login (emite access+refresh tokens) en vez de redirigir a `/auth/login`.**
Decisión ya confirmada con el usuario en Plan Mode: mejor UX — el usuario acaba de probar posesión del correo y de la contraseña recién elegida, no hay razón para pedirle un login manual adicional. Mismo mecanismo de emisión que `LoginUseCase` (mismos claims, mismo TTL, misma cookie).

**Mensajes de error de token inválido vs. expirado son distinguibles, pero ninguno revela existencia de usuario/email.**
Historia 2 pide explícitamente que "expirado" sea distinto de "inválido" (para que la UI ofrezca reenviar), pero también pide no filtrar si el email existe. Ambos objetivos son compatibles porque el error nunca se basa en el email del request (el endpoint no recibe email, solo `token`) — solo se distingue expirado vs. inválido/consumido/inexistente, information que no está atada a la existencia de una cuenta.

## Riesgos / Trade-offs

- **[Riesgo] Sin `SMTP_HOST` configurado en dev, la creación de usuario "funciona" pero el usuario nunca recibe el correo** → Mitigación: igual que hoy con `AdminNotificationService`, se documenta en la verificación manual que hay que revisar la fila creada en `password_setup_tokens` directamente (Supabase/Prisma Studio) para probar el flujo `/auth/set-password` en dev sin SMTP real.
- **[Riesgo] Migración `passwordHash` a nullable es un cambio de schema en una tabla con datos reales (`users`)** → Mitigación: es un `ALTER COLUMN ... DROP NOT NULL`, no destructivo, sin backfill necesario (todas las filas existentes ya tienen un hash real); se corre con `prisma migrate dev` como cualquier otra migración del proyecto.
- **[Riesgo] Un token de 24h vivo es una ventana de exposición si el correo del admin/usuario es interceptado** → Mitigación: de un solo uso (se consume al primer uso exitoso) y se invalida automáticamente si se reemite uno nuevo — no hay forma de tener dos enlaces "vivos" simultáneos para el mismo usuario.
- **[Trade-off] No hay endpoint autoservicio de "olvidé mi contraseña" en `/auth/login`** → Aceptado como Non-Goal explícito; si se pide después, es una extensión natural del mismo `IssuePasswordSetupTokenUseCase`/`SendSetPasswordEmailUseCase` con un nuevo endpoint público que no necesita RBAC (solo verificar que el email exista, sin revelarlo en la respuesta).
