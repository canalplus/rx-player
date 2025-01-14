const pendingTests = new Map();
const groups = [];
let areTestsAlreadyRunning = false;

/**
 * Declare a group of tests in a callback that will be performed together and on
 * which a timeout may be applied.
 * @param {string} name - Name describing this test group
 * @param {Function} code - Code implementing that test group. May return a
 * promise for asynchronous code.
 * @param {number} [timeout] - Optional timeout in milliseconds after which tests
 * will be aborted if the test group is not yet finished.
 */
export function declareTestGroup(name, code, timeout) {
  if (areTestsAlreadyRunning) {
    error(`"declareTestGroup" function called not performed at top level.`);
    return;
  }
  groups.push({ name, code, timeout });
}

/**
 * Start measuring time for a specific test case.
 * Call `testEnd` once done.
 * @param {string} testName - The name of the test case (e.g. "seeking").
 */
export function testStart(name) {
  pendingTests.set(name, performance.now());
}

/**
 * End measuring time for a specific test case started with `testStart`.
 * @param {string} testName - The name of the test case (e.g. "seeking").
 */
export function testEnd(name) {
  const startTime = pendingTests.get(name);
  if (startTime === undefined) {
    error("ERROR: `testEnd` called for inexistant test:", name);
    return;
  }
  reportResult(name, performance.now() - startTime);
}

/**
 * Send log so it's displayed on the Node.js process running those tests.
 * @param {Array.<string>} ...logs
 */
export function log(...logs) {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "log", data: logs.join(" ") }),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error: Cannot send log due to a request error.", err);
  });
}

/**
 * Send error interrupting all tests.
 * @param {Array.<string>} ...logs
 */
export function error(...logs) {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "error", data: logs.join(" ") }),
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Error: Cannot send error due to a request error.", err);
  });
}

/**
 * All `declareTestGroup` calls should be done at file evaluation, so we could
 * just schedule a micro-task running them when done.
 *
 * We wait a little more just to be sure that the page is completely loaded.
 */
setTimeout(async () => {
  areTestsAlreadyRunning = true;
  if (groups.length === 0) {
    log("ERROR: No test group declared");
    return;
  }

  for (const group of groups) {
    const { name, code, timeout } = group;
    try {
      const res = code();
      if (typeof res === "object" && res !== null && typeof res.then === "function") {
        if (typeof timeout === "number") {
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`Timeout of ${timeout} ms exceeded.`));
            }, timeout);
            res.then(
              () => {
                clearTimeout(timeoutId);
                resolve();
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
            );
          });
        } else {
          await res;
        }
      }
    } catch (err) {
      error("Test group", `"${name}"`, "failed with error:", err.toString());
      return;
    }
  }
  done();
}, 200);

/**
 * Send results for a specific test case.
 * @param {string} testName - The name of the test case (e.g. "seeking").
 * @param {number} result - The time in milliseconds it took to achieve that
 * test.
 */
function reportResult(testName, testResult) {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "value",
      data: { name: testName, value: testResult },
    }),
  }).catch((err) => {
    log("ERROR: Failed to send results for ", testName, err.toString());
  });
}

/**
 * Called internally once all tests on the page have been performed. Reload the
 * page or indicates to the server that it's finished if it is.
 */
function done() {
  const testNumber = getTestNumber();
  if (testNumber < 100) {
    location.hash = "#" + (testNumber + 1);
    location.reload();
  } else {
    sendDone();
  }
}

function getTestNumber() {
  if (location.hash === "") {
    return 1;
  }
  return Number(location.hash.substring(1));
}

/**
 * Send internally once tests on that page have been performed enough time.
 * Allows the server to close the current browser instance and compile results.
 */
function sendDone() {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "done" }),
  });
}
