const DEBOUNCE_MS = 24 * 60 * 60 * 1000;

export interface CheckAndNotifyLowStockInput {
  newQuantity: number;
  reorderPoint: number;
  lastLowStockNotifiedAt: Date | null;
  notify: () => Promise<void>;
  updateNotifiedAt: () => Promise<void>;
}

export function shouldNotifyLowStock(
  newQuantity: number,
  reorderPoint: number,
  lastLowStockNotifiedAt: Date | null,
  now: Date = new Date()
): boolean {
  if (newQuantity >= reorderPoint) return false;
  if (lastLowStockNotifiedAt === null) return true;
  return now.getTime() - lastLowStockNotifiedAt.getTime() >= DEBOUNCE_MS;
}

export async function checkAndNotifyLowStock(input: CheckAndNotifyLowStockInput): Promise<void> {
  if (!shouldNotifyLowStock(input.newQuantity, input.reorderPoint, input.lastLowStockNotifiedAt)) return;
  await input.notify();
  await input.updateNotifiedAt();
}
