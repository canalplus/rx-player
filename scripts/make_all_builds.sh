#!/bin/bash

set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --no-typecheck   Skip TypeScript type-checking
  -h, --help       Show this help message and exit
EOF
  exit 0
}

# Parse flags
NO_TYPECHECK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-typecheck) NO_TYPECHECK=1; shift ;;
    -h|--help)      usage ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

npm run clean:build
npm run build:wasm:release
npm run bundle
npm run bundle:min

if [[ -n "$NO_TYPECHECK" ]]; then
  npm run build -- --no-check
else
  npm run build
fi

# And now the bundle types, that actually just read the ones from our regular builds
echo 'import RxPlayer from "./es2017/index"; export default RxPlayer;' \
  | tee dist/rx-player.d.ts dist/rx-player.min.d.ts >/dev/null
