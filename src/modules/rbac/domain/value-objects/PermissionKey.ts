import { ValueObject } from "@/shared/domain/ValueObject";
import { InvalidPermissionKeyError } from "@/modules/rbac/domain/errors/InvalidPermissionKeyError";

const PERMISSION_KEY_REGEX = /^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$/;

export class PermissionKey extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): PermissionKey {
    if (!PERMISSION_KEY_REGEX.test(value)) {
      throw new InvalidPermissionKeyError(value);
    }
    return new PermissionKey(value);
  }
}
