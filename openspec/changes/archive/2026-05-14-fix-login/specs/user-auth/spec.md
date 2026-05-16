## MODIFIED Requirements

### Requirement: User registration
The system SHALL allow a new user to register with name, email and password. The password MUST be hashed before storing. The system SHALL reject registration if the email is already in use. The `name` field SHALL be persisted in the database and returned in the response.

#### Scenario: Successful registration
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a valid name, email and password (min 8 chars)
- **THEN** the system returns HTTP 201 with the created user's id, name and email (no password)

#### Scenario: Duplicate email registration
- **WHEN** a POST request is sent to `/api/v1/auth/register` with an email already registered
- **THEN** the system returns HTTP 409 with error message "Email already in use"

#### Scenario: Invalid email format
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a malformed email
- **THEN** the system returns HTTP 400 with a validation error describing the field

#### Scenario: Password too short
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a password shorter than 8 characters
- **THEN** the system returns HTTP 400 with a validation error describing the minimum length

#### Scenario: Missing or empty name
- **WHEN** a POST request is sent to `/api/v1/auth/register` with a missing or empty `name` field
- **THEN** the system returns HTTP 400 with a validation error for the name field
