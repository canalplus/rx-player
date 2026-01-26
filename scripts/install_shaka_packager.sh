#!/bin/bash

# Document how to use this script and what it is for
help() {
  cat <<EOF
install_shaka_packager.sh
-------------------------

This script tries to load locally the shaka-packager (as ./tmp/shaka-packager)
compatible with the current platorm (e.g. MacOS ARM, Linux x86_64 etc.).

If a compatible binary is found, it loads it, adds executable permissions to
it and exit with exit code \`0\`.

If any detected error happens, including:
-  No shaka-packager is found for the current platform
-  We're unable to determine the current platform
-  Loading the binary failed
-  A necessary dependency isn't found (e.g. \`curl\`. Hope you have curl!)
-  Any of the called command failed

This script will output a descriptive message about the problem to \`stderr\`,
invite the user to install the binary manually and exit with a non-zero exit
code.

Usage: $0 <OPTIONS>

Options:

  --no-confirmation       If set, this script will never ask for confirmation and
                          just validate all prompts.
                          Intended for automated scripts.
  -h, --help              Show this help message and exit
EOF
}

# Exit on error, undefined variable and error in pipes
set -euo pipefail

# Default value for the `NO_CONFIRM` option, allowing to bypass confirmation
# prompts, e.g. when calling this script from some other automated script.
NO_CONFIRM=false

# Parse command line options
while [[ $# -gt 0 ]]; do
  case $1 in
  --no-confirmation)
    NO_CONFIRM=true
    ;;
  -h|--help) help; exit 0;;
  *) echo "Unknown option: $1"; help; exit 1 ;;
  esac
  shift
done

# As written below, I hardcode for now a specific version's URL.
# This way we know the API is compatible to what we expect, and this script is
# easier to write.
# Shaka-packager does not seem to release very often so that doesn't seem that
# much of a problem.
PACKAGER_LINUX_ARM64_BIN="https://github.com/shaka-project/shaka-packager/releases/download/v3.4.2/packager-linux-arm64"
PACKAGER_LINUX_X64_BIN="https://github.com/shaka-project/shaka-packager/releases/download/v3.4.2/packager-linux-x64"
PACKAGER_OSX_ARM64_BIN="https://github.com/shaka-project/shaka-packager/releases/download/v3.4.2/packager-osx-arm64"
PACKAGER_OSX_X64_BIN="https://github.com/shaka-project/shaka-packager/releases/download/v3.4.2/packager-osx-x64"
PACKAGER_WIN_X64_BIN="https://github.com/shaka-project/shaka-packager/releases/download/v3.4.2/packager-win-x64.exe"
TMP_DIR="$(
  cd "$(dirname $0)/.."
  pwd
)/tmp"

# Log a line to stderr, prefixing it with the name of this script
err() {
  echo "ERROR: $1" >&2
  echo ""
  echo "Please install the shaka-packager manually" >&2
  exit 1
}

# Checks that the command in argument exists, exits after printing the issue to
# stderr if that's not the case
requires_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
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

echo ""
echo "This script will install the shaka-packager locally in the following directory:"
echo "$TMP_DIR"
echo ""

requires_cmd curl
requires_cmd uname

# NOTE: `uname` is POSIX and should be supported on all Linux and OSX devices
ostype="$(uname -s)"
cpuarch="$(uname -m)"

if [ "$ostype" = Linux ]; then
  if [ "$(uname -o)" = Android ]; then
    err "Unhandled OS type (Android), please install the shaka-packager manually"
  fi
fi

if [ "$ostype" = Darwin ] && [ "$cpuarch" = i386 ]; then
  # Darwin `uname -m` lies
  if sysctl hw.optional.x86_64 | grep -q ': 1'; then
    cpuarch=x86_64
  fi
fi

case "$ostype" in
Linux) ;;
Darwin) ;;
MINGW* | MSYS* | CYGWIN* | Windows_NT)
  ostype=Windows
  ;;
*)
  err "Unhandled OS type ($ostype), please install the shaka-packager manually"
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
  err "Unhandled CPU type ($cpuarch), please install the shaka-packager manually"
  ;;
esac

# We might need to detect which build is available. Targeting version 3.4.2 is
# good enough for now
if [ "${ostype}" = Darwin ]; then
  if [ "${cpuarch}" = aarch64 ]; then
    echo "Architecture detected -> MacOS ARM"
    packager_url="$PACKAGER_OSX_ARM64_BIN"
  else
    echo "Architecture detected -> MacOS x86_64"
    packager_url="$PACKAGER_OSX_X64_BIN"
  fi
elif [ "${ostype}" = Linux ]; then
  if [ "${cpuarch}" = aarch64 ]; then
    echo "Architecture detected -> Linux ARM"
    packager_url="$PACKAGER_LINUX_ARM64_BIN"
  else
    echo "Architecture detected -> Linux x86_64"
    packager_url="$PACKAGER_LINUX_X64_BIN"
  fi
elif [ "${ostype}" = Windows ]; then
  if [ "${cpuarch}" != x86_64 ]; then
    err "For Windows, only x86_64 is supported by our auto-install script."
  fi
  echo "Architecture detected -> Windows x86_64"
  packager_url=$PACKAGER_WIN_X64_BIN
fi

echo ""
echo "We will load the following binary and add executable rights to it:"
echo "$packager_url"
if [ "$NO_CONFIRM" = false ]; then
  echo -n "Do you want to continue? (y/N): "
  if read -r response; then
    if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ && ! "$response" =~ ^[Yy]$ ]]; then
      echo "Cancelled."
      exit 1
    fi
  else
    echo ""
    echo "Cancelled."
    exit 1
  fi
fi

ensure mkdir -p "$TMP_DIR"

echo "Fetching shaka-packager..."
ensure curl -L "$packager_url" -o "$TMP_DIR"/shaka-packager

if ! [ -f "$TMP_DIR"/shaka-packager ]; then
  err "Could not load the shaka-packager: loaded file not found"
fi

ensure chmod +x "$TMP_DIR"/shaka-packager

echo "The shaka-packager has been locally installed"
echo "Exiting the current script with success!"
