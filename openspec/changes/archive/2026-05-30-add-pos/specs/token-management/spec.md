## MODIFIED Requirements

### Requirement: Access token generation
The system SHALL generate a signed JWT access token upon successful authentication. The token MUST include the user's id and email as claims, MUST include a `roles` claim with the array of role names assigned to the user at the moment of token emission, MUST include a `branchId` claim with the user's assigned branch id (or `null` when the user has no assigned branch — typical for admins), MUST be signed with HS256 using `JWT_ACCESS_SECRET`, and MUST expire in 15 minutes. Permissions are NOT included in the token; they are evaluated server-side via `AuthorizationService`.

#### Scenario: Token contains required claims
- **WHEN** an access token is generated for a user
- **THEN** the decoded payload SHALL contain `sub` (user id), `email`, `roles` (string array, possibly empty), `branchId` (string or `null`), and `exp` fields

#### Scenario: Token expires after 15 minutes
- **WHEN** an access token is generated
- **THEN** the `exp` claim SHALL be set to current time + 900 seconds

#### Scenario: Token reflects roles at emission time
- **WHEN** a user with roles `["viewer", "operator"]` logs in
- **THEN** the decoded payload SHALL contain `roles: ["viewer", "operator"]`

#### Scenario: Token reflects branchId at emission time
- **WHEN** a user assigned to branch `"b1-uuid"` logs in
- **THEN** the decoded payload SHALL contain `branchId: "b1-uuid"`

#### Scenario: Token branchId is null for unassigned users
- **WHEN** an admin user with no assigned branch logs in
- **THEN** the decoded payload SHALL contain `branchId: null`

---

### Requirement: Refresh token generation
The system SHALL generate a refresh token signed with `JWT_REFRESH_SECRET` with a TTL of 7 days, delivered via HttpOnly cookie to prevent XSS access. The refresh token MUST also include the `branchId` claim so that the access token reissued from a refresh operation can carry the branch identity without a database lookup.

#### Scenario: Refresh token is set as HttpOnly cookie
- **WHEN** a user successfully logs in
- **THEN** the response SHALL set a cookie named `refreshToken` with `HttpOnly`, `SameSite=Strict`, and `Max-Age=604800`

#### Scenario: Refresh token includes branchId
- **WHEN** a refresh token is generated for a user assigned to branch `"b1-uuid"`
- **THEN** the decoded payload SHALL contain `branchId: "b1-uuid"`

#### Scenario: Refresh token branchId is null for unassigned users
- **WHEN** a refresh token is generated for an admin without an assigned branch
- **THEN** the decoded payload SHALL contain `branchId: null`

---

### Requirement: Token verification
The system SHALL expose a pure function that verifies and decodes a JWT access token, returning the claims or throwing an error if invalid or expired. The returned `TokenPayload` SHALL always expose `roles: string[]` and `branchId: string | null`, defaulting to an empty array for `roles` and `null` for `branchId` when the respective claims are absent (for backwards compatibility with legacy tokens).

#### Scenario: Valid token verification
- **WHEN** a valid, non-expired access token is passed to the verification function
- **THEN** the function SHALL return the decoded payload `{ sub, email, roles, branchId }` without throwing

#### Scenario: Legacy token without roles claim
- **WHEN** a valid token that pre-dates the roles claim (no `roles` claim) is passed to the verification function
- **THEN** the function SHALL return `roles: []` instead of throwing

#### Scenario: Legacy token without branchId claim
- **WHEN** a valid token that pre-dates this change (no `branchId` claim) is passed to the verification function
- **THEN** the function SHALL return `branchId: null` instead of throwing

#### Scenario: Invalid token verification
- **WHEN** a tampered or expired access token is passed to the verification function
- **THEN** the function SHALL throw a typed error indicating the reason

---

## ADDED Requirements

### Requirement: branchId reassignment requires re-login or refresh to take effect
When an admin changes a user's `branchId` via `PATCH /api/v1/admin/users/:id`, the change SHALL be persisted in the `users` table immediately, but the change SHALL NOT propagate to existing active tokens. The new `branchId` SHALL take effect on the next access token emission via `POST /api/v1/auth/login` or `POST /api/v1/auth/refresh`. Because the refresh token holds the OLD `branchId`, a refresh operation will reissue an access token still carrying the OLD value. To force immediate effect, the user MUST log in again (issuing fresh tokens loaded from the database).

This trade-off is documented; clients requiring immediate effect MAY implement a forced logout flow.

#### Scenario: Branch change takes effect at next login
- **WHEN** an admin sets `branchId = B2` on a user whose current valid access token carries `branchId = B1`, and the user then performs `POST /api/v1/auth/login` with fresh credentials
- **THEN** the newly issued access and refresh tokens SHALL carry `branchId: B2`

#### Scenario: Refresh keeps old branchId until full re-login
- **WHEN** an admin sets `branchId = B2` on a user whose refresh token still carries `branchId = B1`, and the user calls `POST /api/v1/auth/refresh`
- **THEN** the newly issued access token SHALL carry `branchId: B1` (the value from the refresh token), NOT `B2`
