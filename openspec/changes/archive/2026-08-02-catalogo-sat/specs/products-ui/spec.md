## ADDED Requirements

### Requirement: SAT code selector in product form
`ProductGeneralTab` (y `ProductEditModal`) SHALL reemplazar el input de texto libre de `satProductCode` por un combobox con búsqueda (`SatCodeCombobox`), que consulta `GET /api/v1/admin/sat-codes?search=` (mediante un hook `useSatCodesSearch`, con debounce ~300ms) y muestra sugerencias en formato `"<code> — <description>"`. Seleccionar una sugerencia establece `satProductCode` al `code` elegido. El campo SHALL seguir aceptando captura manual de un valor de 8 dígitos que no aparezca en las sugerencias (el catálogo sembrado es un subconjunto, no el listado oficial completo) — la validación de formato `^\d{8}$` sigue aplicando igual que hoy, tanto cliente como servidor. Limpiar el campo envía `satProductCode: null` igual que el comportamiento actual.

#### Scenario: Búsqueda de código SAT muestra sugerencias
- **WHEN** el administrador escribe "fertilizante" en el campo "Cód. SAT"
- **THEN** aparece una lista de sugerencias `"<code> — <description>"` provenientes de `GET /api/v1/admin/sat-codes?search=fertilizante`

#### Scenario: Seleccionar una sugerencia completa el campo
- **WHEN** el administrador selecciona una sugerencia de la lista
- **THEN** `satProductCode` se establece al `code` de esa sugerencia y la lista se cierra

#### Scenario: Captura manual sigue permitida
- **WHEN** el administrador escribe directamente 8 dígitos que no coinciden con ninguna sugerencia del subconjunto sembrado
- **THEN** el campo acepta el valor igual que el input de texto libre anterior, sujeto a la misma validación `^\d{8}$`

#### Scenario: Limpiar el campo envía null
- **WHEN** el administrador borra el campo por completo y guarda
- **THEN** la solicitud envía `satProductCode: null`, igual que el comportamiento previo a este change
