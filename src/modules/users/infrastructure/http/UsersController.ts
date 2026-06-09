import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";
import { BranchNotFoundForUserError } from "@/modules/users/domain/errors/BranchNotFoundForUserError";

const uuidParamSchema = z.string().uuid("Invalid user ID format");

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
});

const updateUserBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    branchId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.email !== undefined ||
      d.avatarUrl !== undefined ||
      d.branchId !== undefined,
    { message: "At least one field (name, email, avatarUrl, branchId) must be provided" }
  );

export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  async listUsers(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = listUsersQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await this.listUsersUseCase.execute(parsed.data);
    return NextResponse.json(result);
  }

  async getUser(_req: NextRequest, id: string): Promise<NextResponse> {
    const parsed = uuidParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const user = await this.getUserUseCase.execute(parsed.data);
      return NextResponse.json(user);
    } catch (err) {
      if (err instanceof UserNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async updateUser(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidParamSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = updateUserBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const requesterId = req.headers.get("x-user-id") ?? "";
    try {
      const user = await this.updateUserUseCase.execute({
        id: idParsed.data,
        requesterId,
        name: parsed.data.name,
        email: parsed.data.email,
        avatarUrl: parsed.data.avatarUrl,
        branchId: parsed.data.branchId,
      });
      return NextResponse.json(user);
    } catch (err) {
      if (err instanceof SelfModificationError) return NextResponse.json({ error: err.message }, { status: 403 });
      if (err instanceof UserNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof EmailAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof BranchNotFoundForUserError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }

  async deleteUser(req: NextRequest, id: string): Promise<NextResponse> {
    const parsed = uuidParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const requesterId = req.headers.get("x-user-id") ?? "";
    try {
      await this.deleteUserUseCase.execute(parsed.data, requesterId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      if (err instanceof SelfModificationError) return NextResponse.json({ error: err.message }, { status: 403 });
      if (err instanceof UserNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
