import { SatUnitRepository, SatUnit } from "../../application/ports/SatUnitRepository";

export class InMemorySatUnitRepository implements SatUnitRepository {
  private store: SatUnit[] = [];

  seed(units: SatUnit[]): void {
    this.store = [...units];
  }

  async search(query: string | undefined, limit: number): Promise<SatUnit[]> {
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
