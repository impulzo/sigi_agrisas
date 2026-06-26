export type FolioScope = "POS" | "INVENTORY" | "OPERATIONS";

export interface Folio {
  id: string;
  code: string;
  name: string;
  prefix: string | null;
  scope: FolioScope;
  currentNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditSequenceItem {
  number: number;
  documentType: "sale" | "quote" | "payment";
  documentId: string;
  status: string;
  issuedAt: string;
}

export interface FolioAuditResult {
  folioId: string;
  code: string;
  prefix: string | null;
  currentNumber: number;
  totalIssued: number;
  withoutFolioNumber: number;
  gaps: number[];
  truncated: boolean;
  sequence: AuditSequenceItem[];
}
