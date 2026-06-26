## ADDED Requirements

### Requirement: FolioScopeMismatch error typed in quotes frontend

El módulo frontend de cotizaciones (`app/(private)/quotes/_logic/`) SHALL definir la clase `FolioScopeMismatchError extends Error` con propiedades públicas `expected: string` y `actual: string`. Los servicios `createQuote` y `convertQuote` SHALL detectar la respuesta `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}` (HTTP 400) y lanzar `FolioScopeMismatchError(expected, actual)`. El componente `ConvertQuoteModal` SHALL capturar `FolioScopeMismatchError` y mostrar el error como `inlineError` con un mensaje claro. La `QuoteCreatePage` (vía `useQuoteSubmission`) mostrará el mensaje del error en el toast existente del POS, ya que `useQuoteSubmission` propaga el error sin modificar.

#### Scenario: Backend retorna FolioScopeMismatch al crear cotización

- **WHEN** el servicio `createQuote` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` con `expected="POS"` y `actual="OPERATIONS"` (en vez de `NetworkError`), y el POS muestra el mensaje del error en el toast

#### Scenario: Backend retorna FolioScopeMismatch al convertir cotización

- **WHEN** el servicio `convertQuote` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` y `ConvertQuoteModal` lo captura mostrando el mensaje como `inlineError` visible sin cerrar el modal

#### Scenario: Otros errores 400 no se ven afectados

- **WHEN** el servicio recibe HTTP 400 con un error que NO es `FolioScopeMismatch` (e.g. `{"error":"Folio inactive"}`)
- **THEN** el comportamiento existente se mantiene sin cambios (otros mapeos de error siguen funcionando)
