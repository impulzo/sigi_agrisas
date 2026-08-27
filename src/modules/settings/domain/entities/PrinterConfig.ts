export type PrintMode = "browser" | "escpos";

export interface PrinterConfig {
  printMode: PrintMode;
  agentUrl: string | null;
  printerHost: string | null;
  printerPort: number | null;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printMode: "browser",
  agentUrl: null,
  printerHost: null,
  printerPort: null,
};
