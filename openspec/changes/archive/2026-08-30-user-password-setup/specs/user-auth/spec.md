## MODIFIED Requirements

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
