## Context

No existe hoy ningún modelo `Vehicle`/`Driver`/`Autotransporte` en `prisma/schema.prisma`, ni catálogo SAT de `c_ConfigAutotransporte` o tipos de permiso SCT (los únicos catálogos SAT sembrados son `SatProductServiceCode`, `SatTaxRegime`, `SatCfdiUse`, `SatUnitOfMeasure`). Los datos del vehículo/operador de una carta porte viven como 9 columnas planas nullable en `Waybill` (`vehiclePlate`, `vehicleConfig`, `vehiclePermitType`, `vehiclePermitNumber`, `insuranceCompany`, `insurancePolicy`, `driverName`, `driverRfc`, `driverLicenseNumber` — `prisma/schema.prisma:814-824`), capturadas en `VehicleDriverForm.tsx` como texto libre. Ese snapshot es correcto y deliberado (mismo patrón que `SaleItem`/`QuoteItem`/`ReturnItem`: preserva el historial fiscal aunque el catálogo cambie después) — este change añade la capa de catálogo que alimenta ese formulario, sin tocar el snapshot fiscal en sí.

## Goals / Non-Goals

**Goals:**
- Catálogos CRUD de vehículos y operadores, reutilizando 1:1 el patrón hexagonal + UI ya validado por `providers` (historias 1, 2).
- Selector opcional en el formulario de carta porte que autocompleta los 9 campos existentes sin cambiar su naturaleza de snapshot (historia 3).

**Non-Goals:**
- No se valida `vehicleConfig`/`permitType` contra un catálogo SAT real (`c_ConfigAutotransporte`) — siguen siendo texto libre con regex de formato, igual que hoy. Sembrar ese catálogo SAT es un change aparte, no pedido.
- No se re-resuelve el snapshot del catálogo al leer una carta porte ya creada — `vehicleId`/`driverId` son sólo trazabilidad hacia adelante, el PDF/CFDI y el detalle siguen leyendo las 9 columnas planas.
- El flujo `simple` (traspaso entre sucursales) no gana selector — nunca capturó vehículo/operador.
- No se agrega validación de vigencia de póliza/permiso (fechas de expiración) — no fue pedido; el catálogo guarda los datos tal como los captura el usuario hoy.

## Decisions

**D1 — Dos módulos hexagonales independientes (`vehicles`, `drivers`), no uno combinado.**
Alternativa descartada: un solo catálogo `Vehicle` con el operador embebido (columnas `driverName`/`driverRfc`/`driverLicenseNumber` dentro de `Vehicle`). Se descarta porque el usuario eligió explícitamente "Vehículo + Operador, ambos catálogo" (dos entidades independientes) — un operador puede manejar distintas unidades y viceversa; embeberlo duplicaría datos del operador por cada vehículo que usa.

**D2 — Copiar la estructura de `providers` completa (entidad, port, 5 use cases, 2 repos, controller, DI), no generalizar un "catálogo genérico".**
El proyecto ya tiene 8+ módulos CRUD casi idénticos (`payment-methods`, `folios`, `departments`, `branches`, `providers`, `products`, `tax-rates`, `customers`) sin abstracción compartida — es el patrón establecido del repo (arquitectura hexagonal por módulo, sin generic repository). Introducir una abstracción genérica aquí sería una desviación arquitectónica no pedida y de mayor riesgo que seguir el patrón ya probado.

**D3 — `vehicleId`/`driverId` en `Waybill` son nullable, `ON DELETE SET NULL`, y no alteran ninguna validación existente del endpoint `POST /waybills`.**
Se agregan como campos opcionales adicionales al objeto `vehicle`/`driver` ya validado por `createCartaPorteWaybillSchema` (`WaybillsController.ts:82-94`) — el snapshot (`plate`, `config`, etc.) sigue siendo obligatorio y autoritativo; `vehicleId`/`driverId` no reemplazan ningún campo, sólo se agregan. Si en el futuro el vehículo/operador es eliminado del catálogo, la carta porte ya emitida conserva su snapshot intacto — `SET NULL` sólo rompe el vínculo de trazabilidad hacia el catálogo, nunca el historial fiscal.

**D4 — El combobox de selección "rellena y permite editar", no bloquea edición tras seleccionar.**
Responde directamente al AC de la historia 3 ("Editar los campos autocompletados después de seleccionar no modifica el catálogo, sólo el snapshot de esa carta porte"). Se implementa con el mismo patrón de estado local que ya usa `useCreateSaleWaybillForm` (`setVehicleField`/`setDriverField`) — seleccionar del combobox simplemente llama a esos setters con los valores del vehículo/operador elegido, sin bloquear los inputs.

## Risks / Trade-offs

- **[Riesgo]** Un vehículo/operador editado en el catálogo DESPUÉS de haber sido usado en una carta porte no actualiza cartas porte pasadas (por diseño) → **Mitigación**: comportamiento esperado y consistente con el resto del sistema (snapshot pattern); documentado explícitamente en la spec.
- **[Trade-off]** No hay deduplicación ni validación de placa/RFC de operador únicos a nivel de negocio real (dos vehículos podrían compartir la misma placa si el usuario los captura mal) — sólo `code` es único, igual que el resto de catálogos. Se acepta porque ningún catálogo existente en el repo valida unicidad de campos de negocio más allá de `code`/`rfc`, y no fue pedido aquí.
- **[Riesgo]** Alcance grande (2 módulos backend + 2 pantallas UI + wiring en carta porte) para un solo change → **Mitigación**: tasks.md lo secuencia backend-primero-por-módulo, permitiendo mergear vehículos y operadores de forma independiente si hiciera falta partir el trabajo en la implementación.
