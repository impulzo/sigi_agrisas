# Spec: token-management

## Purpose

Define the generation, delivery, refresh, and verification of JWT access and refresh tokens used for stateless authentication.

---

## Requirements

### Requirement: Access token generation
The system SHALL generate a signed JWT access token upon successful authentication. The token MUST include the user's id and email as claims, be signed with HS256 using `JWT_ACCESS_SECRET`, and expire in 15 minutes.

#### Scenario: Token contains required claims
- **WHEN** an access token is generated for a user
- **THEN** the decoded payload SHALL contain `sub` (user id), `email`, and `exp` fields

#### Scenario: Token expires after 15 minutes
- **WHEN** an access token is generated
- **THEN** the `exp` claim SHALL be set to current time + 900 seconds

---

### Requirement: Refresh token generation
The system SHALL generate a refresh token signed with `JWT_REFRESH_SECRET` with a TTL of 7 days, delivered via HttpOnly cookie to prevent XSS access.

#### Scenario: Refresh token is set as HttpOnly cookie
- **WHEN** a user successfully logs in
- **THEN** the response SHALL set a cookie named `refreshToken` with `HttpOnly`, `SameSite=Strict`, and `Max-Age=604800`

---

### Requirement: Token refresh
The system SHALL allow a client to obtain a new access token by presenting a valid refresh token cookie, without requiring re-authentication.

#### Scenario: Successful token refresh
- **WHEN** a POST request is sent to `/api/auth/refresh` with a valid `refreshToken` cookie
- **THEN** the system returns HTTP 200 with a new access token in the response body

#### Scenario: Expired refresh token
- **WHEN** a POST request is sent to `/api/auth/refresh` with an expired `refreshToken` cookie
- **THEN** the system returns HTTP 401 with error message "Refresh token expired"

#### Scenario: Invalid refresh token
- **WHEN** a POST request is sent to `/api/auth/refresh` with a tampered or missing `refreshToken` cookie
- **THEN** the system returns HTTP 401 with error message "Invalid refresh token"

---

### Requirement: Token verification
The system SHALL expose a pure function that verifies and decodes a JWT access token, returning the claims or throwing an error if invalid or expired.

#### Scenario: Valid token verification
- **WHEN** a valid, non-expired access token is passed to the verification function
- **THEN** the function SHALL return the decoded payload without throwing

#### Scenario: Invalid token verification
- **WHEN** a tampered or expired access token is passed to the verification function
- **THEN** the function SHALL throw a typed error indicating the reason
