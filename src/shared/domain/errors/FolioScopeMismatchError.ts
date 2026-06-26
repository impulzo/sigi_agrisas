import { FolioScope } from "@/shared/domain/types/FolioScope";

export class FolioScopeMismatchError extends Error {
  readonly expected: FolioScope;
  readonly actual: FolioScope;

  constructor(expected: FolioScope, actual: FolioScope) {
    super(`Folio scope mismatch: expected ${expected}, got ${actual}`);
    this.name = "FolioScopeMismatchError";
    this.expected = expected;
    this.actual = actual;
  }
}
