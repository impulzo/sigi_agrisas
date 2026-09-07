import { NextRequest } from "next/server";
import { authController } from "@/modules/auth/infrastructure/di/container";

export async function GET(req: NextRequest) {
  return authController.me(req);
}

export async function PATCH(req: NextRequest) {
  return authController.updateMe(req);
}
