import { Entity } from "@/shared/domain/Entity";

export interface PermissionProps {
  key: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Permission extends Entity<string> {
  private readonly _props: PermissionProps;

  private constructor(id: string, props: PermissionProps) {
    super(id);
    this._props = props;
  }

  static create(id: string, props: PermissionProps): Permission {
    return new Permission(id, props);
  }

  get key(): string { return this._props.key; }
  get description(): string | undefined { return this._props.description; }
  get createdAt(): Date { return this._props.createdAt; }
  get updatedAt(): Date { return this._props.updatedAt; }
}
