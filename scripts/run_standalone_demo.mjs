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

import { join } from "path";
import launchStaticServer from "./launch_static_server.mjs";
import generateStandaloneDemo from "./generate_standalone_demo.mjs";
import projectRootDirectory from "./utils/project_root_directory.mjs";

generateStandaloneDemo({
  production: false,
  minify: false,
  reportSize: false,
});
launchStaticServer(join(projectRootDirectory, "demo/standalone/"), {
  certificatePath: join(projectRootDirectory, "localhost.crt"),
  keyPath: join(projectRootDirectory, "localhost.key"),
  verbose: true,
  httpPort: 8001,
  httpsPort: 8444,
});
