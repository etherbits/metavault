# Metavault: Self-Hostable digital content management library

MetaVault is a multi-user, API-first personal media library for tracking the things you watch, read, and play. It pulls from multiple sources through a unified data layer, supports AI-powered interactions, and lets you organize your collection with statuses, custom collections, and shareable lists — all built on a fast, lightweight stack.

## Setup

To install dependencies:

```bash
bun install
```

To run locally:

```bash
bun dev
```

To run tests:

```bash
bun test:unit
bun test:e2e
```

## Tech Stack

| Technology                                                             | Role                              | Why over alternatives                                                                        |
| ---------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| [Bun](https://bun.sh)                                                  | Runtime, package manager, bundler | All-in-one replacement for Node + npm + esbuild; significantly faster installs and test runs |
| [TypeScript](https://www.typescriptlang.org)                           | Language                          | Static typing across the full stack from a single language                                   |
| [React 19](https://react.dev)                                          | UI framework                      | Largest ecosystem, stable concurrent features, broad team familiarity vs Vue/Svelte          |
| [Tailwind CSS v4](https://tailwindcss.com)                             | Styling                           | Utility-first keeps styles co-located with markup; v4 drops config files entirely            |
| [shadcn/ui](https://ui.shadcn.com) + [Radix](https://www.radix-ui.com) | UI components                     | Unstyled, accessible primitives you own — no library lock-in vs MUI/Ant Design               |
| [Express 5](https://expressjs.com)                                     | HTTP server                       | Mature, minimal, well-understood; v5 improves async handler error propagation                |
| [Pino](https://getpino.io)                                             | Logging                           | Fastest Node-compatible logger with structured JSON output vs Winston                        |
| [Bun SQLite](https://bun.sh/docs/api/sqlite)                           | Database                          | Zero-config, embedded, no separate process; ideal for simple self-hosted deployments         |
| [Zod](https://zod.dev)                                                 | Validation                        | Runtime schema validation that shares types with TypeScript                                  |
| [Biome](https://biomejs.dev)                                           | Linting & formatting              | Single fast tool replacing ESLint + Prettier with near-zero config                           |
| [Playwright](https://playwright.dev)                                   | E2E testing                       | Cross-browser, reliable auto-waiting vs Cypress                                              |
| [Docker](https://www.docker.com) + [nginx](https://nginx.org)          | Containerisation & serving        | Portable self-hosting across any OS; nginx proxies API and serves static assets              |
| [GitHub Actions](https://github.com/features/actions)                  | CI/CD                             | Native to the repo; free for public projects                                                 |

## Scripts

| Command          | Description                      |
| ---------------- | -------------------------------- |
| `bun lint`       | Check for lint errors            |
| `bun lint:fix`   | Auto-fix lint errors             |
| `bun format`     | Format all source files          |
| `bun type-check` | Type-check server and web client |
| `bun test:unit`  | Run unit tests                   |
| `bun test:e2e`   | Run end-to-end tests             |
| `bun db:seed`    | Seed the database                |
| `bun db:reset`   | Reset the database               |

## Testing

### Test types

**Unit tests** (`tests/unit-tests/`) cover isolated logic — pure functions, utilities, and data transformations. Run with `bun test:unit`.

**E2E tests** (`tests/e2e/`) use Playwright to test the full application through the browser. Playwright automatically starts the server before the suite runs. Run with `bun test:e2e`.

**Rust tests** (`packages/ezq/`) are co-located with their modules using `#[cfg(test)]`. Run with `cargo test` inside `packages/ezq/`.

### Guidelines

- Every major user-facing feature should have at least one E2E test covering its happy path.
- Non-trivial logic (parsers, matchers, data transformations) should have unit tests covering both expected behavior and edge cases.
- API endpoints should be covered by E2E or integration tests — don't test them only through the UI.
- Rust functions with meaningful logic should have inline unit tests; use doc-tests for public API examples.
- Avoid testing implementation details. Test behavior and outcomes, not internal state.

## CI/CD

All checks run on every push and pull request to `main`. Docker images are published to GHCR only on a direct push to `main` after all jobs pass.

| Job          | What it does                                                                |
| ------------ | --------------------------------------------------------------------------- |
| `lint`       | Runs Biome lint across the entire repo                                      |
| `unit-tests` | Runs `bun test` against `tests/unit-tests/`                                 |
| `e2e`        | Starts the server and runs Playwright tests                                 |
| `build`      | Builds the web client to verify the production bundle compiles              |
| `type-check` | Runs `tsc --noEmit` for both `packages/server` and `packages/web-client`    |
| `ezq`        | Runs `cargo fmt --check` and `cargo test` for the Rust `packages/ezq` crate |
| `publish`    | Builds and pushes multi-arch Docker images to GHCR (main branch only)       |

Deployment is handled by Coolify via its GitHub App integration — it picks up new images automatically after `publish` completes.

## Self-Hosting

Metavault can be self-hosted on any OS that supports Docker (Linux, macOS, Windows)

### Option 1: Pre-built images (recommended)

Just download the compose file and run it:

```bash
curl -O https://raw.githubusercontent.com/Etherbits/metavault/main/docker-compose.ghcr.yml
docker compose -f docker-compose.ghcr.yml up -d
```

### Option 2: Build from source

Clone the repo and run the docker-compose.prod.yml

```bash
git clone https://github.com/Etherbits/metavault.git
cd metavault
docker compose -f docker-compose.prod.yml up -d
```

After this, you should be able to access the web app
