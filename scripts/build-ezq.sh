#!/bin/bash
set -e

patch_pkg() {
  local path="$1" name="$2"
  bun -e "
    import { readFileSync, writeFileSync } from 'node:fs';
    const p = JSON.parse(readFileSync('${path}/package.json', 'utf8'));
    p.name = '${name}';
    p.repository = { type: 'git', url: 'git+https://github.com/etherbits/metavault.git' };
    writeFileSync('${path}/package.json', JSON.stringify(p, null, 2) + '\n');
  "
}

wasm-pack build packages/ezq --target nodejs --out-dir out/node --scope etherbits
patch_pkg packages/ezq/out/node @etherbits/ezq-node

wasm-pack build packages/ezq --target bundler --out-dir out/web --scope etherbits
patch_pkg packages/ezq/out/web @etherbits/ezq-web

if [ "${1}" = "--link" ]; then
  echo "linking packages..."

  # Link the generated packages directly. `bun link --no-save` can resolve a
  # workspace dependency back to the registry version instead of the local
  # package, which leaves tests running against stale WASM.
  rm -rf node_modules/@etherbits/ezq-node
  rm -rf node_modules/@etherbits/ezq-web
  mkdir -p node_modules/@etherbits
  ln -s "$(pwd)/packages/ezq/out/node" node_modules/@etherbits/ezq-node
  ln -s "$(pwd)/packages/ezq/out/web" node_modules/@etherbits/ezq-web

  # Remove package module copies so the correct final lib is used locally
  rm -rf packages/server/node_modules/@etherbits/ezq-node
  rm -rf packages/web-client/node_modules/@etherbits/ezq-web

  echo "done. run 'bun dev' in packages/server and packages/web-client to start."
fi
