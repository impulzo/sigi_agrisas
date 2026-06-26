## ADDED Requirements

### Requirement: Login muestra banner contextual según `?reason=`
La página `/auth/login` SHALL leer el query string `reason` y mostrar un banner contextual sobre el formulario cuando su valor sea `inactivity` o `session_lost`. Sin `reason` (o con `reason=manual`), la página NO SHALL mostrar ningún banner relacionado con cierre de sesión. El banner genérico previo "Sesión caducada" SHALL eliminarse del código y reemplazarse por estos copys específicos.

Copys:
- `?reason=inactivity` → banner `info` (icon `info` + color `tertiary-container`): "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión."
- `?reason=session_lost` → banner `warning` (icon `warning` + color `error-container`): "Tu sesión expiró. Inicia sesión nuevamente."
- Sin `reason` o `?reason=manual` → sin banner.

El banner SHALL ser dismissible (botón `close` que limpia el query y oculta el banner sin recargar).

#### Scenario: Reason inactivity muestra banner info
- **WHEN** el usuario llega a `/auth/login?reason=inactivity`
- **THEN** el formulario renderiza un banner `info` con el texto "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión."

#### Scenario: Reason session_lost muestra banner warning
- **WHEN** el usuario llega a `/auth/login?reason=session_lost`
- **THEN** el formulario renderiza un banner `warning` con el texto "Tu sesión expiró. Inicia sesión nuevamente."

#### Scenario: Sin reason no muestra banner
- **WHEN** el usuario llega a `/auth/login` (sin query) o `/auth/login?reason=manual`
- **THEN** ningún banner de sesión se renderiza

#### Scenario: Reason desconocido no muestra banner
- **WHEN** el usuario llega a `/auth/login?reason=foo`
- **THEN** ningún banner se renderiza (defensa contra valores inesperados)

#### Scenario: Banner es dismissible
- **WHEN** el usuario hace click en el botón `close` del banner
- **THEN** el banner se oculta y el query `reason` se limpia de la URL sin recargar
