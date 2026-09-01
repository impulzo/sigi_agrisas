## Context

Backend ya completo: `GET/PATCH /api/v1/admin/branches/:id/printer-config` (`SettingsController.ts:167-202`) valida UUID → body Zod → `enforceBranchScope` → use case (orden correcto, sin invertir). El regex de `agentUrl` ya restringe a `^http:\/\/(localhost|127\.0\.0\.1):\d+$` — no solo esquema `http`, también host (`SettingsController.ts:19-28`). `UpdateBranchPrinterConfigUseCase` lanza `IncompletePrinterConfigError` si `printMode:'escpos'` sin `agentUrl`+`printerHost`. Nada de esto se toca.

En frontend existe `getBranchPrinterConfig.ts` (en `sales/_logic/services/`) — consumido por `TicketPreviewPage` para decidir el flujo de impresión, con fallback silencioso a `{printMode:'browser', agentUrl:null}` ante error de red. Ese comportamiento (silencioso, con default) es correcto para el flujo de impresión pero **no** sirve para un formulario de administración, que necesita mostrar el error real si el fetch falla. Por eso no se reutiliza cross-módulo.

`tools/escpos-print-agent/index.js` es hoy un script Node ejecutado manualmente (`node index.js --printer-host=...`). El README ya documenta la limitación: sin instalador, sin verificación en hardware real.

Ver `proposal.md` — Historia de Usuario para las 3 filas que motivan este diseño.

## Goals / Non-Goals

**Goals:**
- Fila 1: UI de configuración de impresora dentro de `catalogs/branches`, con su propio par get/update de servicios (no cross-módulo), validación cliente espejo de la de backend, gating `settings:read`/`settings:write` independiente del gating de `branches:*` que ya tiene el modal.
- Fila 2: empaquetar el agente como ejecutable standalone y registrarlo como servicio de Windows con auto-arranque, sin tocar el contrato `POST /print`.
- Fila 3: dejar la verificación en hardware real como task explícita, bloqueante para cerrar el change, a cargo del usuario.

**Non-Goals:**
- No se toca `src/modules/settings/` (backend) — el contrato ya cumple todos los criterios de seguridad de la tabla (branch scoping, permisos, validación).
- No se construye un instalador gráfico (`.msi`/wizard) — el alcance es un `.exe` + script de registro de servicio vía línea de comandos, documentado en el README del agente.
- No se agregan más impresoras/plataformas (Linux, macOS) al agente — sigue siendo Windows-only, igual que `add-escpos-ticket-printing`.
- No se reutiliza `getBranchPrinterConfig.ts` de `sales/_logic/` — se crea su equivalente en `catalogs/branches/_logic/`, manteniendo el aislamiento de módulo (`_logic/services` es por-feature, no global).

## Decisions

### 1. Sección "Impresión" dentro de `BranchEditModal`, solo en modo edición
**Responde a:** fila 1 (AC "abre su configuración de impresión").
La configuración de impresora requiere un `branchId` existente (`PATCH /branches/:id/printer-config`), igual que Precios/Dosificaciones de Productos requieren un producto ya creado. Se agrega una sección "Impresión" (mismo patrón de 3-secciones de Providers/Customers) dentro de `BranchEditModal.tsx`, visible solo cuando `mode==='edit'`. En `mode==='create'` la sección no se renderiza — no hay forma de configurar impresión de una sucursal que aún no existe.
**Alternativa descartada:** pantalla separada tipo detalle de Producto (`/catalogs/branches/[id]`) — se descarta por ser el único catálogo que lo necesitaría; agregar una sección al modal existente es más consistente con el resto de `BranchEditModal` (que ya solo tiene un modal, sin detalle).

### 2. Gating de permisos independiente: `settings:write` para la sección, no `branches:write`
**Responde a:** Criterios de Seguridad de fila 1 ("Gate por `settings:write`... no `branches:write`").
La sección "Impresión" se muestra/oculta con su propio `useCurrentUser().can("settings:read")`/`can("settings:write")`, desacoplado del check que ya gatea el resto del modal (`branches:write`). Un usuario con `branches:write` pero sin `settings:read` ve el modal de sucursal sin la sección de impresión; uno con ambos permisos ve todo. Sigue el patrón ya establecido de "Gating por permisos" (cada sección usa su propio `can()`).
**Alternativa descartada:** heredar el gate de `branches:write` para toda la sección — se descarta porque el endpoint real exige `settings:*`, no `branches:*`; heredar el permiso equivocado dejaría a operadores con `branches:write` pero sin `settings:write` viendo un formulario que luego falla en 403 al guardar.

### 3. Servicios propios en `catalogs/branches/_logic/services/` (sin reuso cross-módulo)
**Responde a:** fila 1, requisito arquitectónico de `_logic/services` por-feature.
Se agregan `getPrinterConfig.ts` (GET, sin fallback silencioso — propaga el error al hook para mostrarlo) y `updatePrinterConfig.ts` (PATCH, diff-based igual que `updateBranch.ts`) en `catalogs/branches/_logic/services/`. No se importa `sales/_logic/services/getBranchPrinterConfig.ts` — ese archivo sirve al flujo de impresión (necesita default silencioso ante fallo), este formulario necesita el error real.
**Alternativa descartada:** extraer un servicio compartido en `app/_hooks`/`app/_lib` — se descarta porque los dos consumidores (impresión vs. administración) necesitan semántica de error opuesta (silenciar vs. propagar); forzar un solo servicio genérico los acopla innecesariamente.

### 4. Validación cliente: mismo regex que backend, duplicado a propósito
**Responde a:** Criterios de Seguridad de fila 1 (agentUrl solo localhost/127.0.0.1, solo `http://`).
El schema Zod cliente (`catalogs/branches/_logic/schemas/`) usa el mismo regex `^http:\/\/(localhost|127\.0\.0\.1):\d+$` que `SettingsController.ts:23` — literal duplicado, no importado desde backend (frontend no importa de `src/`, salvo tipos DTO). Se comenta en el código que debe mantenerse en sync manual con el backend si cambia.
**Alternativa descartada:** relajar el regex cliente a solo validar esquema `http://` sin restringir host — se descarta porque dejaría pasar al submit un `agentUrl` que el backend rechazará (ej. `http://192.168.1.5:9101`), dando un 400 sorpresivo en vez de feedback inline inmediato.

### 5. Empaquetado del agente: `@yao-pkg/pkg` (no `vercel/pkg`, no `nexe`)
**Responde a:** fila 2 (AC "agente empaquetado `.exe` standalone").
`vercel/pkg` (paquete `pkg` en npm) está archivado/sin mantenimiento desde 2024. Se usa `@yao-pkg/pkg`, fork activamente mantenido con la misma CLI/API, mínimo cambio de configuración sobre `tools/escpos-print-agent/package.json`. Se descarta `nexe` por tener menor actividad de mantenimiento y peor soporte histórico para dependencias nativas (`node-thermal-printer` ya trae `iconv-lite`/`pngjs`, sin binarios nativos, pero se prioriza la opción con mejor track record de compatibilidad).
**Alternativa descartada:** `nexe` — funcionalmente similar, se prefiere `@yao-pkg/pkg` por mantenimiento activo y continuidad con la API de `pkg` (menos riesgo de reescritura si Node cambia de versión).

### 6. Registro como servicio de Windows: `nssm`, no `node-windows`
**Responde a:** fila 2 (AC "corre como servicio con auto-arranque").
`node-windows` envuelve un *script* de Node y requiere que el runtime de Node esté instalado en la PC de destino — contradice el propósito de empaquetar con `pkg` (un `.exe` standalone que no depende de Node instalado en la caja del cliente). `nssm` (Non-Sucking Service Manager) es agnóstico al lenguaje: envuelve cualquier ejecutable como servicio de Windows, coherente con el `.exe` ya empaquetado. Se documenta en el README el comando (`nssm install AgrisasEscposAgent "C:\ruta\agente.exe" --printer-host=... --port=...`) y que `nssm.exe` debe distribuirse junto al `.exe` del agente.
**Alternativa descartada:** `node-windows` — descartada por requerir Node.js en la PC de la caja, justo lo que el empaquetado standalone busca evitar.

### 7. Verificación física (fila 3) queda como task bloqueante explícita, no automatizable
**Responde a:** fila 3 completa.
Ninguna de las decisiones anteriores puede confirmarse sin una EPSON TM-T20II física del lado del usuario. `tasks.md` deja esta verificación como su propia sección, marcada explícitamente como "no se cierra el change sin esta confirmación" — mismo criterio que `refine-thermal-ticket-print-layout` usó para su verificación de hardware.

## Risks / Trade-offs

| Risk | Mitigación |
|---|---|
| El regex de `agentUrl` duplicado en cliente y backend puede desincronizarse si alguno cambia | Comentario explícito en el schema Zod cliente señalando la fuente de verdad (`SettingsController.ts`); bajo riesgo de cambio (regex estable desde `add-escpos-ticket-printing`) |
| `@yao-pkg/pkg` es un fork de comunidad, no el paquete original de Vercel — riesgo de que el mantenimiento se discontinúe también | Bajo riesgo a corto plazo (fork activo al momento de este change); el agente es un script simple sin dependencias nativas complejas, portable a otra herramienta de empaquetado si hiciera falta |
| `nssm.exe` es un binario de terceros que hay que distribuir manualmente junto al agente — no se instala vía npm | Se documenta en el README del agente como paso manual explícito de instalación, igual que ya se documenta hoy el flag `--printer-host` |
| La verificación en hardware real (fila 3) puede revelar problemas no anticipados (ej. tiempos de timeout del socket TCP, formato de logo en la impresora real) | Queda fuera del alcance de este change resolverlos preventivamente — se abordan como change de seguimiento si aparecen, según el mismo patrón ya usado en `refine-thermal-ticket-print-layout` (hallazgos post-hardware documentados y resueltos en su propia iteración) |
| La sección "Impresión" solo visible en modo edición deja a un admin sin poder configurar ESC/POS en el mismo flujo de creación de sucursal | Aceptado — mismo patrón que Precios/Dosificaciones de Productos (crear primero, configurar después); no bloquea ningún flujo existente |

## Migration Plan

Sin migración de datos — la tabla `BranchPrinterConfig` ya existe desde `add-escpos-ticket-printing`. Despliegue en 2 partes independientes:
1. Frontend (`catalogs/branches`) — deploy normal junto al resto del panel.
2. Agente empaquetado — se distribuye manualmente (descarga del `.exe` + `nssm`) a cada PC de caja que migre a `printMode:'escpos'`; no requiere downtime del panel ni coordina con el deploy de (1).

Rollback: si el agente empaquetado falla en una sucursal, revertir esa sucursal a `printMode:'browser'` desde la nueva UI (o el PATCH crudo) restaura el comportamiento actual sin tocar código.
