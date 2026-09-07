## Context

Ver `proposal.md` - Why. `useSetPasswordForm.ts:65` es el único hook de auth que redirige a `/dashboard`; `useLoginForm.ts:73` y `useRegisterForm.ts` ya usan `router.replace("/pos")` como patrón conforme al requirement `panel-shell` "El panel carga después de iniciar sesión o registrarse".

## Goals / Non-Goals

**Goals:**
- Historia 1: hacer que `useSetPasswordForm` redirija a `/pos` en vez de `/dashboard`, igualando el patrón ya usado por `useLoginForm`.

**Non-Goals:**
- No se toca el guard de permisos de `/pos` (`sales:create`/`quotes:create`) ni el `EmptyState` "Sin acceso" — ese comportamiento es correcto y queda fuera de este fix (ver criterio de aceptación de la historia 1 sobre rol `viewer`).
- No se toca `CompletePasswordSetupUseCase`, `AuthController` ni la emisión de tokens — el bug es puramente de destino de redirect en el cliente.
- No se agrega lógica de redirect basada en roles/permisos (ej. admin → `/dashboard`, otros → `/pos`); el patrón existente en `panel-shell` es un destino único hardcodeado `/pos` para todos los hooks de auth, y este fix simplemente extiende esa misma regla.

## Decisions

- **Reusar el patrón exacto de `useLoginForm.ts:73`** (`router.replace("/pos")`) en vez de introducir una nueva ruta de aterrizaje o lógica condicional. Alternativa descartada: redirigir según rol (ej. `admin` → `/dashboard`). Se descarta porque el requirement `panel-shell` ya declara `/pos` como único destino post-auth para todos los usuarios (incluido admin, ver escenario "Establecer contraseña como rol admin aterriza en /pos"), y añadir una rama por rol sería inconsistente con `useLoginForm`/`useRegisterForm` sin que el usuario lo haya pedido.
- **Cambio de spec vía delta `MODIFIED Requirements`** sobre `panel-shell` (no capability nueva): el requirement existente ya cubre la garantía "ningún hook de auth usa `/dashboard`"; sólo faltaba nombrar `useSetPasswordForm` explícitamente y cubrir sus escenarios (token válido/admin/rol sin permisos/token inválido).
- **Criterios de Seguridad de la historia** (no se altera RBAC, no se altera emisión de sesión, no se expone info adicional): se satisfacen por construcción al no tocar `CompletePasswordSetupUseCase` ni `useCurrentUser` — el diff se limita a la línea del redirect.

## Risks / Trade-offs

- [Riesgo: algún test unitario existente de `useSetPasswordForm` asertaba `router.replace("/dashboard")`] → Mitigación: verificar y actualizar ese test como parte de las tasks; el fix está incompleto si el test queda rojo o queda afirmando el destino viejo.
- [Riesgo: usuarios con rol `viewer` (sin `sales:create`/`quotes:create`) seguirán viendo "Sin acceso" tras establecer contraseña, sólo que ahora en un solo salto en vez de dos] → Aceptado explícitamente como Non-Goal; es comportamiento correcto del guard de `/pos`, no un defecto de este fix. Si el negocio quiere una landing distinta para roles de solo lectura, es una historia nueva, no este fix.
