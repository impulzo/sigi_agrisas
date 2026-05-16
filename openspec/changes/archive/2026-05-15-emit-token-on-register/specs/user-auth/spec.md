## MODIFIED Requirements

### Requirement: User registration
The system SHALL allow a new user to register with email, name, and password. The password MUST be hashed before storing. The system SHALL reject registration if the email is already in use. Upon successful registration, the system SHALL emit an access token and a refresh token, identical to the login flow.

#### Scenario: Successful registration
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a valid name, email and password (min 8 chars)
- **THEN** the system returns HTTP 201 with `{ accessToken, user: { id, name, email } }` and sets a `refreshToken` HttpOnly cookie (7-day TTL, SameSite=Strict)

#### Scenario: Duplicate email registration
- **WHEN** a POST request is sent to `/api/v1/auth/register` with an email already registered
- **THEN** the system returns HTTP 409 with error message "Email already in use"

#### Scenario: Invalid email format
- **WHEN** a POST request is sent to `/api/auth/register` with a malformed email
- **THEN** the system returns HTTP 400 with a validation error describing the field

#### Scenario: Password too short
- **WHEN** a POST request is sent to `/api/auth/register` with a password shorter than 8 characters
- **THEN** the system returns HTTP 400 with a validation error describing the minimum length
