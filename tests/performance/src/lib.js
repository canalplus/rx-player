/**
 * "Tests" in performance tests are simple time measurements between a "start"
 * and an "end" event. `pendingTests` is a map whose keys are the name of the
 * tests that have been started but not yet ended and whose the values are the
 * result of `performance.now()` when they where started.
 */
const pendingTests = new Map();

/**
 * Tests are grouped into a collection which make sense together and which may
 * be associated to a timeout value.
 * This array list objects, each describing a particular group. See usage.
 */
const groups = [];

/**
 * When `true`, we began tests for the current page, and are thus not able to
 * register new test groups anymore.
 */
let areTestsAlreadyRunning = false;

const hashComponents = parseUrlHash();
const resultServerPort = parseInt(hashComponents.p);
const tryAttempt = hashComponents.t === undefined ? 1 : parseInt(hashComponents.t);

if (isNaN(resultServerPort)) {
  throw new Error("The current page should have a valid result server port in its URL");
}

/**
 * There are two testing pages, the current one is described by this `page`
 * property:
 *   - "previous": This is a page testing the previous build with which we want
 *     to compare to.
 *   - "current": This is a page testing the current build which we want to
 *     compare.
 */
let page;
if (location.pathname === "/previous.html") {
  page = "previous";
} else if (location.pathname === "/current.html") {
  page = "current";
} else {
  error("Unknown launched page: " + location.pathname);
  throw new Error("The current page should either be `previous.html` or `current.html`");
}

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
    error(`"declareTestGroup" function call not performed at top level.`);
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
  pendingTests.delete(name);
  reportResult(name, performance.now() - startTime);
}

/**
 * Send log so it's displayed on the Node.js process running those tests.
 * @param {Array.<string>} ...logs
 */
export function log(...logs) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
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
  fetch(`http://127.0.0.1:${resultServerPort}`, {
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
 * We wait a little more just in case the current page is not following exactly
 * that principle.
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
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "value",
      page,
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
  if (tryAttempt < 100) {
    hashComponents.t = tryAttempt + 1;
    updateUrlHash(hashComponents);
    if (page === "previous") {
      location.pathname = "/current.html";
    } else {
      location.pathname = "/previous.html";
    }
  } else {
    sendDone();
  }
}

/**
 * Send internally once tests on that page have been performed enough time.
 * Allows the server to close the current browser instance and compile results.
 */
function sendDone() {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "done" }),
  });
}

/**
 * Parse the current URL fragment (format: "#prop1=value1;prop2=value2") and
 * return it into a JS object (e.g. `{ prop1: "value1", prop2: "value2" }`)
 * etc.
 * @returns {Object}
 */
function parseUrlHash() {
  const hash = location.hash[0] === "#" ? location.hash.substring(1) : location.hash;
  const hashParts = hash.split(";");
  if (hashParts.length === 0) {
    throw new Error("The current page should have a fragment present in its URL");
  }
  const ret = {};
  for (const hashPart of hashParts) {
    const eqlIdx = hashPart.indexOf("=");
    if (eqlIdx > 0) {
      const propName = hashPart.substring(0, eqlIdx);
      ret[propName] = hashPart.substring(eqlIdx + 1);
    }
  }
  return ret;
}

/**
 * Reverse of `parseUrlHash`: take a wanted JS Object (e.g.
 * `{ prop1: "value1", prop2: "value2" }`) and put it in the URL's fragment
 * so that `parseUrlHash` can then parse it (e.g. "#prop1=value1;prop2=value2").
 * @param {Object}
 */
function updateUrlHash(props) {
  let hash = "#";
  for (const prop of Object.keys(props)) {
    hash += `${prop}=${props[prop] ?? ""};`;
  }
  location.hash = hash;
}
