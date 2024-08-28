#!/bin/sh

# TODO Documentation

# Log a line to stdout, prefixing it with the name of this script
log() {
  printf 'rx-player > install_rust_toolchain: %s\n' "$1"
}

# Log a line to sterr, prefixing it with the name of this script
err() {
  log "ERROR: $1" >&2
  echo ""
  echo "Please install a rust toolchain (with the \"wasm32-unknown-unknown\" target) and binaryen manually" >&2
  exit 1
}

# Checks that the command in argument exists, exits after printing the issue to
# stderr if that's not the case
requires_cmd() {
  if ! command -v "$1" > /dev/null 2>&1; then
    err "Need '$1' (command not found)"
  fi
}

# Run a command that should never fail. If the command fails execution
# will immediately terminate with an error showing the failing
# command.
ensure() {
  if ! "$@"; then
    err "Command failed: $*"
  fi
}

log "This script will install Rust dependencies locally in the following directory: $(pwd)/tmp"
log "A lot of logs may be produced by this installation, they can mostly be ignored."

requires_cmd curl
requires_cmd tar

ensure mkdir -p tmp

# Install RustUp in tmp directory with the right target
log "Fetching rustup..."
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | CARGO_HOME=./tmp/cargo RUSTUP_HOME=./tmp/rustup RUSTUP_INIT_SKIP_PATH_CHECK=yes sh -s -- --no-modify-path --profile minimal --target wasm32-unknown-unknown -y
if ! [ $? -eq 0 ]; then
  err "Failed to install rustup"
fi

if ! [ -f tmp/cargo/bin/cargo ]; then
  err "Error while installing rustup: Cargo not available in ./tmp/cargo/bin/cargo"
fi

# Should normally not be needed but CI have shown weird results
ensure tmp/cargo/bin/rustup default stable
ensure tmp/cargo/bin/rustup target add wasm32-unknown-unknown

ostype="$(uname -s)"
cpuarch="$(uname -m)"

if [ "$ostype" = Linux ]; then
  if [ "$(uname -o)" = Android ]; then
    err "Unhandled OS type (Android), please install binaryen manually"
  fi
fi

if [ "$ostype" = Darwin ] && [ "$cpuarch" = i386 ]; then
  # Darwin `uname -m` lies
  if sysctl hw.optional.x86_64 | grep -q ': 1'; then
    cpuarch=x86_64
  fi
fi

case "$ostype" in
  Linux)
    ;;
  Darwin)
    ;;
  MINGW* | MSYS* | CYGWIN* | Windows_NT)
    ostype=Windows
    ;;
  *)
    err "Unhandled OS type ($ostype), please install binaryen manually"
    ;;
esac

case "$cpuarch" in
  aarch64 | arm64)
    cpuarch=aarch64
    ;;
  x86_64 | x86-64 | x64 | amd64)
    cpuarch=x86_64
    ;;
  *)
    err "Unhandled CPU type ($cpuarch), please install binaryen manually"
esac

# TODO automatically download last binaryen?
# We might need to detect which build is available. Targeting version 116 is
# good enough for now
if [ "${ostype}" = Darwin ]; then
  if [ "${cpuarch}" = aarch64 ]; then
    log "Architecture detected -> MacOS ARM"
    binaryen_url=https://github.com/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-arm64-macos.tar.gz
  else
    log "Architecture detected -> MacOS x86_64"
    binaryen_url=https://github.com/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-x86_64-macos.tar.gz
  fi
elif [ "${ostype}" = Linux ]; then
  if [ "${cpuarch}" != x86_64 ]; then
    err "For Linux, only x86_64 is supported by our auto-install script. Please install binaryen manually."
  fi
  log "Architecture detected -> Linux x86_64"
  binaryen_url=https://github.com/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-x86_64-linux.tar.gz
elif [ "${ostype}" = Windows ]; then
  if [ "${cpuarch}" != x86_64 ]; then
    err "For Windows, only x86_64 is supported by our auto-install script. Please install binaryen manually."
  fi
  log "Architecture detected -> Windows x86_64"
  binaryen_url=https://github.com/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-x86_64-windows.tar.gz
fi

log "Fetching binaryen 116..."
curl -L $binaryen_url > tmp/binaryen.tar.gz
if ! [ $? -eq 0 ]; then
  err "Failed to fetch binaryen"
fi


cd tmp
ensure tar xzf binaryen.tar.gz

ensure mv binaryen-version_116 binaryen

# TODO I don't know my windows, does that still work as an executable or is it just dumb?
if [ "${ostype}" = Windows ]; then
  ensure cp binaryen/bin/wasm-opt.exe binaryen/bin/wasm-opt
fi

rm binaryen.tar.gz
cd ..

if ! [ -f tmp/binaryen/bin/wasm-opt ]; then
  err "Error after installing binaryen: wasm-opt not available in ./tmp/binaryen/bin/wasm-opt"
fi

log "All Rust dependencies have been installed"
log "Exiting the current script with success!"
