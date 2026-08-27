import { getInventoryScopeMode, isBranchScopedInventory } from "@/shared/infrastructure/config/inventoryScope";

describe("getInventoryScopeMode", () => {
  const original = process.env.INVENTORY_SCOPE_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.INVENTORY_SCOPE_MODE;
    else process.env.INVENTORY_SCOPE_MODE = original;
  });

  it("returns general when the env var is absent", () => {
    delete process.env.INVENTORY_SCOPE_MODE;
    expect(getInventoryScopeMode()).toBe("general");
    expect(isBranchScopedInventory()).toBe(false);
  });

  it("returns general on an unrecognized value", () => {
    process.env.INVENTORY_SCOPE_MODE = "typo";
    expect(getInventoryScopeMode()).toBe("general");
    expect(isBranchScopedInventory()).toBe(false);
  });

  it("returns branch only on the exact value 'branch'", () => {
    process.env.INVENTORY_SCOPE_MODE = "branch";
    expect(getInventoryScopeMode()).toBe("branch");
    expect(isBranchScopedInventory()).toBe(true);
  });

  it("reads the env var fresh on every call, not cached", () => {
    delete process.env.INVENTORY_SCOPE_MODE;
    expect(getInventoryScopeMode()).toBe("general");
    process.env.INVENTORY_SCOPE_MODE = "branch";
    expect(getInventoryScopeMode()).toBe("branch");
  });
});
