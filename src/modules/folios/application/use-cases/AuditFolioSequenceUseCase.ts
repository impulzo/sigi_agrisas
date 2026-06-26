import { FolioRepository } from "@/modules/folios/application/ports/FolioRepository";
import { FolioAuditResultDto, AuditSequenceItemDto } from "@/modules/folios/application/dto/FolioAuditDto";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";

export class AuditFolioSequenceUseCase {
  constructor(private readonly repo: FolioRepository) {}

  async execute(folioId: string): Promise<FolioAuditResultDto> {
    const folio = await this.repo.findById(folioId);
    if (!folio) throw new FolioNotFoundError();

    const [rawRows, counts] = await Promise.all([
      this.repo.findAuditSequence(folioId),
      this.repo.getAuditCounts(folioId),
    ]);

    const truncated = counts.withFolioNumber > 10000;
    const totalIssued = counts.withFolioNumber;

    let gaps: number[] = [];
    let sequence: AuditSequenceItemDto[] = [];

    if (!truncated) {
      const issuedSet = new Set(rawRows.map((r) => r.num));
      for (let n = 1; n <= folio.currentNumber; n++) {
        if (!issuedSet.has(n)) gaps.push(n);
      }
      sequence = rawRows.map((r) => ({
        number: r.num,
        documentType: r.doc_type,
        documentId: r.doc_id,
        status: r.status,
        issuedAt: r.issued_at instanceof Date ? r.issued_at.toISOString() : String(r.issued_at),
      }));
    }

    return {
      folioId: folio.id,
      code: folio.code,
      prefix: folio.prefix,
      currentNumber: folio.currentNumber,
      totalIssued,
      withoutFolioNumber: counts.withoutFolioNumber,
      gaps,
      truncated,
      sequence,
    };
  }
}
