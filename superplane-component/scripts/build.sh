#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building shared types..."
npm install --prefix shared
npm run build --prefix shared

for dir in list-ecs-tasks deploy-to-gcp get-cloudrun-status; do
  echo "==> Building $dir..."
  LAMBDA="$ROOT/lambdas/$dir"
  cd "$LAMBDA"
  npm install
  npm run build
  rm -rf package function.zip
  mkdir -p package
  cp -r dist/* package/
  cp package.json package/package.json

  # Production deps only (exclude file: shared — bundled below)
  node -e "
    const p=require('./package.json');
    delete p.devDependencies;
    p.dependencies = Object.fromEntries(
      Object.entries(p.dependencies||{}).filter(([k]) => k !== '@superplane/component-shared')
    );
    require('fs').writeFileSync('package/package.json', JSON.stringify(p,null,2));
  "
  (cd package && npm install --omit=dev --no-package-lock)

  mkdir -p package/node_modules/@superplane/component-shared
  cp -r "$ROOT/shared/dist/"* package/node_modules/@superplane/component-shared/
  node -e "
    const p=require('$ROOT/shared/package.json');
    p.main='index.js'; p.types='index.d.ts';
    require('fs').writeFileSync('package/node_modules/@superplane/component-shared/package.json', JSON.stringify(p,null,2));
  "

  (cd package && zip -rq ../function.zip .)
  rm -rf package
  echo "  -> lambdas/$dir/function.zip"
done

echo "Done."
