## ADDED Requirements

### Requirement: Creación de cotización offline respeta el modo offline habilitado
El flujo de creación de cotización SHALL consultar el estado `offlineEnabled` del contexto de sincronización offline antes de encolar una cotización cuando se detecta `NetworkError` o `!isOnline()`. Si `offlineEnabled` es `false`, el sistema SHALL impedir el encolado y mostrar un mensaje explícito indicando que debe fijarse una sucursal de trabajo offline antes de cotizar sin conexión, en vez de encolar la cotización bajo un `ownerBranchId` que no coincide con el contexto offline.

#### Scenario: Cotización offline bloqueada para usuario bypass sin sucursal de trabajo fijada
- **WHEN** un usuario con `branches:access_all` que nunca llamó `fixWorkingBranch` intenta crear una cotización mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema no encola la cotización, deshabilita o intercepta el submit, y muestra un mensaje explícito de "fija tu sucursal de trabajo antes de cotizar offline"

#### Scenario: Cotización offline permitida con sucursal de trabajo ya fijada
- **WHEN** un usuario con `branches:access_all` que ya fijó una sucursal de trabajo (o un cajero regular con `branchId` de sesión) intenta crear una cotización mientras `NetworkError`/`!isOnline()`
- **THEN** el sistema encola la cotización normalmente, sin regresión sobre el comportamiento offline existente

### Requirement: Registro offline de cotización usa el `ownerBranchId` del contexto de sincronización
El encolado de una cotización offline SHALL usar el `ownerBranchId` resuelto por el contexto de sincronización offline como clave de scope del registro persistido, en vez de la sucursal seleccionada en el formulario.

#### Scenario: Ítem de cotización encolado siempre visible en el panel de sincronización
- **WHEN** una cotización se encola offline con `offlineEnabled=true`
- **THEN** el registro persistido usa el `ownerBranchId` del contexto offline, de forma que aparece siempre en el panel de cola de sincronización y se cuenta en el badge de pendientes, sin excepción
