# Reporte de Testing — agrisas-panel

- **Branch**: `feature/fixes`
- **Fecha**: 2026-06-26
- **Entorno**: dev server `:3001`, Supabase Postgres `agrisas`, datos sembrados (seed RBAC + folios + inventario)
- **Capas ejecutadas**: suite automatizada (Jest + build) + exploratorio UI con Playwright MCP
- **Usuario de prueba**: `e2e-admin@agrisas.test` (rol admin)

---

## 1. Resumen ejecutivo

| Severidad | # | Bloquea |
|---|---|---|
| 🔴 Crítico | 2 | Build/CI y flujo core POS |
| 🟠 Alto | 2 | Datos/UX visible |
| 🟡 Medio | 3 | Funcionalidad incompleta |
| 🔵 Bajo | 4 | Cosmético/doc |

**Estado build**: ❌ `npm run build` **FALLA** (error de sintaxis en seed).
**Estado suite Jest**: ⚠️ **43 fallan / 2141 pasan** (2184 total). Mayoría = tests desactualizados vs cambios de `feature/fixes`, no defectos de runtime.
**Módulos backend nuevos** (billing, tax-rates, reports, folio-audit): APIs responden **200 OK**. **Sin UI** para billing y reports.

Dos defectos críticos bloquean los flujos principales:
1. El **build de producción no compila** (generador de seed).
2. **No se puede registrar una venta sin cliente** desde el POS, pese a que la UI marca el cliente como opcional y no existen clientes sembrados.

---

## 2. Resultados de la suite automatizada

### 2.1 `npm run build` — ❌ FALLA (bloqueante CI/deploy)

```
./prisma/seeds/data/generate-inventory-data.ts:184:69
Type error: ',' expected.
Next.js build worker exited with code: 1
```

Ver **BUG-01**. Sin este fix no hay build de producción.

### 2.2 `npm test` (Jest) — ⚠️ 43 fail / 2141 pass

> Nota DX/CI: corriendo `npm test` sin cargar `.env.local`, **43 suites de integración ni siquiera arrancan** (`DATABASE_URL is required`). Con env cargado, el resultado real es 43 tests fallidos. Las integraciones dependen de env no auto-cargado por el runner.

Categorías de fallo (ver **BUG-06**):
- `TypeError: dialog.close is not a function` — jsdom no implementa `<HTMLDialogElement>`; los modales migrados a `<dialog>` (cambio `pos-keyboard-navigation`) no tienen polyfill en tests (~7 fallos).
- `Unable to find link name /Inicio/`, conteo `Expected 6 Received 7`, `Expected "/dashboard" Received "/pos"` — tests de `NavigationRail`/landing desactualizados: hay un ítem de nav nuevo y el landing por defecto cambió a `/pos`.
- `invariant expected app router to be mounted` — componentes que usan `useRouter` sin provider en el test.
- Integración real DB no aislada: `CustomerRfcAlreadyInUseError: CED010101001` (dato leftover) y mismatches de IVA por datos cambiados.

### 2.3 Playwright e2e (`tests/e2e/`)

5 specs existentes (`admin-products-inventory`, `operator-permissions`, `quotes-verification`, `returns-verification`). **Sin cobertura** para billing, tax-rates, reports, payments, full-return, folio-audit.

---

## 3. Hallazgos por módulo

### 🔴 BUG-01 — Build roto: backtick sin escapar en generador de seed
- **Módulo**: Seeders / `hu-005-seeders-inventario`
- **Archivo**: `prisma/seeds/data/generate-inventory-data.ts:184`
- **Severidad**: Crítica (bloquea `npm run build` → CI/CD/deploy)
- **Descripción**: La constante `content` (líneas 166–202) es un **template literal** que genera otro archivo `.ts`. El JSDoc de la línea 184 contiene `` `true` `` con backticks **sin escapar**, que cierran el template literal externo prematuramente.
- **Repro**: `npm run build` → `Type error: ',' expected` en `:184:69`.
- **Esperado vs Real**: build compila ✅ vs falla ❌.
- **Fix**: escapar los backticks dentro del template:
  ```ts
  /** El generador no lee columna del Excel; el engine defaultea a \`true\`. ... */
  ```
- **Nota**: el archivo está untracked (nuevo en working tree). Igual rompe el build porque `tsconfig` type-checkea `prisma/seeds/**`.

### 🔴 BUG-02 — POS: imposible registrar venta sin cliente (UI dice "opcional")
- **Módulo**: POS / Ventas
- **Archivo**: `src/modules/pos/infrastructure/http/SalesController.ts:58`
- **Severidad**: Crítica (bloquea flujo core de venta)
- **Descripción**: `createSaleSchema` define `customerId: z.string().uuid()` (**requerido, no-nullable**). Pero:
  - La UI del POS etiqueta el campo **"Cliente (opcional)"** y habilita "Finalizar venta" sin cliente.
  - El frontend envía `customerId: null` (`app/(private)/pos/_logic/types/api.ts:101` → `customerId?: string | null`).
  - El DTO y el repositorio backend aceptan null (`SaleDto.customerId: string | null`, `CreateSaleData.customerId: string | null`).
  - La BD tiene **0 clientes** sembrados.
- **Repro**: `/pos` → seleccionar sucursal → añadir producto → folio TK + Efectivo → "Finalizar venta" → **400** `{"error":"Expected string, received null"}`. La venta no se crea, el carrito no se limpia, sin feedback claro al usuario.
- **Validación de causa raíz**: `POST /sales` con `customerId=null` → 400; con un `customerId` válido → **201** (`folioCode: "TK-000001"`). Confirmado: `customerId` es el único bloqueante.
- **Esperado vs Real**: venta de contado sin cliente se registra ✅ vs 400 ❌.
- **Fix** (backend, alinear con UI/spec):
  ```ts
  customerId: z.string().uuid().nullable().optional(),
  ```
  Alternativa (si el negocio exige cliente por CFDI): hacer el campo **requerido en la UI**, validar antes de habilitar el botón, y sembrar/permitir alta rápida de cliente. Hoy ambas capas se contradicen.

### 🟠 BUG-03 — Etiqueta de folio en dropdown POS muestra "TK--1" / "COT--1"
- **Módulo**: POS (selector de folio)
- **Severidad**: Alta (confunde al cajero; sugiere numeración negativa)
- **Descripción**: El `<option>` del folio se formatea como `prefix + (currentNumber - 1)` sin zero-padding. Con `currentNumber=0` → `"TK-" + "-1"` → **"TK--1"**. El folio realmente asignado al crear la venta es correcto (`"TK-000001"`), así que es un **bug de presentación** en el label del dropdown.
- **Esperado vs Real**: "TK-000001" (próximo) o "TK" vs "TK--1".
- **Fix**: formatear el label igual que la asignación real (`prefix + String(currentNumber+1).padStart(6,'0')`) o mostrar solo `code (name)`.

### 🟠 BUG-04 — Dashboard con datos mock hardcodeados y en inglés
- **Módulo**: Dashboard (`app/(private)/dashboard`)
- **Severidad**: Alta (datos ficticios presentados como reales)
- **Descripción**: `/dashboard` muestra valores fijos: `Total Sales Today $24,850.00`, `+12.4%`, `Wheat Seeds (Organic)`, `Seeds 450kg`. No están conectados a datos reales y están **en inglés** (resto de la app en español).
- **Esperado vs Real**: métricas reales en español vs placeholders en inglés.
- **Fix**: conectar a endpoints reales (ventas del día, stock bajo, etc.) o marcar claramente como demo. Traducir.

### 🟡 BUG-05 — Billing (Facturama) y Reports: solo backend, sin UI
- **Módulos**: Billing/Facturama, Reports
- **Severidad**: Media (feature inaccesible para usuario final)
- **Descripción**: Las APIs responden 200:
  - `GET /invoices` → lista (ya existe 1 factura de prueba).
  - `GET /billing/csd` → `{"rfc":"FAKE","isValid":true,"issuer":"FAKE CSD (mock mode)"}` → **billing en modo MOCK**, no Facturama real.
  - `GET /tax-rates`, `GET /reports/inventory/stock`, `GET /reports/payments/history` → 200.
  - **No existen páginas UI** (`app/(private)/...`) para invoices, configuración CSD ni reports. `/settings` es un placeholder vacío.
- **Impacto**: no hay forma desde la UI de configurar el CSD, emitir/cancelar/descargar facturas ni generar reportes. Solo consumible vía API.
- **Fix**: implementar UI (o documentar que es backend-only en esta fase). Confirmar que el modo mock no se despliegue a producción.

### 🟡 BUG-06 — 43 tests Jest desactualizados/no aislados
- **Severidad**: Media (señal de regresión de mantenimiento de tests)
- **Detalle**: ver §2.2. Acciones: (a) polyfill `<dialog>` en `jest.setup.ts` (jsdom no implementa `showModal/close`); (b) actualizar `NavigationRail.test`/landing a `/pos` y al nuevo set de ítems; (c) mockear `useRouter` donde falte; (d) aislar integraciones (limpiar RFC/datos entre corridas, o usar transacción/rollback).

### 🟡 BUG-07 — `npm test` no carga `.env.local` → 43 suites de integración no arrancan
- **Severidad**: Media (DX/CI)
- **Descripción**: Sin env exportado, las suites que tocan Prisma fallan con `DATABASE_URL is required` antes de ejecutar. Cargar env via `jest.setup` (dotenv) o documentar el comando con env.

### 🔵 BUG-08 — `/settings` es placeholder vacío
- **Severidad**: Baja. `/settings` renderiza solo "Configuración placeholder". Relevante porque es el candidato natural para la config de CSD/billing (ver BUG-05).

### 🔵 BUG-09 — `favicon.ico` 404 en todas las páginas
- **Severidad**: Baja. Cada carga produce `GET /favicon.ico 404` en consola. Añadir `app/favicon.ico` o `icon.png`.

### 🔵 BUG-10 — Diálogos de "limpiar carrito" duplicados en el DOM (POS)
- **Severidad**: Baja. El POS monta dos confirmaciones de vaciar carrito (`"Limpiar carrito…"` y `"¿Vaciar carrito?…"`) simultáneamente en el DOM. Revisar duplicación de `ConfirmDialog`.

### 🔵 BUG-11 — Drift de documentación (CLAUDE.md)
- **Severidad**: Baja (doc). CLAUDE.md desactualizado vs `feature/fixes`:
  - Hub de catálogos: dice **6 tarjetas**, hay **7** (se agregó `tax-rates`).
  - Permisos: dice **39**, la BD tiene **47** (nuevos para billing/reports/tax-rates).
  - Módulos `billing` y `reports` no listados en la sección de módulos hexagonales.

---

## 4. Cobertura por módulo (smoke UI)

| Módulo | Ruta | Estado |
|---|---|---|
| Auth/Login | `/auth/login` | ✅ OK (favicon 404 menor) |
| Dashboard | `/dashboard` | ⚠️ mock/inglés (BUG-04) |
| POS | `/pos` | 🔴 venta bloqueada sin cliente (BUG-02); folio label (BUG-03) |
| Ventas | `/sales` | ✅ carga (0 registros) |
| Cotizaciones | `/quotes` | ✅ carga, búsqueda server |
| Devoluciones | `/returns` | ✅ carga |
| Abonos | `/payments` | ✅ carga |
| Inventario | `/inventory` | ✅ API 582 filas, pide sucursal |
| Catálogos hub | `/catalogs` | ✅ 7 tarjetas |
| Tax-rates | `/catalogs/tax-rates` | ✅ tabla 3 filas |
| Usuarios | `/users` | ✅ 5 usuarios |
| Roles | `/roles` | ✅ carga |
| Settings | `/settings` | 🔵 placeholder (BUG-08) |
| Billing/Invoices | (API) | 🟡 sin UI, mock CSD (BUG-05) |
| Reports | (API) | 🟡 sin UI (BUG-05) |

> Nota: ventas/devoluciones/abonos/billing **no se pudieron probar E2E vía UI** porque BUG-02 impide crear la venta base. Validados a nivel API.

---

## 5. Cumplimiento de spec

- **Cálculo de totales POS**: IVA $0.00 observado es **correcto** — 572/582 productos sembrados tienen `ivaRate=0` (insumos agrícolas MX), solo 10 con `0.16`. No es bug de `computeTotalsClient`.
- **Folios scope POS**: el dropdown solo ofrece folios `scope=POS` (COT/TC/TK) ✅ conforme a spec.
- **Folio fiscal consecutivo**: la venta creada tomó `TK-000001`, `folioNumber=1` ✅.
- **Branch scoping / RBAC**: admin ve todos los ítems de nav ✅ (no se probó gating con viewer/operator en esta corrida — pendiente).
- **Módulos nuevos**: `billing`, `tax-rates`, `reports`, `folio-audit` tienen spec en `openspec/specs/` y APIs operativas; falta capa UI (billing/reports).

---

## 6. Plan de acción (priorizado)

| # | Fix | Archivo | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 1 | Escapar backticks en template del generador | `prisma/seeds/data/generate-inventory-data.ts:184` | Trivial (1 línea) | P0 — desbloquea build |
| 2 | `customerId` nullable/optional en `createSaleSchema` (o requerir en UI) | `src/modules/pos/infrastructure/http/SalesController.ts:58` | Bajo | P0 — desbloquea POS |
| 3 | Formato correcto del label de folio en POS | bloque selector de folio POS | Bajo | P1 |
| 4 | Conectar Dashboard a datos reales + traducir | `app/(private)/dashboard` | Medio | P1 |
| 5 | Polyfill `<dialog>` + actualizar tests nav/landing + aislar integración | `jest.setup.ts`, tests UI/integración | Medio | P1 |
| 6 | UI para billing (CSD/invoices) y reports, o documentar backend-only | nuevos `app/(private)/...` | Alto | P2 |
| 7 | Cargar `.env.local` en runner de tests | `jest.setup.ts` | Bajo | P2 |
| 8 | favicon, settings, dialog duplicado, sync CLAUDE.md | varios | Bajo | P3 |

---

## 7. Datos de prueba creados (limpieza pendiente)

Durante el testing se mutó la BD (autorizado). Para limpiar:
- **Cliente** `code=TESTQA01` (`Cliente QA Test`, RFC `XAXX010101000`, id `b75f9cc4-...`).
- **Venta** `TK-000001` (id `cedbfd7f-...`) — ⚠️ consumió el **folio fiscal TK número 1**; la numeración consecutiva MX **no se reutiliza** al borrar. Decrementó 1 unidad de stock de `YODA` (sucursal Matriz).

> Recomendación: si esta BD es productiva, revertir el stock de YODA (+1) y considerar el hueco de folio. Idealmente, repetir el testing de escritura contra una BD aislada.
