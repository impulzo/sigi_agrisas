## MODIFIED Requirements

### Requirement: Access token generation
The system SHALL generate a signed JWT access token upon successful authentication. The token MUST include the user's id and email as claims, MUST include a `roles` claim with the array of role names assigned to the user at the moment of token emission, MUST be signed with HS256 using `JWT_ACCESS_SECRET`, and MUST expire in 15 minutes. Permissions are NOT included in the token; they are evaluated server-side via `AuthorizationService`.

#### Scenario: Token contains required claims
- **WHEN** an access token is generated for a user
- **THEN** the decoded payload SHALL contain `sub` (user id), `email`, `roles` (string array, possibly empty), and `exp` fields

#### Scenario: Token expires after 15 minutes
- **WHEN** an access token is generated
- **THEN** the `exp` claim SHALL be set to current time + 900 seconds

#### Scenario: Token reflects roles at emission time
- **WHEN** a user with roles `["viewer", "operator"]` logs in
- **THEN** the decoded payload SHALL contain `roles: ["viewer", "operator"]`

---

### Requirement: Token verification
The system SHALL expose a pure function that verifies and decodes a JWT access token, returning the claims or throwing an error if invalid or expired. The returned `TokenPayload` SHALL always expose `roles: string[]`, defaulting to an empty array if the `roles` claim is absent (for backwards compatibility with legacy tokens).

#### Scenario: Valid token verification
- **WHEN** a valid, non-expired access token is passed to the verification function
- **THEN** the function SHALL return the decoded payload `{ sub, email, roles }` without throwing

#### Scenario: Legacy token without roles claim
- **WHEN** a valid token that pre-dates this change (no `roles` claim) is passed to the verification function
- **THEN** the function SHALL return `{ sub, email, roles: [] }` instead of throwing

#### Scenario: Invalid token verification
- **WHEN** a tampered or expired access token is passed to the verification function
- **THEN** the function SHALL throw a typed error indicating the reason
