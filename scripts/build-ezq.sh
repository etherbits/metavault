#!/bin/bash
set -e

patch_pkg() {
  local path="$1" name="$2"
  bun -e "
    import { readFileSync, writeFileSync } from 'node:fs';
    const p = JSON.parse(readFileSync('${path}/package.json', 'utf8'));
    p.name = '${name}';
    p.repository = { type: 'git', url: 'https://github.com/etherbits/metavault' };
    writeFileSync('${path}/package.json', JSON.stringify(p, null, 2) + '\n');
  "
}

wasm-pack build packages/ezq --target nodejs --out-dir out/node --scope etherbits
patch_pkg packages/ezq/out/node @etherbits/ezq-node

wasm-pack build packages/ezq --target bundler --out-dir out/web --scope etherbits
patch_pkg packages/ezq/out/web @etherbits/ezq-web

if [ "${1}" = "--link" ]; then
  echo "linking packages..."

  # Remove already-installed root copies so bun link cannot reuse stale contents.
  rm -rf node_modules/@etherbits/ezq-node
  rm -rf node_modules/@etherbits/ezq-web

  (cd packages/ezq/out/node && bun link)
  (cd packages/ezq/out/web && bun link)
  (bun link --no-save @etherbits/ezq-node)
  (bun link --no-save @etherbits/ezq-web)

  # Remove package module copies so the correct final lib is used locally
  rm -rf packages/server/node_modules/@etherbits/ezq-node
  rm -rf packages/web-client/node_modules/@etherbits/ezq-web

  echo "done. run 'bun dev' in packages/server and packages/web-client to start."
fi
