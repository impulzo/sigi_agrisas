export class ReportInvalidFiltersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportInvalidFiltersError";
  }
}
