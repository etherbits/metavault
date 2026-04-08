# Metavault: Self-Hostable digital content management library

## setup

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

| Command         | Description             |
| --------------- | ----------------------- |
| `bun lint`      | Check for lint errors   |
| `bun lint:fix`  | Auto-fix lint errors    |
| `bun format`    | Format all source files |
| `bun test:unit` | Run unit tests          |
| `bun test:e2e`  | Run end-to-end tests    |
| `bun db:seed`   | Seed the database       |
| `bun db:reset`  | Reset the database      |

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
