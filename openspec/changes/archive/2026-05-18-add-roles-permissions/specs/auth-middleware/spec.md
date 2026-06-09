## MODIFIED Requirements

### Requirement: User identity propagation
The middleware SHALL extract the authenticated user's claims from the token and forward them to downstream route handlers via custom request headers, so route handlers do not need to re-verify the token. In addition to `x-user-id` and `x-user-email`, the middleware SHALL propagate `x-user-roles` containing the comma-separated list of role names from the verified token's `roles` claim (empty string if the claim is absent).

#### Scenario: User id forwarded in header
- **WHEN** a request passes middleware validation
- **THEN** the middleware SHALL set `x-user-id` and `x-user-email` headers on the forwarded request using the claims from the verified token

#### Scenario: Roles forwarded in header
- **WHEN** a request passes middleware validation with a token containing `roles: ["operator", "viewer"]`
- **THEN** the middleware SHALL set `x-user-roles: "operator,viewer"` on the forwarded request

#### Scenario: Roles header empty when claim is absent
- **WHEN** a request passes middleware validation with a token that has no `roles` claim (legacy token)
- **THEN** the middleware SHALL set `x-user-roles: ""` on the forwarded request

---

### Requirement: Public route passthrough
The middleware SHALL explicitly allow public routes to pass through without any token check. The `exactPublicPaths` set SHALL include the versioned auth endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`), the auth page routes (`/auth/login`, `/auth/register`) and `/favicon.ico`. The prefix `/_next/` MUST also remain public. Administrative endpoints under `/api/v1/admin/**` are NOT public — they MUST pass middleware authentication AND be gated by `requirePermission` inside the route handler.

#### Scenario: Versioned login route is public
- **WHEN** a request is made to `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, or `/api/v1/auth/logout`
- **THEN** the middleware SHALL not apply any token validation and SHALL pass the request through

#### Scenario: Auth page routes are public
- **WHEN** a request is made to `/auth/login` or `/auth/register`
- **THEN** the middleware SHALL not apply any token validation and SHALL pass the request through

#### Scenario: Health check is public
- **WHEN** a request is made to `/api/v1/health`
- **THEN** the middleware SHALL pass the request through (health endpoint does not require auth)

#### Scenario: Static assets pass through
- **WHEN** a request is made to Next.js static files (`/_next/**`, `/favicon.ico`)
- **THEN** the middleware SHALL not apply any token validation and SHALL pass the request through

#### Scenario: Admin endpoints require authentication
- **WHEN** a request is made to `/api/v1/admin/roles` without an `Authorization` header
- **THEN** the middleware SHALL return HTTP 401 (the admin prefix is not in the public allowlist)

#### Scenario: Legacy /api/auth/* paths return 404
- **WHEN** a request is made to `/api/auth/login` or any other `/api/auth/*` path
- **THEN** Next.js SHALL return 404 because the legacy folder `app/api/auth/` no longer exists (handlers moved to `/api/v1/auth/*`)
