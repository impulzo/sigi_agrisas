export type InventoryScopeMode = "general" | "branch";

/** Lee process.env en cada llamada (no cachear en const de módulo) para que los tests puedan alternar el modo sin recargar módulos. */
export function getInventoryScopeMode(): InventoryScopeMode {
  return process.env.INVENTORY_SCOPE_MODE === "branch" ? "branch" : "general";
}

export function isBranchScopedInventory(): boolean {
  return getInventoryScopeMode() === "branch";
}
