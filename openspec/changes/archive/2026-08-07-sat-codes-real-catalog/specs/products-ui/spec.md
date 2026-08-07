## MODIFIED Requirements

### Requirement: SAT code selector in product form
`ProductGeneralTab` (y `ProductEditModal`, tanto en `create` como en `edit`) SHALL reemplazar el input de texto libre de `satProductCode` por un combobox con búsqueda (`SatCodeCombobox`), que consulta `GET /api/v1/admin/sat-codes?search=` (mediante un hook `useSatCodesSearch`, con debounce ~300ms) y muestra sugerencias en formato `"<code> — <description>"`. Seleccionar una sugerencia establece `satProductCode` al `code` elegido. El campo SHALL seguir aceptando captura manual de un valor de 8 dígitos que no aparezca en las sugerencias (el catálogo completo tiene 52,513 códigos; el combobox sólo devuelve las 20 mejores coincidencias) — la validación de formato `^\d{8}$` sigue aplicando igual que hoy, tanto cliente como servidor. Limpiar el campo envía `satProductCode: null` igual que el comportamiento actual.

#### Scenario: Búsqueda de código SAT por nombre muestra sugerencias
- **WHEN** el administrador escribe "fertilizante" en el campo "Cód. SAT"
- **THEN** aparece una lista de sugerencias `"<code> — <description>"` provenientes de `GET /api/v1/admin/sat-codes?search=fertilizante`

#### Scenario: Búsqueda por código muestra sugerencias
- **WHEN** el administrador escribe un fragmento de código (ej. "10191") en el campo "Cód. SAT"
- **THEN** aparece una lista de sugerencias cuyo `code` contiene "10191"

#### Scenario: Listado SAT visible en crear y editar producto
- **WHEN** el administrador abre `ProductEditModal` en `mode="create"` o `mode="edit"`
- **THEN** el campo "Cód. SAT" es el `SatCodeCombobox` y abre el listado de sugerencias al enfocar/escribir, en ambos modos

#### Scenario: Edit mode pre-filla el código guardado y permite re-buscar
- **WHEN** el administrador abre el modal en `edit` con un producto que tiene `satProductCode = "01010101"`
- **THEN** el campo muestra "01010101" pre-cargado y sigue permitiendo buscar/seleccionar otro código del listado

#### Scenario: Seleccionar una sugerencia completa el campo
- **WHEN** el administrador selecciona una sugerencia de la lista
- **THEN** `satProductCode` se establece al `code` de esa sugerencia y la lista se cierra

#### Scenario: Captura manual sigue permitida
- **WHEN** el administrador escribe directamente 8 dígitos que no coinciden con ninguna sugerencia
- **THEN** el campo acepta el valor igual que el input de texto libre anterior, sujeto a la misma validación `^\d{8}$`

#### Scenario: Búsqueda con menos de 2 caracteres no muestra sugerencias
- **WHEN** el administrador escribe 1 carácter en el campo
- **THEN** no se muestra la lista de sugerencias (mínimo de 2 caracteres, igual que el endpoint)

#### Scenario: Limpiar el campo envía null
- **WHEN** el administrador borra el campo por completo y guarda
- **THEN** la solicitud envía `satProductCode: null`, igual que el comportamiento previo a este change
