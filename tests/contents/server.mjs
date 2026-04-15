/* eslint-env node */

/* eslint-disable no-console */

import { createServer } from "http";
import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as fs from "fs";
import urls from "./static/urls.mjs";

/** To activate if you're having content packaging issues. */
const ACTIVATE_PACKAGER_LOGS = false;

/** Path of the current file. */
const __filename = fileURLToPath(import.meta.url);
/** Directory of the current file. */
const __dirname = path.dirname(__filename);

/** Live contents are lazily packaged in this directory. */
const DEFAULT_PACKAGED_LIVE_OS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "tmp",
  "testcontents",
  "live",
);

// Transform `urls` array into an Object where the key is the url of each
// element.
const routeObj = urls.reduce((acc, elt) => {
  acc[elt.url] = elt;
  return acc;
}, {});

const DEFAULT_CONTENT_SERVER_PORT = 3000;

/** Global variable to track the "content packaging" process */
let packagingProcessInfo = null;

/**
 * Create simple HTTP server specifically designed to serve the contents defined
 * in this directory.
 * @param {Object} params
 * @param {number} params.port
 * @returns {Object}
 */
export default function createContentServer({ port = DEFAULT_CONTENT_SERVER_PORT } = {}) {
  const server = createServer(function (req, res) {
    const requestUrl = new URL(req.url, "http://127.0.0.1");

    if (req.url === "/") {
      if (req.method.toUpperCase() === "OPTIONS") {
        answerWithCORS(res, 200);
        res.end();
        return;
      }
      if (req.method.toUpperCase() !== "GET") {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 405, "405 Method Not Allowed");
        return;
      }

      const html = generateUrlListHtml(urls, "http://127.0.0.1:" + String(port));
      answerWithCORS(res, 200, html);
      return;
    }

    if (req.url.startsWith("/live/")) {
      handlePackagedLiveRequest(res, req, "/live/");
      return;
    }

    if (req.url.startsWith("/live-alt/")) {
      handlePackagedLiveRequest(res, req, "/live-alt/");
      return;
    }

    if (requestUrl.pathname === "/start_packager") {
      if (req.method.toUpperCase() === "OPTIONS") {
        answerWithCORS(res, 200);
        res.end();
        return;
      }
      if (req.method.toUpperCase() !== "POST" && req.method.toUpperCase() !== "GET") {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 405, "405 Method Not Allowed");
        return;
      }

      const textTrackQs = requestUrl.searchParams.get("enableTextTrack");
      handleStartPackager(res, textTrackQs === "1");
      return;
    }

    if (requestUrl.pathname === "/packager_status") {
      if (req.method.toUpperCase() === "OPTIONS") {
        answerWithCORS(res, 200);
        res.end();
        return;
      }
      if (req.method.toUpperCase() !== "GET") {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 405, "405 Method Not Allowed");
        return;
      }

      res.setHeader("Content-Type", "application/json");
      const jsonResponse =
        packagingProcessInfo === null
          ? {
              active: false,
              info: null,
            }
          : {
              active: true,
              info: {
                mpdPath: packagingProcessInfo.mpdPath,
                timeShiftBufferDepth: packagingProcessInfo.timeShiftBufferDepth,
                segmentDuration: packagingProcessInfo.segmentDuration,
                hasTextTrack: packagingProcessInfo.hasTextTrack,
              },
            };
      answerWithCORS(res, 200, JSON.stringify(jsonResponse));
      return;
    }

    if (requestUrl.pathname === "/stop_packager") {
      if (req.method.toUpperCase() === "OPTIONS") {
        answerWithCORS(res, 200);
        res.end();
        return;
      }
      if (req.method.toUpperCase() !== "POST" && req.method.toUpperCase() !== "GET") {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 405, "405 Method Not Allowed");
        return;
      }

      handleStopPackager(res);
      return;
    }

    // Handle regular routes
    if (routeObj[req.url] == null) {
      res.setHeader("Content-Type", "text/plain");
      answerWithCORS(res, 404, "404 Page Not Found");
      return;
    }
    if (req.method.toUpperCase() === "OPTIONS") {
      answerWithCORS(res, 200);
      res.end();
      return;
    }
    if (req.method.toUpperCase() !== "GET") {
      res.setHeader("Content-Type", "text/plain");
      answerWithCORS(res, 405, "405 Method Not Allowed");
      return;
    }

    const urlObj = routeObj[req.url];
    let data;
    if (typeof urlObj.path === "string") {
      try {
        data = fs.readFileSync(urlObj.path);
      } catch (_err) {
        res.setHeader("Content-Type", "text/plain");
        answerWithCORS(res, 404, "404 Page Not Found");
        return;
      }
    } else {
      data = urlObj.data;
      try {
        data = Buffer.from(data);
      } catch (_e) {}
      answerWithCORS(res, 200, data);
      return;
    }

    const rangeHeader = req.headers["Range"] || req.headers["range"];
    let isPartial = false;
    if (typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
      const dataLength = data.byteLength;
      const ranges = parseRangeHeader(rangeHeader, dataLength);
      data = data.slice(ranges[0], ranges[1] + 1);
      res.setHeader("Content-Range", `bytes ${ranges[0]}-${ranges[1]}/${dataLength}`);
      isPartial = true;
    }
    if (typeof urlObj.postProcess === "function") {
      data = urlObj.postProcess(data);
    }
    if (typeof urlObj.contentType === "string") {
      res.setHeader("Content-Type", urlObj.contentType);
    }
    const responseBody = Buffer.from(data);
    const delayMs = typeof urlObj.delayMs === "number" ? urlObj.delayMs : 0;
    if (delayMs > 0) {
      setTimeout(() => {
        answerWithCORS(res, isPartial ? 206 : 200, responseBody);
      }, delayMs);
      return;
    }
    answerWithCORS(res, isPartial ? 206 : 200, responseBody);
  });

  const listeningPromise = new Promise((res) => {
    server.listen(port, function () {
      console.log(
        `Test Content Server started: http://localhost:${port ?? DEFAULT_CONTENT_SERVER_PORT}`,
      );
      console.log("");
      console.log(
        "You can request that URL directly to see the list of static contents served by this server.",
      );
      console.log("");
      console.log(
        "NOTE: You can start packaging a live content by POSTing to:\n " +
          "     /start_packager",
      );
      console.log("      Only one content packaging at a time is supported.\n");
      console.log(
        "      A text track can be added by adding enableTextTrack=1 to its query string.\n",
      );
      console.log(
        "      Stop packaging operations by POSTing to:\n      /stop_packager\n",
      );
      console.log(
        "      To check if there's a packaging process going on, and its properties, do a GET at:\n" +
          "      /packager_status",
      );
      console.log("");
      console.log(
        "You can inspect or update the server logic in its file:\n" + __filename,
      );
      console.log("");
      res();
    });
  });

  return {
    listeningPromise,
    close() {
      if (packagingProcessInfo && !packagingProcessInfo.process.killed) {
        packagingProcessInfo.process.kill("SIGINT");
        setTimeout(() => {
          try {
            // Use a negative PID to target the process group
            process.kill(-packagingProcessInfo.process.pid);
            packagingProcessInfo = null;
          } catch (_err) {
            /* previous process already exited */
          }
        }, 5000);
      }
      const wasOpen = server.listening;
      server.close();
      if (wasOpen) {
        console.log("Test Content Server stopped");
      }
    },
  };
}

function handlePackagedLiveRequest(res, req, basePath) {
  if (req.method.toUpperCase() === "OPTIONS") {
    answerWithCORS(res, 200);
    res.end();
    return;
  }
  if (req.method.toUpperCase() !== "GET") {
    res.setHeader("Content-Type", "text/plain");
    answerWithCORS(res, 405, "405 Method Not Allowed");
    return;
  }

  const baseDir = DEFAULT_PACKAGED_LIVE_OS_PATH;
  prepareStaticFile(baseDir, req.url.substring(basePath.length)).then(
    (file) => {
      if (file === null) {
        answerWithCORS(res, 404, "404 Not Found");
        return;
      }
      const mimeType =
        file.ext === "mpd" ? "application/dash+xml" : "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": mimeType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      });
      file.stream.pipe(res);
    },
    (err) => {
      res.setHeader("Content-Type", "text/plain");
      answerWithCORS(
        res,
        500,
        "Error: " + (err instanceof Error ? err.toString() : "Unknown Error"),
      );
    },
  );
}

/**
 * Handle the /start_packager endpoint
 * @param {Response} res
 */
async function handleStartPackager(res, hasTextTrack) {
  try {
    if (packagingProcessInfo && !packagingProcessInfo.process.killed) {
      const previousProcess = packagingProcessInfo.process;
      if (ACTIVATE_PACKAGER_LOGS) {
        console.log("Stopping existing content packaging process...");
      }
      previousProcess.kill("SIGINT");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Use a negative PID to target the process group
      try {
        process.kill(-previousProcess.pid);
      } catch (_err) {
        /* previous process already exited */
      }
      packagingProcessInfo = null;
    }

    const scriptPath = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "packager",
      "main.mjs",
    );
    const proc = spawn(
      process.execPath,
      [
        scriptPath,
        "--no-confirmation",
        ...(hasTextTrack ? ["--enable-text-track"] : []),
        "--segment-duration",
        "2",
        "--timeshift-buffer-depth",
        "40",
        "--base-port",
        "35951",
        "--output-dir",
        DEFAULT_PACKAGED_LIVE_OS_PATH,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"], // Don't inherit stdio, capture output
        cwd: __dirname,
      },
    );

    packagingProcessInfo = {
      process: proc,
      timeShiftBufferDepth: 40,
      segmentDuration: 2,
      mpdPath: "/live/manifest.mpd",
      hasTextTrack,
    };

    packagingProcessInfo.process.on("error", (error) => {
      console.error("ERROR: Content packaging script error:", error);
      packagingProcessInfo = null;
    });

    packagingProcessInfo.process.on("exit", (code) => {
      packagingProcessInfo = null;
      console.log(`Packaging process exited with code ${code}`);
    });

    if (ACTIVATE_PACKAGER_LOGS) {
      console.log("Content Packager Started");
      packagingProcessInfo.process.on("spawn", () => {
        console.log(
          "content packaging script started with PID:",
          packagingProcessInfo.process.pid,
        );
      });
      // Log script output.
      packagingProcessInfo.process.stdout.on("data", (data) => {
        console.log("Content packaging script stdout:", data.toString());
      });
      packagingProcessInfo.process.stderr.on("data", (data) => {
        console.error("Content packaging script stderr:", data.toString());
      });
      packagingProcessInfo.process.on("exit", (code, signal) => {
        console.log(
          `Content packaging script exited with code ${code} and signal ${signal}`,
        );
      });
    }

    res.setHeader("Content-Type", "application/json");
    answerWithCORS(
      res,
      200,
      JSON.stringify({
        success: true,
        message: "Content packaging script started",
        info: {
          mpdPath: packagingProcessInfo.mpdPath,
          timeShiftBufferDepth: packagingProcessInfo.timeShiftBufferDepth,
          segmentDuration: packagingProcessInfo.segmentDuration,
          hasTextTrack: packagingProcessInfo.hasTextTrack,
        },
      }),
    );
  } catch (error) {
    console.error("ERROR: Failed to start content packaging script:", error);
    res.setHeader("Content-Type", "application/json");
    answerWithCORS(
      res,
      500,
      JSON.stringify({
        success: false,
        message: "Failed to start content packaging script",
        error: error.message,
      }),
    );
  }
}

/**
 * Handle the /stop_packager endpoint
 * @param {Response} res
 */
async function handleStopPackager(res) {
  try {
    if (packagingProcessInfo && !packagingProcessInfo.process.killed) {
      if (ACTIVATE_PACKAGER_LOGS) {
        console.log(
          "Stopping content packaging script process with PID:",
          packagingProcessInfo.pid,
        );
      }
      packagingProcessInfo.process.kill("SIGINT");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Use a negative PID to target the process group
      if (packagingProcessInfo) {
        process.kill(-packagingProcessInfo.process.pid);
        packagingProcessInfo = null;
      }

      res.setHeader("Content-Type", "application/json");
      answerWithCORS(
        res,
        200,
        JSON.stringify({
          success: true,
          message: "content packaging script stopped",
        }),
      );
    } else {
      res.setHeader("Content-Type", "application/json");
      answerWithCORS(
        res,
        200,
        JSON.stringify({
          success: true,
          message: "No content packaging script running",
        }),
      );
    }
  } catch (error) {
    console.error("ERROR: Failed to stop content packaging script:", error);
    res.setHeader("Content-Type", "application/json");
    answerWithCORS(
      res,
      500,
      JSON.stringify({
        success: false,
        message: "Failed to stop content packaging script",
        error: error.message,
      }),
    );
  }
}

/**
 * Add CORS headers, Content-Length, body, HTTP status and answer with the
 * Response Object given.
 * @param {Response} res
 * @param {number} status
 * @param {*} body
 */
function answerWithCORS(res, status, body) {
  if (Buffer.isBuffer(body)) {
    res.setHeader("Content-Length", body.byteLength);
  } else if (typeof body === "string") {
    res.setHeader("Content-Length", Buffer.byteLength(body));
  }
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  if (body !== undefined) {
    res.end(body);
  } else {
    res.end();
  }
  return;
}

/**
 * Parse value of the "Range" header into an array of two numbers, which are
 * specifically the start and end range wanted included.
 * @param {string} rangeHeader
 * @param {number} dataLength
 * @returns {Array.<number>}
 */
function parseRangeHeader(rangeHeader, dataLength) {
  const rangesStr = rangeHeader.substring(6).split("-");
  if (
    (rangesStr[0] != "" && Number.isNaN(+rangesStr[0])) ||
    (rangesStr[1] != "" && Number.isNaN(+rangesStr[1]))
  ) {
    throw new Error("Invalid range request");
  }
  const rangesNb = rangesStr.map((x) => (x === "" ? null : +x));
  if (rangesNb[1] == null) {
    return [rangesNb[0], dataLength - 1];
  }
  if (rangesNb[1] <= rangesNb[0]) {
    return [0, 0];
  }
  if (rangesNb[0] == null || rangesNb[0] === 0) {
    if (rangesNb[1] == null) {
      return [0, dataLength - 1];
    }
    return [0, rangesNb[1]];
  }
  return [rangesNb[0], rangesNb[1]];
}

/**
 * Generate default HTML page listing the URL statically served.
 * @param {Array.<Object>} urls - Information on URLs statically served.
 * @param {string} baseUrl - Root URL where those are served.
 * @returns {string} - HTML page where those URL can be inspected and browsed.
 */
function generateUrlListHtml(urls, baseUrl) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>URLs exposed by our content server (${urls.length} items)</title>
    <style>
        body { font-family: monospace; margin: 20px; }
        .search { margin-bottom: 20px; }
        .search input { width: 300px; padding: 5px; }
        .search select { padding: 5px; margin-left: 10px; }
        .item { border: 1px solid #ccc; margin: 10px 0; padding: 10px; }
        .url { font-weight: bold; }
        .path { color: #666; }
        .type { background: #f0f0f0; padding: 2px 5px; font-size: 0.8em; }
        .extra { margin-top: 5px; font-size: 0.9em; color: #333; }
    </style>
</head>
<body>
    <h1>Pre-registered URLs (${urls.length} items)</h1>
    <p>This Website lists the URL of static assets served by our content server.<br>
       Note that many of those assets may be unplayable as they're originally intended for specific integration tests which may not even need to have the correspoding content playing.<br>
       PS: This page only includes URLs to static VoD contents. Assets dynamically created, even by this server, are not listed here.</p>

    <div class="search">
        <input type="text" id="search" placeholder="Search...">
        <select id="typeFilter">
            <option value="">All types</option>
        </select>
        <span id="count"></span>
    </div>

    <div id="results"></div>

    <script>
        const data = ${JSON.stringify(urls)};
        let filtered = data;

        // Populate content type filter
        const types = [...new Set(data.map(i => i.contentType))].sort();
        const typeFilter = document.getElementById('typeFilter');
        types.forEach(type => {
            if (!type) {
              return;
            }
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });

        function render() {
            const results = document.getElementById('results');
            const count = document.getElementById('count');

            count.textContent = \`(\${filtered.length} shown)\`;

            results.innerHTML = filtered.map(item => {
                const extra = Object.keys(item)
                    .filter(k => !['url', 'path', 'contentType'].includes(k))
                    .map(k => \`<div class="extra"><strong>\${k}:</strong> \${JSON.stringify(item[k])}</div>\`)
                    .join('');

                return \`<div class="item">
                    <div class="url"><a href="${baseUrl}\${item.url}">\${item.url}</a></div>
                    <div class="path">\${item.path || 'N/A'}</div>
                    <span class="type">\${item.contentType || 'unknown'}</span>
                    \${extra}
                </div>\`;
            }).join('');
        }

        function filter() {
            const search = document.getElementById('search').value.toLowerCase();
            const type = document.getElementById('typeFilter').value;

            filtered = data.filter(item => {
                const matchSearch = !search ||
                    (item.url && item.url.toLowerCase().includes(search)) ||
                    (item.path && item.path.toLowerCase().includes(search)) ||
                    (item.contentType && item.contentType.toLowerCase().includes(search));

                const matchType = !type || item.contentType === type;

                return matchSearch && matchType;
            });

            render();
        }

        document.getElementById('search').addEventListener('input', filter);
        document.getElementById('typeFilter').addEventListener('change', filter);

        render();
    </script>
</body>
</html>`;

  return html;
}

async function prepareStaticFile(baseDir, url) {
  const filePath = path.resolve(baseDir, url);
  const normalizedBase = path.resolve(baseDir);
  const relative = path.relative(normalizedBase, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const exists = await new Promise((resolve) => {
    fs.access(filePath, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
  if (!exists) {
    return null;
  }
  const ext = path.extname(filePath).substring(1).toLowerCase();
  // TODO: handle ENOENT in case of race conditions?
  const stream = fs.createReadStream(filePath);
  return { ext, stream };
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let port;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;

      case "-p":
      case "--port":
        {
          argOffset++;
          port = +args[argOffset];
          if (isNaN(port)) {
            console.error("ERROR: Given port option is not a number\n");
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
  try {
    createContentServer({
      port,
    }).listeningPromise.catch((err) => {
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
    `server.mjs: Run the content server for integration tests.

Usage: node server.mjs [OPTIONS]

Options:
  -p, --port  Port on which served contents are available.`,
  );
}
