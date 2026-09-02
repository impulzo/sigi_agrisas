# escpos-print-agent

Agente local de referencia para impresión directa ESC/POS de tickets de venta. Ver `openspec/changes/add-escpos-ticket-printing/design.md` para el contrato completo.

**Alcance de este script:** demostrar/probar el contrato navegador → agente → impresora. El empaquetado como instalador (`.exe`, servicio de Windows con auto-arranque, actualizaciones) queda explícitamente fuera de alcance — es un change de seguimiento.

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

## Relación con el panel

- `agentUrl` en la configuración de impresora de la sucursal (`GET/PATCH /api/v1/admin/branches/:id/printer-config`) debe apuntar a `http://localhost:<puerto-agente>` o `http://127.0.0.1:<puerto-agente>` — nunca a otra IP de la LAN (el navegador solo exime de mixed-content las peticiones a `localhost`/`127.0.0.1`, aunque el panel corra en HTTPS).
- Un agente = una impresora = una sucursal. Si una sucursal tiene varias cajas con impresoras distintas, cada una necesita su propio agente corriendo en su propio puerto.

## Limitaciones conocidas

- Sin impresora física disponible en el entorno de desarrollo de este change, no se pudo verificar el resultado impreso real — solo que el contrato HTTP navegador→agente se completa y que el agente intenta el socket TCP hacia `printerHost:printerPort`. La verificación final en la EPSON TM-T20II física requiere confirmación del cliente.
- Sin instalador: hay que dejarlo corriendo manualmente (o vía una tarea programada/servicio que el cliente configure por su cuenta) en la PC del cajero.
