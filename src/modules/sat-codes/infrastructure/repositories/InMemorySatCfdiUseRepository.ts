import { SatCfdiUseRepository } from "../../application/ports/SatCfdiUseRepository";
import { SatCode } from "../../application/ports/SatCodeRepository";

export class InMemorySatCfdiUseRepository implements SatCfdiUseRepository {
  private store: SatCode[] = [];

  seed(codes: SatCode[]): void {
    this.store = [...codes];
  }

  async search(query: string | undefined, limit: number): Promise<SatCode[]> {
    let items = [...this.store].sort((a, b) => a.code.localeCompare(b.code));
    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (c) => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    return items.slice(0, limit);
  }
}
