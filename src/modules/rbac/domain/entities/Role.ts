import { Entity } from "@/shared/domain/Entity";

export interface RoleProps {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Role extends Entity<string> {
  private readonly _props: RoleProps;

  private constructor(id: string, props: RoleProps) {
    super(id);
    this._props = props;
  }

  static create(id: string, props: RoleProps): Role {
    return new Role(id, props);
  }

  get name(): string { return this._props.name; }
  get description(): string | undefined { return this._props.description; }
  get createdAt(): Date { return this._props.createdAt; }
  get updatedAt(): Date { return this._props.updatedAt; }
}
