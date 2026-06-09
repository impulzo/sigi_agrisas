import { NextRequest, NextResponse } from "next/server";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { rbacContainer } from "@/modules/rbac/infrastructure/di/container";

/**
 * Enforces branch scoping: a caller without `branches:access_all` can only
 * operate on resources whose branchId matches their `x-user-branch-id` header.
 *
 * Returns a 403 NextResponse when scope is violated, null when the caller
 * is authorized to proceed.
 */
export async function enforceBranchScope(
  req: NextRequest,
  resourceBranchId: string,
  authzService: AuthorizationService = rbacContainer.authorizationService
): Promise<NextResponse | null> {
  const userId = req.headers.get("x-user-id") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bypass = await authzService.userCan(userId, "branches:access_all");
  if (bypass) return null;

  const userBranchId = req.headers.get("x-user-branch-id") ?? "";
  if (userBranchId === "" || userBranchId !== resourceBranchId) {
    return NextResponse.json(
      { error: "Forbidden", required: "branches:access_all" },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Resolves an effective branchId for listing endpoints: a caller without
 * `branches:access_all` is implicitly scoped to their own `x-user-branch-id`;
 * a caller with the bypass may pass `?branchId=` to filter, or leave it absent
 * to list across all branches.
 *
 * Returns `{ branchId: string | undefined }` on success or a 403 NextResponse
 * if the caller is unauthorized (e.g. no assigned branch + no bypass).
 */
export async function resolveScopedBranchId(
  req: NextRequest,
  requestedBranchId: string | undefined,
  authzService: AuthorizationService = rbacContainer.authorizationService
): Promise<{ branchId: string | undefined } | NextResponse> {
  const userId = req.headers.get("x-user-id") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bypass = await authzService.userCan(userId, "branches:access_all");
  if (bypass) {
    return { branchId: requestedBranchId };
  }

  const userBranchId = req.headers.get("x-user-branch-id") ?? "";
  if (userBranchId === "") {
    return NextResponse.json(
      { error: "Forbidden", required: "branches:access_all" },
      { status: 403 }
    );
  }

  if (requestedBranchId && requestedBranchId !== userBranchId) {
    return NextResponse.json(
      { error: "Forbidden", required: "branches:access_all" },
      { status: 403 }
    );
  }

  return { branchId: userBranchId };
}
