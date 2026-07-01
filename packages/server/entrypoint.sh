#!/bin/sh
set -e

echo "Running database migrations..."
bun scripts/migrate.ts

echo "Starting server..."
exec bun index.ts
