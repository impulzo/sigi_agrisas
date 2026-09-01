## 1. Tipos y schema (frontend, `catalogs/branches/_logic`)

- [x] 1.1 Agregar `PrinterConfigDto` (`printMode: "browser"|"escpos"`, `agentUrl: string|null`, `printerHost: string|null`, `printerPort: number|null`) y `UpdatePrinterConfigBody` (mismos campos, todos opcionales) en `catalogs/branches/_logic/types/api.ts`.
- [x] 1.2 Agregar `printerConfigSchema` en `catalogs/branches/_logic/schemas/` (Zod): `printMode` enum, `agentUrl` con regex `^http:\/\/(localhost|127\.0\.0\.1):\d+$` nullable, `printerHost` string nullable, `printerPort` int 1-65535 nullable, y refine cruzado: si `printMode==='escpos'` entonces `agentUrl` y `printerHost` no pueden ser `null`. Comentario señalando que el regex debe mantenerse en sync con `SettingsController.ts:23`.

## 2. Servicios HTTP (`catalogs/branches/_logic/services`)

- [x] 2.1 `getPrinterConfig.ts` — `GET /api/v1/admin/branches/:id/printer-config` vía `authFetch`, sin fallback silencioso (propaga el error al caller), acepta `fetchImpl?: typeof authFetch` para tests.
- [x] 2.2 `updatePrinterConfig.ts` — `PATCH` con el diff (mismo patrón que `updateBranch.ts`), normaliza 400 (`IncompletePrinterConfigError`/regex) a un error tipado del módulo, acepta `fetchImpl?`.

## 3. Hook de mutación y estado (`catalogs/branches/_logic/hooks`)

- [x] 3.1 `usePrinterConfig.ts` — carga la config al abrir la sección (solo si `mode==='edit'` y hay `branchId`), expone `{config, isLoading, error, refresh}`.
- [x] 3.2 `usePrinterConfigMutations.ts` — calcula diff local vs. config cargada, expone `save(diff)` con `isSaving`/`mutationError`, invalida/refresca tras éxito.

## 4. UI — sección "Impresión" en `BranchEditModal`

- [x] 4.1 Crear `BranchPrinterConfigSection.tsx` en `catalogs/branches/_blocks/` — formulario con `Select` para `printMode` (`browser`/`escpos`), inputs `agentUrl`/`printerHost`/`printerPort` habilitados solo si `printMode==='escpos'`, botón "Guardar configuración de impresión" propio (independiente del botón "Guardar" del resto del modal — son dos PATCH distintos a endpoints distintos), estado vacío/deshabilitado si la sucursal nunca fue configurada (según Decision del design).
- [x] 4.2 Gating de la sección con `useCurrentUser().can("settings:read")`/`can("settings:write")` — oculta la sección completa si no hay `settings:read`; deshabilita el submit (no oculta el formulario) si hay `settings:read` pero no `settings:write`. Optimista durante `"loading"`, mismo criterio que el resto de gating por permisos del proyecto.
- [x] 4.3 Insertar `<BranchPrinterConfigSection>` en `BranchEditModal.tsx` — nueva sección tras "Domicilio fiscal (Carta Porte)", renderizada solo cuando `mode==='edit'` (no en `mode==='create'`, ver Decision 1 del design).
- [x] 4.4 Mapear errores: `IncompletePrinterConfigError` → mensaje inline igual al de backend; regex de `agentUrl` fallido → error inline antes de intentar el submit (bloquea el POST, no solo lo reporta después).

## 5. Tests unitarios (frontend)

- [x] 5.1 `tests/unit/ui/(private)/catalogs/branches/printerConfigSchema.test.ts` — casos: `escpos` sin `agentUrl`/`printerHost` → inválido; `agentUrl` con `https://` → inválido; `agentUrl` con host distinto a localhost/127.0.0.1 → inválido; `browser` sin campos ESC/POS → válido.
- [x] 5.2 `tests/unit/ui/(private)/catalogs/branches/BranchPrinterConfigSection.test.tsx` — RTL: sección oculta sin `settings:read`; campos deshabilitados sin `printMode:'escpos'`; submit bloqueado con config incompleta; submit exitoso llama a `updatePrinterConfig` con el diff correcto.
- [x] 5.3 `npm test -- "printerConfigSchema.test.ts" "BranchPrinterConfigSection.test.tsx"` → verde (13/13).

## 6. Empaquetado del agente (`tools/escpos-print-agent`)

- [x] 6.1 Agregar `@yao-pkg/pkg` como devDependency en `tools/escpos-print-agent/package.json` (ver Decision 5 del design — no `vercel/pkg`, archivado; no `nexe`). Nota: `node18-win-x64` y `node20-win-x64` ya no tienen binario base prebuilt en las releases actuales de `@yao-pkg/pkg-fetch` (confirmado contra GitHub releases) — se usó `node22-win-x64` (LTS activo con binario disponible).
- [x] 6.2 Configurar target de empaquetado (`pkg.targets` en `package.json`) para Windows x64 (`node22-win-x64`), script `npm run build` (`pkg . --output dist/escpos-print-agent.exe`). Build ejecutado localmente: `dist/escpos-print-agent.exe` generado (~57MB).
- [x] 6.3 Verificado el contrato del script fuente (`node index.js`) contra un mock de socket TCP (sin impresora real): `POST /print` con un `TicketPrintJob` de ejemplo → `{"success":true}`. **Caveat:** no fue posible ejecutar el `.exe` win-x64 generado en este entorno (host macOS, sin Wine/emulación) — la equivalencia de contrato se apoya en que `pkg` empaqueta `index.js` sin transformarlo (embebe el runtime + el archivo tal cual, sin transpilar), por lo que el binario ejecuta el mismo código ya verificado. Ejecutar el `.exe` real en Windows queda cubierto por la verificación de hardware de la sección 9.

## 7. Registro como servicio de Windows

- [x] 7.1 Documentar en `tools/escpos-print-agent/README.md` el flujo de instalación como servicio con `nssm` (Decision 6 del design): descarga de `nssm.exe`, comando `nssm install <nombre-servicio> "<ruta>\agente.exe" --printer-host=... --printer-port=... --port=...`, y cómo confirmar que el servicio quedó con inicio automático.
- [x] 7.2 Documentar el procedimiento de desinstalación/actualización del servicio (`nssm remove <nombre-servicio>` + reinstalar con el nuevo `.exe`).
- [x] 7.3 Actualizar la sección "Limitaciones conocidas" del README: quitar la limitación de "sin instalador" (resuelta), dejar explícita la limitación pendiente de verificación en hardware real (sección 9).

## 8. Validación OpenSpec

- [x] 8.1 `openspec validate escpos-printing-production-ready --strict` → "Change 'escpos-printing-production-ready' is valid".
- [x] 8.2 Revisado: los headers de `### Requirement:` de las 2 MODIFIED coinciden exactamente con el canonical (`Configuración de impresora ESC/POS por sucursal`, `Payload de impresión — navegador a agente local`); el ADDED (`Persistencia del agente local como servicio`) no colisiona con ninguno existente; el requirement no tocado (`Reintento y fallback ante fallas del agente local`) queda fuera del delta, sin duplicarlo.

## 9. Verificación manual y hardware físico (bloqueante — a cargo del usuario)

**No cerrar `opsx:archive` de este change sin completar esta sección.** Requiere una PC de caja real y una impresora térmica física (EPSON TM-T20II u otra ya en uso) — no ejecutable por el agente de IA en esta sesión.

- [ ] 9.1 Instalar el `.exe` empaquetado (tarea 6) como servicio (tarea 7) en una PC de caja de prueba; reiniciar la PC y confirmar que el agente queda escuchando sin intervención manual.
- [ ] 9.2 Configurar una sucursal de prueba en `printMode:'escpos'` desde la nueva UI (tarea 4) con el `agentUrl`/`printerHost`/`printerPort` reales.
- [ ] 9.3 Imprimir un ticket real desde `/sales/:id/ticket` y confirmar en la impresora física: ticket completo, sin hoja en blanco sobrante, sin corte de contenido, sin truncado en nombre/dirección largos (si aplica un cliente con esos datos).
- [ ] 9.4 Si aparece algún hallazgo no anticipado (timeouts, formato de logo, ancho de columna incorrecto), documentarlo y decidir con el usuario si se resuelve en este change o se abre uno de seguimiento (mismo criterio usado en `refine-thermal-ticket-print-layout`).
