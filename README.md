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

## Self-Hosting

Metavault can be self-hosted on any OS that supports Docker (Linux, macOS, Windows).

### Option 1: Pre-built images (recommended)

No need to clone the repo. Just download the compose file and run it:

```bash
curl -O https://raw.githubusercontent.com/Etherbits/metavault/main/docker-compose.ghcr.yml
docker compose -f docker-compose.ghcr.yml up -d
```

### Option 2: Build from source

```bash
git clone https://github.com/Etherbits/metavault.git
cd metavault
docker compose -f docker-compose.prod.yml up -d
```

The app will be available at `http://your-host:7000`.
