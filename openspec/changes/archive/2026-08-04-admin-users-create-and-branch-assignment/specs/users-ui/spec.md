## ADDED Requirements

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

## MODIFIED Requirements

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
Al confirmar el modal, el comportamiento depende del modo:

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
