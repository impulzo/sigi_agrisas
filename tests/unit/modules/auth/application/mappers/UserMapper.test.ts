import { UserMapper, UserPrismaModel } from "@/modules/auth/application/mappers/UserMapper";
import { User } from "@/modules/auth/domain/entities/User";

const raw: UserPrismaModel = {
  id: "uuid-1",
  email: "test@example.com",
  passwordHash: "$2b$10$somehash",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("UserMapper", () => {
  it("maps Prisma row to domain User", () => {
    const user = UserMapper.toDomain(raw);
    expect(user.id).toBe("uuid-1");
    expect(user.email).toBe("test@example.com");
    expect(user.passwordHash).toBe("$2b$10$somehash");
    expect(user.createdAt).toEqual(new Date("2026-01-01"));
  });

  it("maps domain User to persistence object", () => {
    const user = User.create("uuid-1", {
      email: "test@example.com",
      passwordHash: "$2b$10$somehash",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    });
    const persistence = UserMapper.toPersistence(user);
    expect(persistence.id).toBe("uuid-1");
    expect(persistence.email).toBe("test@example.com");
    expect(persistence.passwordHash).toBe("$2b$10$somehash");
  });
});
