import { ValueObject } from "@/shared/domain/ValueObject";

export class Password extends ValueObject<string> {
  static readonly MIN_LENGTH = 8;

  private constructor(value: string) {
    super(value);
  }

  static create(plainText: string): Password {
    if (plainText.length < Password.MIN_LENGTH) {
      throw new Error(
        `Password must be at least ${Password.MIN_LENGTH} characters`
      );
    }
    return new Password(plainText);
  }

  static fromHash(hash: string): Password {
    return new Password(hash);
  }
}
