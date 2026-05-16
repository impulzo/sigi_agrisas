import { User } from "@/modules/auth/domain/entities/User";

export interface UserPrismaModel {
  id: string;
  name?: string | null;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  static toDomain(raw: UserPrismaModel): User {
    return User.create(raw.id, {
      name: raw.name ?? undefined,
      email: raw.email,
      passwordHash: raw.passwordHash,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User): Omit<UserPrismaModel, "createdAt" | "updatedAt"> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
    };
  }
}
