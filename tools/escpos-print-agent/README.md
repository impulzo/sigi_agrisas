# escpos-print-agent

Agente local de referencia para impresión directa ESC/POS de tickets de venta. Ver `openspec/changes/add-escpos-ticket-printing/design.md` para el contrato completo, y `openspec/changes/escpos-printing-production-ready/design.md` para el empaquetado y registro como servicio de Windows.

## Qué hace

1. Escucha HTTP en `http://127.0.0.1:<puerto-agente>` (default `9101`).
2. En `POST /print`, recibe el `TicketPrintJob` (JSON) tal cual lo arma `buildTicketPrintJob` en el panel.
3. Traduce ese JSON a comandos ESC/POS (texto, alineación, tabla de dos columnas, imagen del logo, corte) usando `node-thermal-printer`.
4. Envía los bytes por socket TCP crudo a la impresora de red configurada (host + puerto, típicamente `9100`) — no usa HTTP/ePOS-Print ni ningún driver del sistema operativo.

## Cómo correrlo localmente

```bash
cd tools/escpos-print-agent
npm install
node index.js --printer-host=192.168.1.50 --printer-port=9100 --port=9101
```

- `--printer-host` (obligatorio): IP de la impresora EPSON TM-T20II en la red local.
- `--printer-port` (opcional, default `9100`): puerto raw ESC/POS de la impresora.
- `--port` (opcional, default `9101`): puerto HTTP donde el agente escucha — debe coincidir con el `agentUrl` configurado en `BranchPrinterConfig` para esa sucursal (ej. `http://localhost:9101`).

## Empaquetado como ejecutable standalone

El agente se empaqueta con [`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg) (fork mantenido de `vercel/pkg`, archivado desde 2024) en un `.exe` de Windows que no requiere Node.js instalado en la PC de destino:

```bash
cd tools/escpos-print-agent
npm install
npm run build
```

Genera `dist/escpos-print-agent.exe` (~57MB, embebe el runtime de Node). El contrato HTTP (`POST /print` recibiendo el `TicketPrintJob`) es idéntico al de `node index.js` — `pkg` empaqueta el script sin transformarlo. Los mismos flags de CLI aplican al `.exe`:

```
escpos-print-agent.exe --printer-host=192.168.1.50 --printer-port=9100 --port=9101
```

**Nota de compilación cruzada:** el build debe correr en una máquina con acceso a los binarios base prebuilt de `pkg-fetch` para `win-x64` — actualmente solo hay binarios prebuilt para Node 22/24/26 (`pkg.targets` en `package.json` usa `node22-win-x64`); compilar targets Node 18/20 falla porque `pkg-fetch` ya no publica esos binarios y construir desde fuente solo funciona para el SO anfitrión (no permite cross-compilar a Windows desde macOS/Linux sin el binario prebuilt).

## Instalación como servicio de Windows (auto-arranque)

Se usa [`nssm`](https://nssm.cc/) (Non-Sucking Service Manager) para registrar el `.exe` empaquetado como servicio de Windows — a diferencia de `node-windows`, `nssm` envuelve cualquier ejecutable sin requerir Node.js instalado en la máquina de destino, coherente con el `.exe` standalone generado arriba.

1. Descargar `nssm.exe` desde [nssm.cc](https://nssm.cc/download) y copiarlo junto a `escpos-print-agent.exe` en la PC de la caja (ej. `C:\agrisas\escpos-agent\`).
2. Instalar el servicio (desde una consola con permisos de Administrador):
   ```
   nssm install AgrisasEscposAgent "C:\agrisas\escpos-agent\escpos-print-agent.exe" --printer-host=192.168.1.50 --printer-port=9100 --port=9101
   ```
3. Confirmar que el servicio quedó con inicio automático:
   ```
   nssm set AgrisasEscposAgent Start SERVICE_AUTO_START
   nssm start AgrisasEscposAgent
   ```
4. Verificar en `services.msc` que "AgrisasEscposAgent" aparece como "En ejecución" con tipo de inicio "Automático", o reiniciar la PC y confirmar que el agente vuelve a escuchar en el puerto configurado sin intervención manual.

### Desinstalar / actualizar el servicio

```
nssm stop AgrisasEscposAgent
nssm remove AgrisasEscposAgent confirm
```

Para actualizar a una nueva versión del agente: detener y remover el servicio como arriba, reemplazar `escpos-print-agent.exe` por el nuevo build, y volver a correr `nssm install` con los mismos parámetros.

## Relación con el panel

- `agentUrl` en la configuración de impresora de la sucursal (`GET/PATCH /api/v1/admin/branches/:id/printer-config`) debe apuntar a `http://localhost:<puerto-agente>` o `http://127.0.0.1:<puerto-agente>` — nunca a otra IP de la LAN (el navegador solo exime de mixed-content las peticiones a `localhost`/`127.0.0.1`, aunque el panel corra en HTTPS).
- Un agente = una impresora = una sucursal. Si una sucursal tiene varias cajas con impresoras distintas, cada una necesita su propio agente corriendo en su propio puerto.

## Limitaciones conocidas

- Sin impresora física disponible en el entorno de desarrollo de este change, no se pudo verificar el resultado impreso real — solo que el contrato HTTP navegador→agente se completa y que el agente intenta el socket TCP hacia `printerHost:printerPort`. La verificación final en la EPSON TM-T20II física requiere confirmación del cliente (ver `openspec/changes/escpos-printing-production-ready/tasks.md`, sección 9 — bloqueante, a cargo del usuario).
- El `.exe` empaquetado (arriba) no fue ejecutado en Windows real durante el desarrollo de este cambio (host de desarrollo macOS, sin Wine/emulación) — se verificó el contrato del script fuente (`node index.js`) contra un mock de socket TCP; la ejecución del binario real en Windows queda cubierta por la misma verificación de hardware pendiente.
