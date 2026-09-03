## MODIFIED Requirements

### Requirement: User registration
The system SHALL allow creating a new user with name, email and password, but only via an authenticated request from a caller holding `users:write` — there is no public, unauthenticated way to create an account. The password MUST be hashed before storing. The system SHALL reject registration if the email is already in use. The `name` field SHALL be persisted in the database and returned in the response. This endpoint no longer emits an access/refresh token pair for the created user (that behavior was tied to the public self-registration flow); the caller is the authenticated admin/operator performing the creation, not the new user.

Any error not covered by a typed domain error (`EmailAlreadyInUseError`) SHALL be logged server-side and answered with a generic `{ error: "Internal server error" }` (HTTP 500) — the raw exception message SHALL NEVER be reflected in the response body, since this prevents leaking internal configuration state (e.g. a missing seeded role name, missing JWT environment variables) to the caller.

#### Scenario: Successful registration by an authorized caller
- **WHEN** an authenticated caller with `users:write` sends a POST request to `/api/v1/auth/register` with a valid name, email and password (min 8 chars)
- **THEN** the system returns HTTP 201 with `{ user: { id, name, email } }`

#### Scenario: Unauthenticated request rejected
- **WHEN** a POST request is sent to `/api/v1/auth/register` without a valid `Authorization: Bearer` token
- **THEN** the system returns HTTP 401, and no user is created

#### Scenario: Authenticated caller without users:write rejected
- **WHEN** an authenticated caller lacking `users:write` sends a POST request to `/api/v1/auth/register`
- **THEN** the system returns HTTP 403 `{"error":"Forbidden","required":"users:write"}`, and no user is created

#### Scenario: Duplicate email registration
- **WHEN** an authorized caller sends a POST request to `/api/v1/auth/register` with an email already registered
- **THEN** the system returns HTTP 409 with error message "Email already in use"

#### Scenario: Invalid email format
- **WHEN** an authorized caller sends a POST request to `/api/v1/auth/register` with a malformed email
- **THEN** the system returns HTTP 400 with a validation error describing the field

#### Scenario: Password too short
- **WHEN** an authorized caller sends a POST request to `/api/v1/auth/register` with a password shorter than 8 characters
- **THEN** the system returns HTTP 400 with a validation error describing the minimum length

#### Scenario: Missing or empty name
- **WHEN** an authorized caller sends a POST request to `/api/v1/auth/register` with a missing or empty `name` field
- **THEN** the system returns HTTP 400 with a validation error for the name field

#### Scenario: Unexpected internal error does not leak details
- **WHEN** the use case throws an error that is not `EmailAlreadyInUseError`
- **THEN** the system returns HTTP 500 with `{ "error": "Internal server error" }`, and the response body never contains the original exception message
