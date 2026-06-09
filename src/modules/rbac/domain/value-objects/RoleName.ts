import { ValueObject } from "@/shared/domain/ValueObject";
import { InvalidRoleNameError } from "@/modules/rbac/domain/errors/InvalidRoleNameError";

const ROLE_NAME_REGEX = /^[a-z][a-z0-9_]{1,31}$/;

export class RoleName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): RoleName {
    if (!ROLE_NAME_REGEX.test(value)) {
      throw new InvalidRoleNameError(value);
    }
    return new RoleName(value);
  }
}
