#!/usr/bin/env node
/**
 * Launch static server
 * ====================
 *
 * This script allows to start both an HTTP and an HTTPS (only if a certificate
 * path and a key path have been given) static file server.
 */

import { access, createReadStream, readFile } from "fs";
import { join, extname } from "path";
import { promisify } from "util";
import http from "http";
import https from "https";
import getHumanReadableHours from "./utils/get_human_readable_hours.mjs";

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

/**
 * Launch the static server and begin to serve on the configured port.
 * @param {string} path - Root path that will be served by the static server.
 * @param {Object} config - Associated configuration.
 * @param {number} config.httpPort - Port on which the server will be listening
 * for HTTP traffic.
 * @param {number} [config.httpsPort] - Port on which the server will be
 * listening for HTTPS traffic.
 * If not defined, the server won't listen for HTTPS traffic.
 * @param {boolean} [config.verbose] - If set to `true` the server will output
 * when the server start listening and when anything failed.
 * @param {string} [config.certificatePath] - Path to the TLS certificate that
 * will be used in HTTPS connections.
 * If not defined, the server won't listen for HTTPS traffic.
 * @param {string} [config.keyPath] - Path to the public key allowing to encrypt
 * the HTTPS connection.
 * If not defined, the server won't listen for HTTPS traffic.
 * @returns {Object} Object with two properties:
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

  let httpServerStatus = null;
  let httpsServerStatus = null;
  const servers = [];
  const listeningPromise = new Promise((res, rej) => {
    const httpServer = http.createServer(onRequest);
    servers.push(httpServer);
    httpServer.listen(config.httpPort, onHttpConnection);

    if (!shouldStartHttps) {
      return;
    }

    let httpsServer;
    Promise.all([
      promisify(readFile)(config.certificatePath),
      promisify(readFile)(config.keyPath),
    ])
      .then(([certFile, keyFile]) => {
        if (certFile == null || keyFile == null) {
          const err = new Error("Impossible to load the certificate and/or key file");
          onHttpsConnection(err);
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
        httpsServer.listen(config.httpsPort, onHttpsConnection);
      })
      .catch((err) => {
        httpsServerStatus = "error";
        if (err.code === "ENOENT") {
          const err = new Error(
            "Certificate not generated.\n" +
              "(You can run `npm run certificate` to generate a certificate.)",
          );
          onHttpsConnection(err);
        } else {
          const err = new Error("Could not read key and certificate file.");
          onHttpsConnection(err);
        }
      });

    function onHttpConnection(err) {
      if (err) {
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
        } else if (httpsServerStatus === "error") {
          rej(err);
        }
        httpServer.close();
        return;
      }
      httpServerStatus = "success";
      console.log(
        `[${getHumanReadableHours()}] ` +
          `Listening HTTP at http://localhost:${config.httpPort}`,
      );
      if (httpsServerStatus !== null) {
        res({ https: httpsServerStatus === "success", http: true });
      }
    }

    function onHttpsConnection(err) {
      if (err) {
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
        return;
      }
      httpsServerStatus = "success";
      console.log(
        `[${getHumanReadableHours()}] ` +
          `Listening HTTPS at https://localhost:${config.httpsPort}`,
      );
      if (httpServerStatus !== null) {
        res({ https: true, http: httpServerStatus === "success" });
      }
    }
  });

  return {
    listeningPromise,
    close() {
      servers.forEach((server) => server.close());
    },
  };

  async function onRequest(request, response) {
    const file = await prepareFile(path, request.url);
    if (file === null) {
      response.writeHead(404);
      response.end();
      return;
    }
    const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
    response.writeHead(200, { "Content-Type": mimeType });
    file.stream.pipe(response);
  }
}

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
