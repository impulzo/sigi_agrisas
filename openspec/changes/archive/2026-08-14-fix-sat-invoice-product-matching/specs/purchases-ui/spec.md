## MODIFIED Requirements

### Requirement: Carga de factura SAT (CFDI) para prellenar la compra

La página `/purchases/new` SHALL incluir un uploader de XML de factura CFDI (`SatInvoiceUploader`). El parseo SHALL ocurrir en el cliente (`fast-xml-parser`, sin subir el XML al servidor). Al cargar un XML válido, el formulario SHALL prellenarse: proveedor (`newProvider` con RFC/nombre/regimen fiscal del `cfdi:Emisor`), líneas auto-mapeadas producto por producto (ver estrategia de matching abajo, con `ValorUnitario` como costo y cantidades agregadas cuando varios conceptos resuelven al mismo producto), forma de pago derivada de `FormaPago` SAT, y metadatos de la factura (`UUID` de `TimbreFiscalDigital`, serie+folio, fecha, nombre del archivo). La fecha de compra (`purchasedAt`) SHALL ser editable y se prefill con la fecha de la factura.

Cada `Concepto` del XML SHALL resolverse de forma independiente contra el catálogo de productos, SIN agruparse previamente por `ClaveProdServ` (el catálogo SAT no distingue por SKU en este rubro: es común que todos los productos de un mismo proveedor compartan el mismo `ClaveProdServ`). La estrategia de matching es:

1. Extraer el nombre de producto desde `Descripcion` del concepto, removiendo el prefijo `"[NoIdentificacion] "` cuando está presente.
2. Buscar candidatos en el catálogo por ese nombre (coincidencia de texto, ambas direcciones — el nombre de factura puede ser un substring del nombre de catálogo o viceversa).
3. Si hay exactamente 1 candidato, se usa como línea de esa concepto.
4. Si hay 0 candidatos, el concepto queda `unmatched`.
5. Si hay 2 o más candidatos, se desempata comparando `ClaveUnidad` del concepto contra la unidad del producto; si exactamente 1 candidato coincide en unidad se usa ese, si 0 o ≥2 siguen empatados el concepto queda `unmatched` con un aviso indicando ambigüedad (el sistema NUNCA adivina entre candidatos ambiguos).

Cuando dos o más conceptos resuelven al mismo producto, sus cantidades SHALL agregarse en una sola línea de compra (comportamiento preexistente, sin cambios).

#### Scenario: Carga de XML válido prellena el formulario
- **WHEN** el usuario selecciona un archivo `.xml` con un CFDI 4.0 válido
- **THEN** el proveedor (RFC del emisor), las líneas con producto resuelto por nombre (ver estrategia de matching), la forma de pago y los metadatos CFDI se prellenan, y se muestra el nombre del archivo y UUID cargados

#### Scenario: Conceptos con múltiples productos distintos resuelven a líneas separadas
- **WHEN** el XML tiene varios conceptos de productos distintos que comparten el mismo `ClaveProdServ`
- **THEN** cada concepto se resuelve de forma independiente por nombre y genera su propia línea (o se agrega a la línea de otro concepto solo si ambos resuelven al mismo producto), sin colapsar conceptos de productos distintos en una sola línea

#### Scenario: Conceptos sin producto equivalente avisados
- **WHEN** hay conceptos cuyo nombre (extraído de `Descripcion`) no coincide con ningún producto activo
- **THEN** se muestra un aviso listando los conceptos sin mapear (descripción, cantidad, importe) para que el usuario los agregue manualmente

#### Scenario: Coincidencia ambigua de nombre no se adivina
- **WHEN** el nombre de un concepto coincide con 2 o más productos activos y `ClaveUnidad` del concepto no permite desempatar a un único candidato (porque ninguno coincide en unidad, o porque más de uno coincide)
- **THEN** el concepto queda como no mapeado (mismo tratamiento que "sin producto equivalente"), con un aviso que indica que hubo múltiples candidatos ambiguos, en vez de elegir uno al azar

#### Scenario: Diferencias de impuestos avisadas
- **WHEN** la tasa IVA/IEPS de un producto difiere de la del XML
- **THEN** se muestra un aviso comparando ambas tasas, sin bloquear el envío (se usa la tasa del producto)

#### Scenario: XML inválido muestra error inline
- **WHEN** el archivo no es un XML válido, no tiene nodo `cfdi:Comprobante` o no tiene extensión `.xml`
- **THEN** el uploader muestra un mensaje de error sin modificar el formulario

#### Scenario: Nuevo proveedor desde la factura
- **WHEN** la factura se carga y el RFC del emisor no existe en el catálogo
- **THEN** el formulario usa `newProvider` y muestra un aviso "Proveedor de la factura ... Se creará al registrar la compra"; si el usuario elige manualmente otro proveedor, el aviso desaparece

#### Scenario: UUID duplicado rechazado con mensaje específico
- **WHEN** al enviar, el backend responde 409 porque el `satUuid` ya existe en otra compra
- **THEN** el formulario muestra el mensaje de error específico del UUID sin perder los datos capturados

#### Scenario: Quitar factura cargada
- **WHEN** el usuario hace clic en "Quitar" junto a la factura cargada
- **THEN** los metadatos CFDI y el `newProvider` se limpian; las líneas capturadas permanecen editables

#### Scenario: Detalle de compra muestra datos de la factura
- **WHEN** una compra tiene `satUuid`
- **THEN** el panel de metadatos del detalle muestra nombre del archivo, folio fiscal, UUID y fecha de la factura
