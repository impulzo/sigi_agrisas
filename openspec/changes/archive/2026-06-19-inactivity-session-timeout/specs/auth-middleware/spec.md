## MODIFIED Requirements

### Requirement: Access token validation
The middleware (`middleware.ts` at the project root) SHALL delegate authentication to `AuthMiddlewareAdapter`, which inspects every incoming request and ensures that protected routes are accessed only with a valid Bearer access token in the `Authorization` header. Public routes are exempt. The 401 `Token expired` response SHALL be the contract used by the client `authFetch` to trigger transparent token refresh; the middleware itself does NOT redirect on 401 for API routes.

#### Scenario: Valid access token allows protected API route
- **WHEN** a request is made to a protected route with a valid Bearer access token in the Authorization header
- **THEN** the middleware SHALL allow the request to proceed to the route handler

#### Scenario: Missing token blocks API route
- **WHEN** a request is made to `/api/v1/**` (excluding public auth endpoints) without an Authorization header
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Unauthorized"}`

#### Scenario: Expired token blocks API route
- **WHEN** a request is made to `/api/v1/**` (excluding public auth endpoints) with an expired access token
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Token expired"}` (the client SHALL intercept this and attempt a single transparent refresh via `/api/v1/auth/refresh`)

#### Scenario: Missing token redirects page route
- **WHEN** a request is made to a private page route without a valid access token
- **THEN** the middleware SHALL redirect to `/auth/login` with HTTP 302 (no `?reason=` query is added by the middleware; the client adds it when it performs a controlled logout)
