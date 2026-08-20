## ADDED Requirements

### Requirement: Notify admin on inventory lot expiry (digest, configurable recipient)
El sistema SHALL exponer un método `notifyInventoryExpiryDigest({ to, threshold, items })` en `AdminNotificationService`, invocado por `inventory-expiry-notifications`. A diferencia de `notifySaleCancelled` y `notifyLowStock` (que leen `ADMIN_NOTIFICATION_EMAIL` de `process.env` internamente), este método SHALL recibir el destinatario (`to`) como parámetro explícito — provisto por el caller desde el setting `expirationNotificationEmail` de `settings-api`, no desde una variable de entorno. El correo SHALL incluir el umbral (`sixMonths`/`threeMonths`/`dayOf`) y una tabla con todos los `items` (producto, sucursal, lote, cantidad, fecha de caducidad). El envío SHALL ser best-effort: cualquier error del transporte SHALL capturarse y registrarse (`console.error`) internamente por este servicio, y NUNCA SHALL propagar al caller.

#### Scenario: Envío exitoso de digest
- **WHEN** se invoca `notifyInventoryExpiryDigest` con `to="admin@agrisas.mx"`, `threshold="threeMonths"` y 2 `items`
- **THEN** se envía un correo a `admin@agrisas.mx` con el umbral y una tabla listando ambos lotes

#### Scenario: Fallo de SMTP no propaga al caller
- **WHEN** el servidor SMTP está inalcanzable al invocar `notifyInventoryExpiryDigest`
- **THEN** el método captura el error internamente, lo registra vía `console.error`, y retorna sin lanzar excepción — el caller (`inventory-expiry-notifications`) puede continuar su flujo (marcar flags) sin verse afectado

#### Scenario: `to` vacío o inválido no intenta el envío
- **WHEN** se invoca `notifyInventoryExpiryDigest` con `to=null` o `to=""`
- **THEN** el método no intenta ningún envío y retorna sin error — la decisión de "hay destinatario configurado" es responsabilidad del caller (ver `inventory-expiry-notifications`), pero el método también se protege ante un valor vacío como defensa adicional
