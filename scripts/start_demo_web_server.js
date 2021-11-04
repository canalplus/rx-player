#!/usr/bin/env node
/* eslint-env node */

/**
 * Run the full demo server
 * =========================
 *
 * This script allows to build the full demo locally and start both an HTTP and
 * an HTTPS (only if a certificate and key have been generated) server to serve
 * it, on the port 8000 and 8443 respectively.
 *
 * You can run it as a script through `node start_demo_web_server.js`.
 * Be aware that this demo will be built again every time either one of the
 * full demo file or one of the library file is updated.
 */

const path = require("path");
const fastBuild = require("./fast_demo_build");
const slowBuild = require("./generate_full_demo");
const launchStaticServer = require("./launch_static_server");

const shouldRunFastVersion = process.argv.includes("--fast") ||
                             process.argv.includes("-f");

if (shouldRunFastVersion) {
  fastBuild({ watch: true,
              minify: false,
              production: false });
} else {
  slowBuild({ watch: true,
              minify: false,
              production: false });
}

launchStaticServer(path.join(__dirname, "../demo/full/"),
                   { certificatePath: path.join(__dirname, "../localhost.crt"),
                     keyPath: path.join(__dirname, "../localhost.key"),
                     httpPort: 8000,
                     httpsPort: 8443 });
