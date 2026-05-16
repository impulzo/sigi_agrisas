# Spec: auth-middleware

## Purpose

Define the behavior of the Next.js middleware responsible for JWT access token verification, protected route enforcement, public route passthrough, and user identity propagation to downstream route handlers.

---

## Requirements

### Requirement: Protected route enforcement
The Next.js middleware SHALL intercept requests to protected routes (any page route not in `exactPublicPaths` and any route prefixed with `/api/v1/` not in the public allowlist) and verify the presence of a valid access token in the `Authorization: Bearer <token>` header. Requests without a valid token MUST be rejected or redirected.

#### Scenario: Valid token grants access
- **WHEN** a request is made to a protected route with a valid Bearer access token in the Authorization header
- **THEN** the middleware SHALL allow the request to proceed to the route handler

#### Scenario: Missing token blocks API route
- **WHEN** a request is made to `/api/v1/**` (excluding public auth endpoints) without an Authorization header
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Unauthorized"}`

#### Scenario: Expired token blocks API route
- **WHEN** a request is made to `/api/v1/**` (excluding public auth endpoints) with an expired access token
- **THEN** the middleware SHALL return HTTP 401 with `{"error": "Token expired"}`

#### Scenario: Missing token redirects page route
- **WHEN** a request is made to a private page route without a valid access token
- **THEN** the middleware SHALL redirect to `/auth/login` with HTTP 302

---

### Requirement: Public route passthrough
The middleware SHALL explicitly allow public routes to pass through without any token check. The `exactPublicPaths` set SHALL include the versioned auth endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`), the auth page routes (`/auth/login`, `/auth/register`) and `/favicon.ico`. The prefix `/_next/` MUST also remain public.

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

#### Scenario: Legacy /api/auth/* paths return 404
- **WHEN** a request is made to `/api/auth/login` or any other `/api/auth/*` path
- **THEN** Next.js SHALL return 404 because the legacy folder `app/api/auth/` no longer exists (handlers moved to `/api/v1/auth/*`)

---

### Requirement: User identity propagation
The middleware SHALL extract the authenticated user's claims from the token and forward them to downstream route handlers via a custom request header, so route handlers do not need to re-verify the token.

#### Scenario: User id forwarded in header
- **WHEN** a request passes middleware validation
- **THEN** the middleware SHALL set `x-user-id` and `x-user-email` headers on the forwarded request using the claims from the verified token
