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
bun dev
```

## Scripts

| Command | Description |
|---|---|
| `bun lint` | Check for lint errors |
| `bun lint:fix` | Auto-fix lint errors |
| `bun format` | Format all source files |
| `bun test:unit` | Run unit tests |
| `bun test:e2e` | Run end-to-end tests |
| `bun db:seed` | Seed the database |
| `bun db:reset` | Reset the database |

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
