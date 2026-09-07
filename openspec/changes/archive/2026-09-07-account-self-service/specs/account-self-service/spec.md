## Purpose

Permite a cualquier usuario autenticado consultar y editar su propio nombre y correo, y solicitar el cambio de su propia contraseña vía enlace por correo, sin depender de un administrador y sin tocar el flujo admin existente de gestión de usuarios.

## ADDED Requirements

### Requirement: Editar perfil propio (nombre y correo)
El sistema SHALL permitir a un usuario autenticado consultar y actualizar su propio `name` y `email`. La identidad del recurso a editar SHALL derivarse exclusivamente de la sesión autenticada (nunca de un identificador provisto por el cliente en body o URL). El sistema SHALL aplicar únicamente los campos que cambiaron respecto al valor actual (actualización parcial), y SHALL rechazar un correo que ya esté en uso por otra cuenta.

#### Scenario: Actualización exitosa de nombre y/o correo
- **WHEN** un usuario autenticado envía nombre y/o correo distintos a los valores actuales
- **THEN** el sistema aplica sólo los campos que cambiaron y devuelve el perfil actualizado

#### Scenario: Correo con formato inválido
- **WHEN** un usuario autenticado envía un correo con formato inválido
- **THEN** el sistema rechaza la solicitud con un error de validación, sin aplicar ningún cambio

#### Scenario: Correo ya en uso por otra cuenta
- **WHEN** un usuario autenticado envía un correo que ya pertenece a otra cuenta
- **THEN** el sistema rechaza la solicitud con un error de conflicto, sin aplicar ningún cambio

#### Scenario: Solicitud sin campos modificados
- **WHEN** un usuario autenticado envía una actualización de perfil sin ningún campo distinto al valor actual
- **THEN** el sistema no persiste ningún cambio

#### Scenario: Error al cargar el perfil muestra detalle y permite reintentar sin bloquear cambio de contraseña
- **WHEN** la carga inicial del perfil propio (`GET /api/v1/auth/me`) falla, por cualquier motivo (red, error del backend, etc.)
- **THEN** la UI muestra el detalle real del error devuelto por el backend (nunca un mensaje genérico sin información), ofrece una acción de reintento que vuelve a solicitar el perfil, y mantiene visible y funcional la sección de cambio de contraseña — independiente del estado del perfil

### Requirement: Solicitar enlace de cambio de contraseña propia
El sistema SHALL permitir a un usuario autenticado solicitar que se le envíe, a su propio correo registrado, un enlace de un solo uso para establecer una nueva contraseña. El sistema SHALL reusar exactamente el mismo mecanismo de emisión y envío que ya usa el flujo administrativo para restablecer la contraseña de otro usuario (`SendSetPasswordEmailUseCase` / `IssuePasswordSetupTokenUseCase`) — no SHALL existir un flujo de cambio directo (contraseña actual + nueva) para el propio usuario.

#### Scenario: Solicitud de enlace exitosa
- **WHEN** un usuario autenticado solicita su enlace de cambio de contraseña
- **THEN** el sistema emite un token de un solo uso (24h de vigencia) y envía un correo con el enlace a la dirección registrada del propio usuario, devolviendo esa dirección como confirmación

#### Scenario: Solicitud previa vigente se invalida
- **WHEN** un usuario autenticado solicita un nuevo enlace mientras uno anterior sigue vigente y sin usar
- **THEN** el enlace anterior queda invalidado y sólo el nuevo es válido (mismo comportamiento que el flujo admin)

#### Scenario: Falla el envío del correo
- **WHEN** el proveedor de correo no puede entregar el mensaje
- **THEN** el sistema responde con un error de entrega, sin dejar la página en un estado roto ni impedir un nuevo intento

#### Scenario: Identidad siempre desde la sesión
- **WHEN** se procesa la solicitud de enlace
- **THEN** el destinatario del correo es exclusivamente el usuario autenticado (resuelto por `x-user-id`/JWT) — ningún identificador de usuario se acepta desde el cliente
