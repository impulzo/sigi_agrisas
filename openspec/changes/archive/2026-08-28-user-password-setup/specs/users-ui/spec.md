## MODIFIED Requirements

### Requirement: Modal "Editar Usuario" con campos y asignación de roles
El modal de usuario SHALL soportar dos modos mediante una prop `mode: "create" | "edit"`. En ambos modos el modal muestra:
- Avatar (lectura) con la URL actual del usuario (en `create`, se muestra el placeholder/Gravatar por defecto hasta que se ingrese un email).
- `name`: input de texto.
- `email`: input de email.
- `avatarUrl`: input de URL con placeholder vacío y botón secundario "Resetear a Gravatar" (sólo visible en `edit`) que vacía el campo y marca un flag interno para enviar `null` al backend.
- **Sucursal**: selector poblado por `useBranchesOptions`, con una opción "Sin sucursal" que representa `branchId: null`. Visible en ambos modos.
- Lista de roles disponibles (cargada desde `GET /api/v1/admin/roles`) como checkboxes; en `edit` los roles actuales del usuario aparecen marcados, en `create` ninguno viene marcado por defecto.

El modal NO SHALL exponer, en ningún modo, un campo para capturar o editar la contraseña de un usuario. El admin nunca ve ni introduce contraseñas ajenas.

En modo `create` el modal además muestra:
- Título "Crear usuario".
- Un texto informativo indicando que se enviará un correo al nuevo usuario para que establezca su propia contraseña.
- El modal NO exige un `user` precargado (a diferencia de `edit`, donde `user` es obligatorio).

En modo `edit` el título permanece "Editar Usuario" y el modal muestra una sección "Contraseña" con un botón "Enviar correo para establecer/restablecer contraseña" que, tras una confirmación (`ConfirmDialog`), dispara `POST /api/v1/admin/users/:id/resend-set-password-email`. Mientras la petición está en vuelo el botón SHALL mostrar estado de carga y quedar deshabilitado; al resolver, el modal SHALL mostrar un mensaje inline de éxito o de error (sin cerrarse por esta acción).

El modal SHALL tener un footer con botones "Cancelar" (cierra sin guardar) y "Guardar Cambios" en `edit` / "Crear usuario" en `create` (envía el formulario). En `edit`, el botón de guardar SHALL estar deshabilitado mientras no haya cambios respecto al estado inicial o mientras una mutación esté en vuelo. En `create`, el botón SHALL estar deshabilitado mientras falten campos requeridos válidos (`name`, `email`) o mientras una mutación esté en vuelo.

#### Scenario: Apertura del modal en modo edición
- **WHEN** el usuario pulsa "Editar" en una fila
- **THEN** el modal se abre con `mode="edit"`, los campos pre-llenos con los datos del usuario, la sucursal actual seleccionada, los chips de roles marcados según `user.roles`, y la sección "Contraseña" con el botón de reenvío (sin ningún campo de contraseña editable)

#### Scenario: Apertura del modal en modo creación
- **WHEN** el admin pulsa "Crear usuario"
- **THEN** el modal se abre con `mode="create"`, título "Crear usuario", campos vacíos, el texto informativo sobre el correo de establecimiento de contraseña, sin campo de contraseña, y selector de sucursal en "Sin sucursal" por defecto

#### Scenario: Validación de email inválido
- **WHEN** el usuario cambia el email a un valor que no cumple el formato (e.g. "no-email")
- **THEN** el input muestra error inline "Email inválido" y el botón de submit se deshabilita, en ambos modos

#### Scenario: Validación de URL inválida en avatar
- **WHEN** el campo `avatarUrl` contiene un valor que no es URL válida (y no está vacío)
- **THEN** se muestra error inline "URL inválida" y el botón de submit se deshabilita

#### Scenario: Cancelar descarta cambios
- **WHEN** el usuario edita campos y pulsa "Cancelar"
- **THEN** el modal se cierra sin enviar requests; en `edit`, al reabrirlo los datos vuelven al estado del servidor; en `create`, el formulario queda descartado

#### Scenario: Reenviar correo de establecer/restablecer contraseña
- **WHEN** en modo `edit` el admin pulsa "Enviar correo para establecer/restablecer contraseña" y confirma en el diálogo de confirmación
- **THEN** se ejecuta `POST /api/v1/admin/users/:id/resend-set-password-email`; al resolver con éxito el modal muestra un mensaje inline de confirmación sin cerrarse

#### Scenario: Falla el reenvío de correo
- **WHEN** `POST /api/v1/admin/users/:id/resend-set-password-email` responde HTTP 502 `{"error": "EmailDeliveryFailed"}`
- **THEN** el modal muestra un mensaje inline de error junto al botón de reenvío, permite reintentar, y no cierra el modal

---

### Requirement: Commit del modal aplica diff en bloque
Al confirmar el modal, el comportamiento SHALL depender del modo (`create` o `edit`):

**Modo `edit`** — Al pulsar "Guardar Cambios", la pantalla SHALL ejecutar las siguientes operaciones, en este orden lógico (las de roles en paralelo entre sí):
1. Si `name`, `email`, `avatarUrl` o `branchId` cambiaron respecto al estado inicial → un único `PATCH /api/v1/admin/users/:id` con sólo los campos modificados (`avatarUrl: null` cuando el flag de "resetear" está activo; `branchId: null` cuando se selecciona "Sin sucursal").
2. Por cada rol marcado que no estaba antes → `POST /api/v1/admin/users/:id/roles` con `{ roleName }`.
3. Por cada rol desmarcado que sí estaba antes → `DELETE /api/v1/admin/users/:id/roles/:roleId`.

La acción "Enviar correo para establecer/restablecer contraseña" es independiente de este flujo de guardado por diff: se ejecuta inmediatamente al confirmarse (no espera al botón "Guardar Cambios") y no forma parte del diff ni del cierre del modal.

**Modo `create`** — Al pulsar "Crear usuario", la pantalla SHALL ejecutar un único `POST /api/v1/admin/users` con `{ name, email, avatarUrl, branchId, roleIds }` (omitiendo campos opcionales no provistos; sin `password`).

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
- **WHEN** el admin completa `name`, `email` (y opcionalmente `branchId`/roles) y pulsa "Crear usuario"
- **THEN** se ejecuta `POST /admin/users` con esos campos (sin `password`); al recibir 201 el modal se cierra y la tabla refresca mostrando el nuevo usuario

#### Scenario: Creación falla por email duplicado
- **WHEN** el `POST /admin/users` responde 409
- **THEN** el modal permanece abierto en modo `create` y muestra "Ese email ya está en uso por otro usuario"

#### Scenario: Creación falla por sucursal inexistente
- **WHEN** el `POST /admin/users` responde 400 `{ error: "Branch not found" }`
- **THEN** el modal permanece abierto y muestra el error inline en el selector de sucursal
