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
 * You can run it as a script through `node start_demo_web_server.mjs`.
 * Be aware that this demo will be built again every time either one of the
 * full demo file or one of the library file is updated.
 */

import path from "path";
import fastBuild from "./fast_demo_build";
import launchStaticServer from "./launch_static_server";

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  displayHelp();
  process.exit(0);
}

const includeWasmParser = process.argv.includes("--include-wasm");
const production = process.argv.includes("--production-mode");
const shouldMinify = process.argv.includes("--minify");

fastBuild({ watch: true,
            minify: shouldMinify,
            production,
           includeWasmParser });

launchStaticServer(path.join(__dirname, "../demo/full/"),
                   { certificatePath: path.join(__dirname, "../localhost.crt"),
                     keyPath: path.join(__dirname, "../localhost.key"),
                     verbose: true,
                     httpPort: 8000,
                     httpsPort: 8443 });

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable no-console */
  console.log(
  /* eslint-disable indent */
`Usage: node start_demo_web_server.mjs [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).`,
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
