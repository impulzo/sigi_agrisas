# Spec: user-auth

## Purpose

Define the user-facing authentication flows: registration, login, and logout, including validation rules, error responses, and session management via tokens.

---
## Requirements
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

---

### Requirement: User login
The system SHALL authenticate a user with email and password and return an access token and a refresh token. Failed attempts MUST return a generic error that does not reveal which field is wrong. If the user's account has no password set yet (`passwordHash` is `null` — e.g. an admin-created user who has not completed the password-setup flow), the system SHALL NOT attempt to compare the submitted password against a hash; instead it SHALL return a distinct error indicating the account has no password set, without revealing whether the submitted password itself was correct.

#### Scenario: Successful login
- **WHEN** a POST request is sent to `/api/auth/login` with correct email and password
- **THEN** the system returns HTTP 200 with an access token in the response body and sets a `refreshToken` HttpOnly cookie

#### Scenario: Wrong password
- **WHEN** a POST request is sent to `/api/auth/login` with a correct email but wrong password
- **THEN** the system returns HTTP 401 with error message "Invalid credentials"

#### Scenario: Non-existent user
- **WHEN** a POST request is sent to `/api/auth/login` with an email that does not exist
- **THEN** the system returns HTTP 401 with error message "Invalid credentials"

#### Scenario: Account has no password set
- **WHEN** a POST request is sent to `/api/auth/login` with the email of a user whose `passwordHash` is `null` (never completed the password-setup flow)
- **THEN** the system returns HTTP 403 `{"error": "PasswordNotSet"}` instead of comparing against a hash, and does not authenticate the request

### Requirement: User logout
The system SHALL allow an authenticated user to invalidate their session by clearing the refresh token cookie.

#### Scenario: Successful logout
- **WHEN** a POST request is sent to `/api/auth/logout` with a valid `refreshToken` cookie
- **THEN** the system returns HTTP 200 and clears the `refreshToken` cookie (Max-Age=0)

