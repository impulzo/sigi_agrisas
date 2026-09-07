## Purpose

Proveer telemetría de rendimiento de usuario real (Core Web Vitals) del panel mediante Vercel Speed Insights, sin filtrar identificadores de recursos ni consumir la cuota gratuita fuera de producción.

## ADDED Requirements

### Requirement: Instrumentación de Core Web Vitals
El sistema SHALL montar el componente de Vercel Speed Insights en el layout raíz del panel para capturar Core Web Vitals de sesiones reales.

#### Scenario: Script de Speed Insights carga en producción
- **WHEN** un usuario navega a cualquier página del panel desplegado en producción
- **THEN** el `<head>` del documento SHALL incluir el script de Speed Insights y éste SHALL responder 200

#### Scenario: Datos visibles en el dashboard de Vercel
- **WHEN** ha transcurrido tráfico real de usuarios en producción
- **THEN** la pestaña Speed Insights del proyecto SHALL mostrar el Real Experience Score y desglose por ruta

### Requirement: Redacción de identificadores en la URL reportada
El sistema SHALL redactar cualquier identificador de recurso (UUID) y descartar el query string de la URL antes de enviarla a Vercel, de modo que ningún dato de negocio (IDs de venta, cliente, cotización, etc.) salga del navegador hacia el servicio de terceros.

#### Scenario: Ruta con UUID se redacta
- **WHEN** el usuario visita una ruta con identificador real, por ejemplo `/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6`
- **THEN** la URL enviada a Vercel SHALL ser `/sales/:id`, sin el UUID original

#### Scenario: Múltiples identificadores en la misma ruta
- **WHEN** la ruta contiene más de un segmento UUID (por ejemplo `/sales/<uuid>/returns/<uuid>`)
- **THEN** todos los segmentos UUID SHALL redactarse a `:id`, no sólo el último

#### Scenario: Query string se descarta
- **WHEN** la ruta visitada incluye un query string (por ejemplo `?search=<término>`)
- **THEN** el query string completo SHALL omitirse de la URL enviada a Vercel

#### Scenario: Ruta sin identificadores queda intacta
- **WHEN** la ruta no contiene ningún segmento UUID ni query string (por ejemplo `/dashboard`)
- **THEN** la URL enviada a Vercel SHALL permanecer sin cambios

#### Scenario: Entrada inválida no rompe el envío
- **WHEN** la función de redacción recibe un valor que no es una URL parseable
- **THEN** SHALL devolver la entrada original sin lanzar una excepción, para no interrumpir el resto de la aplicación

### Requirement: Tráfico de telemetría no interceptado por el middleware ni el service worker
El sistema SHALL excluir explícitamente las rutas de ingesta de Speed Insights (prefijo `/_vercel/`) del middleware de autenticación y del service worker, de modo que el beacon de métricas nunca sea redirigido a login ni servido desde caché obsoleta.

#### Scenario: Beacon de métricas no requiere sesión
- **WHEN** el navegador envía `POST /_vercel/speed-insights/vitals` sin cookie de sesión ni token
- **THEN** el middleware SHALL dejar pasar la petición sin redirigir a `/auth/login` ni responder 401

#### Scenario: Headers de identidad no se propagan a rutas de telemetría
- **WHEN** una petición a `/_vercel/*` es procesada por el middleware
- **THEN** el middleware SHALL descartar cualquier header `x-user-*` entrante antes de continuar, igual que hace hoy para rutas públicas conocidas

#### Scenario: Rutas de negocio siguen protegidas
- **WHEN** un usuario sin sesión navega a `/dashboard` o llama `GET /api/v1/admin/branches` sin token
- **THEN** el middleware SHALL seguir redirigiendo a `/auth/login` (páginas) o respondiendo 401 (API), sin cambios de comportamiento fuera del prefijo `/_vercel/`

#### Scenario: Service worker no cachea el script de telemetría
- **WHEN** el service worker intercepta un `fetch` cuya URL empieza con `/_vercel/`
- **THEN** SHALL delegar la petición directamente a la red sin pasar por sus estrategias de caché

### Requirement: Envío de eventos gateado por entorno
El sistema SHALL enviar eventos reales a Vercel únicamente cuando el entorno de ejecución sea producción, y SHALL operar en modo de depuración local sin envío en cualquier otro entorno, para proteger la cuota gratuita compartida entre despliegues de vista previa y producción.

#### Scenario: Producción envía eventos
- **WHEN** la aplicación se ejecuta con la variable de entorno de plataforma indicando producción
- **THEN** los eventos de Core Web Vitals SHALL enviarse normalmente a Vercel

#### Scenario: Entornos no productivos no envían eventos
- **WHEN** la aplicación se ejecuta en desarrollo local o en un despliegue de vista previa
- **THEN** el sistema SHALL descartar el evento antes de enviarlo (equivalente a que la función de envío devuelva un valor nulo) y SHALL operar en modo de depuración visible en la consola del navegador
