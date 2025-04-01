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
 *
 * You can also import this file through ES6 imports.
 */

import { join } from "path";
import { pathToFileURL } from "url";
import buildDemo from "./build_demo.mjs";
import projectRootDirectory from "./utils/project_root_directory.mjs";
import launchStaticServer from "./launch_static_server.mjs";

/**
 * Build the RxPlayer's demo (alongside the RxPlayer's code) and serve it
 * through the configured ports.
 * @param {Object|undefined} [opts] - Various options to configure the build,
 * the launched HTTP/HTTPS server, or both.
 * Provide defaults if not specified (see below).
 * @param {boolean|undefined} [opts.verbose] - If `true` logs will be outputed
 * to stdout/stderr indicate the current status of build and server.
 * Defaults to `false`.
 * @param {boolean|undefined} [opts.minify] - If `true`, the built demo and
 * RxPlayer will be minified to a smaller, less readable, JavaScript file.
 * Defaults to `false`.
 * @param {boolean|undefined} [opts.watch] - If `true`, all built files will be
 * "watched", and as such re-built when/if they're updated.
 * Defaults to `false`.
 * @param {boolean|undefined} [opts.production] - If `true`, the demo and
 * RxPlayer will be built in "production mode" (less runtime assertions).
 * Defaults to `false`.
 * @param {boolean|undefined} [opts.includeWasmParser] - If `true` the
 * WebAssembly MPD parser of the RxPlayer will be used by the demo (if it can be
 * requested).
 * Defaults to `false`.
 * @param {number|undefined} [opts.httpPort] - The port on which the demo will
 * be served on incoming HTTP connections.
 * Defaults to `8000`.
 * @param {number|undefined} [opts.httpsPort] - The port on which the demo will
 * be served on incoming HTTP connections.
 * Defaults to `8443`.
 * @param {string|undefined} [opts.keyPath] - The path to the private key file
 * you want to use for the HTTPS connection.
 * Defaults to `<PROJECT_ROOT>/localhost.key`.
 * @param {string|undefined} [opts.certificatePath] - The path to the
 * certificate file you want to use for the HTTPS connection.
 * Defaults to `<PROJECT_ROOT>/localhost.crt`.
 * @returns {Promise}
 */
export default function startDemoWebServer({
  verbose,
  minify,
  watch,
  production,
  includeWasmParser,
  httpPort,
  httpsPort,
  keyPath,
  certificatePath,
} = {}) {
  return Promise.all([
    buildDemo({
      watch: !!watch,
      minify: !!minify,
      production: !!production,
      includeWasmParser: !!includeWasmParser,
      silent: !verbose,
    }),
    launchStaticServer(join(projectRootDirectory, "demo/"), {
      certificatePath: certificatePath ?? join(projectRootDirectory, "localhost.crt"),
      keyPath: keyPath ?? join(projectRootDirectory, "localhost.key"),
      verbose: !!verbose,
      httpPort: httpPort ?? 8000,
      httpsPort: httpsPort ?? 8443,
    }).listeningPromise,
  ]);
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let singleBuild = false;
  let shouldMinify = false;
  let production = false;
  let silent = false;
  let includeWasmParser = false;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "-1":
      case "--single-build":
        singleBuild = true;
        break;
      case "-m":
      case "--minify":
        shouldMinify = true;
        break;
      case "-p":
      case "--production-mode":
        production = true;
        break;
      case "-s":
      case "--silent":
        silent = true;
        break;
      case "-w":
      case "--include-wasm":
        includeWasmParser = true;
        break;
      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }

  try {
    startDemoWebServer({
      verbose: !silent,
      watch: !singleBuild,
      minify: shouldMinify,
      production,
      includeWasmParser,
    }).catch((err) => {
      console.error(`ERROR: ${err}\n`);
      process.exit(1);
    });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    process.exit(1);
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `start_demo_web_server.mjs: Build the demo and start an HTTP/HTTPS server to serve it.

Usage: node start_demo_web_server.mjs [OPTIONS]

Options:
  -h, --help             Display this help
  -m, --minify           Minify the built demo
  -1, --single-build     Only build a single time (don't watch)
  -s, --silent           Don't log to stdout/stderr when bundling
  -p, --production-mode  Build all files in production mode (less runtime checks, mostly).
  -w, --include-wasm     The demo will be able to request the WebAssembly MPD parser (if available).`,
  );
}
