## ADDED Requirements

### Requirement: Protected route enforcement
The Next.js middleware SHALL intercept requests to protected routes (under `/dashboard` and any route prefixed with `/api/protected`) and verify the presence of a valid access token in the `Authorization: Bearer <token>` header. Requests without a valid token MUST be rejected or redirected.

#### Scenario: Valid token grants access
- **WHEN** a request is made to a protected route with a valid Bearer access token in the Authorization header
- **THEN** the middleware SHALL allow the request to proceed to the route handler

#### Scenario: Missing token blocks API route
- **WHEN** a request is made to `/api/protected/**` without an Authorization header
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Unauthorized"}`

#### Scenario: Expired token blocks API route
- **WHEN** a request is made to `/api/protected/**` with an expired access token
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Token expired"}`

#### Scenario: Missing token redirects page route
- **WHEN** a request is made to `/dashboard/**` without a valid access token
- **THEN** the middleware SHALL redirect to `/login` with HTTP 302

---

### Requirement: Public route passthrough
The middleware SHALL explicitly allow public routes to pass through without any token check.

#### Scenario: Login route is public
- **WHEN** a request is made to `/api/auth/login`, `/api/auth/register`, or `/api/auth/refresh`
- **THEN** the middleware SHALL not apply any token validation and SHALL pass the request through

#### Scenario: Static assets pass through
- **WHEN** a request is made to Next.js static files (`/_next/**`, `/favicon.ico`)
- **THEN** the middleware SHALL not apply any token validation and SHALL pass the request through

---

### Requirement: User identity propagation
The middleware SHALL extract the authenticated user's claims from the token and forward them to downstream route handlers via a custom request header, so route handlers do not need to re-verify the token.

#### Scenario: User id forwarded in header
- **WHEN** a request passes middleware validation
- **THEN** the middleware SHALL set `x-user-id` and `x-user-email` headers on the forwarded request using the claims from the verified token
