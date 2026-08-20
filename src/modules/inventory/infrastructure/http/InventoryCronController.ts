import { NextResponse } from "next/server";
import { SendInventoryExpiryNotificationsUseCase } from "../../application/use-cases/SendInventoryExpiryNotificationsUseCase";

export class InventoryCronController {
  constructor(private readonly sendExpiryNotificationsUseCase: SendInventoryExpiryNotificationsUseCase) {}

  async sendExpiryNotifications(): Promise<NextResponse> {
    await this.sendExpiryNotificationsUseCase.execute();
    return NextResponse.json({ success: true });
  }
}
