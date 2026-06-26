## ADDED Requirements

### Requirement: FolioScopeMismatch error typed in POS frontend

El módulo frontend de POS (`app/(private)/pos/_logic/`) SHALL definir la clase `FolioScopeMismatchError extends Error` con propiedades públicas `expected: string` y `actual: string`. El servicio `createSale` SHALL detectar la respuesta `{"error":"FolioScopeMismatch","expected":"...","actual":"..."}` (HTTP 400) y lanzar `FolioScopeMismatchError(expected, actual)` en lugar de `NetworkError`. El toast de error existente en `PosPage` mostrará el mensaje del error automáticamente ya que usa `submitError.message`.

#### Scenario: Backend retorna FolioScopeMismatch al crear venta

- **WHEN** el servicio `createSale` recibe HTTP 400 con body `{"error":"FolioScopeMismatch","expected":"POS","actual":"OPERATIONS"}`
- **THEN** el servicio lanza `FolioScopeMismatchError` (en vez de `NetworkError`) y el toast del POS muestra el mensaje en español

#### Scenario: Otros errores 400 no se ven afectados

- **WHEN** el servicio `createSale` recibe HTTP 400 con cualquier otro error (e.g. "Folio inactive")
- **THEN** el comportamiento existente se mantiene sin cambios

---

## ADDED Requirements

### Requirement: Scope badge labels in FoliosTable are human-readable

La columna "Ámbito" en `FoliosTable` SHALL mostrar etiquetas legibles en español en lugar de los valores raw del enum (`POS`, `INVENTORY`, `OPERATIONS`). Las etiquetas SHALL provenir de una constante `SCOPE_LABEL: Record<FolioScope, string>` definida en `app/(private)/catalogs/folios/_logic/scopeLabels.ts` y reutilizada también por `FolioEditModal`. Los valores de `SCOPE_LABEL` SHALL ser: `POS` → `"Punto de Venta"`, `INVENTORY` → `"Inventario"`, `OPERATIONS` → `"Operaciones"`.

#### Scenario: Tabla muestra etiqueta legible en badge de scope

- **WHEN** un folio con `scope="POS"` aparece en `FoliosTable`
- **THEN** el badge muestra "Punto de Venta" en lugar de "POS"

#### Scenario: Tabla muestra etiqueta para todos los scopes

- **WHEN** la tabla contiene folios con `scope="INVENTORY"` y `scope="OPERATIONS"`
- **THEN** los badges muestran "Inventario" y "Operaciones" respectivamente

#### Scenario: FolioEditModal usa las mismas etiquetas

- **WHEN** un usuario abre el modal para crear o editar un folio
- **THEN** el select de "Ámbito" muestra opciones derivadas de `SCOPE_LABEL` (consistente con la tabla)
