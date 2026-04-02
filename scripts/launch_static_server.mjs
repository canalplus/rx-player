#!/usr/bin/env node
/**
 * Launch static server
 * ====================
 *
 * This script allows to start both an HTTP and an HTTPS (only if a certificate
 * path and a key path have been given) static file server.
 */

// @ts-check

import { access, createReadStream, existsSync } from "fs";
import { readFile } from "fs/promises";
import { join, extname, normalize } from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";
import http from "http";
import https from "https";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";

/** @typedef {keyof typeof MIME_TYPES} MimeTypeExtension */
/**
 * @typedef {{
 *   httpPort: number;
 *   httpsPort?: number;
 *   verbose?: boolean;
 *   certificatePath?: string;
 *   keyPath?: string;
 * }} LaunchStaticServerConfig
 *
 * Static server configuration.
 * @property {number} httpPort - Port on which the server will listen for HTTP
 * traffic.
 * @property {number} [httpsPort] - Port on which the server will listen for
 * HTTPS traffic. If not defined, the server won't listen for HTTPS traffic.
 * @property {boolean} [verbose] - If set to `true`, the server outputs when it
 * starts listening and when startup fails.
 * @property {string} [certificatePath] - Path to the TLS certificate used for
 * HTTPS connections. If not defined, the server won't listen for HTTPS traffic.
 * @property {string} [keyPath] - Path to the private key used for HTTPS
 * connections. If not defined, the server won't listen for HTTPS traffic.
 */
/**
 * @typedef {{
 *   ext: string;
 *   stream: import("fs").ReadStream;
 * }} PreparedFile
 *
 * Prepared file response returned by `prepareFile`.
 * @property {string} ext - Lower-cased file extension without the leading dot.
 * @property {import("fs").ReadStream} stream - Stream reading the file content.
 */

const MIME_TYPES = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  wasm: "application/wasm",
  js: "application/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);

  let normalizedPath;
  let certificateFile;
  let keyFile;
  let httpPort;
  let httpsPort;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;

      case "-d":
      case "--directory":
        {
          argOffset++;
          const wantedDirectoryFile = args[argOffset];
          if (wantedDirectoryFile === undefined) {
            console.error("ERROR: no directory file provided\n");
            displayHelp();
            process.exit(1);
          }
          normalizedPath = normalize(wantedDirectoryFile);
          if (!existsSync(normalizedPath)) {
            console.error(`ERROR: root path not found: ${wantedDirectoryFile}\n`);
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "-c":
      case "--certificate":
        {
          argOffset++;
          const wantedCertificateFile = args[argOffset];
          if (wantedCertificateFile === undefined) {
            console.error("ERROR: no certificate file provided\n");
            displayHelp();
            process.exit(1);
          }
          certificateFile = normalize(wantedCertificateFile);
          if (!existsSync(certificateFile)) {
            console.error(
              `ERROR: certificate file not found: ${wantedCertificateFile}\n`,
            );
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "-k":
      case "--key":
        {
          argOffset++;
          const wantedKeyFile = args[argOffset];
          if (wantedKeyFile === undefined) {
            console.error("ERROR: no key file provided\n");
            displayHelp();
            process.exit(1);
          }
          keyFile = normalize(wantedKeyFile);
          if (!existsSync(keyFile)) {
            console.error(`ERROR: key file not found: ${wantedKeyFile}\n`);
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "-p":
      case "-http":
        {
          argOffset++;
          const wantedHttpPort = args[argOffset];
          if (wantedHttpPort === undefined) {
            console.error("ERROR: no http port provided\n");
            displayHelp();
            process.exit(1);
          }
          httpPort = +wantedHttpPort;
          if (isNaN(httpPort)) {
            console.error(
              'ERROR: Invalid HTTP port configured. Should be a number, received "' +
                wantedHttpPort +
                '"\n',
            );
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "-s":
      case "-https":
        {
          argOffset++;
          const wantedHttpsPort = args[argOffset];
          if (wantedHttpsPort === undefined) {
            console.error("ERROR: no https port provided\n");
            displayHelp();
            process.exit(1);
          }
          httpsPort = +wantedHttpsPort;
          if (isNaN(httpsPort)) {
            console.error(
              'ERROR: Invalid HTTPS port configured. Should be a number, received "' +
                wantedHttpsPort +
                '"\n',
            );
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "--":
        argOffset = args.length;
        break;

      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }

  if (normalizedPath === undefined) {
    normalizedPath = normalize(process.cwd());
  }

  if (certificateFile !== undefined && keyFile === undefined) {
    console.warn(
      "⚠️ Certificate path communicated but no private key. Not running in HTTPS.",
    );
    certificateFile = undefined;
  }

  if (keyFile !== undefined && certificateFile === undefined) {
    console.warn("⚠️ Private key communicated but no certificate. Not running in HTTPS.");
    keyFile = undefined;
  }

  try {
    /** @type {LaunchStaticServerConfig} */
    const launchConfig = {
      verbose: true,
      httpPort: httpPort ?? 8000,
      httpsPort: httpsPort ?? 8443,
    };
    if (certificateFile !== undefined) {
      launchConfig.certificatePath = certificateFile;
    }
    if (keyFile !== undefined) {
      launchConfig.keyPath = keyFile;
    }
    const { listeningPromise } = launchStaticServer(normalizedPath, launchConfig);
    listeningPromise.catch((err) => {
      console.error(`ERROR: ${err}\n`);
      process.exit(1);
    });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    process.exit(1);
  }
}

/**
 * Launch the static server and begin to serve on the configured port.
 * @param {string} path - Root path that will be served by the static server.
 * @param {LaunchStaticServerConfig} config - Associated configuration.
 * @returns {{listeningPromise:Promise.<*>;close: () => void}} Object with two properties:
 *   - `listeningPromise` (Promise.<Object>): This promise rejects if the HTTP
 *     server could not start but resolves in any other case (listening to HTTP
 *     alone or both HTTP and HTTPS), even if the asked HTTPS server could not
 *     be started.
 *
 *     The resolved object contains two boolean properties: `http` and `https`,
 *     which are set to `true` when the corresponding server has been started.
 *
 *     You can know the reason for the HTTPS server not starting by setting the
 *     `verbose` option to `true`. In that case, it will be logged.
 *
 *   - `close` (Function): Method allowing to stop the servers from listening
 *     and to free their resources.
 */
export default function launchStaticServer(path, config) {
  const shouldStartHttps =
    config.httpsPort !== undefined &&
    config.certificatePath !== undefined &&
    config.keyPath !== undefined;

  /** @type {string|null} */
  let httpServerStatus = null;
  /** @type {string|null} */
  let httpsServerStatus = null;
  /** @type {Array<http.Server | https.Server>} */
  const servers = [];
  const listeningPromise = new Promise((res, rej) => {
    const httpServer = http.createServer(onRequest);
    servers.push(httpServer);
    httpServer.once("error", onHttpConnectionError);
    httpServer.listen(config.httpPort, onHttpConnection);

    if (!shouldStartHttps) {
      httpsServerStatus = "disabled";
      return;
    }

    const certificatePath = /** @type {string} */ (config.certificatePath);
    const keyPath = /** @type {string} */ (config.keyPath);
    /** @type {import("https").Server|undefined} */
    let httpsServer;
    Promise.all([readFile(certificatePath), readFile(keyPath)])
      .then(([certFile, keyFile]) => {
        if (certFile == null || keyFile == null) {
          const err = new Error("Impossible to load the certificate and/or key file");
          onHttpsConnectionError(err);
          return;
        }
        httpsServer = https.createServer(
          {
            key: keyFile,
            cert: certFile,
          },
          onRequest,
        );
        servers.push(httpsServer);
        httpsServer.once("error", onHttpsConnectionError);
        httpsServer.listen(config.httpsPort, onHttpsConnection);
      })
      .catch((err) => {
        httpsServerStatus = "error";
        if (err instanceof Error && "code" in err && err.code === "ENOENT") {
          const fileError = new Error(
            "Certificate not generated.\n" +
              "(You can run `npm run certificate` to generate a certificate.)",
          );
          onHttpsConnectionError(fileError);
        } else {
          const fileError = new Error("Could not read key and certificate file.");
          onHttpsConnectionError(fileError);
        }
      });

    function onHttpConnection() {
      httpServerStatus = "success";
      if (config.verbose) {
        console.log(
          `[${getHumanReadableHours()}] ` +
            `Listening HTTP at http://localhost:${config.httpPort}`,
        );
      }
      if (httpsServerStatus !== null) {
        res({ https: httpsServerStatus === "success", http: true });
      }
    }

    /**
     * @param {Error} err
     */
    function onHttpConnectionError(err) {
      if (config.verbose) {
        console.error(
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
            "Could not start static HTTP server:",
          err.toString(),
        );
      }
      httpServerStatus = "error";
      if (httpsServerStatus === "success") {
        res({ http: false, https: true });
      } else if (httpsServerStatus === "error" || httpsServerStatus === "disabled") {
        rej(err);
      }
      httpServer.close();
    }

    function onHttpsConnection() {
      httpsServerStatus = "success";
      if (config.verbose) {
        console.log(
          `[${getHumanReadableHours()}] ` +
            `Listening HTTPS at https://localhost:${config.httpsPort}`,
        );
      }
      if (httpServerStatus !== null) {
        res({ https: true, http: httpServerStatus === "success" });
      }
    }

    /**
     * @param {Error} err
     */
    function onHttpsConnectionError(err) {
      if (config.verbose) {
        console.error(
          `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
            "Could not start static HTTPS server:",
          err.toString(),
        );
      }
      if (httpServerStatus === "success") {
        res({ http: true, https: false });
      } else if (httpServerStatus === "error") {
        rej(err);
      }
      httpsServerStatus = "error";
      httpsServer?.close();
    }
  });

  return {
    listeningPromise,
    close() {
      servers.forEach((server) => server.close());
    },
  };

  /**
   * @param {import("http").IncomingMessage} request
   * @param {import("http").ServerResponse} response
   */
  async function onRequest(request, response) {
    const file = await prepareFile(path, request.url ?? "/");
    if (file === null) {
      response.writeHead(404);
      response.end();
      return;
    }
    const mimeType =
      file.ext in MIME_TYPES
        ? MIME_TYPES[/** @type {MimeTypeExtension} */ (file.ext)]
        : MIME_TYPES.default;
    response.writeHead(200, { "Content-Type": mimeType });
    file.stream.pipe(response);
  }
}

/**
 * @param {string} baseDirectory
 * @param {string} url
 * @returns {Promise<PreparedFile | null>}
 */
async function prepareFile(baseDirectory, url) {
  let filePath = join(baseDirectory, url);
  if (url.endsWith("/")) {
    filePath = join(filePath, "index.html");
  }
  if (!filePath.startsWith(baseDirectory)) {
    return null;
  }
  const exists = await promisify(access)(filePath).then(
    () => true,
    () => false,
  );
  if (!exists) {
    return null;
  }
  const ext = extname(filePath).substring(1).toLowerCase();
  const stream = createReadStream(filePath);
  return { ext, stream };
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `launch_static_server.mjs: Serve files inside a given directory via HTTP and HTTPS.

Usage: node launch_static_server.mjs [OPTIONS]

Options:
  -d <PATH>, --directory <PATH>    Path to the directory whose files will be served.
                                   Defaults to the current working directory.
  -p <NUMBER>, --http <NUMBER>     Configure the port listening for HTTP connections.
                                   8000 by default.
  -s <NUMBER>, --https <NUMBER>    Configure the port listening for HTTPS connections.
                                   Also requires "-c" and "-k" options to be set.
                                   8443 by default.
  -c <PATH>, --certificate <PATH>  Only required for HTTPS connections.
                                   Path to the corresponding certificate file.
  -k <PATH>, --key <PATH>          Only required for HTTPS connections.
                                   Path to the corresponding private key.`,
  );
}
