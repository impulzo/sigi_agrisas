import { NextRequest } from "next/server";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { UpdateOwnProfileUseCase } from "@/modules/users/application/use-cases/UpdateOwnProfileUseCase";
import type { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { UserNotFoundError } from "@/modules/auth/domain/errors/UserNotFoundError";
import { SetPasswordEmailSendFailedError } from "@/modules/auth/domain/errors/SetPasswordEmailSendFailedError";
import { __resetRateLimitForTests } from "@/shared/infrastructure/http/rateLimit";

function buildController(sendSetPasswordEmailUseCase: SendSetPasswordEmailUseCase): AuthController {
  return new AuthController(
    {} as RegisterUseCase,
    {} as LoginUseCase,
    {} as RefreshTokenUseCase,
    {} as LogoutUseCase,
    {} as CompletePasswordSetupUseCase,
    {} as GetUserUseCase,
    {} as UpdateOwnProfileUseCase,
    sendSetPasswordEmailUseCase
  );
}

function makeReq(userId: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/send-password-link", {
    method: "POST",
    headers: { "x-user-id": userId },
  });
}

describe("AuthController.sendMyPasswordLink", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("returns 200 with sentTo on success, delegating userId from x-user-id", async () => {
    const execute = jest.fn().mockResolvedValue({ sentTo: "me@example.com" });
    const controller = buildController({ execute } as unknown as SendSetPasswordEmailUseCase);

    const res = await controller.sendMyPasswordLink(makeReq("uid-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sentTo).toBe("me@example.com");
    expect(execute).toHaveBeenCalledWith("uid-1");
  });

  it("returns 404 when the user can't be found", async () => {
    const execute = jest.fn().mockRejectedValue(new UserNotFoundError());
    const controller = buildController({ execute } as unknown as SendSetPasswordEmailUseCase);

    const res = await controller.sendMyPasswordLink(makeReq("uid-missing"));

    expect(res.status).toBe(404);
  });

  it("returns 502 EmailDeliveryFailed when the mailer fails", async () => {
    const execute = jest.fn().mockRejectedValue(new SetPasswordEmailSendFailedError(new Error("smtp down")));
    const controller = buildController({ execute } as unknown as SendSetPasswordEmailUseCase);

    const res = await controller.sendMyPasswordLink(makeReq("uid-1"));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("EmailDeliveryFailed");
  });

  it("returns 429 TooManyRequests on a second request from the same user within the cooldown window", async () => {
    const execute = jest.fn().mockResolvedValue({ sentTo: "me@example.com" });
    const controller = buildController({ execute } as unknown as SendSetPasswordEmailUseCase);

    const first = await controller.sendMyPasswordLink(makeReq("uid-rl"));
    expect(first.status).toBe(200);

    const second = await controller.sendMyPasswordLink(makeReq("uid-rl"));
    const body = await second.json();

    expect(second.status).toBe(429);
    expect(body.error).toBe("TooManyRequests");
    expect(typeof body.retryAfterSeconds).toBe("number");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("does not rate-limit a different user", async () => {
    const execute = jest.fn().mockResolvedValue({ sentTo: "me@example.com" });
    const controller = buildController({ execute } as unknown as SendSetPasswordEmailUseCase);

    await controller.sendMyPasswordLink(makeReq("uid-a"));
    const res = await controller.sendMyPasswordLink(makeReq("uid-b"));

    expect(res.status).toBe(200);
  });
});
