export interface PrinterConfigDto {
  printMode: "browser" | "escpos";
  agentUrl: string | null;
  printerHost: string | null;
  printerPort: number | null;
}
