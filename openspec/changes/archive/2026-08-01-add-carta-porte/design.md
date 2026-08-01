## Context

`branch_inventory.quantity` puede quedar negativo tras una venta o una cancelación de devolución (`openspec/specs/inventory-api/spec.md:136-141`), y el spec documenta explícitamente que esa deuda "debe saldarse con una futura transferencia entre sucursales (**módulo `branch_transfers`, reservado para un cambio posterior**)". Ese módulo nunca se construyó, y el folio `TS` (`Traspaso entre inventarios`, `scope: INVENTORY`, `prisma/seeds/folios.ts:30`) sigue sin consumidor. Historia 1 de la tabla de usuario resuelve exactamente esto: traspaso de mercancía entre sucursales propias, con Complemento Carta Porte SAT porque el traslado usa vía pública.

El proyecto ya tiene un módulo `billing` (`src/modules/billing/`) que integra Facturama para CFDI de Ingreso (`FacturamaGateway`, `FacturamaRestGateway`, `FakeFacturamaGateway`), pero está acoplado al dominio de venta (`Invoice.saleId`, montos, impuestos). Un traspaso Carta Porte es fiscalmente distinto: `CfdiType='T'` (Traslado), sin impuestos, `Total=0`, Receptor = el mismo RFC emisor (mercancía propia moviéndose a sí misma). Reusar el `FacturamaGateway` de `billing` acoplaría dos dominios sin relación de negocio y rompería la convención ya establecida en `payments`/`returns` de no importar repositorios/gateways de otro módulo vía su `di/`, sino instanciar localmente lo que se necesite.

`Branch.address` es hoy un único `VarChar(300)` de texto libre (`prisma/schema.prisma:146`) — el nodo `Ubicacion` del Complemento Carta Porte exige domicilio desglosado (calle, número, colonia, municipio, estado, código postal, país). Historia 2 cubre esta extensión.

Decisiones de negocio ya cerradas con el usuario (no reabrir):
- Solo CFDI Traslado standalone nacional — sin Ingreso+CartaPorte, sin comercio exterior.
- Vehículo y operador se capturan libres por documento — sin catálogo maestro de vehículos/choferes.
- Esta change entrega solo specs; la implementación (`opsx:apply`) es una sesión aparte.

## Goals / Non-Goals

**Goals:**
- Módulo `waybills` hexagonal aislado que crea (con timbrado atómico), cancela, descarga y consulta traspasos de mercancía entre sucursales con Complemento Carta Porte 3.1 nacional.
- Resolver el TODO de `branch_transfers` de `inventory-api` con un movimiento de inventario transaccional que **rechaza** negativo en origen (a diferencia del POS).
- Extender `Branch` con domicilio fiscal estructurado, reutilizable por futuros complementos que lo requieran.
- Gateway Facturama propio del módulo, desacoplado de `billing`, con implementación REST real y `FakeFacturamaGateway` para mock/tests — mismo patrón dual que `billing`.
- Branch scoping + RBAC consistentes con el resto de módulos (Historias 3 y 4).

**Non-Goals:**
- CFDI de Ingreso con Complemento Carta Porte (venta + transporte) — v2, no bloquea esta entrega.
- Comercio exterior / régimen aduanero (`TranspInternac`).
- Catálogo maestro de vehículos u operadores — captura libre por documento (decisión explícita del negocio).
- Cálculo de rutas/distancia — `distanceKm` es dato capturado, no calculado.
- UI — cubierta por la change `carta-porte-ui` (depende de esta).

## Decisions

**D1 — `waybills` es la materialización de `branch_transfers`, no un módulo paralelo**
El requirement de stock negativo en `inventory-api` se actualiza para señalar que el traspaso Carta Porte es el mecanismo real de reconciliación entre sucursales, y que a diferencia de la venta, el traspaso **rechaza** dejar el origen en negativo (es movimiento físico real, no una obligación diferida).

**D2 — Movimiento de inventario: origen estricto, destino tolerante**
Origen usa el patrón atómico ya existente en `PrismaBranchInventoryRepository.adjust` (`WHERE branch_id=X AND product_id=Y AND quantity - delta >= 0`; 0 filas afectadas → `InsufficientStockAtOrigin` 409) — **no** el patrón `decrementInventoryAllowNegative` de `pos-api`. Destino usa el mismo patrón `incrementInventory` de `returns-api` (crea el registro si no existe). En cancelación se invierte: incrementa origen (tolerante, siempre exitoso), decrementa destino con el patrón tolerante de `returns-api` (puede quedar negativo, igual que `CancelSaleUseCase`/`CancelReturnUseCase` — el traspaso ya se dio por recibido y pudo re-consumirse).

**D3 — Gateway Facturama propio, sin dependencia de `billing`**
Nuevo port `WaybillFacturamaGateway` en `application/ports/`, con `stampTraslado(payload)`, `cancel(cfdiId, motive)`, `download(format, cfdiId)`. Implementaciones `FacturamaRestGateway`/`FakeFacturamaGateway` **dentro de `src/modules/waybills/infrastructure/services/`**, no reexportadas ni importadas desde `billing`. Justificación: mismo criterio que `payments`/`returns` instanciando `PrismaSaleRepository` localmente para evitar import circular — aquí no hay circularidad pero sí acoplamiento de dominio innecesario (un traspaso no es una factura). Selección real vs fake por `FACTURAMA_MOCK`, igual que `billing`.

**D4 — Creación = timbrado atómico, sin draft**
Igual que `Sale` (no como `Invoice`, que separa venta de timbrado): `CreateWaybillUseCase` en una sola transacción Prisma: valida branches activas+distintas+domicilio completo → valida stock suficiente por línea → aloca folio `TS` (`allocateFolio`, compartido con `pos`/`quotes`/`payments`) → mueve inventario (D2) → arma payload SAT → llama `WaybillFacturamaGateway.stampTraslado` → persiste. Si Facturama rechaza, la transacción no hace commit — no queda folio consumido ni inventario movido a medias (mismo principio "todo o nada" que `StampInvoiceUseCase`, pero aquí el timbrado está dentro de la misma transacción porque no existe una venta previa que ya haya movido inventario).

**D5 — Payload SAT del traslado**
`CfdiType='T'`, `Currency='XXX'` (No aplica), sin `Taxes`, `Total=0`. `Receiver`: mismo RFC del emisor configurado (`FACTURAMA_USER`/CSD), `CfdiUse='S01'` (Sin efectos fiscales), `FiscalRegime`/`TaxZipCode` del emisor. Complemento CartaPorte: `Ubicacion` origen/destino desde los campos estructurados de `Branch` (D6), `Mercancias` desde `WaybillItem` (`satBienesTranspCode`, `weightKg`), `Autotransporte` y `FiguraTransporte` desde los campos libres del `Waybill`.

**D6 — Domicilio estructurado en `Branch`, nullable**
Columnas nuevas nullable (no rompen sucursales existentes): `addressStreet`, `addressExteriorNumber`, `addressInteriorNumber?`, `addressNeighborhood`, `addressMunicipality`, `addressState`, `addressCountry` (default `'MEX'`), `addressZipCode`. El campo `address` (texto libre) existente **no se toca** — sigue usándose donde ya se usa. `BranchAddressIncompleteError` (400, análogo a `ReceiverFiscalDataIncompleteError` de billing) se lanza en `CreateWaybillUseCase` si origen o destino tienen algún campo estructurado vacío, listando los faltantes.

**D7 — Branch scoping por origen O destino**
`Waybill` no tiene un único `branchId` como el resto de entidades — tiene `originBranchId` y `destinationBranchId`. `list` filtra por `originBranchId=scopedId OR destinationBranchId=scopedId` cuando no hay `branches:access_all`. `getById`/`cancel`/`download` cargan el recurso y verifican que el `branchId` del usuario coincida con origen O destino (`enforceBranchScope` no aplica directo por tomar un solo `branchId` — se documenta una variante de dos-sucursales en el spec, implementable como una función `enforceBranchScopeEither` o dos llamadas OR).

**D8 — RBAC**
`waybills:read` (admin/operator/viewer), `waybills:write` (admin/operator — crear), `waybills:cancel` (admin/operator) — mismo patrón que `returns`.

**D9 — Validación en controller (Zod), orden estándar**
Orden en handlers scoped: validar UUID + body (Zod → 400) → `enforceBranchScope`-equivalente (401/403) → use case. Igual que el resto de módulos.

## Risks / Trade-offs

- **[Riesgo] Esquema Carta Porte 3.1 estricto del SAT**: claves de catálogo (`c_ClaveProdServCP`, `c_ConfigAutotransporte`, `c_Estado`) deben ser válidas o Facturama rechaza (422). → Se validan formato/presencia en el use case; el catálogo completo de claves SAT no se valida contra una lista exhaustiva en v1 (deuda documentada), Facturama es la fuente de verdad del rechazo.
- **[Riesgo] Captura libre de vehículo/operador sin catálogo**: sin maestro, dos traspasos del mismo camión pueden tener datos inconsistentes (typos en placa). → Aceptado explícitamente por el negocio para v1; catálogo maestro queda como mejora futura si se vuelve doloroso.
- **[Trade-off] Timbrado dentro de la misma transacción que el movimiento de inventario**: si Facturama es lento, la transacción Prisma queda abierta más tiempo que en `Sale` (que no timbra). → Aceptado porque no hay una segunda entidad "venta ya completada" que journal-ee el movimiento por separado; si se vuelve un problema de lock contention, v2 puede separar timbrado de movimiento (como `Invoice` hace con `Sale`).
- **[Riesgo] Domicilio estructurado desactualizado**: si una sucursal cambia de domicilio después de usarse en traspasos pasados, los traspasos históricos no snapshotean el domicilio en el momento de creación bajo este diseño inicial — **corrección**: sí se snapshotea (ver `WaybillItem`/`Waybill` — los campos de ubicación se copian al `Waybill` al crear, no se leen en vivo desde `Branch` al consultar). Se deja explícito como requirement en el spec para evitar la ambigüedad.
- **[Riesgo] RFC propio como receptor**: depende de que el emisor tenga CSD configurado (dependencia del módulo `billing`/CSD ya existente `POST /api/v1/admin/billing/csd`). → Se documenta como precondición operativa, no se duplica la gestión de CSD.

## Migration Plan

`npx prisma migrate dev --name add_waybills_tables_and_branch_address`. Tablas nuevas (`waybills`, `waybill_items`) + columnas nullable nuevas en `branches`. Sin backfill (sucursales existentes quedan con domicilio estructurado vacío hasta que un admin lo complete). `npx prisma generate`.

## Open Questions

_Resueltas:_
- ¿CFDI Ingreso+CartaPorte o Traslado standalone? → Solo Traslado standalone (decisión del negocio).
- ¿Catálogo de vehículos/operadores? → Captura libre, sin catálogo (decisión del negocio).
- ¿Alcance geográfico? → Solo nacional.
- ¿Reusar `FacturamaGateway` de `billing`? → No, gateway propio del módulo (D3).

_Pendientes (no bloquean el propose, sí bloquean el `apply`):_
- ¿La cuenta Facturama sandbox actual soporta Complemento Carta Porte 3.1 en modo mock/sandbox sin configuración adicional? Verificar en fase de implementación.
- ¿Se requiere `SubTipoRem` o algún campo adicional del nodo `Mercancias` para materiales agrícolas específicos (fertilizantes, agroquímicos) que puedan clasificar como material peligroso? A resolver con catálogo SAT vigente al implementar.
