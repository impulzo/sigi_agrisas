## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Administrador de catálogo de productos | Como administrador de productos, quiero buscar y seleccionar el código SAT (`c_ClaveProdServ`) de un catálogo administrable en vez de escribirlo a mano, para evitar códigos de 8 dígitos válidos en formato pero inexistentes o incorrectos que generan CFDI erróneos. | - Given el formulario de producto (`ProductGeneralTab`)<br>- When el administrador escribe en el campo "Cód. SAT" (ahora un buscador, no texto libre)<br>- Then ve una lista de coincidencias por código o descripción del catálogo `sat_product_service_codes` y puede seleccionar una<br>- Given el administrador selecciona un código<br>- When guarda el producto<br>- Then `satProductCode` se persiste igual que hoy (string de 8 dígitos), sin cambio en el contrato de `products-api`<br>- Given el catálogo SAT sembrado es un subconjunto placeholder (~50-100 códigos agro/insumos, no la descarga oficial completa)<br>- When el administrador busca un código que no está en el subconjunto sembrado<br>- Then no aparece en las sugerencias, pero el campo permite capturar manualmente un código de 8 dígitos como respaldo (no bloquea la operación mientras el catálogo completo no esté cargado) | - Mismos permisos que hoy (`products:write` para editar, sin permiso nuevo); el catálogo SAT es de solo lectura para todos los usuarios autenticados (no expone endpoint de escritura en esta iteración — la carga es vía seed/script administrativo) |

_Nota: una sola historia — el alcance es acotado (tabla + búsqueda + picker), la carga completa del catálogo oficial queda fuera (decisión explícita del usuario: subconjunto placeholder por ahora)._

## Why

`satProductCode` hoy es un campo de texto libre validado sólo por formato (`^\d{8}$`), sin verificar que el código exista en el catálogo real `c_ClaveProdServ` del SAT. Esto permite capturar códigos con formato correcto pero inexistentes o incorrectos, que terminan en el CFDI facturado (`billing-api` ya usa `satProductCode` del producto al construir el XML). Un catálogo administrable con búsqueda reduce ese error humano.

## What Changes

- Nueva tabla `sat_product_service_codes` (`code` VARCHAR(8) único, `description` TEXT) — catálogo de sólo lectura vía API.
- Seed `prisma/seeds/satCodes.ts` con un subconjunto curado (~50-100 códigos) de rubros agro/agroquímicos comunes al catálogo de este cliente. **Marcado explícitamente como placeholder aproximado — no una descarga verificada del catálogo oficial SAT vigente.** El README/comentario del seed y el mensaje en la UI dejan esto claro para quien lo use.
- `GET /api/v1/admin/sat-codes?search=` — búsqueda por código o descripción (mínimo 2 caracteres), sin autenticación adicional más allá de sesión válida (catálogo de referencia, no dato sensible).
- `ProductGeneralTab.tsx`: el campo "Cód. SAT" pasa de `<input type=text>` a un combobox con búsqueda (mismo patrón que `TaxRateSelect`/`useTaxRatesOptions`), con opción de captura manual como respaldo mientras el catálogo no esté completo.

## Capabilities

### New Capabilities
- `sat-codes-api`: catálogo de códigos de producto/servicio del SAT, de sólo lectura con búsqueda.

### Modified Capabilities
- `products-ui`: el campo de captura de `satProductCode` en `ProductGeneralTab` pasa de texto libre a buscador con catálogo (más opción manual).

## Impact

- Migración Prisma: tabla nueva `sat_product_service_codes`, sin cambios a `products`.
- Sin cambio de contrato en `products-api` (`satProductCode` sigue siendo `string | null` validado `^\d{8}$` — el picker sólo ayuda a poblarlo correctamente).
- **Limitación conocida y aceptada**: el catálogo sembrado es un subconjunto pequeño, no el listado oficial completo del SAT. Cargar el catálogo completo (+52,000 códigos) queda como trabajo futuro cuando se disponga del archivo oficial (CSV/XLSX del SAT).
