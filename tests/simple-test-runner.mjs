#!/usr/bin/env node

/**
 * # simple-test-runner.mjs
 *
 * This script is intended to be a drop-in solution to replace `vitest` on tests
 * that do not need its complex features, yet which can profit from more
 * control of the lower-level aspects of a testing framework such as:
 *
 * - running the browser (finding it on the host, giving it the right flags,
 *   controlling how it access the testing page, controlling how the testing
 *   page responds back)
 *
 * - orchestrating tests (how/when tests run)
 *
 * It was born out of frustration of `vitest` and its dependencies breaking
 * at every new version on my machine, when what we want to do is relatively
 * simple and understood by us.
 *
 * So even if `vitest`-compatibility for those tests is still maintained, this
 * library acts as a simpler alternative that's much easier to hack around, and
 * allow me to just run my tests locally without too much maintainance. It is
 * basically a backup runner in the (frequent) occurence where vitest fails.
 *
 * One of the other focus of this lib is simplicity: no JS magic, no mocking
 * utils, we just implement what we need (`describe` / `it` / `beforeEach` etc.)
 * in the expected manner.
 *
 * ## How to use it
 *
 * First, the tests that are run needs to rely on `./simple-test-lib.mjs`
 * instead of `vitest`.
 * This has been written to be a drop-in so you should theoretically just be
 * able to rewrite:
 * ```js
 * import { describe, afterEach, it, expect } from "vitest";
 * ````
 * into:
 * ```js
 * import { describe, afterEach, it, expect } from "../simple-test-lib.js";
 * ````
 * (so just replacing the path) in most cases.
 *
 * Then you can run this script to run those tests on a local browser.
 * See --help flag to see usage.
 */

/* eslint-env node */

import { createServer } from "http";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import runChrome from "../scripts/run_chrome.mjs";
import runFirefox from "../scripts/run_firefox.mjs";
import launchStaticServer from "../scripts/launch_static_server.mjs";
import runBundler from "../scripts/run_bundler.mjs";
import createContentServer from "./contents/server.mjs";

/**
 * Path to the directory this script is currently in.
 * The same path should contain the `simple-test-page.html` page and will
 * contain our `simple-test-bundle.js` test page bundle.
 */
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Default port of the HTTP server which will serve local contents. */
const DEFAULT_CONTENT_SERVER_PORT = 3000;

/** Default port of the HTTP server which will serve the test files */
const DEFAULT_TEST_PAGE_PORT = 8080;

/** Default port of the HTTP server which will be used to exchange about test results. */
const DEFAULT_RESULT_SERVER_PORT = 6789;

/**
 * `ChildProcess` instance of the current browser being run.
 * `undefined` if no browser is currently being run.
 * @type {import("child_process").ChildProcess|undefined}
 */
let currentBrowser;

/**
 * Initialize and start all tests on the given browser.
 * @param {Object} params
 * @param {string} params.inputFile - The test input file.
 * @param {string} params.browser - The browser to run the tests on.
 * "chrome" by default. Can be either "chrome" or "firefox".
 * @param {number} params.contentServerPort - The port through which test
 * contents are served.
 * @param {number} params.resultServerPort - The port through which test
 * results should be sent.
 * @param {number} params.testPagePort - The port through which the test page
 * is acceeded.
 * @returns {Promise.<Object>}
 */
export default function runTests({
  inputFile,
  browser = "chrome",
  contentServerPort = DEFAULT_CONTENT_SERVER_PORT,
  resultServerPort = DEFAULT_RESULT_SERVER_PORT,
  testPagePort = DEFAULT_TEST_PAGE_PORT,
}) {
  if (inputFile === undefined) {
    return Promise.reject(new Error("No input file provided."));
  }
  return new Promise((resolve, reject) => {
    let isFinished = false;
    let contentServer;
    let resultServer;
    let staticServer;
    const results = {
      success: [],
      skipped: [],
      failures: [],
    };

    const onFinished = (results) => {
      isFinished = true;
      closeServers();
      closeBrowser().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to close the browser:", err);
      });
      resolve(results);
    };
    const onError = (error) => {
      isFinished = true;
      closeServers();
      closeBrowser().catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to close the browser:", err);
      });
      reject(error);
    };

    const closeServers = () => {
      contentServer?.close();
      contentServer = undefined;
      resultServer?.close();
      resultServer = undefined;
      staticServer?.close();
      staticServer = undefined;
    };

    Promise.all([
      initializeServers({
        contentServerPort,
        resultServerPort,
        testPagePort,
        results,
        onFinished,
        onError,
      }),
      createTestBundle(inputFile, contentServerPort, {
        output: "simple-test-bundle.js",
        minify: false,
        production: true,
      }),
    ])
      .then(async ([servers]) => {
        if (currentBrowser !== undefined) {
          currentBrowser.kill("SIGKILL");
        }
        const testsUrl = `http://127.0.0.1:${testPagePort}/simple-test-page.html#p=${resultServerPort}`;
        if (browser === "firefox") {
          // eslint-disable-next-line no-console
          console.log("Running tests on Firefox");
          currentBrowser = await runFirefox(testsUrl, {
            headless: true,
            enableAutoPlay: true,
          });
        } else {
          // eslint-disable-next-line no-console
          console.log("Running tests on Chrome");
          currentBrowser = await runChrome(testsUrl, {
            headless: true,
            enableAutoPlay: true,
            memoryTools: true,
          });
        }
        contentServer = servers.contentServer;
        resultServer = servers.resultServer;
        staticServer = servers.staticServer;
        if (isFinished) {
          closeServers();
        }
      })
      .catch(onError);
  });
}

/**
 * @param {Object} params
 * @param {number} params.contentServerPort
 * @param {Object} params.results
 * @param {Array<Object>} params.results.success
 * @param {Array<Object>} params.results.skipped
 * @param {Array<Object>} params.results.failures
 * @param {Function} params.onFinished
 * @param {function} params.onError
 * @returns {Promise} - Resolves when all servers are listening.
 */
async function initializeServers({
  contentServerPort,
  resultServerPort,
  testPagePort,
  results,
  onFinished,
  onError,
}) {
  let contentServer;
  let staticServer;
  let resultServer;
  try {
    contentServer = createContentServer({ port: contentServerPort });
    staticServer = launchStaticServer(currentDirectory, {
      httpPort: testPagePort,
    });
    resultServer = createResultServer({ resultServerPort, results, onFinished, onError });
    await Promise.all([
      contentServer.listeningPromise,
      staticServer.listeningPromise,
      resultServer.listeningPromise,
    ]);
    return { contentServer, resultServer, staticServer };
  } catch (error) {
    contentServer?.close();
    staticServer?.close();
    resultServer?.close();
    throw error;
  }
}

/**
 * Free all resources and terminate script.
 */
async function closeBrowser() {
  if (currentBrowser !== undefined) {
    currentBrowser.kill("SIGKILL");
    currentBrowser = undefined;
  }
}

/**
 * Create HTTP server which will receive test results and react appropriately.
 * @param {Object} params
 * @param {Object} params.results
 * @param {Array} params.results.success
 * @param {Array} params.results.skipped
 * @param {Array} params.results.failures
 * @param {Function} params.onFinished
 * @param {function} params.onError
 * @returns {Object}
 */
function createResultServer({ resultServerPort, results, onFinished, onError }) {
  // Results sent by HTTP can be received out-of-order. We use an incrementing id,
  // `currentRequestNb`, to ensure that this is the next awaited message and if
  // not, buffer that message until it is.
  // TODO: use long-lived WebSocket instead of buffered HTTP requests with an
  // index, for robustness when/if HTTP errors arise. Not done for now because
  // more complex (needs to either write a WebSocket server or import one as a
  // dependency.)
  let currentRequestNb = 0;
  const bufferedRequests = [];
  const server = createServer(onRequest);
  return {
    listeningPromise: new Promise((res) => {
      server.listen(resultServerPort, function () {
        res();
      });
    }),
    close() {
      server.close();
    },
  };

  function onRequest(request, response) {
    if (request.method === "OPTIONS") {
      answerWithCORS(response, 200);
      response.end();
    } else if (request.method == "POST") {
      let body = "";
      request.on("data", function (data) {
        body += data;
      });
      request.on("end", function () {
        let json;
        try {
          json = JSON.parse(body);
          answerWithCORS(response, 200, "");
        } catch {
          answerWithCORS(response, 500, "Invalid JSON.");
          return;
        }
        if (typeof json.sequenceNb !== "number") {
          /* eslint-disable-next-line no-console */
          console.error("Invalid/Missing sequence number");
        } else if (json.sequenceNb < currentRequestNb) {
          /* eslint-disable-next-line no-console */
          console.error("Sequence number too low, is it another page running?");
        } else {
          // Buffer and find out next request nb
          bufferedRequests.push(json);
          while (true) {
            const index = bufferedRequests.findIndex(
              (req) => req.sequenceNb === currentRequestNb,
            );
            if (index === -1) {
              break;
            }
            const requestInfo = bufferedRequests.splice(index, 1)[0];
            try {
              processRequest(requestInfo);
            } catch (err) {
              /* eslint-disable-next-line no-console */
              console.error(err);
            }
            currentRequestNb++;
          }
        }
      });
    }
  }

  function processRequest(body) {
    switch (body.type) {
      case "log":
        {
          if (
            body.data == null ||
            typeof body.data.level !== "string" ||
            typeof body.data.msg !== "string"
          ) {
            throw new Error("Invalid log message");
          }
          const { level, msg } = body.data;
          switch (level) {
            case "log":
            case "warn":
            case "debug":
            case "info":
              // eslint-disable-next-line no-console
              console[level](level + ":", msg);
              break;
          }
        }
        break;

      case "error": {
        if (typeof body.data !== "string") {
          throw new Error("Invalid error message");
        }
        onError(new Error("ERROR: A fatal error happened: " + body.data));
        break;
      }

      case "done": {
        if (currentBrowser !== undefined) {
          currentBrowser.kill("SIGKILL");
          currentBrowser = undefined;
        }
        onFinished(results);
        break;
      }

      case "suite": {
        if (typeof body.data !== "string") {
          throw new Error("Invalid suite message");
        }
        /* eslint-disable-next-line no-console */
        console.log("\n> test suite:", body.data);
        break;
      }

      case "passed": {
        if (
          body.data == null ||
          body.data.testCase == null ||
          (typeof body.data.timer !== "number" && body.data.timer !== undefined) ||
          typeof body.data.attempt !== "number"
        ) {
          throw new Error("Invalid passed message");
        }
        const parsedCase = assertAndParseTestCase(body.data.testCase);
        onSuccess(parsedCase, body.data.timer, body.data.attempt);
        break;
      }

      case "failed": {
        if (
          body.data == null ||
          body.data.testCase == null ||
          (typeof body.data.timer !== "number" && body.data.timer !== undefined) ||
          typeof body.data.errorStr !== "string"
        ) {
          throw new Error("Invalid failed message");
        }
        const parsedCase = assertAndParseTestCase(body.data.testCase);
        onFailure(parsedCase, body.data.timer, body.data.errorStr);
        break;
      }

      case "skipped": {
        if (body.data == null || body.data.testCase == null) {
          throw new Error("Invalid skipped message");
        }
        const parsedCase = assertAndParseTestCase(body.data.testCase);
        onSkipped(parsedCase);
        break;
      }
    }
  }

  /**
   * Logic called when we are notified that a test failed.
   * @param {Object} testCase
   * @param {number|undefined} timer
   * @param {string} errorStr
   */
  function onFailure(testCase, timer, errorStr) {
    const logStr = `✗ ${testCase.testName} (failed after ${testCase.retry} retries)`;
    /* eslint-disable-next-line no-console */
    console.log(logStr);
    /* eslint-disable-next-line no-console */
    console.log("Error:", errorStr);
    results.failures.push({
      testCase,
      timer,
      errorStr,
    });
  }

  /**
   * Logic called when we are notified that a test succeeded.
   * @param {Object} testCase
   * @param {number|undefined} timer
   * @param {number} attempt
   */
  function onSuccess(testCase, timer, attempt) {
    let logStr = `✓ ${testCase.testName}`;
    if (attempt > 0) {
      logStr += ` (passed on retry ${attempt})`;
    }
    if (timer != null) {
      logStr += ` - in ${timer.toFixed(1)}ms`;
    }
    /* eslint-disable-next-line no-console */
    console.log(logStr);
    results.success.push({ testCase, timer, attempt });
  }

  /**
   * Logic called when we are notified that a test was skipped.
   * @param {Object} testCase
   */
  function onSkipped(testCase) {
    /* eslint-disable-next-line no-console */
    console.log(`⊘ ${testCase.testName} (skipped)`);
    results.skipped.push({ testCase });
  }

  /**
   * Add CORS headers, Content-Length, body, HTTP status and answer with the
   * Response Object given.
   * @param {Response} response
   * @param {number} status
   * @param {*} body
   */
  function answerWithCORS(response, status, body) {
    if (Buffer.isBuffer(body)) {
      response.setHeader("Content-Length", body.byteLength);
    }
    response.writeHead(status, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    if (body !== undefined) {
      response.end(body);
    } else {
      response.end();
    }
  }
}

/**
 * Build the bundle where tests will run.
 * @param {string} inputFile - The test input file to bundle.
 * @param {number} contentServerPort - The port used by the content server.
 * @param {Object} options
 * @param {Object} options.output - The output file
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production=true] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @returns {Promise}
 */
async function createTestBundle(inputFile, contentServerPort, options) {
  const minify = !!options.minify;
  try {
    await runBundler(inputFile, {
      minify,
      silent: true,
      globalScope: false,
      production: options.production ?? true,
      watch: false,
      outfile: path.join(currentDirectory, options.output),
      globals: {
        __TEST_CONTENT_SERVER__: JSON.stringify({
          URL: "127.0.0.1",
          PORT: String(contentServerPort),
        }),
      },
    });
  } catch (err) {
    throw new Error(`Build failed: ${err}`);
  }
}

/**
 * @param {*} data
 * @returns {Object}
 */
function assertAndParseTestCase(data) {
  if (
    data == null ||
    typeof data.testName !== "string" ||
    (typeof data.timeout !== "number" && data.timeout !== undefined) ||
    typeof data.retry !== "number" ||
    !Array.isArray(data.suiteStack) ||
    data.suiteStack.some((s) => typeof s !== "string")
  ) {
    throw new Error("Invalid test case");
  }
  return {
    testName: data.testName,
    timeout: data.timeout,
    retry: data.retry,
    suiteStack: data.suiteStack,
  };
}

/**
 * Display information to stdout/stderr on the test results in its globality.
 * To call once tests have all run.
 * @param {Object} results
 */
function diplayResults(results) {
  /* eslint-disable no-console */
  if (results.success.length === 0) {
    console.log();
    if (results.skipped.length > 0) {
      if (results.skipped.length === 1) {
        console.log(`The only test was skipped.`);
      } else {
        console.log(`No test ran, ${results.skipped.length} tests were skipped`);
      }
    } else {
      console.log("The given input file has no test!");
    }
  } else if (results.failures.length === 0) {
    console.log();
    if (results.success.length === 1) {
      console.log("1 test passed!");
    } else {
      console.log(`All ${results.success.length} tests passed!`);
    }
    if (results.skipped.length > 0) {
      if (results.skipped.length === 1) {
        console.log(`(1 test was skipped)`);
      } else {
        console.log(`(${results.skipped.length} tests were skipped)`);
      }
    }
  } else {
    console.log();
    if (results.failures.length === 1) {
      console.log(`>> There is 1 test failure:`);
    } else {
      console.log(`>> There are ${results.failures.length} test failures:`);
    }
    console.log();
    for (let i = 0; i < results.failures.length; i++) {
      const failure = results.failures[i];
      console.log(`${i + 1} / ${results.failures.length}`);
      if (failure.testCase.suiteStack.length > 0) {
        console.log("From suite: " + "> " + failure.testCase.suiteStack.join(" > "));
      }
      console.log(`✗ ${failure.testCase.testName}\n`);
      console.log("Error Message:");
      console.log(failure.errorStr);
      console.log();
      console.log("---");
      console.log();
    }
    throw new Error("The test suite failed");
  }
  /* eslint-enable no-console */
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);

  let resultServerPort = DEFAULT_RESULT_SERVER_PORT;
  let contentServerPort = DEFAULT_CONTENT_SERVER_PORT;
  let testPagePort = DEFAULT_TEST_PAGE_PORT;

  /**
   * @param {string|undefined} input
   * @param {string} flagName
   * @returns {number}
   */
  const parsePort = (input, flagName) => {
    if (input === undefined) {
      // eslint-disable-next-line no-console
      console.error(`ERROR: no port provided to ${flagName} flag\n`);
      displayHelp();
      process.exit(1);
    }
    const port = +input;
    if (isNaN(port)) {
      // eslint-disable-next-line no-console
      console.error(
        `ERROR: Invalid port configured for flag ${flagName}. Should be a number, received "` +
          input +
          '"\n',
      );
      displayHelp();
      process.exit(1);
    }
    return port;
  };

  /** @type {Array.<string>} */
  const inputFiles = [];

  let browser = "chrome";
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;

      case "--result-port":
        argOffset++;
        resultServerPort = parsePort(args[argOffset], currentArg);
        break;

      case "--page-port":
        argOffset++;
        testPagePort = parsePort(args[argOffset], currentArg);
        break;

      case "--content-port":
        argOffset++;
        contentServerPort = parsePort(args[argOffset], currentArg);
        break;

      case "--browser":
        argOffset++;
        if (!["chrome", "firefox"].includes(args[argOffset])) {
          // eslint-disable-next-line no-console
          console.error(
            `ERROR: Invalid browser configured: should be either "chrome" or "firefox", received: ` +
              args[argOffset] +
              '"\n',
          );
          displayHelp();
          process.exit(1);
        }
        browser = args[argOffset];
        break;

      case "--":
        argOffset = args.length;
        break;

      default:
        inputFiles.push(args[argOffset]);
        break;
    }
  }

  if (inputFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Error: No input file provided");
    displayHelp();
    process.exit(1);
  } else if (inputFiles.length > 1) {
    // eslint-disable-next-line no-console
    console.error("Error: Too many input files provided:\n" + inputFiles.join("\n"));
    displayHelp();
    process.exit(1);
  }

  runTests({
    inputFile: inputFiles[0],
    browser,
    resultServerPort,
    contentServerPort,
    testPagePort,
  })
    .then(diplayResults)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Error:", err);
      return process.exit(1);
    });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  // eslint-disable-next-line no-console
  console.log(
    `Usage: node run-tests.mjs [options] <TEST_FILE_PATH>

Available options:
  -h, --help                 Display this help message
  --browser <BROWSER>        The browser to run the tests on.
                             Can be "chrome" or "firefox".
                             "chrome" by default.
  --result-port <NUMBER>     Configure the port used to send/receive test results.
                             ${DEFAULT_RESULT_SERVER_PORT} by default.
  --page-port <NUMBER>       Configure the port used to serve the test page.
                             ${DEFAULT_TEST_PAGE_PORT} by default.
  --content-port <NUMBER>    Configure the port used to serve test contents.
                             ${DEFAULT_CONTENT_SERVER_PORT} by default.

Examples:
  # Running a test file
  node run-tests.mjs ./index.test.js

  # Running a test file on firefox
  node run-tests.mjs --browser firefox ./index.test.js

  # Running a test file with another test page port
  node run-tests.mjs --page-port 12345 ./test1.js ./test2.js`,
  );
}
