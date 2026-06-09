# Spec: logout-ui

## Purpose

Define el cierre de sesión desde el panel privado: el servicio que limpia la sesión en cliente y servidor, el hook que orquesta el flujo y la redirección, y el botón de logout renderizado en el NavigationRail.

---

## Requirements

### Requirement: Servicio `logout` limpia la sesión en cliente y servidor
El módulo `app/(public)/auth/_logic/services/logout.ts` SHALL exportar una función `logout(fetchImpl?)` que:
1. Llama `POST /api/v1/auth/logout` usando `authFetch` (o el `fetchImpl` inyectado).
2. Elimina el access token de `sessionStorage` (`sessionStorage.removeItem("accessToken")`), independientemente del resultado HTTP.
3. Devuelve `void` en éxito.
4. Lanza `NetworkError` si la llamada falla por error de red.

#### Scenario: Logout exitoso
- **WHEN** `POST /api/v1/auth/logout` responde 200
- **THEN** la función elimina `"accessToken"` de `sessionStorage` y devuelve `void`

#### Scenario: Error de red no bloquea limpieza
- **WHEN** la llamada lanza un error de red
- **THEN** la función aun así elimina `"accessToken"` de `sessionStorage` antes de propagar `NetworkError`

---

### Requirement: Hook `useLogout` orquesta el cierre de sesión y la redirección
El hook `app/(public)/auth/_logic/hooks/useLogout.ts` SHALL exponer `{ logout: () => void; isLoading: boolean }`. Al invocar `logout()`:
1. Pone `isLoading = true`.
2. Llama al servicio `logout()`.
3. Independientemente del resultado, ejecuta `router.push("/auth/login")`.
4. Pone `isLoading = false` sólo si el componente sigue montado.

#### Scenario: Flujo nominal
- **WHEN** el usuario invoca `logout()`
- **THEN** `isLoading` pasa a `true`, el servicio es llamado y el router redirige a `/auth/login`

#### Scenario: isLoading deshabilita reenvíos
- **WHEN** `isLoading` es `true`
- **THEN** el botón que consume el hook debe quedar `disabled` para evitar doble envío

#### Scenario: Error de red no bloquea la redirección
- **WHEN** el servicio lanza `NetworkError`
- **THEN** el hook igualmente llama `router.push("/auth/login")` (la sesión está localmente destruida)

---

### Requirement: Botón de logout en el `NavigationRail`
El `NavigationRail` SHALL renderizar un botón `<button>` al final del grupo secundario (debajo de los `secondaryItems`) con:
- Icono `logout` (Material Symbols).
- `title="Cerrar sesión"` para tooltip accesible.
- `aria-label="Cerrar sesión"`.
- Mismo estilo visual que los demás items del rail (`flex flex-col items-center justify-center w-14 h-14 rounded-xl`), con variante de color de error al hover (`hover:bg-error-container hover:text-error`).
- `disabled` mientras `isLoading` sea `true`.

#### Scenario: Botón visible para todos los usuarios autenticados
- **WHEN** cualquier usuario autenticado navega por el panel
- **THEN** el botón de logout es visible en la parte inferior del NavigationRail

#### Scenario: Click dispara el logout
- **WHEN** el usuario hace click en el botón de logout
- **THEN** se invoca `logout()` del hook `useLogout`, el botón pasa a `disabled` y el router redirige a `/auth/login`

#### Scenario: Botón deshabilitado durante la operación
- **WHEN** `isLoading` es `true` (logout en vuelo)
- **THEN** el botón tiene el atributo `disabled` y muestra opacidad reducida
