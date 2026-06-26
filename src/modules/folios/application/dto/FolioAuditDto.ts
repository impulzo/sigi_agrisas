export interface AuditSequenceRaw {
  num: number;
  doc_type: "sale" | "quote" | "payment";
  doc_id: string;
  status: string;
  issued_at: Date;
}

export interface AuditSequenceItemDto {
  number: number;
  documentType: "sale" | "quote" | "payment";
  documentId: string;
  status: string;
  issuedAt: string;
}

export interface FolioAuditResultDto {
  folioId: string;
  code: string;
  prefix: string | null;
  currentNumber: number;
  totalIssued: number;
  withoutFolioNumber: number;
  gaps: number[];
  truncated: boolean;
  sequence: AuditSequenceItemDto[];
}
