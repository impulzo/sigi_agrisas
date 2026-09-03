## REMOVED Requirements

### Requirement: Página de registro accesible sin autenticación
**Reason**: El alta de cuentas deja de ser un flujo público de autoservicio; ahora requiere un caller autenticado con `users:write` (ver capability `user-auth`, requirement "User registration"). La pantalla `/auth/register` ya no existe.
**Migration**: El alta de usuarios se realiza desde `/users` (ya protegido por `users:write`), que ya expone un flujo de creación completo (`CreateUserModal` → `POST /api/v1/admin/users`). No hay acción de migración para usuarios finales — cualquier bookmark a `/auth/register` redirige a `/auth/login`.

### Requirement: Formulario de registro con validación Zod
**Reason**: El componente `RegisterForm` se elimina junto con la pantalla de registro público.
**Migration**: Ninguna — el alta admin en `/users` usa su propio formulario (`CreateUserModal`), no derivado de este componente.

### Requirement: Integración del formulario de registro con el endpoint versionado
**Reason**: El servicio `register` (llamado desde la UI pública) se elimina; el endpoint `POST /api/v1/auth/register` sigue existiendo pero ahora requiere autenticación y se invoca únicamente desde el flujo de alta en `/users`.
**Migration**: Ninguna — no hay consumidor público de este servicio tras el cambio.

### Requirement: Navegación entre login y registro
**Reason**: Ya no existe pantalla de registro a la que navegar; el link "Regístrate aquí" se retira de `/auth/login`.
**Migration**: Ninguna.

## MODIFIED Requirements

### Requirement: Layout split-panel compartido entre login y registro
Las páginas públicas de autenticación restantes (`/auth/login`, `/auth/set-password`) SHALL usar el mismo `app/(public)/auth/layout.tsx` — panel izquierdo únicamente con el logo `logo.png` sobre un fondo en gradiente verde claro que permite distinguir el logo, panel derecho con el slot `children` para el formulario. El layout SHALL ser un Server Component.

#### Scenario: Vista en pantalla ancha (≥1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/set-password` en pantalla ≥1024px
- **THEN** el layout muestra dos columnas de 50% cada una (logo izquierda, formulario derecha)

#### Scenario: Vista en pantalla pequeña (<1024px)
- **WHEN** el usuario visualiza `/auth/login` o `/auth/set-password` en pantalla <1024px
- **THEN** el layout apila los paneles verticalmente (logo arriba, formulario abajo)

#### Scenario: Layout es Server Component
- **WHEN** se inspecciona `app/(public)/auth/layout.tsx`
- **THEN** no contiene la directiva `"use client"`

#### Scenario: Logo reemplaza ilustración, título y subtítulo en el panel izquierdo
- **WHEN** un visitante no autenticado visualiza `/auth/login` o `/auth/set-password`
- **THEN** el panel izquierdo muestra únicamente la imagen `logo.png` (servida desde `/public/logo.png`); ni el `<svg>` agrícola, ni el `<h1>Agrisas</h1>`, ni el texto "Gestión agrícola inteligente" se renderizan

#### Scenario: Fondo del panel izquierdo permite distinguir el logo
- **WHEN** se inspecciona el CSS aplicado a `.leftPanel` en `app/(public)/auth/layout.module.css`
- **THEN** el gradiente usa tonos de verde más claros que los originales (`#1a4d42`/`#2a6b5f`), de modo que el logo `logo.png` se distinga visualmente sobre el fondo
