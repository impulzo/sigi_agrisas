import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { ListCustomersUseCase } from "@/modules/customers/application/use-cases/ListCustomersUseCase";
import { GetCustomerUseCase } from "@/modules/customers/application/use-cases/GetCustomerUseCase";
import { CreateCustomerUseCase } from "@/modules/customers/application/use-cases/CreateCustomerUseCase";
import { UpdateCustomerUseCase } from "@/modules/customers/application/use-cases/UpdateCustomerUseCase";
import { SoftDeleteCustomerUseCase } from "@/modules/customers/application/use-cases/SoftDeleteCustomerUseCase";
import { CustomerNotFoundError } from "@/modules/customers/domain/errors/CustomerNotFoundError";
import { CustomerCodeAlreadyInUseError } from "@/modules/customers/domain/errors/CustomerCodeAlreadyInUseError";
import { CustomerRfcAlreadyInUseError } from "@/modules/customers/domain/errors/CustomerRfcAlreadyInUseError";

describe("Customers use cases", () => {
  let repo: InMemoryCustomerRepository;

  beforeEach(() => {
    repo = new InMemoryCustomerRepository();
    repo.reset();
  });

  it("crea y lista clientes", async () => {
    await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "Acme",
      rfc: "ACM010101AAA",
    });
    const list = await new ListCustomersUseCase(repo).execute({
      page: 1,
      pageSize: 20,
      includeInactive: false,
    });
    expect(list.total).toBe(1);
    expect(list.items[0].currentBalance).toBe(0);
  });

  it("rechaza código duplicado", async () => {
    await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "A",
      rfc: "ACM010101AAA",
    });
    await expect(
      new CreateCustomerUseCase(repo).execute({
        code: "CLI_001",
        name: "B",
        rfc: "BBB010101AAA",
      })
    ).rejects.toThrow(CustomerCodeAlreadyInUseError);
  });

  it("rechaza RFC duplicado", async () => {
    await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "A",
      rfc: "ACM010101AAA",
    });
    await expect(
      new CreateCustomerUseCase(repo).execute({
        code: "CLI_002",
        name: "B",
        rfc: "ACM010101AAA",
      })
    ).rejects.toThrow(CustomerRfcAlreadyInUseError);
  });

  it("get devuelve el cliente o lanza not found", async () => {
    const created = await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "Acme",
      rfc: "ACM010101AAA",
    });
    const fetched = await new GetCustomerUseCase(repo).execute(created.id);
    expect(fetched.id).toBe(created.id);
    await expect(new GetCustomerUseCase(repo).execute("missing")).rejects.toThrow(
      CustomerNotFoundError
    );
  });

  it("update no permite cambiar code (lo ignora)", async () => {
    const created = await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "Acme",
      rfc: "ACM010101AAA",
    });
    const updated = await new UpdateCustomerUseCase(repo).execute(created.id, {
      name: "Nuevo nombre",
    });
    expect(updated.code).toBe("CLI_001");
    expect(updated.name).toBe("Nuevo nombre");
  });

  it("update con creditLimit nulo lo limpia", async () => {
    const created = await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "A",
      rfc: "ACM010101AAA",
      creditLimit: 5000,
    });
    expect(created.creditLimit).toBe(5000);
    const updated = await new UpdateCustomerUseCase(repo).execute(created.id, {
      creditLimit: null,
    });
    expect(updated.creditLimit).toBeNull();
  });

  it("softDelete marca isActive=false", async () => {
    const created = await new CreateCustomerUseCase(repo).execute({
      code: "CLI_001",
      name: "A",
      rfc: "ACM010101AAA",
    });
    await new SoftDeleteCustomerUseCase(repo).execute(created.id);
    const fetched = await new GetCustomerUseCase(repo).execute(created.id);
    expect(fetched.isActive).toBe(false);
  });
});
