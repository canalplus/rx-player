#!/usr/bin/env node
/* eslint-env node */

/**
 * Launch static server
 * ====================
 *
 * This script allows to start both an HTTP and an HTTPS (only if a certificate
 * path and a key path have been given) static file server.
 */

const express = require("express");
const fs = require("fs");
const { promisify } = require("util");
const https = require("https");
const getHumanReadableHours = require("./utils/get_human_readable_hours");

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
module.exports = function launchStaticServer(path, config) {
  const shouldStartHttps =
    config.httpsPort !== undefined &&
    config.certificatePath !== undefined &&
    config.keyPath !== undefined;
  let isHttpServerStarted = false;
  let isHttpsServerStarted = false;

  const app = express();
  app.use(express.static(path));

  let server;
  const listeningPromise = new Promise((res, rej) => {
    server = app.listen(config.httpPort, (err) => {
      if (err) {
        if (config.verbose) {
          /* eslint-disable-next-line no-console */
          console.error(
            `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
              "Could not start static HTTP server:",
            err,
          );
        }
        server.close();
        return rej(err);
      }
      if (config.verbose) {
        /* eslint-disable-next-line no-console */
        console.log(
          `[${getHumanReadableHours()}] ` +
            `Listening HTTP at http://localhost:${config.httpPort}`,
        );
      }
      isHttpServerStarted = true;
      if (!shouldStartHttps || isHttpsServerStarted) {
        res({ http: true, https: isHttpsServerStarted });
      }
    });

    if (!shouldStartHttps) {
      return;
    }

    Promise.all([
      promisify(fs.readFile)(config.certificatePath),
      promisify(fs.readFile)(config.keyPath),
    ]).then(
      ([certFile, keyFile]) => {
        if (certFile != null && keyFile != null) {
          https
            .createServer(
              {
                key: keyFile,
                cert: certFile,
              },
              app,
            )
            .listen(config.httpsPort, (err) => {
              if (err) {
                if (config.verbose) {
                  /* eslint-disable-next-line no-console */
                  console.error(
                    `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
                      "Could not start static HTTPS server:",
                    err,
                  );
                }
                if (isHttpServerStarted) {
                  res({ http: true, https: false });
                }
                return;
              }
              /* eslint-disable-next-line no-console */
              console.log(
                `[${getHumanReadableHours()}] ` +
                  `Listening HTTPS at https://localhost:${config.httpsPort}`,
              );
            });
          if (isHttpServerStarted) {
            res();
          }
          isHttpsServerStarted = true;
        } else {
          const err = new Error("Impossible to load the certificate and/or key file");
          if (config.verbose === true) {
            /* eslint-disable-next-line no-console */
            console.error(
              `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
                "Could not start static HTTPS server:",
              err,
            );
          }
          if (isHttpServerStarted) {
            res({ http: true, https: false });
          }
          return;
        }
      },
      (err) => {
        if (err.code === "ENOENT") {
          if (config.verbose) {
            /* eslint-disable-next-line no-console */
            console.warn(
              `[${getHumanReadableHours()}] ` + "Could not start static HTTPS server: ",
              "Certificate not generated.\n" +
                "(You can run `npm run certificate` to generate a certificate.)",
            );
          }
          if (isHttpServerStarted) {
            res({ http: true, https: false });
          }
          return;
        } else {
          const err = new Error("Could not read key and certificate file.");
          if (config.verbose) {
            /* eslint-disable-next-line no-console */
            console.error(
              `\x1b[31m[${getHumanReadableHours()}]\x1b[0m ` +
                "Could not start static HTTPS server:",
              err,
            );
          }
          if (isHttpServerStarted) {
            res({ http: true, https: false });
          }
          return;
        }
      },
    );
  });

  return {
    listeningPromise,
    close() {
      server.close();
    },
  };
};
