import { NextRequest } from "next/server";
import { DepartmentsController } from "@/modules/departments/infrastructure/http/DepartmentsController";
import { InMemoryDepartmentRepository } from "@/modules/departments/infrastructure/repositories/InMemoryDepartmentRepository";
import { InMemoryProviderRepository } from "@/modules/providers/infrastructure/repositories/InMemoryProviderRepository";
import { ListDepartmentsUseCase } from "@/modules/departments/application/use-cases/ListDepartmentsUseCase";
import { GetDepartmentUseCase } from "@/modules/departments/application/use-cases/GetDepartmentUseCase";
import { CreateDepartmentUseCase } from "@/modules/departments/application/use-cases/CreateDepartmentUseCase";
import { UpdateDepartmentUseCase } from "@/modules/departments/application/use-cases/UpdateDepartmentUseCase";
import { SoftDeleteDepartmentUseCase } from "@/modules/departments/application/use-cases/SoftDeleteDepartmentUseCase";

function buildController(): DepartmentsController {
  const repo = new InMemoryDepartmentRepository();
  const providerRepo = new InMemoryProviderRepository();
  return new DepartmentsController(
    new ListDepartmentsUseCase(repo),
    new GetDepartmentUseCase(repo),
    new CreateDepartmentUseCase(repo, providerRepo),
    new UpdateDepartmentUseCase(repo, providerRepo),
    new SoftDeleteDepartmentUseCase(repo)
  );
}

function listReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/v1/admin/departments");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

describe("DepartmentsController.list — providerId query validation", () => {
  it("returns 200 when providerId is absent", async () => {
    const res = await buildController().list(listReq());
    expect(res.status).toBe(200);
  });

  it("returns 200 when providerId is a valid UUID", async () => {
    const res = await buildController().list(
      listReq({ providerId: "11111111-1111-1111-1111-111111111111" })
    );
    expect(res.status).toBe(200);
  });

  it("returns 400 when providerId is not a valid UUID", async () => {
    const res = await buildController().list(listReq({ providerId: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/providerId/);
  });
});
