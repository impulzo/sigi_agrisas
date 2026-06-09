export interface PriorReturnItemInput {
  quantity: number;
  returnStatus: "completed" | "cancelled";
}

export class ReturnableQuantityCalculator {
  static computeRemaining(soldQuantity: number, priorReturnItems: PriorReturnItemInput[]): number {
    if (soldQuantity <= 0) {
      throw new Error("soldQuantity must be > 0");
    }
    const completed = priorReturnItems.filter((r) => r.returnStatus === "completed");
    for (const item of completed) {
      if (item.quantity <= 0) {
        throw new Error("prior return item quantity must be > 0");
      }
    }
    const returned = completed.reduce((sum, r) => sum + r.quantity, 0);
    return soldQuantity - returned;
  }
}
