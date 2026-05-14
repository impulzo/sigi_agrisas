import { User } from "@/modules/auth/domain/entities/User";

export interface UserPrismaModel {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserMapper {
  static toDomain(raw: UserPrismaModel): User {
    return User.create(raw.id, {
      email: raw.email,
      passwordHash: raw.passwordHash,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(user: User): Omit<UserPrismaModel, "createdAt" | "updatedAt"> {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
    };
  }
}
