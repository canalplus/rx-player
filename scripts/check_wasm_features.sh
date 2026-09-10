#!/bin/bash

# Validate the instructions in the final DASH parser WebAssembly artifact.
# Its supported feature contract is WebAssembly MVP plus bulk-memory operations.

set -euo pipefail

help() {
  cat <<EOF
check_wasm_features.sh
----------------------

Validate that a WebAssembly file only uses MVP instructions and bulk-memory
operations.

Usage: $0 [WASM_FILE]

WASM_FILE defaults to dist/mpd-parser.wasm.
EOF
}

if [[ ${1:-} = "-h" || ${1:-} = "--help" ]]; then
  help
  exit 0
elif [[ $# -gt 1 ]]; then
  help >&2
  exit 1
fi

wasm_file="${1:-dist/mpd-parser.wasm}"
if [[ ! -f $wasm_file ]]; then
  echo "Error: WebAssembly file not found: $wasm_file" >&2
  exit 1
fi

if [[ -x tmp/binaryen/bin/wasm-opt ]]; then
  wasm_opt=tmp/binaryen/bin/wasm-opt
elif wasm_opt_path="$(command -v wasm-opt)" && [[ -n $wasm_opt_path ]]; then
  wasm_opt="$wasm_opt_path"
else
  echo "Error: wasm-opt is required to validate $wasm_file" >&2
  exit 1
fi

# Rust and LLVM emit a target_features custom section. Strip that declaration
# before validating the output so that it cannot enable features outside this
# allowlist. This pass changes metadata only, not executable instructions.
"$wasm_opt" "$wasm_file" \
  --strip-target-features \
  --mvp-features \
  --enable-bulk-memory \
  --enable-bulk-memory-opt \
  -o /dev/null

echo "Validated $wasm_file: WebAssembly MVP + bulk memory"
