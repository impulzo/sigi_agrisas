## Context

Ver `proposal.md` — Why. Restricciones que enmarcan el diseño:

- `Product` es global (`prisma/schema.prisma:296-330`), sin `branchId` ni tabla puente. `branch_inventory` ya existe con unicidad `(branch_id, product_id)` y es la única estructura de datos por-sucursal disponible para representar "asignación".
- `PrismaProductRepository.findAll` (`:92-121`) usa `branchId` sólo en el `include` de stock; el `where` y el `count` lo ignoran. Éste es el único punto donde el catálogo se lista, consumido por 7+ superficies distintas (POS, cotizaciones, compras, caché offline, kardex, pagos, catálogo admin).
- `recordInventoryMovement` (`src/shared/infrastructure/inventory/recordInventoryMovement.ts:72-`) es el único escritor de `branch_inventory` para ventas/devoluciones/compras/ajustes, y auto-crea la fila si no existe (`:90-102`). `waybills` escribe con SQL crudo aparte (fuera de alcance, ver "Fuera de alcance" en proposal.md).
- Único precedente de flag de negocio en el repo: `FACTURAMA_MOCK`, leído como `const` de módulo en el DI container (`src/modules/billing/infrastructure/di/container.ts:25`).
- `resolveScopedBranchId` / `enforceBranchScope` (`src/modules/rbac/infrastructure/http/enforceBranchScope.ts`) ya implementan el patrón de bypass `branches:access_all` reutilizado aquí.

## Goals / Non-Goals

**Goals:**
- Filtrar el catálogo consumido por POS/Cotizaciones a los productos asignados a la sucursal activa, cuando el modo está en `branch` (Historia 2).
- Bloquear la venta/cotización de un producto no asignado, con error explícito, en ambas capas — aplicación y escritura (Historia 3).
- Conservar la alta automática vía compra, traspaso y asignación admin (Historia 4).
- Que el modo `general` (default) sea bit-a-bit idéntico al comportamiento actual — cero riesgo de regresión en instalaciones que no activan el flag (Historia 1).

**Non-Goals:**
- No se introduce tabla puente producto↔sucursal ni migración de schema — decisión ya tomada (ver proposal.md, Historia 4, y el plan aprobado previamente).
- No se corrige que los traspasos no escriban kardex, ni la desincronización de tipos de movimiento — change separado (`waybill-kardex-movements`, fuera de alcance).
- No se filtra el catálogo admin (`/catalogs/products`) ni el modal de asignación — ambos deben seguir viendo el catálogo completo por diseño (son las herramientas para dar de alta).
- No se añade UI de "cambiar de modo" en runtime — el flag es de despliegue (env var + reinicio), no una preferencia de usuario en base de datos.

## Decisions

### 1. El flag es una función pura, no una constante de módulo

`getInventoryScopeMode()` lee `process.env.INVENTORY_SCOPE_MODE` en cada invocación, a diferencia de `FACTURAMA_MOCK` que se evalúa una vez al importar el DI container.

**Por qué:** los tests de este change necesitan alternar el modo entre casos (`describe.each(["general", "branch"])` o equivalente) sin recurrir a `jest.resetModules()` en cada archivo, lo que sería frágil dado cuántos módulos importan el DI container transitivamente. Un `const` de módulo congelaría el valor leído en el primer import de la suite completa.

**Alternativa descartada:** replicar el patrón `FACTURAMA_MOCK` (const evaluada una vez). Se descartó por el costo de testing — forzaría reiniciar el proceso de Jest o usar `jest.isolateModules` en cada test, mucho más caro que una función.

### 2. La fila de `branch_inventory` es la única fuente de verdad de "asignación"

Ninguna estructura nueva. `quantity = 0` = asignado sin stock; ausencia de fila = no disponible. Esto es la Decisión 1 del plan aprobado, documentada aquí porque condiciona el resto del diseño: cualquier operación que hoy auto-cree la fila (ver Decisión 4) es, de facto, una operación de asignación implícita.

**Alternativa descartada:** tabla puente `branch_products` con columna booleana `isAssigned`. Descartada por costo (migración + CRUD + UI + duplicación semántica con `branch_inventory`) sin beneficio funcional adicional — el plan aprobado por el usuario ya fijó esta decisión.

### 3. El filtro de catálogo se mueve del `include` al `where`, condicionado por un parámetro explícito

`FindAllProductsOptions.branchScoped?: boolean` es un booleano explícito que decide el `ProductsController`, no un efecto lateral de "si `branchId` está presente". Esto separa dos preguntas distintas que hoy están fusionadas en el único parámetro `branchId`:
- "¿para qué sucursal calculo el `stock`?" (siempre, si `branchId` está presente — sin cambios)
- "¿debo excluir productos no asignados?" (sólo si el modo es `branch` Y hay `branchId`)

**Por qué separar:** el modal de asignación (`InventoryAssignModal`) y compras pasan `branchId` implícitamente vía contexto de sucursal en algunos flujos futuros, pero necesitan ver el catálogo completo. Fusionar ambas preguntas en un solo booleano derivado de "hay branchId" habría roto esos consumidores el día que empezaran a pasar `branchId`. Mantenerlas separadas hace el contrato explícito y a prueba de futuros cambios en esos consumidores.

**Alternativa descartada:** inferir el filtrado sólo de la presencia de `branchId` sin flag adicional. Descartada porque acopla "quiero saber el stock" con "quiero sólo ver lo asignado" — dos intenciones distintas que ya conviven hoy en los mismos parámetros (compras nunca manda `branchId`; el modal de asignación tampoco).

### 4. Gate de disponibilidad en dos capas independientes (Historia 3)

**Capa aplicación** (`isProductAvailableInBranch` + excepción `ProductNotAvailableInBranchError`, 400): da el mensaje claro y evita transacciones desperdiciadas. Se aplica en `CreateSaleUseCase`, `EditCompletedSaleUseCase`, `CreateQuoteUseCase`, `UpdateQuoteUseCase`.

**Capa escritura** (`allowRowCreation: false` en `recordInventoryMovement`, sólo para movimientos OUT de venta en modo `branch`): defensa en profundidad si la capa de aplicación se bypassea (bug futuro, ruta nueva que olvide el check). Sin esta capa, una venta que se colara dejaría el sistema en el mismo estado "auto-asignado" que se quiere evitar — el bug sería silencioso.

**Por qué NO aplicar `allowRowCreation: false` a las restauraciones** (`sale_cancel`, `sale_edit_restore`, `return`): la fila pudo ser borrada legítimamente entre la venta y su cancelación (ej. un admin usó `DELETE /inventory/:productId` para "quitar" el producto de la sucursal después de vender). Bloquear la restauración dejaría la venta imposible de cancelar — un estado peor que el que se intenta prevenir. Esto es asimétrico a propósito: el gate protege la ENTRADA de productos no asignados, no la reversión de operaciones ya consumadas.

**Alternativa descartada:** una sola capa (sólo aplicación, o sólo escritura). Sólo-aplicación deja la invariante rota si alguna ruta futura llama `recordInventoryMovement` sin pasar por el use case. Sólo-escritura da un error genérico de base de datos en vez de un 400 legible, mal para UX del POS.

### 5. `quotes-api` recibe el mismo gate que `pos-api`, no un stock check nuevo distinto

Cotizar un producto no asignado a la sucursal fallaría de todos modos al convertir (vía `SaleRepository.createCompletedFromQuote`, que reutiliza el mismo camino de venta). Aplicar el gate también en `CreateQuoteUseCase`/`UpdateQuoteUseCase` evita que el operador arme una cotización completa, la autorice, y sólo descubra el problema al convertir — mueve el error al punto más temprano posible.

**Alternativa descartada:** dejar que sólo la conversión falle. Descartada por UX — el error aparecería después de que el cliente ya aceptó una cotización con un producto que la sucursal no puede vender.

## Risks / Trade-offs

- **[Riesgo] Catálogo existente sin cobertura de asignación** → si un cliente activa `INVENTORY_SCOPE_MODE=branch` sobre datos ya sembrados donde algún producto activo nunca recibió una fila de `branch_inventory` en ninguna sucursal, ese producto desaparece de todo POS sin aviso. **Mitigación:** documentado como precondición en la spec `data-seeding` (Requirement: Assignment coverage precondition); el seeder v3 ya cubre esto para datos sembrados por él. La auditoría previa a activar el flag (query de productos huérfanos) queda como paso operativo, no automatizado en este change.
- **[Riesgo] Nuevo método de puerto duplicado entre `pos` y `quotes`** (`isProductAvailableInBranch` en dos lookup services distintos) → riesgo de que diverjan con el tiempo. **Mitigación:** ambos son consultas triviales de una sola fila (`branchInventory.findUnique` por clave compuesta); el riesgo de divergencia es bajo y no justifica una abstracción compartida cross-módulo que violaría el aislamiento actual entre `pos` y `quotes` (cada uno con su propio lookup service, según CLAUDE.md).
- **[Riesgo] Mensaje de error del gate podría filtrar información por timing** (ej. distinguir "producto no existe" vs "producto existe pero no asignado" por tiempo de respuesta) → bajo, ya que ambos casos hacen una consulta de complejidad equivalente (`findUnique` por PK/índice único). No se considera explotable en este contexto (usuarios ya autenticados, RBAC ya aplicado).
- **[Trade-off] `branchScoped` como parámetro explícito añade una rama más al contrato de `ProductRepository.findAll`** en vez de mantenerlo simple — aceptado deliberadamente (Decisión 3) para no acoplar semánticas distintas.

## Migration Plan

1. Desplegar el código con `INVENTORY_SCOPE_MODE` ausente (o `general`) — sin cambio observable, `npm test` completo en verde sin tocar ningún test existente.
2. Por cliente que lo requiera: ejecutar la auditoría manual de productos activos sin fila en `branch_inventory` (query, no automatizada en este change — ver A5 del plan aprobado).
3. Activar `INVENTORY_SCOPE_MODE=branch` en `.env` del entorno objetivo y reiniciar.
4. Rollback: quitar la variable (o volver a `general`) y reiniciar — no hay migración inversa porque no hubo migración de datos; `branch_inventory` nunca cambió de forma.

## Open Questions

Ninguna — el alcance, las decisiones de modelo de datos y las vías de alta ya fueron resueltas explícitamente por el usuario antes de este proposal (ver Decisiones tomadas en el plan aprobado, replicadas en la Historia de Usuario de `proposal.md`).
