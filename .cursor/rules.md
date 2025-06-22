
# MixContext‑Core · Cursor Rules

_Last updated: 2025-06-21_

## Code Style

1. **TypeScript strict**; no `any`, prefer readonly types.
2. Use functional helpers; avoid classes unless unavoidable.
3. Keep files ≤ 250 LOC; split into helpers otherwise.
4. SPDX header on every source file:
   `// Copyright 2025 MixContext.ai — SPDX-License-Identifier: MIT`

## Architecture

* Pure TS library—no React, no DOM access.
* All parsers under `src/parsers/**`.
* Public API surface limited to the four exports defined in `src/index.ts`.
* Build via **tsup**; tests via **Vitest**.

## Testing

* Every parser must have a fixture in `/fixtures` and a corresponding test under `/tests`.
* New public APIs require unit tests with ≥ 80 % line coverage.

## Commit / PR

* Conventional Commits (`feat:`, `fix:` ...).
* CI must pass `pnpm lint`, `pnpm type-check`, `pnpm test` before merge.
