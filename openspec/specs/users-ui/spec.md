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

### Requirement: Botón "Crear usuario" en la toolbar
La pantalla `/users` SHALL mostrar un botón "Crear usuario" en `UsersToolbar`. El botón SHALL estar visible únicamente cuando `can("users:write")` sea `true`, mostrado optimistamente mientras `can("users:write")` sea `"loading"`, y oculto cuando sea `false`. Al pulsarlo, la pantalla SHALL abrir `UserEditModal` en `mode="create"`.

#### Scenario: Botón visible con permiso
- **WHEN** `can("users:write")` resuelve a `true`
- **THEN** el botón "Crear usuario" se muestra en la toolbar

#### Scenario: Botón oculto sin permiso
- **WHEN** `can("users:write")` resuelve a `false`
- **THEN** el botón "Crear usuario" no se renderiza

#### Scenario: Click abre el modal en modo creación
- **WHEN** el admin pulsa "Crear usuario"
- **THEN** `UserEditModal` se abre con `mode="create"` y sin usuario precargado

---

### Requirement: Hook global `useBranchesOptions`
La aplicación SHALL exponer un hook `app/_hooks/useBranchesOptions.ts` que consulte `GET /api/v1/admin/branches?pageSize=100`, filtre las sucursales con `isActive !== false`, y devuelva una lista de opciones `{ id: string; name: string }[]` para poblar selects. El hook SHALL cachear el resultado durante 60 segundos por sesión de módulo, siguiendo el mismo patrón que `useHeadquarters`.

#### Scenario: Carga de opciones de sucursal
- **WHEN** un componente monta `useBranchesOptions()`
- **THEN** el hook solicita `GET /api/v1/admin/branches?pageSize=100` y expone únicamente las sucursales activas como `{ id, name }`

#### Scenario: Caché entre componentes
- **WHEN** dos componentes distintos usan `useBranchesOptions()` dentro de la ventana de 60 segundos
- **THEN** sólo se realiza una llamada de red; el segundo componente reutiliza el resultado cacheado

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
El modal de usuario SHALL soportar dos modos mediante una prop `mode: "create" | "edit"`. En ambos modos el modal muestra:
- Avatar (lectura) con la URL actual del usuario (en `create`, se muestra el placeholder/Gravatar por defecto hasta que se ingrese un email).
- `name`: input de texto.
- `email`: input de email.
- `avatarUrl`: input de URL con placeholder vacío y botón secundario "Resetear a Gravatar" (sólo visible en `edit`) que vacía el campo y marca un flag interno para enviar `null` al backend.
- **Sucursal**: selector poblado por `useBranchesOptions`, con una opción "Sin sucursal" que representa `branchId: null`. Visible en ambos modos.
- Lista de roles disponibles (cargada desde `GET /api/v1/admin/roles`) como checkboxes; en `edit` los roles actuales del usuario aparecen marcados, en `create` ninguno viene marcado por defecto.

En modo `create` el modal además muestra:
- Título "Crear usuario".
- Campo **password**: input de tipo password, requerido, validación de longitud mínima (8 caracteres) con error inline.
- El modal NO exige un `user` precargado (a diferencia de `edit`, donde `user` es obligatorio).

En modo `edit` el título permanece "Editar Usuario" y el campo password no se renderiza.

El modal SHALL tener un footer con botones "Cancelar" (cierra sin guardar) y "Guardar Cambios" en `edit` / "Crear usuario" en `create` (envía el formulario). En `edit`, el botón de guardar SHALL estar deshabilitado mientras no haya cambios respecto al estado inicial o mientras una mutación esté en vuelo. En `create`, el botón SHALL estar deshabilitado mientras falten campos requeridos válidos (`name`, `email`, `password`) o mientras una mutación esté en vuelo.

#### Scenario: Apertura del modal en modo edición
- **WHEN** el usuario pulsa "Editar" en una fila
- **THEN** el modal se abre con `mode="edit"`, los campos pre-llenos con los datos del usuario, la sucursal actual seleccionada, y los chips de roles marcados según `user.roles`

#### Scenario: Apertura del modal en modo creación
- **WHEN** el admin pulsa "Crear usuario"
- **THEN** el modal se abre con `mode="create"`, título "Crear usuario", campos vacíos, campo password visible, y selector de sucursal en "Sin sucursal" por defecto

#### Scenario: Validación de email inválido
- **WHEN** el usuario cambia el email a un valor que no cumple el formato (e.g. "no-email")
- **THEN** el input muestra error inline "Email inválido" y el botón de submit se deshabilita, en ambos modos

#### Scenario: Validación de URL inválida en avatar
- **WHEN** el campo `avatarUrl` contiene un valor que no es URL válida (y no está vacío)
- **THEN** se muestra error inline "URL inválida" y el botón de submit se deshabilita

#### Scenario: Validación de password corto en modo creación
- **WHEN** en `mode="create"` el campo password tiene menos de 8 caracteres
- **THEN** se muestra error inline "La contraseña debe tener al menos 8 caracteres" y "Crear usuario" se deshabilita

#### Scenario: Cancelar descarta cambios
- **WHEN** el usuario edita campos y pulsa "Cancelar"
- **THEN** el modal se cierra sin enviar requests; en `edit`, al reabrirlo los datos vuelven al estado del servidor; en `create`, el formulario queda descartado

---

### Requirement: Commit del modal aplica diff en bloque
Al confirmar el modal, el comportamiento SHALL depender del modo (`create` o `edit`):

**Modo `edit`** — Al pulsar "Guardar Cambios", la pantalla SHALL ejecutar las siguientes operaciones, en este orden lógico (las de roles en paralelo entre sí):
1. Si `name`, `email`, `avatarUrl` o `branchId` cambiaron respecto al estado inicial → un único `PATCH /api/v1/admin/users/:id` con sólo los campos modificados (`avatarUrl: null` cuando el flag de "resetear" está activo; `branchId: null` cuando se selecciona "Sin sucursal").
2. Por cada rol marcado que no estaba antes → `POST /api/v1/admin/users/:id/roles` con `{ roleName }`.
3. Por cada rol desmarcado que sí estaba antes → `DELETE /api/v1/admin/users/:id/roles/:roleId`.

**Modo `create`** — Al pulsar "Crear usuario", la pantalla SHALL ejecutar un único `POST /api/v1/admin/users` con `{ name, email, password, avatarUrl, branchId, roleIds }` (omitiendo campos opcionales no provistos).

Si todas las operaciones tienen éxito, el modal SHALL cerrarse y el hook `useUsers` SHALL refrescar la página actual (en `create`, adicionalmente resetea a la primera página para mostrar el nuevo usuario si corresponde al orden por fecha de creación descendente). Si alguna falla, el modal permanece abierto y muestra el mensaje del error tipado (`EmailAlreadyInUseError` → "Ese email ya está en uso por otro usuario", `BranchNotFoundError` → "La sucursal seleccionada no existe", `ForbiddenError` → "No tienes permisos para esta acción", `NetworkError` → "Error de conexión", error genérico → mensaje del backend).

#### Scenario: Guardar sólo cambios de nombre (edit)
- **WHEN** el usuario sólo modificó `name` y pulsa "Guardar"
- **THEN** se ejecuta `PATCH /admin/users/:id` con body `{ name: "Nuevo Nombre" }` (sin `email`, `avatarUrl` ni `branchId`); no se envía ningún request a `/roles`

#### Scenario: Guardar cambio de sucursal (edit)
- **WHEN** el usuario selecciona una nueva sucursal en el modal de edición y pulsa "Guardar"
- **THEN** se ejecuta `PATCH /admin/users/:id` con body `{ branchId: "<uuid>" }`

#### Scenario: Guardar cambios mixtos (datos + roles)
- **WHEN** el usuario cambió `email` y agregó el rol `operator`
- **THEN** se ejecuta primero el PATCH, luego un POST a `/admin/users/:id/roles` con `{ roleName: "operator" }`; ambos en paralelo si el orden no importa para el dominio

#### Scenario: Email duplicado (edit)
- **WHEN** el PATCH responde 409 con `{ error: "Email already in use" }`
- **THEN** el modal permanece abierto, muestra "Ese email ya está en uso por otro usuario" y el botón "Guardar Cambios" se rehabilita

#### Scenario: Resetear avatar a Gravatar
- **WHEN** el usuario pulsa "Resetear a Gravatar" y luego "Guardar"
- **THEN** el PATCH se envía con `{ avatarUrl: null }` y la respuesta devuelve la URL de Gravatar calculada

#### Scenario: 403 al guardar (intento de auto-edición que se coló)
- **WHEN** el backend responde 403 `{ error: "Cannot modify your own account" }`
- **THEN** el modal muestra el mensaje del backend y permanece abierto

#### Scenario: Creación exitosa
- **WHEN** el admin completa `name`, `email`, `password` (y opcionalmente `branchId`/roles) y pulsa "Crear usuario"
- **THEN** se ejecuta `POST /admin/users` con esos campos; al recibir 201 el modal se cierra y la tabla refresca mostrando el nuevo usuario

#### Scenario: Creación falla por email duplicado
- **WHEN** el `POST /admin/users` responde 409
- **THEN** el modal permanece abierto en modo `create` y muestra "Ese email ya está en uso por otro usuario"

#### Scenario: Creación falla por sucursal inexistente
- **WHEN** el `POST /admin/users` responde 400 `{ error: "Branch not found" }`
- **THEN** el modal permanece abierto y muestra el error inline en el selector de sucursal

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
El módulo `app/(private)/users/_logic/services/` SHALL exponer las funciones `listUsers`, `createUser`, `updateUser`, `deleteUser`, `assignRoleToUser`, `revokeRoleFromUser`. Cada función SHALL:
- Aceptar un parámetro opcional `fetchImpl: typeof fetch = authFetch` para testabilidad.
- Llamar al endpoint correspondiente con `authFetch`.
- Devolver el dato parseado en caso de éxito (o `void` para DELETE/204).
- Lanzar un error tipado del módulo (`UserNotFoundError`, `EmailAlreadyInUseError`, `SelfModificationError`, `BranchNotFoundError`) o re-propagar errores comunes (`ForbiddenError`, `NetworkError`, `UnauthenticatedError`).

`createUser` SHALL llamar a `POST /api/v1/admin/users`, mapear 409 a `EmailAlreadyInUseError` y 400 con `{ error: "Branch not found" }` a `BranchNotFoundError`.

#### Scenario: listUsers parsea respuesta
- **WHEN** `listUsers({ page: 1, pageSize: 20 })` se invoca y el endpoint responde 200
- **THEN** devuelve `{ users: UserDto[], total: number, page: number, pageSize: number }`

#### Scenario: createUser mapea 201 a User de dominio
- **WHEN** `createUser({ name, email, password })` se invoca y el endpoint responde 201
- **THEN** devuelve el `User` de dominio creado (con `branchId`/`branchName` incluidos)

#### Scenario: createUser mapea 409 a EmailAlreadyInUseError
- **WHEN** el endpoint responde 409 con `{ error: "Email already in use" }`
- **THEN** la función lanza `EmailAlreadyInUseError`

#### Scenario: createUser mapea 400 de branch a BranchNotFoundError
- **WHEN** el endpoint responde 400 con `{ error: "Branch not found" }`
- **THEN** la función lanza `BranchNotFoundError`

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
- `api.ts`: DTOs serializados desde el backend (`UserDto` con `createdAt: string`, `roles: string[]`, `branchId: string | null`, `branchName: string | null`), respuestas (`ListUsersResponse`, `CreateUserResponse`, `UpdateUserResponse`), y bodies de request (`CreateUserBody` con `name`, `email`, `password`, `avatarUrl?`, `branchId?`, `roleIds?`; `UpdateUserBody` con `name?`, `email?`, `avatarUrl?`, `branchId?`).
- `domain.ts`: tipos del dominio del frontend (`User` con `createdAt: Date`, `branchId: string | null`, `branchName: string | null`).

Los services SHALL convertir entre ambos antes de devolver al hook.

#### Scenario: Conversión de fecha
- **WHEN** el backend devuelve `createdAt: "2026-05-14T07:12:59.006Z"`
- **THEN** el service devuelve `createdAt: Date("2026-05-14T07:12:59.006Z")` al hook

#### Scenario: branchId y branchName viajan hasta el dominio
- **WHEN** el backend devuelve `{ branchId: "<uuid>", branchName: "Matriz" }`
- **THEN** el `User` de dominio expone `branchId: "<uuid>"` y `branchName: "Matriz"`
