# Spec: users-ui

## Purpose

Define la pantalla de administración de usuarios del panel privado de Agrisas: ruta `/users` bajo `(private)`, tabla paginada de usuarios con acciones de edición y eliminación, guard de permiso `users:read`, modal de edición con asignación de roles, y los servicios/hooks de lógica de negocio del módulo.

---

## Requirements

### Requirement: Ruta privada `/users` con guard de permiso `users:read`
La aplicación SHALL exponer la ruta `/users` dentro del route group `(private)` con un `layout.tsx` que extienda el shell privado y un `page.tsx` que verifique sesión (`refreshToken` en cookies; redirect a `/auth/login` si falta) y renderice el block `UsersPage`. El block SHALL consultar `useCurrentUser().can("users:read")` y mostrar una pantalla "Sin acceso" cuando el resultado sea `false`, un esqueleto cuando sea `"loading"`, y la tabla cuando sea `true`.

#### Scenario: Usuario sin sesión accede a /users
- **WHEN** un usuario sin `refreshToken` navega a `/users`
- **THEN** el route handler hace `redirect("/auth/login")` antes de renderizar

#### Scenario: Usuario autenticado con users:read accede a /users
- **WHEN** el usuario tiene el permiso `users:read` y la cookie de refresh
- **THEN** la página renderiza el header "Administración de Usuarios" y la tabla

#### Scenario: Usuario autenticado sin users:read accede a /users
- **WHEN** el usuario está autenticado pero `can("users:read")` resuelve a `false`
- **THEN** la página renderiza un `EmptyState` con icono `lock`, título "Sin acceso" y descripción "No tienes permisos para administrar usuarios. Contacta a un administrador."

#### Scenario: Permiso aún cargando
- **WHEN** `can("users:read")` devuelve `"loading"`
- **THEN** la página renderiza esqueletos (cabecera + 5 filas) mientras se resuelve el permiso

---

### Requirement: Tabla de usuarios paginada con datos del backend
La pantalla SHALL renderizar una tabla con las siguientes columnas en este orden: avatar + nombre, email, roles (chips), fecha de creación (relativa con tooltip absoluto), acciones. Los datos provienen de `GET /api/v1/admin/users?page&pageSize` vía `listUsers` service y se exponen en el hook `useUsers({ page, pageSize })`. Estado de carga inicial muestra esqueletos; error muestra mensaje con botón "Reintentar"; lista vacía muestra `EmptyState` con título "No hay usuarios" e icono `group`.

#### Scenario: Carga exitosa
- **WHEN** la página monta con `page=1, pageSize=20` y el endpoint responde 200
- **THEN** la tabla renderiza una fila por usuario, mostrando avatar, nombre (o "—" si es null), email, chips de roles, "Creado hace X" con tooltip ISO, y las acciones

#### Scenario: Página vacía
- **WHEN** el endpoint devuelve `{ users: [], total: 0, page: 1, pageSize: 20 }`
- **THEN** la tabla esconde sus filas y muestra `EmptyState` con título "No hay usuarios"

#### Scenario: Error de red al cargar
- **WHEN** `listUsers` lanza `NetworkError`
- **THEN** la pantalla muestra "No se pudo cargar la lista de usuarios" y un botón "Reintentar" que invoca `refresh()`

#### Scenario: Forbidden al cargar (caso defensivo)
- **WHEN** `listUsers` lanza `ForbiddenError` (token aún válido pero permiso revocado)
- **THEN** la pantalla cae al estado "Sin acceso" del requisito anterior

---

### Requirement: Paginación offset con controles visibles
La pantalla SHALL exponer controles de paginación en el footer de la tabla con: indicador "Mostrando X-Y de N usuarios", botón "Anterior" (deshabilitado en page 1), botón "Siguiente" (deshabilitado cuando `(page-1)*pageSize + users.length >= total`), y selector de `pageSize` con valores `10`, `20`, `50`. Cambiar `pageSize` SHALL resetear `page` a 1.

#### Scenario: Primera página
- **WHEN** la respuesta es `{ total: 42, page: 1, pageSize: 20, users: [20 items] }`
- **THEN** el footer muestra "Mostrando 1-20 de 42 usuarios", "Anterior" deshabilitado, "Siguiente" habilitado

#### Scenario: Última página parcial
- **WHEN** la respuesta es `{ total: 42, page: 3, pageSize: 20, users: [2 items] }`
- **THEN** el footer muestra "Mostrando 41-42 de 42 usuarios", "Anterior" habilitado, "Siguiente" deshabilitado

#### Scenario: Cambio de pageSize
- **WHEN** el usuario selecciona `pageSize=50` mientras está en `page=3`
- **THEN** `page` se resetea a 1 y se vuelve a llamar al endpoint con `page=1&pageSize=50`

---

### Requirement: Buscador y filtro por rol sobre la página actual
La pantalla SHALL incluir un input de búsqueda (placeholder "Buscar por nombre o email") y un grupo de chips de filtro con los roles disponibles más el chip "Todos" (activo por defecto). Ambos filtros operan en cliente sobre la lista cargada en la página actual:
- Search: case-insensitive substring match sobre `name` y `email`.
- Role chips: si "Todos" está activo no filtra; si uno o más roles están activos, muestra solo usuarios que tengan al menos uno de esos roles.

#### Scenario: Búsqueda por email
- **WHEN** el usuario escribe "admin" en el input
- **THEN** sólo permanecen visibles los usuarios cuyo email o nombre contiene "admin" (case-insensitive)

#### Scenario: Filtro por rol
- **WHEN** el usuario activa el chip "viewer"
- **THEN** sólo permanecen visibles los usuarios cuyo array `roles` incluye "viewer"

#### Scenario: Combinación search + role
- **WHEN** el usuario escribe "test" y activa el chip "operator"
- **THEN** se aplica la intersección: usuarios cuyo nombre/email contiene "test" Y tienen rol "operator"

#### Scenario: Sin resultados tras filtrar
- **WHEN** los filtros activos no coinciden con ningún usuario de la página actual
- **THEN** la tabla muestra un mensaje inline "Ningún usuario coincide con los filtros" con botón "Limpiar filtros"

---

### Requirement: Acciones por fila con auto-protección visual
Cada fila SHALL renderizar dos botones de acción al final: "Editar" (icono `edit`) y "Eliminar" (icono `delete`). Ambos botones SHALL estar visibles únicamente cuando `can("users:write")` sea `true`. Para la fila correspondiente al `userId` del propio admin, ambos botones SHALL aparecer deshabilitados con `title="No puedes editar tu propia cuenta"` y `title="No puedes eliminar tu propia cuenta"` respectivamente.

#### Scenario: Admin con users:write ve acciones en filas de otros usuarios
- **WHEN** `can("users:write")` es `true` y la fila no es la propia
- **THEN** los botones "Editar" y "Eliminar" están habilitados

#### Scenario: Admin ve acciones deshabilitadas en su propia fila
- **WHEN** `userId === currentUserId`
- **THEN** los botones aparecen con `disabled` y los tooltips mencionados

#### Scenario: Usuario con users:read pero sin users:write
- **WHEN** `can("users:read")` es `true` y `can("users:write")` es `false`
- **THEN** la columna de acciones no renderiza ningún botón (o se oculta completamente)

---

### Requirement: Modal "Editar Usuario" con campos y asignación de roles
Al pulsar "Editar", la pantalla SHALL abrir un modal con título "Editar Usuario" y los campos:
- Avatar (lectura) con la URL actual del usuario.
- `name`: input de texto.
- `email`: input de email.
- `avatarUrl`: input de URL con placeholder vacío y botón secundario "Resetear a Gravatar" que vacía el campo y marca un flag interno para enviar `null` al backend.
- Lista de roles disponibles (cargada desde `GET /api/v1/admin/roles`) como checkboxes; los roles actuales del usuario aparecen marcados.

El modal SHALL tener un footer con botones "Cancelar" (cierra sin guardar) y "Guardar Cambios" (envía el diff). El botón "Guardar Cambios" SHALL estar deshabilitado mientras no haya cambios respecto al estado inicial o mientras una mutación esté en vuelo.

#### Scenario: Apertura del modal
- **WHEN** el usuario pulsa "Editar" en una fila
- **THEN** el modal se abre con los campos pre-llenos con los datos del usuario y los chips de roles marcados según `user.roles`

#### Scenario: Validación de email inválido
- **WHEN** el usuario cambia el email a un valor que no cumple el formato (e.g. "no-email")
- **THEN** el input muestra error inline "Email inválido" y "Guardar Cambios" se deshabilita

#### Scenario: Validación de URL inválida en avatar
- **WHEN** el campo `avatarUrl` contiene un valor que no es URL válida (y no está vacío)
- **THEN** se muestra error inline "URL inválida" y "Guardar Cambios" se deshabilita

#### Scenario: Cancelar descarta cambios
- **WHEN** el usuario edita campos y pulsa "Cancelar"
- **THEN** el modal se cierra sin enviar requests; al reabrirlo, los datos vuelven al estado del servidor

---

### Requirement: Commit del modal aplica diff en bloque
Al pulsar "Guardar Cambios", la pantalla SHALL ejecutar las siguientes operaciones, en este orden lógico (las de roles en paralelo entre sí):
1. Si `name`, `email` o `avatarUrl` cambiaron respecto al estado inicial → un único `PATCH /api/v1/admin/users/:id` con sólo los campos modificados (`avatarUrl: null` cuando el flag de "resetear" está activo).
2. Por cada rol marcado que no estaba antes → `POST /api/v1/admin/users/:id/roles` con `{ roleName }`.
3. Por cada rol desmarcado que sí estaba antes → `DELETE /api/v1/admin/users/:id/roles/:roleId`.

Si todas las operaciones tienen éxito, el modal SHALL cerrarse y el hook `useUsers` SHALL refrescar la página actual. Si alguna falla, el modal permanece abierto y muestra el mensaje del error tipado (`EmailAlreadyInUseError` → "Ese email ya está en uso por otro usuario", `ForbiddenError` → "No tienes permisos para esta acción", `NetworkError` → "Error de conexión", error genérico → mensaje del backend).

#### Scenario: Guardar sólo cambios de nombre
- **WHEN** el usuario sólo modificó `name` y pulsa "Guardar"
- **THEN** se ejecuta `PATCH /admin/users/:id` con body `{ name: "Nuevo Nombre" }` (sin `email`, sin `avatarUrl`); no se envía ningún request a `/roles`

#### Scenario: Guardar cambios mixtos (datos + roles)
- **WHEN** el usuario cambió `email` y agregó el rol `operator`
- **THEN** se ejecuta primero el PATCH, luego un POST a `/admin/users/:id/roles` con `{ roleName: "operator" }`; ambos en paralelo si el orden no importa para el dominio

#### Scenario: Email duplicado
- **WHEN** el PATCH responde 409 con `{ error: "Email already in use" }`
- **THEN** el modal permanece abierto, muestra "Ese email ya está en uso por otro usuario" y el botón "Guardar Cambios" se rehabilita

#### Scenario: Resetear avatar a Gravatar
- **WHEN** el usuario pulsa "Resetear a Gravatar" y luego "Guardar"
- **THEN** el PATCH se envía con `{ avatarUrl: null }` y la respuesta devuelve la URL de Gravatar calculada

#### Scenario: 403 al guardar (intento de auto-edición que se coló)
- **WHEN** el backend responde 403 `{ error: "Cannot modify your own account" }`
- **THEN** el modal muestra el mensaje del backend y permanece abierto

---

### Requirement: Eliminación con confirmación
Al pulsar "Eliminar", la pantalla SHALL abrir un `ConfirmDialog` con título "Eliminar usuario", descripción "Esta acción no se puede deshacer. Se eliminará al usuario `<email>` y se removerán todas sus asignaciones de rol.", botón primario "Eliminar" (variante destructiva) y botón secundario "Cancelar". Confirmar SHALL llamar a `DELETE /api/v1/admin/users/:id`; al éxito (HTTP 204) cierra el diálogo y refresca la tabla; al error muestra toast/inline con el mensaje del error.

#### Scenario: Eliminación exitosa
- **WHEN** el admin confirma la eliminación de un usuario distinto al suyo
- **THEN** se ejecuta `DELETE /admin/users/:id`, el diálogo se cierra y la tabla refresca

#### Scenario: Cancelar el diálogo
- **WHEN** el admin pulsa "Cancelar" en el diálogo
- **THEN** no se envía ningún request y el diálogo se cierra

#### Scenario: Error al eliminar
- **WHEN** el DELETE responde 404 o 403
- **THEN** el diálogo permanece abierto y muestra el mensaje del error

---

### Requirement: Servicios `_logic` envuelven los endpoints con errores tipados
El módulo `app/(private)/users/_logic/services/` SHALL exponer las funciones `listUsers`, `updateUser`, `deleteUser`, `assignRoleToUser`, `revokeRoleFromUser`. Cada función SHALL:
- Aceptar un parámetro opcional `fetchImpl: typeof fetch = authFetch` para testabilidad.
- Llamar al endpoint correspondiente con `authFetch`.
- Devolver el dato parseado en caso de éxito (o `void` para DELETE/204).
- Lanzar un error tipado del módulo (`UserNotFoundError`, `EmailAlreadyInUseError`, `SelfModificationError`) o re-propagar errores comunes (`ForbiddenError`, `NetworkError`, `UnauthenticatedError`).

#### Scenario: listUsers parsea respuesta
- **WHEN** `listUsers({ page: 1, pageSize: 20 })` se invoca y el endpoint responde 200
- **THEN** devuelve `{ users: UserDto[], total: number, page: number, pageSize: number }`

#### Scenario: updateUser mapea 409 a EmailAlreadyInUseError
- **WHEN** el endpoint responde 409 con `{ error: "Email already in use" }`
- **THEN** la función lanza `EmailAlreadyInUseError`

#### Scenario: deleteUser mapea 403 a ForbiddenError o SelfModificationError según body
- **WHEN** el endpoint responde 403 con `{ error: "Cannot delete your own account" }`
- **THEN** la función lanza `SelfModificationError("delete")`

#### Scenario: assignRoleToUser mapea 404
- **WHEN** se intenta asignar un rol a un usuario inexistente y el endpoint responde 404
- **THEN** la función lanza `UserNotFoundError`

---

### Requirement: Hook `useUsers` orquesta carga y refresh
El hook `useUsers({ page, pageSize })` SHALL:
- Cargar usuarios al montar y cuando `page` o `pageSize` cambian.
- Exponer `{ users, total, page, pageSize, isLoading, error, refresh }`.
- Manejar cancelación al desmontar para evitar setState en componentes desmontados.
- Re-disparar la carga cuando `refresh()` se invoca (igual que `useRoles`).

#### Scenario: Carga inicial
- **WHEN** se monta con `{ page: 1, pageSize: 20 }`
- **THEN** se llama a `listUsers({ page: 1, pageSize: 20 })`, `isLoading=true` durante la carga, luego `users` se popula

#### Scenario: Cambio de página
- **WHEN** el componente cambia el prop a `{ page: 2, pageSize: 20 }`
- **THEN** se vuelve a llamar al service con los nuevos valores; los usuarios anteriores quedan reemplazados por los nuevos

#### Scenario: Refresh manual
- **WHEN** `refresh()` se invoca tras un PATCH
- **THEN** el hook vuelve a llamar `listUsers` con la misma `page`/`pageSize`

---

### Requirement: Tipos del frontend separan DTO HTTP de dominio
El módulo SHALL definir tipos en `_logic/types/`:
- `api.ts`: DTOs serializados desde el backend (`UserDto` con `createdAt: string`, `roles: string[]`), respuestas (`ListUsersResponse`, `UpdateUserResponse`).
- `domain.ts`: tipos del dominio del frontend (`User` con `createdAt: Date`).

Los services SHALL convertir entre ambos antes de devolver al hook.

#### Scenario: Conversión de fecha
- **WHEN** el backend devuelve `createdAt: "2026-05-14T07:12:59.006Z"`
- **THEN** el service devuelve `createdAt: Date("2026-05-14T07:12:59.006Z")` al hook
