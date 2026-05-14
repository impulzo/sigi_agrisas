import bcrypt from "bcryptjs";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";

const SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
