#!/usr/bin/env node
"use strict";

/**
 * Agente local de referencia — recibe un TicketPrintJob (JSON) por HTTP en
 * localhost y lo traduce a ESC/POS, enviándolo por socket TCP crudo al
 * puerto de la impresora de red (9100 por default).
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
const CUSTOM_WIDTH = Number(argValue("--width")) || 0;
const MARGIN_LEFT = Number(argValue("--margin-left")) || 0;

if (!PRINTER_HOST) {
  console.error(
    "Falta --printer-host=<ip-de-la-impresora> (ej. --printer-host=192.168.1.50 --printer-port=9100 --port=9101 --width=48 --margin-left=1)"
  );
  process.exit(1);
}

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

/**
 * Ajusta un texto haciendo word-wrap para que ninguna línea exceda `maxWidth`.
 */
function wrapText(text, maxWidth) {
  if (!text) return [];
  const words = String(text).split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + (currentLine ? " " : "") + word).length <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxWidth) {
        let rem = word;
        while (rem.length > maxWidth) {
          lines.push(rem.slice(0, maxWidth));
          rem = rem.slice(maxWidth);
        }
        currentLine = rem;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Aplica margen izquierdo en espacios a una línea dada.
 */
function applyMargin(text, margin) {
  if (margin <= 0) return text;
  const pad = " ".repeat(margin);
  return `${pad}${text}`;
}

async function downloadLogo(logoUrl) {
  const res = await fetch(logoUrl);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `ticket-logo-${Date.now()}.png`);
  await fs.writeFile(tmpPath, buffer);
  return tmpPath;
}

async function printTicketJob(job, printerHost, printerPort) {
  const defaultWidth = job.paperWidth === "58mm" ? 32 : 48;
  const totalWidth = CUSTOM_WIDTH > 0 ? CUSTOM_WIDTH : defaultWidth;
  const effectiveWidth = Math.max(20, totalWidth - MARGIN_LEFT * 2);

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${printerHost}:${printerPort}`,
    width: totalWidth,
  });

  const printWrapped = (text, align = "LEFT") => {
    if (!text) return;
    const lines = wrapText(text, effectiveWidth);
    for (const line of lines) {
      if (align === "CENTER") printer.alignCenter();
      else if (align === "RIGHT") printer.alignRight();
      else printer.alignLeft();

      printer.println(applyMargin(line, MARGIN_LEFT));
    }
  };

  const printTwoColumns = (leftText, rightText, boldLeft = false, boldRight = false) => {
    const rightLen = String(rightText).length;
    const leftMax = effectiveWidth - rightLen - 1;

    if (leftMax <= 5) {
      printWrapped(leftText, "LEFT");
      printWrapped(rightText, "RIGHT");
      return;
    }

    const leftLines = wrapText(leftText, leftMax);
    const firstLeft = leftLines[0] || "";
    const spaceCount = effectiveWidth - firstLeft.length - rightLen;
    const spaces = " ".repeat(Math.max(1, spaceCount));

    printer.alignLeft();
    if (boldLeft) printer.bold(true);
    printer.print(applyMargin(firstLeft, MARGIN_LEFT));
    if (boldLeft) printer.bold(false);

    printer.print(spaces);

    if (boldRight) printer.bold(true);
    printer.println(String(rightText));
    if (boldRight) printer.bold(false);

    for (let i = 1; i < leftLines.length; i++) {
      printer.println(applyMargin(leftLines[i], MARGIN_LEFT));
    }
  };

  const printSeparator = () => {
    const line = "-".repeat(effectiveWidth);
    printer.alignLeft();
    printer.println(applyMargin(line, MARGIN_LEFT));
  };

  let logoPath = null;
  try {
    if (job.logoUrl) logoPath = await downloadLogo(job.logoUrl);
  } catch {
    logoPath = null;
  }

  if (logoPath) {
    printer.alignCenter();
    try {
      await printer.printImage(logoPath);
    } catch (e) {
      console.warn("No se pudo imprimir el logo:", e?.message);
    }
  }

  if (job.business.name) {
    printer.bold(true);
    printWrapped(job.business.name, "CENTER");
    printer.bold(false);
  }
  if (job.business.rfc) printWrapped(`RFC: ${job.business.rfc}`, "CENTER");
  if (job.business.address) printWrapped(job.business.address, "CENTER");
  if (job.business.phone) printWrapped(`Tel. ${job.business.phone}`, "CENTER");
  if (job.business.taxRegime) printWrapped(job.business.taxRegime, "CENTER");
  printSeparator();

  printWrapped(`Folio: ${job.meta.folioCode}`);
  printWrapped(`Fecha: ${new Date(job.meta.date).toLocaleString("es-MX")}`);
  printWrapped(`Vendedor: ${job.meta.cashierName}`);
  printWrapped(`Sucursal: ${job.meta.branchName}`);
  printTwoColumns("Pago", job.meta.paymentMethodName);
  printSeparator();

  if (job.customer) {
    printer.bold(true);
    printWrapped("Cliente");
    printer.bold(false);
    if (job.customer.rfc) printWrapped(`RFC: ${job.customer.rfc}`);
    if (job.customer.name) printWrapped(`Nombre: ${job.customer.name}`);
    if (job.customer.address) printWrapped(`Dirección: ${job.customer.address}`);
    printSeparator();
  }

  if (job.creditDays != null) {
    printTwoColumns("Condiciones", `Crédito a ${job.creditDays} días`);
    printSeparator();
  }

  for (const item of job.items) {
    printWrapped(item.name);
    printTwoColumns(
      `${item.quantity} x ${MX.format(item.unitPrice)}`,
      MX.format(item.lineTotal)
    );
  }
  printSeparator();

  printTwoColumns("Subtotal", MX.format(job.totals.subtotal));
  printTwoColumns("IVA", MX.format(job.totals.iva));
  printTwoColumns("IEPS", MX.format(job.totals.ieps));
  printTwoColumns("Total a pagar", MX.format(job.totals.total), true, true);
  printSeparator();

  if (job.footerText) printWrapped(job.footerText, "CENTER");
  if (job.legendText) printWrapped(job.legendText, "CENTER");
  printer.newLine();
  printWrapped(job.meta.folioCode, "CENTER");

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
  req.on("data", (chunk) => {
    raw += chunk;
  });
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
      res.end(
        JSON.stringify({
          error: "Print failed",
          detail: String(err && err.message ? err.message : err),
        })
      );
    }
  });
});

server.listen(AGENT_PORT, "127.0.0.1", () => {
  console.log(`escpos-print-agent escuchando en http://127.0.0.1:${AGENT_PORT}`);
  console.log(`Impresora objetivo: ${PRINTER_HOST}:${PRINTER_PORT}`);
  console.log(`Configuración: Ancho=${CUSTOM_WIDTH || "Auto (48/32)"}, Margen izq=${MARGIN_LEFT}`);
});
