export interface TicketLogoStorage {
  upload(buffer: Buffer, mime: string, ext: string): Promise<string>;
  delete(url: string): Promise<void>;
}
