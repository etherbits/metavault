FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/server/package.json ./packages/server/
COPY packages/web-client/package.json ./packages/web-client/

RUN bun install --frozen-lockfile

COPY packages/server/ ./packages/server/
COPY packages/web-client/ ./packages/web-client/

WORKDIR /app/packages/web-client

EXPOSE 3000
CMD ["bun", "src/index.tsx"]
