FROM oven/bun:1.3.14

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/server/package.json ./packages/server/
COPY packages/web-client/package.json ./packages/web-client/
COPY packages/info-web/package.json ./packages/info-web/
COPY tests/package.json ./tests/

RUN bun install --frozen-lockfile

COPY packages/server/ ./packages/server/

WORKDIR /app/packages/web-client

EXPOSE 3534
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "3534"]
