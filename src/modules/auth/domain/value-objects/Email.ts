import { ValueObject } from "@/shared/domain/ValueObject";

export class Email extends ValueObject<string> {
  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!Email.REGEX.test(normalized)) {
      throw new Error(`Invalid email: ${value}`);
    }
    return new Email(normalized);
  }
}
