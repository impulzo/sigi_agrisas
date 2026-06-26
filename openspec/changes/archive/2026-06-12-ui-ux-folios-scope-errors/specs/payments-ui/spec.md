## ADDED Requirements

### Requirement: FolioScopeMismatch error typed in payments frontend

El módulo frontend de pagos (`app/(private)/payments/_logic/`) SHALL definir la clase `FolioScopeMismatchError extends Error` con propiedades públicas `expected: string` y `actual: string`. El servicio `registerPayment` SHALL detectar la respuesta `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}` (HTTP 400) y lanzar `FolioScopeMismatchError(expected, actual)`. El componente `RegisterPaymentModal` SHALL capturar `FolioScopeMismatchError` y mostrar un mensaje inline claro en lugar del mensaje genérico actual.

#### Scenario: Backend retorna FolioScopeMismatch en registro de abono

- **WHEN** el servicio `registerPayment` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"OPERATIONS","actual":"POS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` con `expected="OPERATIONS"` y `actual="POS"`, y el modal muestra un mensaje explicativo (ej. "El folio seleccionado es de tipo POS, pero este flujo requiere uno de tipo OPERATIONS.") en lugar de "Error al registrar el abono"

#### Scenario: Mensaje inline visible en RegisterPaymentModal

- **WHEN** la submisión del abono resulta en `FolioScopeMismatchError`
- **THEN** el modal muestra el error como `formError` (banner inline) en lugar de cerrar el modal o mostrar un mensaje genérico irrecuperable
