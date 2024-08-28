#!/bin/sh

# TODO documentation

print_toolchain_installation_notice() {
  echo ""
  echo ""
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~  RxPlayer building Info  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  echo ""
  echo "   A Rust toolchain is needed to build some components of the RxPlayer."
  echo "   We will thus now install one locally in the following temporary directory:"
  echo "   $(pwd)/tmp "
  echo ""
  echo "   If you intend to develop or build the RxPlayer regularly, you can install rustup or"
  echo "   cargo globally (with the \"wasm32-unknown-unknown\" target) as well as binaryen."
  echo "   Once done, this \"tmp\" directory can be removed."
  echo ""
  echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
  echo ""
  echo ""
}

has_local_cargo=false
has_local_wasmopt=false
has_installed=false

mkdir -p dist

if [ -f tmp/cargo/bin/cargo ]; then
  has_local_cargo=true
elif ! cargo_loc="$(type -p "cargo")" || [[ -z $cargo_loc ]]; then
  echo "WARNING: cargo command not found."
  print_toolchain_installation_notice
  sleep 1
  ./scripts/install_rust_toolchain.sh
  has_local_cargo=true
  has_installed=true
fi

if [ -f tmp/binaryen/bin/wasm-opt ]; then
  has_local_wasmopt=true
elif ! wasmopt_loc="$(type -p "wasm-opt")" || [[ -z $wasmopt_loc ]]; then
  if $has_installed; then
    >&2 echo "Error: did not succeed to install binaryen dependency. Please install it manually."
    exit 1
  fi

  echo "WARNING: wasm-opt command not found."
  print_toolchain_installation_notice
  sleep 1
  ./scripts/install_rust_toolchain.sh
  has_local_wasmopt=true
  has_installed=true
fi

# Move to MPD parser directory
cd ./src/parsers/manifest/dash/wasm-parser
echo " 🦀 Building mpd-parser WebAssembly file with Cargo..."
if $has_local_cargo; then
  echo "NOTE: Relying on local cargo in ./tmp/cargo/bin/cargo"
  . ../../../../../tmp/cargo/env
  ../../../../../tmp/cargo/bin/cargo build --target wasm32-unknown-unknown --release -q
else
  cargo build --target wasm32-unknown-unknown --release -q
fi

echo " 🪚 Optimizing mpd-parser WebAssembly build..."
if $has_local_wasmopt; then
  echo "NOTE: Relying on local wasm-opt in ./tmp/binaryen/bin/wasm-opt"
  ../../../../../tmp/binaryen/bin/wasm-opt target/wasm32-unknown-unknown/release/mpd_node_parser.wasm --signext-lowering --strip-dwarf -O4 -o ../../../../../dist/mpd-parser.wasm
else
  wasm-opt target/wasm32-unknown-unknown/release/mpd_node_parser.wasm --signext-lowering --strip-dwarf -O4 -o ../../../../../dist/mpd-parser.wasm
fi
