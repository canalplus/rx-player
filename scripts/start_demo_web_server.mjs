#!/usr/bin/env node
/**
 * Run the demo server
 * =========================
 *
 * This script allows to build the demo locally and start both an HTTP and
 * an HTTPS (only if a certificate and key have been generated) server to serve
 * it, on the port 8000 and 8443 respectively.
 *
 * You can run it as a script through `node start_demo_web_server.mjs`.
 * Be aware that this demo will be built again every time either one of the
 * demo file or one of the library file is updated.
 */

import { join } from "path";
import buildDemo from "./build_demo.mjs";
import projectRootDirectory from "./utils/project_root_directory.mjs";
import launchStaticServer from "./launch_static_server.mjs";

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  displayHelp();
  process.exit(0);
}

const includeWasmParser = process.argv.includes("--include-wasm");
const production = process.argv.includes("--production-mode");
const shouldMinify = process.argv.includes("--minify");

buildDemo({ watch: true, minify: shouldMinify, production, includeWasmParser });

launchStaticServer(join(projectRootDirectory, "demo/"), {
  certificatePath: join(projectRootDirectory, "localhost.crt"),
  keyPath: join(projectRootDirectory, "localhost.key"),
  verbose: true,
  httpPort: 8000,
  httpsPort: 8443,
});

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Usage: node start_demo_web_server.mjs [options]
Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).`,
  );
}
