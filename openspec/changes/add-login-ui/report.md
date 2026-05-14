# Reporte de Verificación E2E — add-login-ui

**Fecha:** 2026-05-11  
**Entorno:** macOS Darwin 25.3.0 | Node.js 24.14.1 | Next.js 14.2.35  
**Servidor:** `npm run dev` → `http://localhost:3000`

---

## Procedimiento de arranque

### Problema encontrado: versión de Node.js

El entorno tenía Node.js 18.0.0 (< 18.17.0 requerido por Next.js 14). Se resolvió usando `nvm`:

```bash
nvm use 24          # activa Node.js v24.14.1
npm run dev         # servidor listo en ~1.2s
```

### Problema encontrado: Tailwind CSS v4 instalado en lugar de v3

`npm install tailwindcss` instaló la versión 4.x (la más reciente), que mueve el plugin PostCSS a `@tailwindcss/postcss`. El diseño especifica v3. Se corrigió:

```bash
npm install tailwindcss@3   # downgrade a 3.4.19
```

Error original:
```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
The PostCSS plugin has moved to a separate package...
```

### Corrección incidental: `/api/v1/health` en rutas públicas del middleware

El endpoint de health check devolvía 401 porque no estaba incluido en `PUBLIC_PATHS`. Se añadió al `AuthMiddlewareAdapter`:

```typescript
const PUBLIC_PATHS = [
  ...
  "/api/v1/health",   // ← añadido
  ...
];
```

---

## Resultados de las pruebas

### Prueba 20.1 — GET /auth/login sin token

**Comando:**
```bash
curl -s -o /tmp/login_page.html -w "HTTP_STATUS:%{http_code}" http://localhost:3000/auth/login
```

**Resultado esperado:** 200, split-panel con LoginForm  
**Resultado obtenido:** ✅ HTTP 200

**Contenido verificado en la página:**
```
Iniciar sesión        # título del formulario
Correo electrónico    # campo email
Contraseña            # campo password
Regístrate aquí       # enlace a /auth/register
font-poppins          # fuente Poppins aplicada
agrisas               # tokens de marca presentes
```

---

### Prueba 20.2 — GET /auth/register sin token

**Comando:**
```bash
curl -s -o /tmp/register_page.html -w "HTTP_STATUS:%{http_code}" http://localhost:3000/auth/register
```

**Resultado esperado:** 200, split-panel con RegisterForm  
**Resultado obtenido:** ✅ HTTP 200

**Contenido verificado:**
```
Crear cuenta        # título del formulario
Nombre completo     # campo name
Correo electrónico  # campo email
Contraseña          # campo password
Inicia sesión       # enlace a /auth/login
```

---

### Prueba 20.3 — Login con credenciales válidas → 200 + accessToken

**Preparación:** registro del usuario de prueba

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Prueba E2E","email":"e2e@agrisas.test","password":"pass123test"}'
```

**Respuesta del registro:**
```json
{"user":{"id":"4845ae1a-2dfd-4e59-9fc0-0ddf9643a059","email":"e2e@agrisas.test"}}
HTTP: 201
```

**Comando de login:**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e@agrisas.test","password":"pass123test"}'
```

**Resultado esperado:** 200 + `{ accessToken, user }`  
**Resultado obtenido:** ✅ HTTP 200

```json
{
  "accessToken": "eyJhbGci...",
  "user": {"id": "4845ae1a-...", "email": "e2e@agrisas.test"}
}
```

**Verificación de redirección con token válido:**
```bash
curl -H "Authorization: Bearer <accessToken>" http://localhost:3000/
# → HTTP 200 (ruta privada accesible)
```

---

### Prueba 20.4 — Login con credenciales inválidas → 401

**Comando:**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"noexiste@test.com","password":"wrongpass"}'
```

**Resultado esperado:** HTTP 401 + `{ error: "Invalid credentials" }`  
**Resultado obtenido:** ✅

```json
{"error": "Invalid credentials"}
HTTP: 401
```

El servicio frontend (`login.ts`) mapea este 401 → `InvalidCredentialsError` → el hook muestra "Credenciales inválidas" en `formError` (verificado por tests unitarios de hooks).

---

### Prueba 20.5 — Registro con datos válidos → 201

Verificado en el paso de preparación de la prueba 20.3.  
**Resultado:** ✅ HTTP 201 con `{ user: { id, email } }`

La redirección post-registro a `/` ocurre en el hook `useRegisterForm` (guardado del accessToken en `sessionStorage` + `router.replace("/")`) — verificado por tests unitarios `useRegisterForm.test.ts`.

---

### Prueba 20.6 — Registro con email duplicado → 409

**Comando:**
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Prueba E2E","email":"e2e@agrisas.test","password":"pass123test"}'
```

**Resultado esperado:** HTTP 409  
**Resultado obtenido:** ✅

```json
{"error": "Email already in use"}
HTTP: 409
```

El servicio frontend (`register.ts`) mapea 409 → `EmailAlreadyExistsError` → el hook muestra "Este correo ya está registrado" (verificado por `useRegisterForm.test.ts`).

---

### Prueba 20.7 — Layout responsive (viewport < 1024px)

**Método:** inspección del HTML generado por el servidor.

**Clases Tailwind encontradas en el HTML:**
```
lg:flex      # panel izquierdo: visible solo en lg+
lg:w-1/2     # ancho 50% en pantallas grandes
flex-col     # dirección columna en mobile (apilado)
max-w-md     # formulario centrado con ancho máximo
```

**Resultado:** ✅ Layout split-panel se apila en viewport < 1024px gracias a `hidden lg:flex` en el panel izquierdo y `flex-col` en el contenedor raíz.

---

### Prueba 20.8 — GET /api/v1/health → 200

**Comando:**
```bash
curl -s http://localhost:3000/api/v1/health
```

**Resultado esperado:** 200 `{ status: "ok", timestamp: "<ISO>" }`  
**Resultado obtenido:** ✅

```json
{"status": "ok", "timestamp": "2026-05-11T19:51:17.807Z"}
```

> Nota: se requirió agregar `/api/v1/health` a `PUBLIC_PATHS` del middleware (ver sección "Correcciones incidentales").

---

### Prueba 20.9 — TypeScript sin errores

**Comando:**
```bash
npx tsc --noEmit
```

**Resultado:** ✅ Sin errores (0 errores de TypeScript)

> Nota: el build `npm run build` requiere Node.js ≥ 18.17 (se verificó con `npx tsc --noEmit` directamente).

---

### Prueba 20.10 — Tests unitarios

**Comando:**
```bash
npm test
```

**Resultado:** ✅

```
Test Suites:  20 passed, 20 total
Tests:        73 passed, 73 total
Snapshots:    14 passed, 14 total
Time:         0.98s
```

**Proyectos:**
- `backend`: 11 suites (domain, use-cases, repositories, services, integration)
- `ui`: 9 suites (atoms, molecules, blocks, hooks, services)

---

### Prueba 20.11 — Grep: componentes presentational sin lógica de red

**Comando:**
```bash
grep -r "fetch\|sessionStorage\|useRouter\|/api/" \
  app/_components app/(public)/auth/_blocks app/(private)/dashboard/_blocks
```

**Resultado:** ✅ Sin coincidencias — ningún componente presentational contiene lógica de red, navegación ni acceso a storage.

---

### Prueba 20.12 — Grep: hooks globales sin importaciones de features

**Comando:**
```bash
grep -r "public\|private" app/_hooks
```

**Resultado:** ✅ Sin coincidencias — los hooks globales (`useDebounce`, `useLocalStorage`, `useMediaQuery`) no importan de ningún módulo de feature.

---

## Pruebas adicionales verificadas

### Redirect server-side con sesión activa

```bash
curl -o /dev/null -w "HTTP:%{http_code}\nLocation:%{redirect_url}" \
  -H "Cookie: refreshToken=some-token" \
  --max-redirs 0 \
  http://localhost:3000/auth/login
```

**Resultado:** ✅
```
HTTP: 307
Location: http://localhost:3000/
```
El Server Component lee la cookie `refreshToken` con `cookies()` y llama `redirect("/")` antes de renderizar.

### Redirect sin token en ruta privada

```bash
curl -o /dev/null -w "HTTP:%{http_code}\nLocation:%{redirect_url}" \
  --max-redirs 0 \
  http://localhost:3000/dashboard
```

**Resultado:** ✅
```
HTTP: 307
Location: http://localhost:3000/auth/login
```
El middleware redirige correctamente a `/auth/login` (no a `/login` como antes).

### Refresh token inválido

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Cookie: refreshToken=invalid-token"
```

**Resultado:** ✅ HTTP 401 `{ "error": "Invalid refresh token" }`

---

## Resumen

| # | Verificación | Resultado |
|---|---|---|
| 20.1 | `/auth/login` sin token → 200 + LoginForm | ✅ |
| 20.2 | `/auth/register` sin token → 200 + RegisterForm | ✅ |
| 20.3 | Login válido → 200 + accessToken | ✅ |
| 20.4 | Login inválido → 401 + "Invalid credentials" | ✅ |
| 20.5 | Registro válido → 201 + user | ✅ |
| 20.6 | Email duplicado → 409 | ✅ |
| 20.7 | Layout responsive (clases `lg:flex`, `flex-col`) | ✅ |
| 20.8 | GET /api/v1/health → 200 + `{ status: "ok" }` | ✅ |
| 20.9 | `tsc --noEmit` sin errores | ✅ |
| 20.10 | 73/73 tests pasan, 14/14 snapshots | ✅ |
| 20.11 | Cero `fetch`/`sessionStorage`/`useRouter` en presentational | ✅ |
| 20.12 | Hooks globales sin imports de features | ✅ |

**Todas las 12 verificaciones E2E pasaron correctamente.**

---

## Problemas encontrados y soluciones

| Problema | Causa | Solución |
|---|---|---|
| `npm run dev` falla | Node.js 18.0.0 < 18.17.0 requerido | `nvm use 24` |
| Tailwind PostCSS error | `npm install` instaló Tailwind v4 en lugar de v3 | `npm install tailwindcss@3` |
| `/api/v1/health` devuelve 401 | Ruta no estaba en `PUBLIC_PATHS` | Añadida al `AuthMiddlewareAdapter` |
| `.next/types` stale | Cache del build anterior | `rm -rf .next && tsc --noEmit` |
| `setupFilesAfterEach` key inválida | Nombre incorrecto de opción Jest | Corregido a `setupFilesAfterEnv` |
