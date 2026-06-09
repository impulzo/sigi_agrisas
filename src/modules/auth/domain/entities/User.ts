import { Entity } from "@/shared/domain/Entity";

interface UserProps {
  name?: string;
  email: string;
  passwordHash: string;
  roles: string[];
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User extends Entity<string> {
  private readonly props: UserProps;

  private constructor(id: string, props: UserProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: UserProps): User {
    return new User(id, props);
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get roles(): string[] {
    return this.props.roles;
  }

  get branchId(): string | null {
    return this.props.branchId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
