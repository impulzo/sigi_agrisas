## MODIFIED Requirements

### Requirement: User identity propagation
The middleware SHALL extract the authenticated user's claims from the token and forward them to downstream route handlers via custom request headers, so route handlers do not need to re-verify the token. The middleware SHALL set `x-user-id`, `x-user-email`, `x-user-roles` (comma-separated list of role names from the verified token's `roles` claim, empty string if the claim is absent), and `x-user-branch-id` (the verified token's `branchId` claim as a string, or empty string when the claim is `null` or absent).

#### Scenario: User id forwarded in header
- **WHEN** a request passes middleware validation
- **THEN** the middleware SHALL set `x-user-id` and `x-user-email` headers on the forwarded request using the claims from the verified token

#### Scenario: Roles forwarded in header
- **WHEN** a request passes middleware validation with a token containing `roles: ["operator", "viewer"]`
- **THEN** the middleware SHALL set `x-user-roles: "operator,viewer"` on the forwarded request

#### Scenario: Roles header empty when claim is absent
- **WHEN** a request passes middleware validation with a token that has no `roles` claim (legacy token)
- **THEN** the middleware SHALL set `x-user-roles: ""` on the forwarded request

#### Scenario: Branch id forwarded in header
- **WHEN** a request passes middleware validation with a token containing `branchId: "b1-uuid"`
- **THEN** the middleware SHALL set `x-user-branch-id: "b1-uuid"` on the forwarded request

#### Scenario: Branch id header empty when claim is null
- **WHEN** a request passes middleware validation with a token containing `branchId: null` (admin user without an assigned branch)
- **THEN** the middleware SHALL set `x-user-branch-id: ""` on the forwarded request

#### Scenario: Branch id header empty when claim is absent (legacy token)
- **WHEN** a request passes middleware validation with a token that has no `branchId` claim
- **THEN** the middleware SHALL set `x-user-branch-id: ""` on the forwarded request

---

## ADDED Requirements

### Requirement: Branch scoping is the route handler's responsibility
The middleware SHALL NOT compare `x-user-branch-id` against any path parameter or body field. Branch-level authorization is the responsibility of each route handler (or its controller). The middleware only PROPAGATES the identity claims; the handlers DECIDE whether the resource being accessed is in the user's branch.

The official pattern that handlers SHALL follow is:

1. Resolve the resource's `branchId` (from path param, request body, or by loading the persisted resource first).
2. Call `authz.userCan(userId, "branches:access_all")`.
3. If `false`, compare `resourceBranchId` against the `x-user-branch-id` header; on mismatch (including the case where the header is empty) return HTTP 403 `{ "error": "Forbidden", "required": "branches:access_all" }`.

Handlers that LIST resources without a specific `branchId` (e.g. `GET /api/v1/admin/sales` without `?branchId=`) SHALL implicitly scope the query to `x-user-branch-id` for callers without `branches:access_all`. If the header is empty and the caller lacks the bypass, the handler SHALL return HTTP 403.

#### Scenario: Middleware does not block based on branch
- **WHEN** a request to `/api/v1/admin/branches/<otherBranchId>/inventory` carries a valid token with `branchId: "different"` and `roles: ["operator"]`
- **THEN** the middleware SHALL set `x-user-branch-id: "different"` and pass the request through to the handler; the 403 (if any) is emitted by the handler, not by the middleware

#### Scenario: Public routes ignore branch header
- **WHEN** a request reaches a public route such as `/api/v1/auth/login`
- **THEN** the middleware SHALL NOT set `x-user-branch-id` (there is no token to read it from)
