import type { TicketLogoStorage } from "../../application/ports/TicketLogoStorage";

export class InMemoryTicketLogoStorage implements TicketLogoStorage {
  private counter = 0;
  readonly deleted: string[] = [];

  async upload(_buffer: Buffer, _mime: string, ext: string): Promise<string> {
    this.counter += 1;
    return `https://fake.local/ticket-logo/${this.counter}.${ext}`;
  }

  async delete(url: string): Promise<void> {
    this.deleted.push(url);
  }
}
