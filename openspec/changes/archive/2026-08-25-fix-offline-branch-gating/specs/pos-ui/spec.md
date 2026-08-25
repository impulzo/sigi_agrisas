## ADDED Requirements

### Requirement: Creación de venta offline respeta el modo offline habilitado
El flujo de creación de venta en el POS SHALL consultar el estado `offlineEnabled` del contexto de sincronización offline antes de encolar una venta cuando se detecta `NetworkError` o `!isOnline()`. Si `offlineEnabled` es `false`, el sistema SHALL impedir el encolado y mostrar un mensaje explícito indicando que debe fijarse una sucursal de trabajo offline antes de vender sin conexión, en vez de encolar la venta bajo un `ownerBranchId` que no coincide con el contexto offline.

#### Scenario: Venta offline bloqueada para usuario bypass sin sucursal de trabajo fijada
- **WHEN** un usuario con `branches:access_all` que nunca llamó `fixWorkingBranch` intenta finalizar una venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema no encola la venta, deshabilita o intercepta el submit, y muestra un mensaje explícito de "fija tu sucursal de trabajo antes de vender offline"

#### Scenario: Venta offline permitida con sucursal de trabajo ya fijada
- **WHEN** un usuario con `branches:access_all` que ya fijó una sucursal de trabajo (o un cajero regular con `branchId` de sesión) intenta finalizar una venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema encola la venta normalmente, sin regresión sobre el comportamiento offline existente

#### Scenario: Venta offline bloqueada aunque el formulario tenga otra sucursal seleccionada
- **WHEN** un usuario con `branches:access_all` fijó la sucursal de trabajo A, pero mientras aún online seleccionó la sucursal B en el formulario del POS sin volver a fijarla, y luego intenta finalizar venta mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema bloquea el encolado igual que en el caso sin sucursal fijada — la sucursal de trabajo offline fijada es la única autoridad de scope, no la sucursal seleccionada en el formulario

### Requirement: Registro offline usa el `ownerBranchId` del contexto de sincronización
El encolado de una venta offline SHALL usar el `ownerBranchId` resuelto por el contexto de sincronización offline como clave de scope del registro persistido, en vez de la sucursal seleccionada en el formulario de venta.

#### Scenario: Ítem encolado siempre visible en el panel de sincronización
- **WHEN** una venta se encola offline con `offlineEnabled=true`
- **THEN** el registro persistido usa el `ownerBranchId` del contexto offline, de forma que aparece siempre en el panel de cola de sincronización y se cuenta en el badge de pendientes, sin excepción

### Requirement: Error al cambiar de sucursal de trabajo offline es visible al usuario
Cuando el sistema rechaza un cambio de sucursal de trabajo offline por existir ventas o cotizaciones sin sincronizar, el error SHALL mostrarse al usuario de forma visible, no como una falla silenciosa.

#### Scenario: Mensaje de error visible tras intento de cambio rechazado
- **WHEN** un usuario con `branches:access_all` intenta fijar una nueva sucursal de trabajo mientras existen ítems `pending`/`failed` sin sincronizar de la sucursal de trabajo anterior
- **THEN** el sistema muestra el mensaje de error ("No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar.") de forma visible en la interfaz, y la sucursal de trabajo fijada no cambia

#### Scenario: Sin mensaje de error residual tras un cambio exitoso
- **WHEN** un usuario con `branches:access_all` fija una nueva sucursal de trabajo sin tener ítems pendientes sin sincronizar
- **THEN** el cambio se aplica sin mostrar ningún mensaje de error
