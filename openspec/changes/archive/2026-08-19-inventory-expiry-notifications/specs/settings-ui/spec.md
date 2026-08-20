## ADDED Requirements

### Requirement: Inventory notification settings form
El sistema SHALL renderizar en `/settings` una nueva sección "Notificaciones de inventario", respaldada por `settings-api` (`GET/PATCH /api/v1/admin/settings/inventory-notifications`). Visible para cualquier usuario con `settings:read`; editable (input habilitado, botón "Guardar cambios" disponible) sólo para usuarios con `settings:write` — de lo contrario, sólo lectura. Campo único: correo de notificación de caducidad (`expirationNotificationEmail`), con validación de formato email en el cliente antes de habilitar el guardado.

#### Scenario: Vista de solo lectura sin settings:write
- **WHEN** un usuario tiene `settings:read` pero no `settings:write`
- **THEN** la sección muestra el correo configurado (o vacío si no hay ninguno), con el input deshabilitado y sin botón de guardar

#### Scenario: Vista editable con settings:write
- **WHEN** un usuario tiene `settings:write`
- **THEN** la sección permite editar el correo y guardar el cambio vía `settings-api`, reflejando el nuevo valor sin recargar la página

#### Scenario: Formato de email inválido bloquea el guardado en cliente
- **WHEN** un usuario con `settings:write` escribe un valor sin formato de email válido
- **THEN** el botón "Guardar cambios" permanece deshabilitado y se muestra un mensaje de validación inline

#### Scenario: Sin acceso sin settings:read
- **WHEN** un usuario carece de `settings:read`
- **THEN** la página muestra un estado de acceso denegado, consistente con el resto de páginas admin del proyecto
