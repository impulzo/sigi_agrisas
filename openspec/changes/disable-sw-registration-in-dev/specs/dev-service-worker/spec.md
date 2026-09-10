## ADDED Requirements

### Requirement: Registro condicional del Service Worker por entorno
El sistema SHALL registrar `public/sw.js` vía `navigator.serviceWorker.register` únicamente cuando `process.env.NODE_ENV === "production"`. En cualquier otro valor de `NODE_ENV` (`development`, `test`), `ServiceWorkerRegistrar` SHALL montar sin efectos secundarios y SHALL NOT invocar `navigator.serviceWorker.register` bajo ninguna condición.

#### Scenario: Sin registro en desarrollo
- **WHEN** `ServiceWorkerRegistrar` monta con `process.env.NODE_ENV === "development"`
- **THEN** `navigator.serviceWorker.register` no es invocado

#### Scenario: Registro preservado en producción
- **WHEN** `ServiceWorkerRegistrar` monta con `process.env.NODE_ENV === "production"` y `"serviceWorker" in navigator`
- **THEN** `navigator.serviceWorker.register("/sw.js")` es invocado exactamente igual que antes de este cambio

#### Scenario: Sin registro en test
- **WHEN** `ServiceWorkerRegistrar` monta con `process.env.NODE_ENV === "test"`
- **THEN** `navigator.serviceWorker.register` no es invocado
