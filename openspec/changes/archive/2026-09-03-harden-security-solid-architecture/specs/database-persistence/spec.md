## ADDED Requirements

### Requirement: Raw SQL queries are always parameterized
Any raw SQL executed through Prisma (`$queryRaw`, `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe`, `Prisma.raw`) SHALL NEVER interpolate a value originating from user input (request body, query string, path params, or any other externally-controlled source) directly into the SQL text via string concatenation or template-literal interpolation outside of Prisma's tagged-template parameter binding. Values SHALL always be passed as bound parameters (Prisma tagged-template placeholders, or the positional-parameter array form of `$queryRawUnsafe`/`$executeRawUnsafe`). `Prisma.raw()` — which bypasses parameter binding entirely — SHALL only ever receive a literal string or a value drawn from a closed, hardcoded set defined in the same module (e.g. a `Record<SomeUnionType, string>` lookup of column names), never a value derived from request input.

#### Scenario: Automated guard against unsafe raw SQL
- **WHEN** the test suite runs
- **THEN** a dedicated test scans `src/**/*.ts` for `$queryRawUnsafe`/`$executeRawUnsafe` calls using template-literal interpolation and for `Prisma.raw()` calls whose argument is not a string literal or a reference to a module-level constant, and fails if any such pattern is found

#### Scenario: Existing raw SQL passes the guard
- **WHEN** the guard test runs against the current codebase
- **THEN** it passes — every existing raw-SQL call site already uses tagged-template parameter binding or positional parameters for values, with `Prisma.raw()` limited to literals from closed lookup tables
