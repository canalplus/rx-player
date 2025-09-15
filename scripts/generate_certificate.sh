#!/bin/bash

# Generate certificate
# ====================
#
# This script allows to create a self-signed ssl certificate easily.
# One of the goal here, is to be able to easily test HTTPS pages.
#
# An HTTPS server can then be created with the use of the generated
# `localhost.crt` certificate and the `localhost.key` key.

openssl req \
  -x509 \
  -out localhost.crt \
  -keyout localhost.key \
  -newkey rsa:2048 \
  -nodes \
  -sha256 \
  -subj "/C=FR/L=Paris/O=CANAL+"
