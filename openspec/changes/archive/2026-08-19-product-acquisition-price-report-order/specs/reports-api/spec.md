## MODIFIED Requirements

### Requirement: Department price list report JSON DTO

La respuesta JSON SHALL tener exactamente la siguiente forma. Los `Decimal` se serializan como `string` preservando la escala del schema (`price` con 4 decimales, `discountPct` con 2, `acquisitionPrice` con 4); los `Decimal` nullable (`ivaRate`, `iepsRate`, `discountPct`, `acquisitionPrice`) SHALL aparecer como `null` cuando no tienen valor.

```json
{
  "generatedAt": "2026-08-08T18:23:00.000Z",
  "generatedBy": { "userId": "<uuid>", "email": "operator@example.com" },
  "filters": { "departmentId": null },
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

---

### Requirement: Department price list report PDF and Excel artifacts

Cuando `?format=pdf`, el sistema SHALL generar el PDF con `@react-pdf/renderer` que contenga al menos: header con título "Inventario por Departamento", `generatedAt` formateado y email del `generatedBy`; una sección por departamento con `departmentCode` + `departmentName`; por cada producto un grupo con código, nombre, unidad y costo de adquisición (formateado como moneda MXN, o "—" si es `null`) seguido de sus filas de precio (lista, precio formateado como moneda MXN, cantidad mínima, % descuento, default); subtotales por departamento y totales globales; footer con número de página (`Página X de Y`). Cuando `?format=xlsx`, el sistema SHALL devolver un workbook con una fila por precio y las columnas `Departamento | Código | Producto | Unidad | Costo Adq. | Lista | Precio | Cant. Mín | % Descto | Default`, más filas de subtotal por departamento y totales al final. En ambos formatos, dentro de cada departamento las columnas/filas de nivel de precio SHALL ordenarse: primero el/los nombre(s) de precio marcados `isDefault=true` en los datos, luego el resto por orden alfabético `es-MX`.

#### Scenario: PDF con metadatos correctos

- **WHEN** se solicita `?format=pdf` con datos
- **THEN** el `Content-Disposition` es `attachment` y el nombre de archivo respeta `inventory-by-department-<fecha>.pdf`

#### Scenario: Excel plano con totales

- **WHEN** se solicita `?format=xlsx` con datos
- **THEN** la hoja contiene una fila por precio (columnas de producto repetidas), filas de subtotal por departamento y filas de totales al final

#### Scenario: Costo de adquisición formateado como moneda en PDF

- **WHEN** se solicita `?format=pdf` y un producto tiene `acquisitionPrice: "45.5000"`
- **THEN** el PDF muestra `$45.50` (formato moneda MXN), no el string crudo `"45.5000"`

#### Scenario: Costo de adquisición ausente en PDF/Excel

- **WHEN** un producto tiene `acquisitionPrice: null`
- **THEN** el PDF y el Excel muestran `"—"` en la columna de costo de adquisición

#### Scenario: Orden de columnas de precio — default primero

- **WHEN** un departamento tiene productos con precios nombrados `"10"`, `"15"`, `"4"` y `"Precio público"` (este último marcado `isDefault: true` en al menos una ocurrencia)
- **THEN** las columnas/filas de precio se ordenan `Precio público, 10, 15, 4` — el precio default aparece primero, el resto en orden alfabético `es-MX`, no puramente alfabético
