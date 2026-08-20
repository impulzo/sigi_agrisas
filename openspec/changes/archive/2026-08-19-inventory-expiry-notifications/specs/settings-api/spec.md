## ADDED Requirements

### Requirement: Get inventory notification settings
El sistema SHALL exponer `GET /api/v1/admin/settings/inventory-notifications`. Requiere `settings:read`. Retorna la configuración global (singleton, sin `branchId`, mismo patrón que `pricing_settings`) del correo destino para avisos de caducidad de inventario. Si no existe fila aún en `inventory_notification_settings`, el sistema SHALL retornar el valor por defecto SIN crear una fila: `{"expirationNotificationEmail": null}`.

#### Scenario: Sin configuración aún
- **WHEN** se llama `GET /settings/inventory-notifications` y `inventory_notification_settings` no tiene filas
- **THEN** el sistema retorna HTTP 200 con `{"expirationNotificationEmail": null}`, sin crear ninguna fila como efecto secundario

#### Scenario: Configuración existente
- **WHEN** existe una fila con `expiration_notification_email = "compras@agrisas.mx"`
- **THEN** el sistema retorna `{"expirationNotificationEmail": "compras@agrisas.mx"}`

#### Scenario: Sin permiso
- **WHEN** un caller sin `settings:read` llama al endpoint
- **THEN** el sistema retorna HTTP 403 `{"error": "Forbidden", "required": "settings:read"}`

### Requirement: Update inventory notification settings
El sistema SHALL exponer `PATCH /api/v1/admin/settings/inventory-notifications`. Requiere `settings:write`. Body: `expirationNotificationEmail: string | null` (formato email válido si no es `null`, máximo 120 caracteres). Un body vacío (`{}`) SHALL responder HTTP 400 (siguiendo la regla común de PATCH del resto de módulos admin: al menos 1 campo requerido). Si no existe fila aún, el sistema SHALL crearla (upsert) usando un `id` fijo y bien conocido, de forma que nunca exista más de una fila.

#### Scenario: Actualización exitosa
- **WHEN** el body es `{ "expirationNotificationEmail": "compras@agrisas.mx" }`
- **THEN** el sistema retorna HTTP 200 con el valor persistido

#### Scenario: Desactivar notificaciones enviando null
- **WHEN** el body es `{ "expirationNotificationEmail": null }`
- **THEN** el sistema persiste `null`, desactivando el envío de avisos de caducidad sin error

#### Scenario: Formato de email inválido es rechazado
- **WHEN** el body es `{ "expirationNotificationEmail": "no-es-un-correo" }`
- **THEN** el sistema retorna HTTP 400 con un mensaje de validación sobre el campo

#### Scenario: Body vacío es rechazado
- **WHEN** el body es `{}`
- **THEN** el sistema retorna HTTP 400
