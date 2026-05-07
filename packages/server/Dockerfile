FROM oven/bun:1.3.10

WORKDIR /app

# ARG EZQ_REGISTRY=https://registry.npmjs.org
# RUN printf "@etherbits:registry=${EZQ_REGISTRY}\n" > .npmrc

COPY package.json bun.lock ./
COPY packages/server/package.json ./packages/server/
COPY packages/web-client/package.json ./packages/web-client/
COPY tests/package.json ./tests/

RUN bun install --frozen-lockfile

COPY packages/server/ ./packages/server/

WORKDIR /app/packages/server

EXPOSE 3435
CMD ["bun", "index.ts"]
