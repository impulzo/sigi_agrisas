## ADDED Requirements

### Requirement: User registration
The system SHALL allow a new user to register with email and password. The password MUST be hashed before storing. The system SHALL reject registration if the email is already in use.

#### Scenario: Successful registration
- **WHEN** a POST request is sent to `/api/auth/register` with a valid email and password (min 8 chars)
- **THEN** the system returns HTTP 201 with the created user's id and email (no password)

#### Scenario: Duplicate email registration
- **WHEN** a POST request is sent to `/api/auth/register` with an email already registered
- **THEN** the system returns HTTP 409 with error message "Email already in use"

#### Scenario: Invalid email format
- **WHEN** a POST request is sent to `/api/auth/register` with a malformed email
- **THEN** the system returns HTTP 400 with a validation error describing the field

#### Scenario: Password too short
- **WHEN** a POST request is sent to `/api/auth/register` with a password shorter than 8 characters
- **THEN** the system returns HTTP 400 with a validation error describing the minimum length

---

### Requirement: User login
The system SHALL authenticate a user with email and password and return an access token and a refresh token. Failed attempts MUST return a generic error that does not reveal which field is wrong.

#### Scenario: Successful login
- **WHEN** a POST request is sent to `/api/auth/login` with correct email and password
- **THEN** the system returns HTTP 200 with an access token in the response body and sets a `refreshToken` HttpOnly cookie

#### Scenario: Wrong password
- **WHEN** a POST request is sent to `/api/auth/login` with a correct email but wrong password
- **THEN** the system returns HTTP 401 with error message "Invalid credentials"

#### Scenario: Non-existent user
- **WHEN** a POST request is sent to `/api/auth/login` with an email that does not exist
- **THEN** the system returns HTTP 401 with error message "Invalid credentials"

---

### Requirement: User logout
The system SHALL allow an authenticated user to invalidate their session by clearing the refresh token cookie.

#### Scenario: Successful logout
- **WHEN** a POST request is sent to `/api/auth/logout` with a valid `refreshToken` cookie
- **THEN** the system returns HTTP 200 and clears the `refreshToken` cookie (Max-Age=0)
