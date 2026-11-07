export interface AnticipoReceiptResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  payment: {
    id: string;
    folio: string;
    folioCode: string;
    folioNumber: number;
    amount: string;
    status: string;
    date: string;
    reference: string | null;
    paymentMethodCode: string;
    paymentMethodName: string;
  };
  customer: {
    code: string;
    name: string;
    address: string | null;
  };
  /** Comprobante fiscal al que se aplica el abono; `null` si es un abono a saldo general (sin venta asociada). */
  sale: { folio: string } | null;
}
