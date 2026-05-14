# Spec: database-persistence

## Purpose

Define the data persistence layer: Prisma schema configuration for Supabase Postgres, the initial users table migration, the `UserPrismaRepository` implementation of the `UserRepository` port, and the migration management workflow.

---

## Requirements

### Requirement: Prisma schema and Supabase connection
The system SHALL configure Prisma 5 with a `schema.prisma` that declares the `User` model mapped to the `public.users` table in Supabase Postgres. The datasource MUST use `DATABASE_URL` (PgBouncer port 6543) for runtime queries and `DIRECT_URL` (direct port 5432) for migrations.

#### Scenario: PrismaClient initializes without error
- **WHEN** the application starts with valid `DATABASE_URL` and `DIRECT_URL` env vars
- **THEN** `PrismaClient` connects successfully and is available as a singleton at `src/shared/infrastructure/prisma/client.ts`

#### Scenario: Missing DATABASE_URL fails fast
- **WHEN** the application starts without `DATABASE_URL` defined
- **THEN** the process MUST throw a startup error before accepting any request

---

### Requirement: First migration — create users table
The system SHALL include a Prisma migration that creates the `public.users` table with the following columns: `id` (UUID, PK, default `gen_random_uuid()`), `email` (VARCHAR 255, UNIQUE, NOT NULL), `password_hash` (TEXT, NOT NULL), `created_at` (TIMESTAMPTZ, default `now()`), `updated_at` (TIMESTAMPTZ, default `now()`). An index on `email` MUST be included.

#### Scenario: Migration applies cleanly on empty schema
- **WHEN** `prisma migrate deploy` is run against Supabase with no prior migrations
- **THEN** the `public.users` table is created with all columns, constraints, and the `users_email_idx` index

#### Scenario: Migration is idempotent
- **WHEN** `prisma migrate deploy` is run a second time against the same database
- **THEN** no error is thrown and no duplicate table is created

---

### Requirement: UserPrismaRepository implements UserRepository port
The system SHALL provide `UserPrismaRepository` in `src/modules/auth/infrastructure/repositories/` that implements the `UserRepository` port. It MUST use `PrismaClient` exclusively and map Prisma model fields to the `User` domain entity via `UserMapper`.

#### Scenario: save() persists a new user
- **WHEN** `save(user)` is called with a valid `User` entity
- **THEN** a row is inserted in `public.users` and the method resolves without error

#### Scenario: findByEmail() returns user when found
- **WHEN** `findByEmail(email)` is called with an email that exists in the database
- **THEN** the method returns the corresponding `User` domain entity

#### Scenario: findByEmail() returns null when not found
- **WHEN** `findByEmail(email)` is called with an email that does not exist
- **THEN** the method returns `null`

#### Scenario: findById() returns user when found
- **WHEN** `findById(id)` is called with a valid UUID that exists in the database
- **THEN** the method returns the corresponding `User` domain entity

#### Scenario: Duplicate email throws conflict error
- **WHEN** `save(user)` is called with an email that already exists in `public.users`
- **THEN** the repository catches the Prisma `P2002` unique constraint error and rethrows a domain `EmailAlreadyInUseError`

---

### Requirement: Migration management workflow
The system SHALL document and enforce the migration workflow so schema changes are always tracked as versioned migration files.

#### Scenario: New migration via prisma migrate dev
- **WHEN** a developer runs `prisma migrate dev --name <description>` after editing `schema.prisma`
- **THEN** a new timestamped migration folder is created under `prisma/migrations/` with the generated SQL

#### Scenario: CI applies migrations via prisma migrate deploy
- **WHEN** `prisma migrate deploy` runs in CI against Supabase using `DIRECT_URL`
- **THEN** only unapplied migrations are executed in order, and the `_prisma_migrations` tracking table is updated
