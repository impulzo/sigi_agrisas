export interface TicketPrintJobItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface TicketPrintJobCustomer {
  rfc: string;
  name: string;
  address: string;
}

export interface TicketPrintJob {
  paperWidth: "58mm" | "80mm";
  logoUrl: string;
  business: {
    name: string | null;
    rfc: string | null;
    address: string | null;
    phone: string | null;
    taxRegime: string | null;
  };
  meta: {
    folioCode: string;
    date: string;
    cashierName: string;
    branchName: string;
    paymentMethodName: string;
  };
  customer: TicketPrintJobCustomer | null;
  creditDays: number | null;
  items: TicketPrintJobItem[];
  totals: {
    subtotal: number;
    iva: number;
    ieps: number;
    total: number;
  };
  footerText: string | null;
  legendText: string | null;
}
