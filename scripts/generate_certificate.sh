#!/bin/bash

# Document how to use this script and what it is for
help() {
  cat <<EOF
generate_certificate.sh
-----------------------

This script allows to create a self-signed ssl certificate easily.
One of the goal here, is to be able to easily test HTTPS pages.

An HTTPS server can then be created with the use of the generated \`localhost.crt\`
certificate and the \`localhost.key\` key.

Usage: $0 [OPTIONS]

Options:
  -h, --help       Show this help message and exit
EOF
}

# Exit on error, undefined variable and error in pipes
set -euo pipefail

# Check for --help flag
while [[ $# -gt 0 ]]; do
  case "$1" in
  -h|--help) help; exit 0;;
  *) echo "Unknown option: $1"; help; exit 1 ;;
  esac
done

openssl req \
  -x509 \
  -out localhost.crt \
  -keyout localhost.key \
  -newkey rsa:2048 \
  -nodes \
  -sha256 \
  -subj "/C=FR/L=Paris/O=CANAL+"
