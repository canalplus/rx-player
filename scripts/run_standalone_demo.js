#!/usr/bin/env node
/* eslint-env node */

/**
 * Run the standalone demo server
 * ==============================
 *
 * This script allows to build the standalone demo locally and start both an
 * HTTP and an HTTPS (only if a certificate and key have been generated) server
 * to serve it, on the port 8001 and 8444 respectively.
 *
 * You can run it as a script through `node run_standalone_demo.js`.
 * Be aware that this demo will be built again every time one of the library
 * file is updated.
 */

const path = require("path");
const launchStaticServer = require("./launch_static_server");

require("./generate_standalone_demo");

launchStaticServer(path.join(__dirname, "../demo/standalone/"), {
  certificatePath: path.join(__dirname, "../localhost.crt"),
  keyPath: path.join(__dirname, "../localhost.key"),
  verbose: true,
  httpPort: 8001,
  httpsPort: 8444,
});
