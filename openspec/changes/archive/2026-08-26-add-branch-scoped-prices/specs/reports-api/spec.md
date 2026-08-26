## MODIFIED Requirements

### Requirement: Department price list report filters

El endpoint SHALL aceptar en la querystring, validados por Zod en el controller:
- `departmentId?: string (UUID)` — restringe el reporte al departamento dado. Si el departamento no existe o no tiene productos, el reporte devuelve `departments: []` (no `404`). Si se omite, el reporte incluye todos los departamentos que tengan al menos un producto.
- `branchId?: string (UUID)` — cuando se omite, cada producto muestra únicamente sus precios base (`branchId: null`), igual que antes de esta capability. Cuando se especifica, cada producto muestra su conjunto de precios **efectivo** para esa sucursal: los overrides propios de la sucursal reemplazan al base del mismo nombre; los nombres sin override propio muestran el base sin cambios. Sucursal inexistente → `400 {"error":"Invalid branchId"}` (mismo criterio que un UUID mal formado — el endpoint no distingue "formato inválido" de "no existe" para este filtro).
- `format?: "json" | "pdf" | "xlsx"` (default `"json"`).

#### Scenario: Filtro por departmentId

- **WHEN** el endpoint recibe `?departmentId=<uuid-D>` (D existe y tiene productos)
- **THEN** `departments[]` contiene a lo sumo un elemento (el departamento D) y `products[]` solo lista productos cuyo `departmentId === D`

#### Scenario: departmentId con formato inválido

- **WHEN** `?departmentId=` recibe un valor que no es UUID
- **THEN** el sistema responde `400 application/json` con `{"error":"Invalid departmentId"}`

#### Scenario: Sin departmentId

- **WHEN** el endpoint recibe la request sin `departmentId`
- **THEN** el reporte incluye todos los departamentos con productos, y `filters.departmentId === null`

#### Scenario: Sin branchId muestra sólo precios base

- **WHEN** el endpoint recibe la request sin `branchId`
- **THEN** cada producto lista únicamente sus precios con `branchId: null`, exactamente como antes de esta capability

#### Scenario: Con branchId muestra el precio efectivo de la sucursal

- **WHEN** el endpoint recibe `?branchId=<ZARIOZ>` y un producto tiene un override "Precio Publico" para esa sucursal distinto de su base
- **THEN** la lista de precios de ese producto muestra el valor del override en "Precio Publico"; los demás nombres de precio del mismo producto sin override propio de ZARIOZ muestran su valor base

---

### Requirement: Department price list report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. Los `Decimal` se serializan como `string` preservando la escala del schema (`price` con 4 decimales, `discountPct` con 2, `acquisitionPrice` con 4); los `Decimal` nullable (`ivaRate`, `iepsRate`, `discountPct`, `acquisitionPrice`) SHALL aparecer como `null` cuando no tienen valor. Cuando `filters.branchId` es no-nulo, cada objeto de `prices[]` refleja el precio EFECTIVO para esa sucursal (override propio o base heredado), no siempre las filas crudas con `branch_id = null`.

```json
{
  "generatedAt": "2026-08-08T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": { "departmentId": null, "branchId": null },
  "departments": [
    {
      "departmentId": "<uuid>",
      "departmentCode": "AGRICULTOR",
      "departmentName": "AGRICULTOR",
      "products": [
        {
          "productId": "<uuid>",
          "code": "ACTIVA1",
          "name": "ACTIVANE 1KG",
          "unit": "PZA",
          "ivaRate": "0.1600",
          "iepsRate": null,
          "acquisitionPrice": "45.5000",
          "prices": [
            {
              "priceId": "<uuid>",
              "name": "Menudeo",
              "price": "100.0000",
              "minQuantity": 1,
              "discountPct": "0.00",
              "isDefault": true
            }
          ]
        }
      ],
      "subtotal": { "productCount": 1, "priceCount": 1 }
    }
  ],
  "totals": { "departmentCount": 1, "productCount": 1, "priceCount": 1 }
}
```

#### Scenario: Subtotales y totales consistentes

- **WHEN** el reporte devuelve `departments[]` con N departamentos, cada uno con P_i productos y Q_{i,j} precios por producto
- **THEN** `totals.departmentCount === N`, `totals.productCount === sum(P_i)`, `totals.priceCount === sum(Q_{i,j})`
- **AND** para cada departamento i: `departments[i].subtotal.productCount === P_i` y `departments[i].subtotal.priceCount === sum(Q_{i,j})`

#### Scenario: Producto sin listas de precio

- **WHEN** un producto no tiene registros `ProductPrice`
- **THEN** el producto se incluye con `prices: []` y su precio no suma a `priceCount`

#### Scenario: Precios nullable

- **WHEN** un producto tiene `ivaRate`/`iepsRate` nulos y un precio con `discountPct` nulo
- **THEN** los campos correspondientes se serializan como `null` (no `"0.0000"`)

#### Scenario: Sin productos

- **WHEN** el filtro selecciona un departamento sin productos
- **THEN** el reporte devuelve `departments: []`, `totals.productCount === 0` y `totals.priceCount === 0`

#### Scenario: Producto con costo de adquisición

- **WHEN** un producto tiene `acquisitionPrice` capturado
- **THEN** el JSON incluye `"acquisitionPrice": "<valor con 4 decimales>"` en ese producto

#### Scenario: Producto sin costo de adquisición

- **WHEN** un producto no tiene `acquisitionPrice` capturado
- **THEN** el JSON incluye `"acquisitionPrice": null`

#### Scenario: Reporte filtrado por sucursal muestra el precio efectivo, no el base

- **WHEN** el endpoint recibe `?branchId=<ZARIOZ>` para un producto cuyo precio base "Precio Publico" es `3666.65` y cuyo override ZARIOZ del mismo nombre es `699.35`
- **THEN** el objeto de precio "Precio Publico" en la respuesta tiene `"price": "699.3500"`, no el valor base
