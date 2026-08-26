#!/usr/bin/env node
"use strict";

/**
 * Agente local de referencia — recibe un TicketPrintJob (JSON) por HTTP en
 * localhost y lo traduce a ESC/POS, enviándolo por socket TCP crudo al
 * puerto de la impresora de red (9100 por default). Ver
 * openspec/changes/add-escpos-ticket-printing/design.md para el contrato
 * completo. Empaquetado/instalación como servicio de Windows queda fuera
 * de alcance — esto es un script Node standalone para pruebas/desarrollo.
 */

const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs/promises");
const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");

function argValue(flag) {
  return process.argv.find((a) => a.startsWith(`${flag}=`))?.split("=")[1];
}

const AGENT_PORT = Number(argValue("--port")) || 9101;
const PRINTER_HOST = argValue("--printer-host");
const PRINTER_PORT = Number(argValue("--printer-port")) || 9100;

if (!PRINTER_HOST) {
  console.error("Falta --printer-host=<ip-de-la-impresora> (ej. --printer-host=192.168.1.50 --printer-port=9100 --port=9100)");
  process.exit(1);
}

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

async function downloadLogo(logoUrl) {
  const res = await fetch(logoUrl);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `ticket-logo-${Date.now()}.png`);
  await fs.writeFile(tmpPath, buffer);
  return tmpPath;
}

async function printTicketJob(job, printerHost, printerPort) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${printerHost}:${printerPort}`,
    width: job.paperWidth === "58mm" ? 32 : 42,
  });

  let logoPath = null;
  try {
    logoPath = await downloadLogo(job.logoUrl);
  } catch {
    logoPath = null;
  }

  printer.alignCenter();
  if (logoPath) {
    await printer.printImage(logoPath);
  }

  if (job.business.name) printer.bold(true), printer.println(job.business.name), printer.bold(false);
  if (job.business.rfc) printer.println(`RFC: ${job.business.rfc}`);
  if (job.business.address) printer.println(job.business.address);
  if (job.business.phone) printer.println(`Tel. ${job.business.phone}`);
  if (job.business.taxRegime) printer.println(job.business.taxRegime);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Folio: ${job.meta.folioCode}`);
  printer.println(`Fecha: ${new Date(job.meta.date).toLocaleString("es-MX")}`);
  printer.println(`Vendedor: ${job.meta.cashierName}`);
  printer.println(`Sucursal: ${job.meta.branchName}`);
  printer.tableCustom([{ text: "Pago", align: "LEFT" }, { text: job.meta.paymentMethodName, align: "RIGHT" }]);
  printer.drawLine();

  if (job.customer) {
    printer.bold(true);
    printer.println("Cliente");
    printer.bold(false);
    printer.println(`RFC: ${job.customer.rfc}`);
    printer.println(`Nombre: ${job.customer.name}`);
    printer.println(`Dirección: ${job.customer.address}`);
    printer.drawLine();
  }

  if (job.creditDays != null) {
    printer.tableCustom([{ text: "Condiciones", align: "LEFT" }, { text: `Crédito a ${job.creditDays} días`, align: "RIGHT" }]);
  }

  for (const item of job.items) {
    printer.println(item.name);
    printer.tableCustom([
      { text: `${item.quantity} x ${MX.format(item.unitPrice)}`, align: "LEFT" },
      { text: MX.format(item.lineTotal), align: "RIGHT" },
    ]);
  }
  printer.drawLine();

  printer.tableCustom([{ text: "Subtotal", align: "LEFT" }, { text: MX.format(job.totals.subtotal), align: "RIGHT" }]);
  printer.tableCustom([{ text: "IVA", align: "LEFT" }, { text: MX.format(job.totals.iva), align: "RIGHT" }]);
  printer.tableCustom([{ text: "IEPS", align: "LEFT" }, { text: MX.format(job.totals.ieps), align: "RIGHT" }]);
  printer.bold(true);
  printer.tableCustom([{ text: "Total a pagar", align: "LEFT" }, { text: MX.format(job.totals.total), align: "RIGHT" }]);
  printer.bold(false);
  printer.drawLine();

  printer.alignCenter();
  if (job.footerText) printer.println(job.footerText);
  if (job.legendText) printer.println(job.legendText);
  printer.newLine();
  printer.println(job.meta.folioCode);

  printer.newLine();
  printer.newLine();
  printer.cut();

  await printer.execute();

  if (logoPath) {
    await fs.rm(logoPath, { force: true });
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/print") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", async () => {
    let job;
    try {
      job = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON body" }));
      return;
    }

    try {
      await printTicketJob(job, PRINTER_HOST, PRINTER_PORT);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Print failed", detail: String(err && err.message ? err.message : err) }));
    }
  });
});

server.listen(AGENT_PORT, "127.0.0.1", () => {
  console.log(`escpos-print-agent escuchando en http://127.0.0.1:${AGENT_PORT}`);
});
