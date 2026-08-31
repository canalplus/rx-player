#!/usr/bin/env node

import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as fsProm from "fs/promises";
import { createServer } from "http";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import runChrome from "../../scripts/run_chrome.mjs";
import runFirefox from "../../scripts/run_firefox.mjs";
import launchStaticServer from "../../scripts/launch_static_server.mjs";
import removeDir from "../../scripts/utils/remove_dir.mjs";
import runBundler from "../../scripts/run_bundler.mjs";
import createContentServer from "../contents/server.mjs";

/**
 * Path to the directory this script is currently in.
 * The same path should contain the `./current.html` and `./previous.js` pages
 * and will contain our `./current.js` and `./previous.js` test page bundles.
 */
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Default port of the HTTP server which will serve local contents. */
const DEFAULT_CONTENT_SERVER_PORT = 3000;

/** Default port of the HTTP server which will serve the test files */
const DEFAULT_TEST_PAGE_PORT = 8080;

/** Default port of the HTTP server which will be used to exchange about test results. */
const DEFAULT_RESULT_SERVER_PORT = 6789;

/**
 * Number of times test are runs on each browser/RxPlayer configuration.
 * More iterations means (much) more time to perform tests, but also produce
 * better estimates.
 *
 * TODO: GitHub actions fails when running the 128th browser. Find out why.
 */
const TEST_ITERATIONS = 30;

/**
 * `ChildProcess` instance of the current browser being run.
 * `undefined` if no browser is currently being run.
 */
let currentBrowser;

/**
 * Contains "tasks" which are function each run inside a new browser process.
 * Task are added by groups of two:
 *   - the first one testing the current player build
 *   - the second one testing the last RxPlayer production version.
 */
const tasks = [];

/**
 * Store results of the performance tests in two arrays:
 *   - "current" contains the test results of the current RxPlayer version
 *   - "previous" contains the test results of the last RxPlayer version
 */
const allSamples = {
  current: [],
  previous: [],
};

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);

  let resultServerPort = DEFAULT_RESULT_SERVER_PORT;
  let contentServerPort = DEFAULT_CONTENT_SERVER_PORT;
  let testPagePort = DEFAULT_TEST_PAGE_PORT;

  let browser;
  let branchName;
  let remote;
  let reportFile;
  /**
   * @param {string|undefined} input
   * @param {string} flagName
   * @returns {number}
   */
  const parsePort = (input, flagName) => {
    if (input === undefined) {
      /* eslint-disable-next-line no-console */
      console.error(`ERROR: no port provided to ${flagName} flag\n`);
      displayHelp();
      process.exit(1);
    }
    const port = +input;
    if (isNaN(port)) {
      /* eslint-disable-next-line no-console */
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

      case "-b":
      case "--branch":
        argOffset++;
        branchName = args[argOffset];
        if (branchName === undefined) {
          // eslint-disable-next-line no-console
          console.error("ERROR: no branch name provided\n");
          displayHelp();
          process.exit(1);
        }
        break;

      case "-u":
      case "--remote-git-url":
        argOffset++;
        remote = args[argOffset];
        if (remote === undefined) {
          // eslint-disable-next-line no-console
          console.error("ERROR: no remote URL provided\n");
          displayHelp();
          process.exit(1);
        }
        break;

      case "-r":
      case "--report":
        {
          argOffset++;
          reportFile = args[argOffset];
          if (reportFile === undefined) {
            // eslint-disable-next-line no-console
            console.error("ERROR: no file path provided\n");
            displayHelp();
            process.exit(1);
          }
        }
        break;

      case "--browser":
        argOffset++;
        if (!["chrome", "firefox"].includes(args[argOffset])) {
          /* eslint-disable-next-line no-console */
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
        // eslint-disable-next-line no-console
        console.error("ERROR: Unrecognized flag:", currentArg);
        displayHelp();
        process.exit(1);
    }
  }

  initializePerformanceTestsPages({
    branchName: branchName ?? "dev",
    remoteGitUrl: remote,
    contentServerPort,
  })
    .then(() =>
      runPerformanceTests({ browser, contentServerPort, resultServerPort, testPagePort }),
    )
    .then(async (results) => {
      /* eslint-disable no-console */
      /** Contain results on the second run if it is done */
      let results2 = null;
      if (results.worse.length > 0) {
        console.warn(
          "\nWorse performance for tests:\n\n" +
            formatResultAsMarkdownTable(results.worse),
        );
      }
      if (results.better.length > 0) {
        console.log(
          "\nBetter performance for tests:\n\n" +
            formatResultAsMarkdownTable(results.better),
        );
      }
      if (results.notSignificative.length > 0) {
        console.log(
          "\nNo significative change in performance for tests:\n\n" +
            formatResultAsMarkdownTable(results.notSignificative),
        );
      }

      if (results.worse.length === 0) {
        await writeHtmlReportIfneeded();
        process.exit(0);
      }

      console.warn("\nRetrying one time just to check if unlucky...");

      results2 = await runPerformanceTests(browser);
      console.error("\nFinal result after 2 attempts\n-----------------------------\n");

      if (results.better.length > 0) {
        console.error(
          "\nBetter performance at first attempt for tests:\n\n" +
            formatResultAsMarkdownTable(results.better),
        );
      }
      if (results2.better.length > 0) {
        console.error(
          "\nBetter performance at second attempt for tests:\n\n" +
            formatResultAsMarkdownTable(results2.better),
        );
      }

      if (results.worse.length > 0) {
        console.error(
          "\nWorse performance at first attempt for tests:\n\n" +
            formatResultAsMarkdownTable(results.worse),
        );
      }
      if (results2.worse.length > 0) {
        console.warn(
          "\nWorse performance at second attempt for tests:\n\n" +
            formatResultAsMarkdownTable(results.worse),
        );
      }

      for (const failure1 of results.worse) {
        if (results2.worse.some((r) => r.testName === failure1.testName)) {
          await writeHtmlReportIfneeded();
          process.exit(1);
        }
      }
      await writeHtmlReportIfneeded();
      process.exit(0);

      /**
       * This script may optionally output an HTML report of tests results.
       *
       * Call this function before exiting so we'll produce that file if needed
       * The returned Promise should never reject.
       * @returns {Promise}
       */
      async function writeHtmlReportIfneeded() {
        if (reportFile !== undefined) {
          try {
            let commitSha = await execCommandAndGetFirstOutput("git rev-parse HEAD");
            if (commitSha) {
              commitSha = commitSha.trim();
            }
            const htmlReport = formatHtmlReport({
              success:
                results.worse.length === 0 &&
                (results2 === undefined ||
                  results2 === null ||
                  results2.worse.length === 0),
              baseBranch: branchName,
              commitSha,
              firstRun: results,
              secondRun: results2,
            });
            fs.writeFileSync(reportFile, htmlReport);
          } catch (err) {
            console.error(`WARNING: Cannot write report: ${err.toString()}`);
          }
        }
      }
    })
    .catch((err) => {
      console.error("Error:", err);
      return process.exit(1);
    });
  /* eslint-enable no-console */
}

/**
 * Take test results as outputed by performance tests and output a markdown
 * table listing them in hopefully a readable way.
 * @param {Array.<Object>} results
 * @returns {string}
 */
function formatResultAsMarkdownTable(results) {
  if (results.length === 0) {
    return "";
  }
  const testNames = results.map((r) => r.testName);
  const meanResult = results.map(
    (r) =>
      `${r.previousMean.toFixed(2)}ms -> ${r.currentMean.toFixed(2)}ms ` +
      `(${r.meanDifferenceMs.toFixed(3)}ms, z: ${r.zScore.toFixed(5)})`,
  );
  const medianResult = results.map(
    (r) => `${r.previousMedian.toFixed(2)}ms -> ${r.currentMedian.toFixed(2)}ms`,
  );

  const nameColumnInnerLength = Math.max(
    testNames.reduce((acc, t) => Math.max(acc, t.length), 0) + 2 /* margin */,
    " Name ".length,
  );
  const meanColumnInnerLength = Math.max(
    meanResult.reduce((acc, t) => Math.max(acc, t.length), 0) + 2 /* margin */,
    " Mean ".length,
  );
  const medianColumnInnerLength = Math.max(
    medianResult.reduce((acc, t) => Math.max(acc, t.length), 0) + 2 /* margin */,
    " Median ".length,
  );

  let str;

  {
    // Table header
    const nameWhitespaceLength = (nameColumnInnerLength - "Name".length) / 2;
    const meanWhitespaceLength = (meanColumnInnerLength - "Mean".length) / 2;
    const medianWhitespaceLength = (medianColumnInnerLength - "Median".length) / 2;
    str =
      "|" +
      " ".repeat(Math.floor(nameWhitespaceLength)) +
      "Name" +
      " ".repeat(Math.ceil(nameWhitespaceLength)) +
      "|" +
      " ".repeat(Math.floor(meanWhitespaceLength)) +
      "Mean" +
      " ".repeat(Math.ceil(meanWhitespaceLength)) +
      "|" +
      " ".repeat(Math.floor(medianWhitespaceLength)) +
      "Median" +
      " ".repeat(Math.ceil(medianWhitespaceLength)) +
      "|\n" +
      "|" +
      "-".repeat(nameColumnInnerLength) +
      "|" +
      "-".repeat(meanColumnInnerLength) +
      "|" +
      "-".repeat(medianColumnInnerLength) +
      "|";
  }
  for (let i = 0; i < results.length; i++) {
    str += "\n";
    const nameWhitespaceLength = (nameColumnInnerLength - testNames[i].length) / 2;
    const meanWhitespaceLength = (meanColumnInnerLength - meanResult[i].length) / 2;
    const medianWhitespaceLength = (medianColumnInnerLength - medianResult[i].length) / 2;
    str +=
      "|" +
      " ".repeat(Math.floor(nameWhitespaceLength)) +
      testNames[i] +
      " ".repeat(Math.ceil(nameWhitespaceLength)) +
      "|" +
      " ".repeat(Math.floor(meanWhitespaceLength)) +
      meanResult[i] +
      " ".repeat(Math.ceil(meanWhitespaceLength)) +
      "|" +
      " ".repeat(Math.floor(medianWhitespaceLength)) +
      medianResult[i] +
      " ".repeat(Math.ceil(medianWhitespaceLength)) +
      "|";
  }
  return str;
}

/**
 * Initialize and start all tests on a browser..
 * @param {Object} params
 * @param {string} [params.browser="chrome"] - The browser to run the tests on.
 * "chrome" by default. Can be either "chrome" or "firefox".
 * @param {number} params.contentServerPort - The port through which test
 * contents are served.
 * @param {number} params.resultServerPort - The port through which test
 * results should be sent.
 * @param {number} params.testPagePort - The port through which the test page
 * is acceeded.
 * @returns {Promise.<Object>}
 */
function runPerformanceTests({
  browser = "chrome",
  contentServerPort = DEFAULT_CONTENT_SERVER_PORT,
  resultServerPort = DEFAULT_RESULT_SERVER_PORT,
  testPagePort = DEFAULT_TEST_PAGE_PORT,
}) {
  return new Promise((resolve, reject) => {
    let isFinished = false;
    let contentServer;
    let resultServer;
    let staticServer;

    const onFinished = () => {
      isFinished = true;
      closeServers();
      const results = compareSamples();
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

    initServers({
      contentServerPort,
      testPagePort,
      resultServerPort,
      onFinished,
      onError,
    })
      .then((servers) => {
        contentServer = servers.contentServer;
        resultServer = servers.resultServer;
        staticServer = servers.staticServer;
        if (isFinished) {
          closeServers();
        }
        return startAllTests({ browser, testPagePort, resultServerPort });
      })
      .catch(onError);
  });
}

/**
 * Initialize all servers used for the performance tests.
 * @param {Object} params
 * @param {number} params.contentServerPort - The port through which test
 * contents are served.
 * @param {number} params.resultServerPort - The port through which test
 * results should be sent.
 * @param {number} params.testPagePort - The port through which the test page
 * is acceeded.
 * @param {Function} params.onFinished
 * @param {function} params.onError
 * @returns {Promise} - Resolves when all servers are listening.
 */
async function initServers({
  contentServerPort,
  testPagePort,
  resultServerPort,
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
    resultServer = createResultServer({ port: resultServerPort, onFinished, onError });
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
 * Prepare all scripts needed for the performance tests.
 * @param {Object} opts - Various options for scripts initialization.
 * @param {number} params.contentServerPort - Port on which media content is
 * served.
 * @param {string} opts.branchName - The name of the branch results should be
 * compared to.
 * @param {string} [opts.remoteGitUrl] - The git URL where the current
 * repository can be cloned for comparisons.
 * The one for the current git repository by default.
 * @returns {Promise} - Resolves when the initialization is finished.
 */
async function initializePerformanceTestsPages({
  branchName,
  remoteGitUrl,
  contentServerPort,
}) {
  await prepareLastRxPlayerTests({ branchName, remoteGitUrl, contentServerPort });
  await prepareCurrentRxPlayerTests({ contentServerPort });
}

/**
 * Build test file for testing the current RxPlayer.
 * @param {Object} params
 * @param {number} params.contentServerPort - Port on which media content is
 * served.
 * @returns {Promise}
 */
async function prepareCurrentRxPlayerTests({ contentServerPort }) {
  await linkCurrentRxPlayer();
  await createBundle({
    output: "current.js",
    contentServerPort,
    minify: true,
    production: true,
  });
}

/**
 * Build test file for testing the last version of the RxPlayer.
 * @param {Object} opts - Various options.
 * @param {string} opts.branchName - The name of the branch results should be
 * compared to.
 * @param {number} params.contentServerPort - Port on which media content is
 * served.
 * @param {string} [opts.remoteGitUrl] - The git URL where the current
 * repository can be cloned for comparisons.
 * The one for the current git repository by default.
 * @returns {Promise}
 */
async function prepareLastRxPlayerTests({ branchName, contentServerPort, remoteGitUrl }) {
  await linkRxPlayerBranch({ branchName, remoteGitUrl });
  await createBundle({
    contentServerPort,
    output: "previous.js",
    minify: true,
    production: true,
  });
}

/**
 * Link the current RxPlayer to the performance tests, so its performance can be
 * tested.
 * @returns {Promise}
 */
async function linkCurrentRxPlayer() {
  const rootDir = path.join(currentDirectory, "..", "..");
  await removeDir(path.join(rootDir, "dist"));

  const innerNodeModulesPath = path.join(currentDirectory, "node_modules");
  await removeDir(innerNodeModulesPath);
  await fsProm.mkdir(innerNodeModulesPath);
  const rxPlayerPath = path.join(innerNodeModulesPath, "rx-player");
  await spawnProc("npm", ["run", "build"], {
    parseError: (code) => new Error(`npm run build exited with code ${code}`),
  }).promise;
  await fsProm.symlink(path.join(currentDirectory, "..", ".."), rxPlayerPath);
}

/**
 * Link the last published RxPlayer version to the performance tests, so
 * performance of new code can be compared to it.
 * @param {Object} opts - Various options.
 * @param {string} opts.branchName - The name of the branch results should be
 * compared to.
 * @param {string} [opts.remoteGitUrl] - The git URL where the current
 * repository can be cloned for comparisons.
 * The one for the current git repository by default.
 * @returns {Promise}
 */
async function linkRxPlayerBranch({ branchName, remoteGitUrl }) {
  const rootDir = path.join(currentDirectory, "..", "..");
  await removeDir(path.join(rootDir, "dist"));

  const innerNodeModulesPath = path.join(currentDirectory, "node_modules");
  await removeDir(innerNodeModulesPath);
  await fsProm.mkdir(innerNodeModulesPath);
  const rxPlayerPath = path.join(innerNodeModulesPath, "rx-player");
  let url =
    remoteGitUrl ??
    (await execCommandAndGetFirstOutput("git config --get remote.origin.url"));
  url = url.trim();
  await spawnProc("git", ["clone", "--depth", "1", "-b", branchName, url, rxPlayerPath], {
    parseError: (code) => new Error(`git clone exited with code ${code}`),
  }).promise;
  await spawnProc("npm", ["install"], {
    cwd: rxPlayerPath,
    parseError: (code) => new Error(`npm install failed with code ${code}`),
  }).promise;
  await spawnProc("npm", ["run", "build"], {
    cwd: rxPlayerPath,
    parseError: (code) => new Error(`npm run build exited with code ${code}`),
  }).promise;

  // GitHub actions, for unknown reasons, want to use the root's `dist` directory
  // TODO: find why
  await fsProm.symlink(
    path.join(rxPlayerPath, "dist"),
    path.join(currentDirectory, "..", "..", "dist"),
  );
}

/**
 * Build the `tasks` array and start all tests on the given browser.
 * @param {Object} params
 * @param {string} params.browser - The web browser to run those tests on. Can
 * be either "chrome" or "firefox".
 * @param {number} params.resultServerPort - The port through which test
 * results should be sent.
 * @param {number} params.testPagePort - The port through which the test page
 * is acceeded.
 * @returns {Promise}
 */
async function startAllTests({ browser, testPagePort, resultServerPort }) {
  tasks.length = 0;
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    tasks.push(() =>
      startIteration({
        browser,
        startWithCurrent: i % 2 === 0,
        iteration: i + 1,
        total: TEST_ITERATIONS,
        testPagePort,
        resultServerPort,
      }),
    );
  }
  if (tasks.length === 0) {
    throw new Error("No task scheduled");
  }
  return tasks.shift()();
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
 * Starts the next function in the `tasks` array.
 * If no task are available anymore, call the `onFinished` callback.
 * @param {Function} onFinished
 */
function startNextTaskOrFinish(onFinished) {
  const nextTask = tasks.shift();
  if (nextTask === undefined) {
    onFinished();
  }
  return nextTask();
}

/**
 * Start browser running performance tests.
 * @param {Object} params
 * @param {boolean} params.startWithCurrent - If `true` we will begin with
 * tests on the current build. If `false` we will start with the previous
 * build. We will then alternate.
 * The global idea is to ensure we're testing both cases as to remove some
 * potential for lower performances due e.g. to browser internal logic.
 * @param {string} params.browser - The web browser to run those tests on.
 * Can be either "chrome" or "firefox".
 * @param {number} params.iteration - The current test iteration, starting
 * from `1` to `total`. Used to indicate progress.
 * @param {number} params.total - The maximum number of iterations. Used to
 * indicate progress.
 * @returns {Promise}
 */
async function startIteration({
  browser,
  startWithCurrent,
  iteration,
  total,
  testPagePort,
  resultServerPort,
}) {
  if (currentBrowser !== undefined) {
    currentBrowser.kill("SIGKILL");
  }
  const url = startWithCurrent
    ? `http://localhost:${testPagePort}/current.html#p=${resultServerPort};`
    : `http://localhost:${testPagePort}/previous.html#p=${resultServerPort};`;
  if (browser === "firefox") {
    // eslint-disable-next-line no-console
    console.log(`Running tests on Firefox (${iteration}/${total})`);
    currentBrowser = await runFirefox(url, {
      headless: true,
      enableAutoPlay: true,
    }).catch((err) => {
      throw new Error("Could not launch page on Firefox: " + err.toString());
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(`Running tests on Chrome (${iteration}/${total})`);
    currentBrowser = await runChrome(url, {
      headless: true,
      enableAutoPlay: true,
    }).catch((err) => {
      throw new Error("Could not launch page on Chrome: " + err.toString());
    });
  }
}

/**
 * Create HTTP server which will receive test results and react appropriately.
 * @param {Object} params
 * @param {number} params.port
 * @param {Function} params.onFinished
 * @param {function} params.onError
 * @returns {Object}
 */
function createResultServer({ port, onFinished, onError }) {
  const server = createServer(onRequest);
  return {
    listeningPromise: new Promise((res) => {
      server.listen(port, function () {
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
        try {
          const parsedBody = JSON.parse(body);
          if (parsedBody.type === "log") {
            // eslint-disable-next-line no-console
            console.warn("LOG:", parsedBody.data);
          } else if (parsedBody.type === "error") {
            onError(new Error("ERROR: A fatal error happened: " + parsedBody.data));
            return;
          } else if (parsedBody.type === "done") {
            if (currentBrowser !== undefined) {
              currentBrowser.kill("SIGKILL");
              currentBrowser = undefined;
            }
            if (allSamples.previous.length > 0 && allSamples.current.length > 0) {
              compareSamples();
            }
            startNextTaskOrFinish(onFinished).catch(onError);
          } else if (parsedBody.type === "value") {
            let page;
            if (parsedBody.page === "current") {
              page = "current";
            } else if (parsedBody.page === "previous") {
              page = "previous";
            } else {
              onError(new Error("Unknown page: " + parsedBody.page));
              return;
            }
            allSamples[page].push(parsedBody.data);
          }
          answerWithCORS(response, 200, "OK");
          return;
        } catch (err) {
          answerWithCORS(response, 500, "Invalid data format.");
          return;
        }
      });
    }
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
 * Construct array from the given list which contains both the value and a added
 * `rank` property useful for the Mann–Whitney U test.
 * @param {Array.<number>} list
 * @returns {Array.<Object>}
 */
function rankSamples(list) {
  list.sort((a, b) => a - b);
  const withRank = list.map(function (item, index) {
    return {
      rank: index + 1,
      value: item,
    };
  });

  for (let i = 0; i < withRank.length;) {
    let count = 1;
    let total = withRank[i].rank;

    for (
      let j = 0;
      withRank[i + j + 1] !== undefined &&
      withRank[i + j].value === withRank[i + j + 1].value;
      j++
    ) {
      total += withRank[i + j + 1].rank;
      count++;
    }

    const rank = total / count;
    for (let k = 0; k < count; k++) {
      withRank[i + k].rank = rank;
    }

    i = i + count;
  }

  return withRank;
}

/**
 * Compare both elements of `allSamples` and display comparative results.
 * Returns false if any of the tested scenario had a significant performance
 * regression.
 * @returns {Object}
 */
function compareSamples() {
  const samplesPerScenario = {
    current: getSamplePerScenarios(allSamples.current),
    previous: getSamplePerScenarios(allSamples.previous),
  };

  const results = {
    worse: [],
    better: [],
    notSignificative: [],
  };
  for (const testName of Object.keys(samplesPerScenario.current)) {
    const sampleCurrent = samplesPerScenario.current[testName];
    const samplePrevious = samplesPerScenario.previous[testName];
    if (samplePrevious === undefined) {
      // eslint-disable-next-line no-console
      console.error("Error: second result misses a scenario:", testName);
      continue;
    }
    const resultCurrent = getResultsForSample(sampleCurrent);
    const resultPrevious = getResultsForSample(samplePrevious);

    const medianDiffMs = resultPrevious.median - resultCurrent.median;
    const meanDiffMs = resultPrevious.mean - resultCurrent.mean;
    const uValue = getUValueFromSamples(sampleCurrent, samplePrevious);
    const zScore = Math.abs(
      calculateZScore(uValue, sampleCurrent.length, samplePrevious.length),
    );
    // For p-value of 5%
    // const isSignificant = zScore > 1.96;
    // For p-value of 1%
    const isSignificant = zScore > 2.575829;

    /* eslint-disable no-console */
    console.log("");
    console.log(`> Current results for test:`, testName);
    console.log("");
    console.log("    For current Player:");
    console.log(`      mean: ${resultCurrent.mean}`);
    console.log(`      median: ${resultCurrent.median}`);
    console.log(`      variance: ${resultCurrent.variance}`);
    console.log(`      standard deviation: ${resultCurrent.standardDeviation}`);
    console.log(`      standard error of mean: ${resultCurrent.standardErrorOfMean}`);
    console.log(`      moe: ${resultCurrent.moe}`);
    console.log("");
    console.log("    For previous Player:");
    console.log(`      mean: ${resultPrevious.mean}`);
    console.log(`      median: ${resultPrevious.median}`);
    console.log(`      variance: ${resultPrevious.variance}`);
    console.log(`      standard deviation: ${resultPrevious.standardDeviation}`);
    console.log(`      standard error of mean: ${resultPrevious.standardErrorOfMean}`);
    console.log(`      moe: ${resultPrevious.moe}`);
    console.log("");
    console.log("    Results");
    console.log(`      mean difference time (negative is slower): ${meanDiffMs} ms`);
    if (isSignificant) {
      console.log(`      The difference is significant (z: ${zScore})`);
      if (meanDiffMs < -2 && medianDiffMs < -2) {
        results.worse.push({
          testName,
          previousMean: resultPrevious.mean,
          currentMean: resultCurrent.mean,
          previousMedian: resultPrevious.median,
          currentMedian: resultCurrent.median,
          meanDifferenceMs: meanDiffMs,
          zScore,
        });
      } else if (meanDiffMs > 2 && medianDiffMs > 2) {
        results.better.push({
          testName,
          previousMean: resultPrevious.mean,
          currentMean: resultCurrent.mean,
          previousMedian: resultPrevious.median,
          currentMedian: resultCurrent.median,
          meanDifferenceMs: meanDiffMs,
          zScore,
        });
      } else {
        results.notSignificative.push({
          testName,
          previousMean: resultPrevious.mean,
          currentMean: resultCurrent.mean,
          previousMedian: resultPrevious.median,
          currentMedian: resultCurrent.median,
          meanDifferenceMs: meanDiffMs,
          zScore,
        });
      }
    } else {
      console.log(`      The difference is not significant (z: ${zScore})`);
      results.notSignificative.push({
        testName,
        previousMean: resultPrevious.mean,
        currentMean: resultCurrent.mean,
        previousMedian: resultPrevious.median,
        currentMedian: resultCurrent.median,
        meanDifferenceMs: meanDiffMs,
        zScore,
      });
    }
    console.log("");
  }
  /* eslint-enable no-console */
  return results;
  function calculateZScore(u, len1, len2) {
    return (u - (len1 * len2) / 2) / Math.sqrt((len1 * len2 * (len1 + len2 + 1)) / 12);
  }
}

/**
 * Calculate U value from the Mann–Whitney U test from two samples.
 * @param {Array.<number>} sampleCurrent
 * @param {Array.<number>} samplePrevious
 * @returns {number}
 */
function getUValueFromSamples(sampleCurrent, samplePrevious) {
  const concatSamples = sampleCurrent.concat(samplePrevious);
  const ranked = rankSamples(concatSamples);

  const summedRanks1 = sumRanks(ranked, sampleCurrent);
  const summedRanks2 = sumRanks(ranked, samplePrevious);
  const n1 = sampleCurrent.length;
  const n2 = samplePrevious.length;

  const u1 = calculateUValue(summedRanks1, n1, n2);
  const u2 = calculateUValue(summedRanks2, n2, n1);

  function calculateUValue(rank, currLen, otherLen) {
    return currLen * otherLen + (currLen * (currLen + 1)) / 2 - rank;
  }
  return Math.min(u1, u2);

  function sumRanks(rankedList, observations) {
    const remainingToFind = observations.slice();
    let rank = 0;
    rankedList.forEach(function (observation) {
      const index = remainingToFind.indexOf(observation.value);
      if (index > -1) {
        rank += observation.rank;
        remainingToFind.splice(index, 1);
      }
    });
    return rank;
  }
}

/**
 * Construct a "result object" from the given sample.
 * That object will contain various useful information like the mean,
 * standard deviation, and so on.
 * @param {Array.<number>} sample
 * @returns {Object}
 */
function getResultsForSample(sample) {
  sample.sort();
  let median;
  if (sample.length === 0) {
    median = 0;
  } else {
    median =
      sample.length % 2 === 0
        ? sample[sample.length / 2 - 1] + sample[sample.length / 2] / 2
        : sample[Math.floor(sample.length / 2)];
  }
  const mean = sample.reduce((acc, x) => acc + x, 0) / sample.length;
  const variance =
    sample.reduce((acc, x) => {
      return acc + Math.pow(x - mean, 2);
    }, 0) /
      (sample.length - 1) || 0;
  const standardDeviation = Math.sqrt(variance);
  const standardErrorOfMean = standardDeviation / Math.sqrt(sample.length);
  const criticalVal = 1.96;
  const moe = standardErrorOfMean * criticalVal;
  return { mean, median, variance, standardErrorOfMean, standardDeviation, moe };
}

/**
 * Transform the sample object given to divide sample numbers per scenario (the
 * `name` property).
 * In the returned object, keys will be the scenario's name and value will be
 * the array of results (in terms of number) for that scenario.
 * @param {Array.<Object>} samplesObj
 * @returns {Array.<Object>}
 */
function getSamplePerScenarios(samplesObj) {
  return samplesObj.reduce((acc, x) => {
    if (acc[x.name] === undefined) {
      acc[x.name] = [x.value];
    } else {
      acc[x.name].push(x.value);
    }
    return acc;
  }, {});
}

/**
 * Build the performance tests.
 * @param {Object} options
 * @param {Object} options.output - The output file
 * @param {number} options.contentServerPort - Port on which media content is
 * served.
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production=true] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @returns {Promise}
 */
async function createBundle(options) {
  const minify = !!options.minify;
  try {
    await runBundler(path.join(currentDirectory, "src", "main.js"), {
      minify,
      silent: true,
      globalScope: false,
      production: options.production ?? true,
      watch: false,
      outfile: path.join(currentDirectory, options.output),
      globals: {
        __TEST_CONTENT_SERVER__: JSON.stringify({
          URL: "127.0.0.1",
          PORT: String(options.contentServerPort),
        }),
      },
    });
  } catch (err) {
    throw new Error(`Performance build failed: ${err}`);
  }
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Object} [params]
 * @param {string|undefined} [params.cwd]
 * @param {Function|undefined} [params.parseError]
 * @returns {Object}
 */
function spawnProc(command, args, { cwd, parseError } = {}) {
  let child;
  const prom = new Promise((res, rej) => {
    child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("close", (code) => {
      if (code !== 0 && typeof parseError === "function") {
        rej(parseError(code));
      }
      res();
    });
  });
  return {
    promise: prom,
    child,
  };
}

function execCommandAndGetFirstOutput(command) {
  return new Promise((res, rej) => {
    exec(command, (error, stdout) => {
      if (error) {
        rej(error);
      } else {
        res(stdout);
      }
    });
  });
}

/**
 * Format the given report object into an readable HTML string.
 * @param {Object} reportObj
 * @returns {string}
 */
function formatHtmlReport(reportObj) {
  let str = "<div>\n";
  str += "  <p>\n";
  if (reportObj.success) {
    str += "    ✅ Automated performance checks have passed ";
  } else {
    str += "    ❌ Automated performance checks have failed ";
  }
  if (reportObj.commitSha && reportObj.baseBranch) {
    str += `on commit <code>${reportObj.commitSha}</code> with the base branch <code>${reportObj.baseBranch}</code>`;
  }
  str += ".\n";
  str += "  </p>\n";
  str += "  <details>\n";
  str += "    <summary>Details</summary>\n\n";
  str += "<h2>Performance tests 1st run output</h2>\n";

  const { firstRun, secondRun } = reportObj;
  if (firstRun.worse.length > 0) {
    str += "\n<p>No significative change in performance for tests:</p>\n\n";
    str += formatResultAsHtmlTable(firstRun.worse);
  }

  if (firstRun.better.length > 0) {
    str += "\n<p>Better performance for tests:</p>\n\n";
    str += formatResultAsHtmlTable(firstRun.better);
  }

  if (firstRun.notSignificative.length > 0) {
    str += "\n<p>No significative change in performance for tests:</p>\n\n";
    str += formatResultAsHtmlTable(firstRun.notSignificative);
  }
  str += "\n";

  if (secondRun) {
    str += "\n";
    str += "<h2>Performance tests 2st run output</h2>\n";
    if (secondRun.worse.length > 0) {
      str += "\n<p>No significative change in performance for tests:</p>\n\n";
      str += formatResultAsHtmlTable(secondRun.worse);
    }

    if (secondRun.better.length > 0) {
      str += "\n<p>Better performance for tests:</p>\n\n";
      str += formatResultAsHtmlTable(secondRun.better);
    }

    if (secondRun.notSignificative.length > 0) {
      str += "\n<p>No significative change in performance for tests:</p>\n\n";
      str += formatResultAsHtmlTable(secondRun.notSignificative);
    }
    str += "\n";
  }
  str += "  </details>\n";
  str += "</div>";
  return str;
}

/**
 * Take test results as outputed by performance tests and output an HTML
 * table listing them.
 * @param {Array.<Object>} results
 * @returns {string}
 */
function formatResultAsHtmlTable(results) {
  if (results.length === 0) {
    return "";
  }
  const testNames = results.map((r) => r.testName);
  const meanResult = results.map(
    (r) =>
      `${r.previousMean.toFixed(2)}ms -> ${r.currentMean.toFixed(2)}ms ` +
      `(${r.meanDifferenceMs.toFixed(3)}ms, z: ${r.zScore.toFixed(5)})`,
  );
  const medianResult = results.map(
    (r) => `${r.previousMedian.toFixed(2)}ms -> ${r.currentMedian.toFixed(2)}ms`,
  );

  let str;
  str = '<table role="table">\n';
  str += "  <thead>\n";
  str += "    <tr>\n";
  str += "      <th>Name</th>\n";
  str += "      <th>Mean</th>\n";
  str += "      <th>Median</th>\n";
  str += "    </tr>\n";
  str += "  </thead>\n";
  str += "  <tbody>\n";

  for (let i = 0; i < results.length; i++) {
    str += "    <tr>\n";
    str += `      <td>${testNames[i]}</td>\n`;
    str += `      <td>${meanResult[i]}</td>\n`;
    str += `      <td>${medianResult[i]}</td>\n`;
    str += "    </tr>\n";
  }
  str += "  </tbody>\n";
  str += "</table>\n";
  return str;
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable-next-line no-console */
  console.log(
    `Usage: node run.mjs [options]
Available options:
  -h, --help                        Display this help message
  -b <branch>, --branch <branch>    Specify the branch name the performance results should be compared to.
                                    Defaults to the "dev" branch.,
  -u <URL>, --remote-git-url <URL>  Specify the remote git URL where the current repository can be cloned from.
                                    Defaults to the current remote URL.
  --browser <BROWSER>               The browser to run the tests on. Can be "chrome" or "firefox".
                                    "chrome" by default.
  --result-port <NUMBER>            Configure the port used to send/receive test results.
                                    ${DEFAULT_RESULT_SERVER_PORT} by default.
  --page-port <NUMBER>              Configure the port used to serve the test page.
                                    ${DEFAULT_TEST_PAGE_PORT} by default.
  --content-port <NUMBER>           Configure the port used to serve test contents.
                                    ${DEFAULT_CONTENT_SERVER_PORT} by default.
  -r <path>, --report <path>        Optional path to HTML file where a report will be written in once done.`,
  );
}
