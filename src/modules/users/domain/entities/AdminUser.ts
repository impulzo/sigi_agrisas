export interface AdminUserProps {
  name?: string;
  email: string;
  avatarUrl: string;
  branchId: string | null;
  branchName: string | null;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class AdminUser {
  readonly id: string;
  readonly name?: string;
  readonly email: string;
  readonly avatarUrl: string;
  readonly branchId: string | null;
  readonly branchName: string | null;
  readonly roles: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(id: string, props: AdminUserProps) {
    this.id = id;
    this.name = props.name;
    this.email = props.email;
    this.avatarUrl = props.avatarUrl;
    this.branchId = props.branchId;
    this.branchName = props.branchName;
    this.roles = props.roles;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(id: string, props: AdminUserProps): AdminUser {
    return new AdminUser(id, props);
  }
}
