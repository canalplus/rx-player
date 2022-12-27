#!/usr/bin/env node
/* eslint-env node */

const { exec, spawn } = require("child_process");
const esbuild = require("esbuild");
const fs = require("fs/promises");
const http = require("http");
const path = require("path");
const rimraf = require("rimraf");
const launchStaticServer = require("../../scripts/launch_static_server");
const getHumanReadableHours = require("../../scripts/utils/get_human_readable_hours");
const TestContentServer = require("../contents/server");

/** Port of the HTTP server which will serve local contents. */
const CONTENT_SERVER_PORT = 3000;

/** Port of the HTTP server which will serve the performance test files */
const PERF_TESTS_PORT = 8080;

/**
 * Number of times test are runs on each browser/RxPlayer configuration.
 * More iterations means (much) more time to perform tests, but also produce
 * better estimates.
 */
const TEST_ITERATIONS = 10;

/**
 * After initialization is done, contains the path allowing to run the Chrome
 * browser.
 * @type {string|undefined|null}
 */
let CHROME_CMD;

/**
 * After initialization is done, contains the path allowing to run the Firefox
 * browser.
 * @type {string|undefined|null}
 */
let FIREFOX_CMD;

/** Options used when starting the Chrome browser. */
const CHROME_OPTIONS = [
  "--enable-automation",
  "--no-default-browser-check",
  "--no-first-run",
  "--disable-default-apps",
  "--disable-popup-blocking",
  "--disable-translate",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-device-discovery-notifications",
  "--autoplay-policy=no-user-gesture-required",
  "--headless",
  "--disable-gpu",
  "--disable-dev-shm-usage",

  // We don't even care about that one but Chrome may not launch without this
  // for some unknown reason
  "--remote-debugging-port=9222"
];

/** Options used when starting the Firefox browser. */
const FIREFOX_OPTIONS = [
  "-no-remote",
  "-wait-for-browser",
  "-headless",
  // "--start-debugger-server 6000",
];

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
 * Index of the currently ran task in the `tasks` array.
 * @see tasks
 */
let nextTaskIndex = 0;

/**
 * Store results of the performance tests in two arrays:
 *   - the first one contains the test results of the current RxPlayer version
 *   - the second one contains the test results of the last RxPlayer version
 */
const allSamples = [
  [],
  []
];

/**
 * Current results for the tests being run in `currentBrowser`.
 * Will be added to `allSamples` once those tests are finished.
 */
let currentTestSample = [];

/**
 * Contains references to every launched servers, with a `close` method allowing
 * to close each one of them.
 */
const servers = [];

/**
 * Callback called when all current tasks are finished.
 * This allows to perform several groups of tasks (e.g. per browser).
 */
let onFinished = () => {};

start();

/** Initialize and start all tests on Chrome. */
async function start() {
  await initScripts();
  await initServers();

  onFinished = () => {
    const hasSucceededOnChrome = compareSamples();
    shutdown();
    if (!hasSucceededOnChrome) {
      // eslint-disable-next-line no-console
      console.error("Tests failed on Chrome");
      return process.exit(1);
    }
    return process.exit(0);

    // TODO also run on Firefox? Despite my efforts, I did not succeed to run
    // tests on it.
    // onFinished = async () => {
    //   shutdown();
    //   const hasSucceededOnFirefox = compareSamples();
    //   if (!hasSucceededOnChrome || !hasSucceededOnFirefox) {
    //     // eslint-disable-next-line no-console
    //     console.error("Tests failed on:" +
    //                   (!hasSucceededOnChrome ? " Chrome" : "") +
    //                   (!hasSucceededOnFirefox ? " Firefox" : ""));
    //     return process.exit(1);
    //   }
    //   return process.exit(0);
    // };
    // startAllTestsOnFirefox();
  };

  startAllTestsOnChrome();
}

/**
 * Initialize all servers used for the performance tests.
 * @returns {Promise} - Resolves when all servers are listening.
 */
async function initServers() {
  const contentServer = TestContentServer(CONTENT_SERVER_PORT);
  const staticServer = launchStaticServer(__dirname, {
    httpPort: PERF_TESTS_PORT,
  });
  const resultServer = createResultServer();
  servers.push(contentServer, staticServer, resultServer);
  await Promise.all([
    contentServer.listeningPromise,
    staticServer.listeningPromise,
    resultServer.listeningPromise,
  ]);
}

/**
 * Prepare all scripts needed for the performance tests.
 * @returns {Promise} - Resolves when the initialization is finished.
 */
async function initScripts() {
  await prepareCurrentRxPlayerTests();
  await prepareLastRxPlayerTests();
}

/**
 * Build test file for testing the current RxPlayer.
 * @returns {Promise}
 */
async function prepareCurrentRxPlayerTests() {
  await linkCurrentRxPlayer();
  await createBundle({ output: "bundle1.js", minify: false, production: true });
}

/**
 * Build test file for testing the last version of the RxPlayer.
 * @returns {Promise}
 */
async function prepareLastRxPlayerTests() {
  await linkLastRxPlayer();
  await createBundle({ output: "bundle2.js", minify: false, production: true });
}

/**
 * Link the current RxPlayer to the performance tests, so its performance can be
 * tested.
 * @returns {Promise}
 */
async function linkCurrentRxPlayer() {
  await removeFile(path.join(__dirname, "node_modules"));
  await fs.mkdir(path.join(__dirname, "node_modules"));
  await spawnProc("npm run build:rxp:all",
                  [],
                  (code) => new Error(`npm install exited with code ${code}`)).promise;
  await fs.symlink(
    path.join(__dirname, "..", ".."),
    path.join(__dirname, "node_modules", "rx-player")
  );
}

/**
 * Link the last published RxPlayer version to the performance tests, so
 * performance of new code can be compared to it.
 * @returns {Promise}
 */
async function linkLastRxPlayer() {
  await removeFile(path.join(__dirname, "node_modules"));
  await spawnProc("npm install",
                  ["--prefix", __dirname, "rx-player"],
                  (code) => new Error(`npm install exited with code ${code}`)).promise;
}

/**
 * Build the `tasks` array and start all tests on the Chrome browser.
 * The `onFinished` callback will be called when finished.
 */
async function startAllTestsOnChrome() {
  CHROME_CMD = await getChromeCmd();
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    tasks.push(
      () => startCurrentPlayerTestsOnChrome(i * 2, TEST_ITERATIONS * 2)
    );
    tasks.push(
      () => startLastPlayerTestsOnChrome(i * 2 + 1, TEST_ITERATIONS * 2)
    );
  }
  if (CHROME_CMD === null) {
    // eslint-disable-next-line no-console
    console.error("Error: Chrome not found on the current platform");
    return process.exit(1);
  }
  startNextTaskOrFinish();
}

/**
 * Build the `tasks` array and start all tests on the Chrome browser.
 * The `onFinished` callback will be called when finished.
 * TODO Find out why Firefox just fails without running tests.
 */
// eslint-disable-next-line no-unused-vars
async function _startAllTestsOnFirefox() {
  FIREFOX_CMD = await getFirefoxCmd();
  for (let i = 0; i < TEST_ITERATIONS; i++) {
    tasks.push(
      () => startCurrentPlayerTestsOnFirefox(i * 2, TEST_ITERATIONS * 2)
    );
    tasks.push(
      () => startLastPlayerTestsOnFirefox(i * 2 + 1, TEST_ITERATIONS * 2)
    );
  }
  if (FIREFOX_CMD === null) {
    // eslint-disable-next-line no-console
    console.error("Error: Firefox not found on the current platform");
    return process.exit(1);
  }
  startNextTaskOrFinish();
}

/**
 * Free all resources and terminate script.
 */
async function shutdown() {
  if (currentBrowser !== undefined) {
    currentBrowser.kill();
    currentBrowser = undefined;
  }
  while (servers.length > 0) {
    servers.pop().close();
  }
}

/**
 * Starts the next function in the `tasks` array.
 * If no task are available anymore, call the `onFinished` callback.
 */
function startNextTaskOrFinish() {
  if (nextTaskIndex > 0) {
    allSamples[(nextTaskIndex - 1) % 2].push(...currentTestSample);
  }
  currentTestSample = [];
  if (tasks[nextTaskIndex] === undefined) {
    onFinished();
  }
  nextTaskIndex++;
  return tasks[nextTaskIndex - 1]();
}

/**
 * Start Chrome browser running performance tests on the current RxPlayer
 * version.
 * @returns {Promise}
 */
async function startCurrentPlayerTestsOnChrome(testNb, testTotal) {
  // eslint-disable-next-line no-console
  console.log("Running tests on Chrome on the current RxPlayer version " +
              `(${testNb}/${testTotal})`);
  startPerfhomepageOnChrome("index1.html");
}

/**
 * Start Firefox browser running performance tests on the current RxPlayer
 * version.
 * @returns {Promise}
 */
async function startCurrentPlayerTestsOnFirefox(testNb, testTotal) {
  // eslint-disable-next-line no-console
  console.log("Running tests on Firefox on the current RxPlayer version " +
              `(${testNb}/${testTotal})`);
  startPerfhomepageOnFirefox("index1.html");
}

/**
 * Start Chrome browser running performance tests on the last published RxPlayer
 * version.
 * @returns {Promise}
 */
async function startLastPlayerTestsOnChrome(testNb, testTotal) {
  // eslint-disable-next-line no-console
  console.log("Running tests on Chrome on the previous RxPlayer version " +
              `(${testNb}/${testTotal})`);
  startPerfhomepageOnChrome("index2.html");
}

/**
 * Start Firefox browser running performance tests on the last published
 * RxPlayer version.
 * @returns {Promise}
 */
async function startLastPlayerTestsOnFirefox(testNb, testTotal) {
  // eslint-disable-next-line no-console
  console.log("Running tests on Firefox on the previous RxPlayer version " +
              `(${testNb}/${testTotal})`);
  startPerfhomepageOnFirefox("index2.html");
}

/**
 * Start the performance tests on Chrome.
 * Set `currentBrowser` to chrome.
 */
async function startPerfhomepageOnChrome(homePage) {
  if (currentBrowser !== undefined) {
    currentBrowser.kill();
  }
  if (CHROME_CMD === undefined || CHROME_CMD === null) {
    // eslint-disable-next-line no-console
    console.error("Error: Starting browser before initialization");
    return process.exit(1);
  }
  const spawned = spawnProc(CHROME_CMD, [
    ...CHROME_OPTIONS,
    `http://localhost:${PERF_TESTS_PORT}/${homePage}`
  ]);
  currentBrowser = spawned.child;
}

/**
 * Start the performance tests on Firefox.
 * Set `currentBrowser` to Firefox.
 */
async function startPerfhomepageOnFirefox(homePage) {
  if (currentBrowser !== undefined) {
    currentBrowser.kill();
  }
  if (FIREFOX_CMD === undefined || FIREFOX_CMD === null) {
    // eslint-disable-next-line no-console
    console.error("Error: Starting browser before initialization");
    return process.exit(1);
  }
  const spawned = spawnProc(FIREFOX_CMD, [
    ...FIREFOX_OPTIONS,
    `http://localhost:${PERF_TESTS_PORT}/${homePage}`
  ]);
  currentBrowser = spawned.child;
}

/**
 * Create HTTP server which will receive test results and react appropriately.
 * @returns {Object}
 */
function createResultServer() {
  const server = http.createServer(onRequest);
  return {
    listeningPromise: new Promise((res) => {
      server.listen(6789, function () {
        res();
      });
    }),
    close() { server.close(); },
  };

  function onRequest(request, response) {
    if (request.method === "OPTIONS") {
      answerWithCORS(response, 200);
      response.end();
      return;
    } else if (request.method == "POST") {
      let body = "";
      request.on("data", function (data) {
        body += data;
      });
      request.on("end", function () {
        try {
          const parsedBody = JSON.parse(body);
          if (parsedBody.type === "log") {
            /* eslint-disable-next-line no-console */
            console.log("LOG:", parsedBody.data);
          } else if (parsedBody.type === "done") {
            if (currentBrowser !== undefined) {
              currentBrowser.kill();
              currentBrowser = undefined;
            }
            displayTemporaryResults();
            startNextTaskOrFinish();
          } else {
            currentTestSample.push(parsedBody.data);
          }
          answerWithCORS(response, 200, "OK");
          return;
        } catch (err){
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
    return;
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
  const withRank = list.map(function(item, index) {
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
        (withRank[i + j].value === withRank[i + j + 1].value);
      j++
    ) {
      total += withRank[i + j + 1].rank;
      count++;
    }

    const rank = (total / count);
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
 * @returns {boolean}
 */
function compareSamples() {
  if (allSamples.length !== 2) {
    throw new Error("Not enough result");
  }
  const samplesPerScenario = [getSamplePerScenarios(allSamples[0]),
                              getSamplePerScenarios(allSamples[1])];

  let hasSucceeded = true;
  for (const testName of Object.keys(samplesPerScenario[0])) {
    const sample1 = samplesPerScenario[0][testName];
    const sample2 = samplesPerScenario[1][testName];
    if (sample2 === undefined) {
      // eslint-disable-next-line no-console
      console.error("Error: second result misses a scenario:", testName);
      continue;
    }
    const result1 = getResultsForSample(sample1);
    const result2 = getResultsForSample(sample2);

    // eslint-disable-next-line no-console
    console.log("For current Player:\n" +
                "===================");
    // eslint-disable-next-line no-console
    console.log(`test name: ${testName}\n` +
                `mean: ${result1.mean}\n` +
                `variance: ${result1.variance}\n` +
                `standardDeviation: ${result1.standardDeviation}\n` +
                `standardErrorOfMean: ${result1.standardErrorOfMean}\n` +
                `moe: ${result1.moe}\n`);

    // eslint-disable-next-line no-console
    console.log("\nFor previous Player:\n" +
                "===================");
    // eslint-disable-next-line no-console
    console.log(`test name: ${testName}\n` +
                `mean: ${result2.mean}\n` +
                `variance: ${result2.variance}\n` +
                `standardDeviation: ${result2.standardDeviation}\n` +
                `standardErrorOfMean: ${result2.standardErrorOfMean}\n` +
                `moe: ${result2.moe}\n`);

    const difference = (result2.mean - result1.mean) / result1.mean;

    // eslint-disable-next-line no-console
    console.log(`\nDifference: ${difference * 100}`);

    const uValue = getUValueFromSamples(sample1, sample2);
    const zScore = Math.abs(calculateZScore(uValue,
                                            sample1.length,
                                            sample2.length));
    const isSignificant = zScore > 1.96;
    if (isSignificant) {
      // eslint-disable-next-line no-console
      console.log(`The difference is significant (z: ${zScore})`);
      if (difference < 0) {
        hasSucceeded = false;
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`The difference is not significant (z: ${zScore})`);
    }
  }
  return hasSucceeded;
  function calculateZScore(u, len1, len2) {
    return (u - ((len1 * len2) / 2)) /
                Math.sqrt((len1 * len2 * (len1 + len2 + 1)) / 12);
  }
}

/**
 * Calculate U value from the Mann–Whitney U test from two samples.
 * @param {Array.<number>} sample1
 * @param {Array.<number>} sample2
 * @returns {number}
 */
function getUValueFromSamples(sample1, sample2) {
  const concatSamples = sample1.concat(sample2);
  const ranked = rankSamples(concatSamples);

  const summedRanks1 = sumRanks(ranked, sample1);
  const summedRanks2 = sumRanks(ranked, sample2);
  const n1 = sample1.length;
  const n2 = sample2.length;

  const u1 = calculateUValue(summedRanks1, n1, n2);
  const u2 = calculateUValue(summedRanks2, n2, n1);

  function calculateUValue(rank, currLen, otherLen) {
    return (currLen * otherLen) + ((currLen*(currLen+1)) / 2) - rank;
  }
  return Math.min(u1, u2);

  function sumRanks(rankedList, observations) {
    const remainingToFind = observations.slice();
    let rank = 0;
    rankedList.forEach(function(observation) {
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
  const mean = sample
    .reduce((acc, x) => acc + x, 0) / sample.length;
  const variance = sample.reduce((acc, x) => {
    return acc + Math.pow(x - mean, 2);
  }, 0) / (sample.length - 1) || 0;
  const standardDeviation = Math.sqrt(variance);
  const standardErrorOfMean = standardDeviation /
    Math.sqrt(sample.length);
  const criticalVal = 1.96;
  const moe = standardErrorOfMean * criticalVal;
  return { mean, variance, standardErrorOfMean, standardDeviation, moe };
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
 * Log results for `currentTestSample`: mean, standard deviation etc.
 */
function displayTemporaryResults() {
  const testedScenarios = getSamplePerScenarios(currentTestSample);
  for (const testName of Object.keys(testedScenarios)) {
    const scenarioSample = testedScenarios[testName];
    const results = getResultsForSample(scenarioSample);
    // eslint-disable-next-line no-console
    console.log(`test name: ${testName}\n` +
                `mean: ${results.mean}\n` +
                `first sample: ${scenarioSample[0]}\n` +
                `last sample: ${scenarioSample[scenarioSample.length - 1]}\n` +
                `variance: ${results.variance}\n` +
                `standard deviation: ${results.standardDeviation}\n` +
                `standard error of mean: ${results.standardErrorOfMean}\n` +
                `moe: ${results.moe}\n`);
  }
}

/**
 * Build the performance tests.
 * @param {Object} options
 * @param {Object} options.output - The output file
 * @param {boolean} [options.minify] - If `true`, the output will be minified.
 * @param {boolean} [options.production] - If `false`, the code will be compiled
 * in "development" mode, which has supplementary assertions.
 * @returns {Promise}
 */
function createBundle(options) {
  const minify = !!options.minify;
  const isDevMode = !options.production;
  return new Promise((res) => {
    esbuild.build({
      entryPoints: [path.join(__dirname, "src", "main.js")],
      bundle: true,
      minify,
      outfile: path.join(__dirname, options.output),
      define: {
        __TEST_CONTENT_SERVER__: JSON.stringify({
          URL: "127.0.0.1",
          PORT: "3000",
        }),
        "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
        __FEATURES__: JSON.stringify({
          IS_DISABLED: 0,
          IS_ENABLED: 1,

          BIF_PARSER: 1,
          DASH: 1,
          DIRECTFILE: 1,
          EME: 1,
          HTML_SAMI: 1,
          HTML_SRT: 1,
          HTML_TTML: 1,
          HTML_VTT: 1,
          LOCAL_MANIFEST: 1,
          METAPLAYLIST: 1,
          NATIVE_SAMI: 1,
          NATIVE_SRT: 1,
          NATIVE_TTML: 1,
          NATIVE_VTT: 1,
          SMOOTH: 1,
        }),
        __ENVIRONMENT__: JSON.stringify({
          PRODUCTION: 0,
          DEV: 1,
          CURRENT_ENV: isDevMode ? 1 : 0,
        }),
        __LOGGER_LEVEL__: JSON.stringify({
          CURRENT_LEVEL: "INFO",
        }),
      }
    }).then(
      () => { res(); },
      (err) => {
        // eslint-disable-next-line no-console
        console.error(`\x1b[31m[${getHumanReadableHours()}]\x1b[0m Demo build failed:`,
                      err);
        process.exit(1);
      });
  });
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
function removeFile(fileName) {
  return rimraf(fileName);
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Function|undefined} [errorOnCode]
 * @returns {Object}
 */
function spawnProc(command, args, errorOnCode) {
  let child;
  const prom = new Promise((res, rej) => {
    child = spawn(command, args, { shell: true, stdio: "inherit" })
      .on("close", (code) => {
        if (code !== 0 && typeof errorOnCode === "function") {
          rej(errorOnCode(code));
        }
        res();
      });
  });
  return {
    promise: prom,
    child,
  };
}

/**
 * Returns string corresponding to the Chrome binary.
 * @returns {Promise.<string>}
 */
async function getChromeCmd() {
  switch (process.platform) {
    case "win32": {
      const suffix = "\\Google\\Chrome\\Application\\chrome.exe";
      const prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"]];
      for (let i = 0; i < prefixes.length; i++) {
        const prefix = prefixes[i];
        try {
          const windowsChromeDirectory = path.join(prefix, suffix);
          fs.accessSync(windowsChromeDirectory);
          return windowsChromeDirectory;
        } catch (e) {}
      }

      return null;
    }

    case "darwin": {
      const defaultPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      try {
        const homePath = path.join(process.env.HOME, defaultPath);
        fs.accessSync(homePath);
        return homePath;
      } catch (e) {
        return defaultPath;
      }
    }

    case "linux": {
      const chromeBins = ["google-chrome", "google-chrome-stable"];
      for (const chromeBin of chromeBins) {
        try {
          await execCommandAndGetFirstOutput(`which ${chromeBin}`);
          return chromeBin;
        } catch (e) {}
      }
      return null;
    }
    default:
      // eslint-disable-next-line no-console
      console.error("Error: unsupported platform:", process.platform);
      process.exit(1);
  }
}

/**
 * Returns string corresponding to the Chrome binary.
 * @returns {Promise.<string>}
 */
async function getFirefoxCmd() {
  switch (process.platform) {
    case "linux": {
      return "firefox";
    }
    // TODO other platforms
    default:
      // eslint-disable-next-line no-console
      console.error("Error: unsupported platform:", process.platform);
      process.exit(1);
  }
}

function execCommandAndGetFirstOutput(command) {
  return new Promise((res,rej) => {
    exec(command, (error, stdout) => {
      if (error) {
        rej(error);
      } else {
        res(stdout);
      }
    });
  });
}
