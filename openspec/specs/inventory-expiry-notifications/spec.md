# inventory-expiry-notifications Specification

## Purpose
TBD - created by archiving change inventory-expiry-notifications. Update Purpose after archive.
## Requirements
### Requirement: Evaluación de umbrales de caducidad con catch-up
El sistema SHALL evaluar, para cada `InventoryLot` cuyo ciclo de notificación no esté completo (`notifiedDayOfAt IS NULL`), si corresponde disparar alguno de 3 umbrales independientes en la fecha de referencia (fecha de la corrida): `sixMonths` (`notifiedSixMonthsAt IS NULL AND expirationDate <= referenceDate + 6 meses`), `threeMonths` (`notifiedThreeMonthsAt IS NULL AND expirationDate <= referenceDate + 3 meses`), `dayOf` (`notifiedDayOfAt IS NULL AND expirationDate <= referenceDate`). Cada umbral SHALL dispararse como máximo una vez por lote — una vez marcado (`notified<Umbral>At` seteado), esa combinación `(lote, umbral)` NUNCA vuelve a disparar, sin importar cuántas veces corra el job después. Si al momento de evaluar un lote ya cumple varios umbrales simultáneamente (por ejemplo, un lote cargado con fecha de caducidad a 2 meses, que nunca fue evaluado antes), el sistema SHALL disparar todos los umbrales pendientes que correspondan en la misma corrida (catch-up).

#### Scenario: Umbral de 6 meses se marca y no se repite
- **WHEN** un lote con `expirationDate` a 5 meses y 20 días de la fecha de referencia, sin ningún flag de notificación seteado, es evaluado
- **THEN** el sistema determina que corresponde disparar `sixMonths`, y en corridas posteriores (con `notifiedSixMonthsAt` ya seteado) ese mismo lote NO vuelve a disparar `sixMonths`

#### Scenario: Lote ya notificado en un umbral no se re-notifica
- **WHEN** un lote tiene `notifiedThreeMonthsAt` ya seteado y `expirationDate` sigue dentro de la ventana de 3 meses en una corrida posterior
- **THEN** el sistema NO incluye a ese lote en el resultado para el umbral `threeMonths` en esa corrida

#### Scenario: Catch-up dispara varios umbrales a la vez
- **WHEN** un lote se registra con `expirationDate` a 2 meses de la fecha de referencia y ningún flag seteado (nunca fue evaluado antes)
- **THEN** la primera corrida del job dispara tanto `sixMonths` como `threeMonths` para ese lote en la misma corrida

### Requirement: Agrupación en digest diario por umbral
El sistema SHALL agrupar todos los `(lote, umbral)` que disparan en una misma corrida por tipo de umbral, y SHALL enviar como máximo 1 correo por umbral por corrida (no 1 correo por lote), conteniendo una tabla con todos los lotes afectados de ese umbral (producto, sucursal, número de lote, cantidad, fecha de caducidad). Si ningún lote dispara un umbral determinado en la corrida, el sistema NO SHALL enviar correo para ese umbral.

#### Scenario: Varios lotes cruzan el mismo umbral el mismo día
- **WHEN** 3 lotes distintos cumplen la condición de `threeMonths` en la misma corrida
- **THEN** el sistema envía 1 solo correo digest para el umbral `threeMonths`, con una tabla que lista los 3 lotes

#### Scenario: Ningún lote cruza un umbral en la corrida
- **WHEN** ningún lote cumple la condición de `sixMonths` en una corrida determinada
- **THEN** el sistema no envía ningún correo para el umbral `sixMonths` en esa corrida

### Requirement: Sin envío cuando no hay destinatario configurado
El sistema SHALL consultar el correo configurado en `settings-api` (grupo "Notificaciones de inventario") antes de intentar cualquier envío. Si el valor es `null` o cadena vacía, el sistema SHALL omitir el envío de todos los digests de esa corrida sin registrar error, y SHALL responder HTTP 200 igualmente. En este caso, el sistema NO SHALL marcar ningún flag `notified<Umbral>At` — los umbrales pendientes quedan disponibles para dispararse en la primera corrida posterior a que se configure un destinatario.

#### Scenario: Sin correo configurado, el job es no-op seguro
- **WHEN** el job corre y `expirationNotificationEmail` está `null`
- **THEN** ningún correo se envía, ningún flag `notified<Umbral>At` se marca, y la respuesta del endpoint es HTTP 200

#### Scenario: Configurar el correo después habilita los umbrales pendientes
- **WHEN** un administrador configura `expirationNotificationEmail` después de varias corridas sin destinatario
- **THEN** la siguiente corrida del job evalúa y notifica normalmente los umbrales que ya correspondían a lotes existentes

### Requirement: Endpoint cron protegido por secreto compartido
El sistema SHALL exponer `POST /api/v1/admin/cron/inventory-expiry-notifications`. Esta ruta SHALL estar excluida de la validación de JWT de usuario (agregada a la allowlist de rutas públicas del middleware de autenticación), y en su lugar SHALL validar el header `Authorization: Bearer <valor>` contra `process.env.CRON_SECRET`. Si el header falta o no coincide, el sistema SHALL responder HTTP 401 sin ejecutar ninguna lógica de negocio ni acceder a la base de datos.

#### Scenario: Secreto correcto ejecuta el job
- **WHEN** se llama al endpoint con `Authorization: Bearer <CRON_SECRET correcto>`
- **THEN** el sistema ejecuta la evaluación de umbrales y responde HTTP 200

#### Scenario: Secreto ausente o incorrecto es rechazado
- **WHEN** se llama al endpoint sin header `Authorization` o con un valor que no coincide con `CRON_SECRET`
- **THEN** el sistema responde HTTP 401 y no evalúa ningún lote ni envía correos

### Requirement: Envío best-effort con marcado consistente
El envío de cada digest SHALL ser best-effort: cualquier error del transporte de correo (SMTP inalcanzable, credenciales inválidas, etc.) SHALL capturarse internamente y NUNCA SHALL propagar al caller del endpoint cron ni interrumpir la evaluación de los demás umbrales en la misma corrida. El sistema SHALL marcar `notified<Umbral>At = NOW()` para cada `(lote, umbral)` incluido en un digest siempre que se haya intentado el envío (haya tenido éxito o no) — nunca antes de intentar el envío, y nunca si el envío fue omitido por falta de destinatario (ver requirement anterior).

#### Scenario: Fallo de SMTP no rompe la respuesta del cron
- **WHEN** el servidor SMTP configurado está inalcanzable durante una corrida con lotes pendientes
- **THEN** el endpoint responde HTTP 200, el error se registra internamente, y los flags `notified<Umbral>At` de los lotes de esa corrida quedan marcados (el intento de envío sí se ejecutó)

#### Scenario: Un umbral fallido no bloquea a los demás
- **WHEN** el envío del digest de `sixMonths` falla pero hay lotes pendientes también para `dayOf` en la misma corrida
- **THEN** el sistema intenta igualmente el envío del digest de `dayOf` y marca sus flags correspondientes

