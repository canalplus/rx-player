#!/bin/bash

# Document how to use this script and what it is for
help() {
  cat <<EOF
make_all_builds.sh
------------------

Produce all the RxPlayer builds:
-  Its CommonJS and ES builds in \`dist/commonjs/\` and \`dist/es2017/\` respectively
-  Its minified bundle in \`dist/rx-player.min.js\`
-  Its non-minified bundle in \`dist/rx-player.js\`
-  Its WebAssembly MPD parser in \`mpd-parser.wasm\`

Usage: $0 [OPTIONS]

Options:
  --no-typecheck   Skip TypeScript type-checking
  -h, --help       Show this help message and exit
EOF
}

# Exit on error, undefined variable and error in pipes
set -euo pipefail

# Parse flags
NO_TYPECHECK=""
while [[ $# -gt 0 ]]; do
  case "$1" in
  --no-typecheck) NO_TYPECHECK=1; shift ;;
  -h|--help) help; exit 0;;
  *) echo "Unknown option: $1"; echo ""; help; exit 1 ;;
  esac
done

npm run clean
npm run build:wasm:release
npm run bundle
npm run bundle:min

if [[ -n "$NO_TYPECHECK" ]]; then
  npm run build -- --no-typecheck
else
  npm run build
fi

# And now the bundle types, that actually just read the ones from our regular builds
echo 'import RxPlayer from "./es2017/index"; export default RxPlayer;' \
  | tee dist/rx-player.d.ts dist/rx-player.min.d.ts >/dev/null
