# Metavault: Self-Hostable digital content management library

MetaVault is a multi-user, API-first personal media library for tracking the things you watch, read, and play. It pulls from multiple sources through a unified data layer, supports AI-powered interactions, and lets you organize your collection with statuses, custom collections, and shareable lists — all built on a fast, lightweight stack.

## Features / What it can do

MetaVault is a self-hostable media library for tracking the things you watch, read, and play. In the demo, I show the parts that are working right now:

- Group library entries on the Home page by status, recency, and custom collections.
- Search and modify the library from the Query page using EZQ, the Easy Query language.
- Create, update, search, and delete library entries from the query input.
- Add metadata such as title, media type, status, dates, ratings, and tags.
- Enrich entries from configured source integrations.
- Configure metadata providers such as TMDB, AniList, IGDB, and OpenLibrary.
- Configure AI model profiles and choose which one the assistant should use.
- Ask the assistant questions about the current query and visible query results.
- Export library entries as a zip archive.
- Import exported entries back into the library.

## Demo

[Demo video](https://youtu.be/ETdOzTMx31s)

### Walkthrough

The demo starts on the Home page. Library entries are grouped into sections, including in-progress items, recently added items, and custom collections. From there, I can click `Query More` to open that group in the Query page.

The Query page is the main workspace in MetaVault. EZQ, short for Easy Query, is the central piece here. It lets me search the library, create new entries, update existing ones, delete entries, and run enrichment from a single input.

First, I create a new library entry with the `/c` create action. I can pass the title and any supported metadata, such as the media type. The syntax is intentionally flexible, so I do not have to write every field in its full canonical form. When the query is valid, MetaVault shows the canonical version below the input so I can see exactly what will be run.

After creating the entry, I use enrichment to fill in missing metadata. This is one of the more useful parts of the query flow. If enrichment is used with `/s`, the search action, the enriched result is temporary and is not saved. If it is used with `/c` or `/u`, the create and update actions, the enriched fields are stored on the library entry.

The `#enrich` command can also run with override mode, written as `#enrich:override`. Normal enrichment fills missing fields without replacing what is already there. Override mode replaces existing fields with the values returned by the source integration.

The demo also shows deletion with `/d`. After deleting an entry, the query results update and the removed item disappears from the library.

Full EZQ syntax documentation will be provided in the future.

Next, I open the Integrations page. There are two integration sections: source integrations and AI integrations.

Source integrations are used for metadata enrichment. These are the providers that fill in things like poster images, dates, ratings, and tags. They need to be configured with the required keys or credentials before they can enrich entries.

The AI integrations section controls which model the assistant uses on the Query page. I have two model profiles defined in the demo, and I select my locally running Qwen model for the assistant.

Back on the Query page, I open the assistant. The assistant can see the current query and the current query results, so I can ask about the items on screen without pasting that context into the prompt. In the demo, I ask for a recommendation from the visible movie results, then ask which one fits a scientific mood. The assistant recommends Oppenheimer based on the current result set.

NOTE: This is just the LLM picking the answer from what it knows already, we are working on a more robust recommendations system that will use cosine matching. Once it's done, the LLM will use the endpoint we expose to it to get the recommendations

The last part of the demo shows import and export. Export creates a zip archive with a CSV file for the textual library data and any local images attached to the exported entries. Hosted images are not copied into the archive.

Imported data is treated the same way as data added by hand. That means, for example, that an exported CSV can be edited before importing, then brought back into MetaVault as normal library entries.



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
| `bun test:e2e`   | Run end-to-end tests with a visible browser |
| `bun test:e2e:headless` | Run end-to-end tests headlessly |
| `bun db:seed`    | Seed the database                |
| `bun db:reset`   | Reset the database               |

## Testing

### Test types

**Unit tests** (`tests/unit-tests/`) cover isolated logic — pure functions, utilities, and data transformations. Run with `bun test:unit`.

**E2E tests** (`tests/e2e/`) use Playwright to test the full application through the browser. Playwright automatically starts the server before the suite runs. Run with `bun test:e2e` when you want to watch the browser, or `bun test:e2e:headless` for a quiet local run.

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
