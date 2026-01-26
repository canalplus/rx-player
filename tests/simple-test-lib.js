/**
 * # simple-test-lib.js
 *
 * ## What's this?
 *
 * @see ./simple-test-runner.mjs for the explanation of why this file exists.
 *
 * ## How does it work?
 *
 * **TL;DR:** Just replace `vitest` imports with the path to that file in tests.
 * If those tests do not rely on advanced mocking function, it should work directly.
 * Then run `./simple-test-runner.mjs` with the right options (`-h` flag for help).
 *
 * This present file implements the usual test running functions (`describe` /
 * `it` / `test` / `beforeEach` etc.) with the same semantics (or close enough
 * to it) than your usual `vitest` / `jest` etc. testing framework.
 *
 * It still relies for now on `vitest` to re-export its `expect` assertion part
 * as this is completely independent from the test running logic which I wanted
 * to control here.
 *
 * It needs to be used together with `./simple-test-runner.mjs`, our test
 * server, which will be the Node.js part, bundling a page for your tests,
 * running a browser instance on it and processing the tests' result.
 *
 * ## Note about JSDoc syntax
 *
 * JSDoc with TypeScript types is used instead of plain TypeScript to make it
 * easier to have it just plug and play: I just replace `vitest` imports with
 * that file even on JS-only code and it just works.
 */

// TODO `describe.skip`?

const DEFAULT_TIMEOUT = 30 * 60 * 1000;

/**
 * This test framework has an HTTP-based communication protocol between the
 * test file (which include this file) and the test server (which ran the
 * browser and process/display test results).
 *
 * To ensure ordered responses, we could have multiple strategies (ordered
 * protocol like websockets, requests-responses. sequence id).
 * I went with incrementing sequence-number as a very simple mechanism, just
 * for simplicity reasons.
 *
 * This number is incremented with each request.
 * TODO: WebSocket would probably be more robust. Here if a request misses,
 * we'll just hang.
 */
let requestSequenceNb = 0;

/**
 * @typedef {() => void | Promise<void>} TestFn - Testing function. Can either
 * be a synchronous function which just has to not throw to pass, or a
 * Promise-returning function which has to resolve to pass.
 */

/**
 * @typedef {Object} TestCase - A singular test, generally created through a
 * `it` or `test` function call.
 * @property {string} name - The test description
 * @property {TestFn} fn - Test implementation
 * @property {number} timeout - Maximum amount of milliseconds the tests should
 * run in. If that limit is reached, the test will be marked as failed.
 * @property {number} retry - If the test fails, it will be retried `retry`
 * times until it succeeds. If it still fails after that number of retries, the
 * test will be marked as a failure.
 * @property {boolean} skip - If `true`, this test should be skipped in the
 * current run.
 * @property {TestSuite[]} suiteStack - The stack of suites the test is in.
 */

/**
 * @typedef {Object} TestSuite - A collection of tests, generally created
 * through a `describe` call.
 * @property {string} name - The description of that suite.
 * @property {TestCase[]} tests - Tests contained in that suite.
 * @property {TestSuite[]} suites - Potential sub-suites
 * @property {TestFn[]} beforeEachHooks - Functions that have to be invokated
 * before each test run in that suite.
 * @property {TestFn[]} afterEachHooks - Functions that have to be invokated
 * after each test run in that suite.
 * @property {TestFn[]} beforeAllHooks - Functions that have to be invokated
 * before all tests run in that suite.
 * @property {TestFn[]} afterAllHooks - Functions that have to be invokated
 * after all test run in that suite.
 */

/**
 * @typedef {Object} TestResults - Current test results for all tests that
 * run here.
 * @property {number} passed - Amount of tests that have succeeded.
 * @property {number} failed - Amount of tests that have failed.
 * @property {number} skipped - Amount of tests that were skipped.
 * @property {TestErrorInfo[]} errors - Information on failed
 * tests: the name and the corresponding error.
 */

/**
 * @typedef {Object} TestErrorInfo - Information associated to a failing test.
 * @property {TestCase} testCase - Test test that failed.
 * @property {number|undefined} timer - Amount of time to run that test.
 * `undefined` if we couldn't run it (e.g. its `beforeEach` hook failed).
 * @property {any} error - The error thrown / rejected by that test
 */

/**
 * @typedef {Object} SkippedTestInfo - Information associated to a skipped test.
 * @property {TestCase} testCase - Test case that is being skipped
 */

/**
 * @typedef {Object} ParentHooks - Callback associated to the lifecycle of a
 * single `TestCase`.
 * @property {TestFn[]} beforeEach - Callback to call just before a test.
 * @property {TestFn[]} afterEach - Callback to call just after a test.
 */

// The HTTP port used for exchange with our "test server" is part of the URL's
// "fragment" (after the first `#`). We here parse it to know how to communicate
// result back to the main test process.

const hashComponents = parseUrlHash();
const resultServerPort = parseInt(hashComponents.p);

/**
 * Root object containing all test suites.
 * @type {TestSuite}
 */
const rootSuite = {
  name: "root",
  tests: [],
  suites: [],
  beforeEachHooks: [],
  afterEachHooks: [],
  beforeAllHooks: [],
  afterAllHooks: [],
};

/**
 * The test suite that we're currently parsing (we're at evaluation-time here,
 * before running).
 * Set to `rootSuite` initially.
 * @type {TestSuite}
 */
let currentSuite = rootSuite;

/**
 * Stack of suites we're currently in the process of parsing. Allows to handle
 * nested suites easily.
 * @type {TestSuite[]}
 */
const suiteStack = [rootSuite];

/** @type {Array<{name: string, suite: string}>} */
const skippedTests = [];

/**
 * Native, non-monkey-patched versions of console functions.
 */
const oldConsoleFns = {};
["log", "warn", "debug", "info", "error"].forEach((meth) => {
  /* eslint-disable no-console */
  oldConsoleFns[meth] = console[meth];
  console[meth] = function () {
    sendLog(meth, ...arguments);
    oldConsoleFns[meth].apply(this, arguments);
  };
  /* eslint-enable no-console */
});

setTimeout(() => {
  run().then(sendDone, sendError);
});

/**
 * @param {string} name
 * @param {() => void} fn
 * @returns {void}
 */
export function describe(name, fn) {
  /** @type {TestSuite} */
  const suite = {
    name,
    tests: [],
    suites: [],
    beforeEachHooks: [],
    afterEachHooks: [],
    beforeAllHooks: [],
    afterAllHooks: [],
  };

  currentSuite.suites.push(suite);
  suiteStack.push(suite);
  currentSuite = suite;

  fn();

  suiteStack.pop();
  currentSuite = suiteStack[suiteStack.length - 1];
}

/**
 * @param {string} name
 * @param {...*} args
 * @returns {void}
 */
export function it(name, ...args) {
  const testCase = parseTestCase(name, ...args);
  if (testCase != null) {
    currentSuite.tests.push(testCase);
  }
}

/**
 * TODO: Remove? `it` should be sufficient (or we remove `it`, no opinion).
 * @param {...*} args
 * @returns {void}
 */
export function test(...args) {
  it(...args);
}

/**
 * @param {string} name
 * @param {...*} args
 * @returns {TestCase|undefined}
 */
function parseTestCase(name, ...args) {
  let fn;
  let timeout = DEFAULT_TIMEOUT;
  let retry = 0;

  if (typeof args[0] === "function") {
    fn = args[0];
  } else if (typeof args[0] === "object") {
    if (args[0]?.timeout != null) {
      timeout = args[0].timeout;
    }
    if (args[0]?.retry != null) {
      retry = args[0].retry;
    }
  } else if (args[0] !== undefined) {
    oldConsoleFns.error("Invalid second argument for test: " + name);
    return;
  }

  if (typeof args[1] === "number") {
    timeout = args[1];
  } else if (typeof args[1] === "function") {
    fn = args[1];
  } else if (args[1] !== undefined) {
    oldConsoleFns.error("Invalid third argument for test: " + name);
    return;
  }

  if (fn === undefined) {
    oldConsoleFns.error("Missing test function for test: " + name);
    return;
  }
  if (typeof fn !== "function") {
    oldConsoleFns.error("Test function must be a function for test: " + name);
    return;
  }
  if (typeof timeout !== "number") {
    oldConsoleFns.error("Invalid timeout value for test: " + name);
    return;
  }
  if (typeof retry !== "number") {
    oldConsoleFns.error("Invalid retry value for test: " + name);
    return;
  }

  return {
    name,
    fn,
    timeout,
    retry,
    skip: false,
    suiteStack: suiteStack.slice(1),
  };
}

/**
 * @param {string} name
 * @param {...*} args
 * @returns {void}
 */
it.skip = function (name, ...args) {
  const testCase = parseTestCase(name, ...args);
  if (testCase != null) {
    testCase.skip = true;
    skippedTests.push(testCase);
    currentSuite.tests.push(testCase);
  }
};

/**
 * @param {...*} args
 * @returns {void}
 */
test.skip = function (...args) {
  it.skip(...args);
};

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function beforeEach(fn) {
  currentSuite.beforeEachHooks.push(fn);
}

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function afterEach(fn) {
  currentSuite.afterEachHooks.push(fn);
}

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function beforeAll(fn) {
  currentSuite.beforeAllHooks.push(fn);
}

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function before(fn) {
  beforeAll(fn);
}

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function afterAll(fn) {
  currentSuite.afterAllHooks.push(fn);
}

/**
 * @param {TestFn} fn
 * @returns {void}
 */
export function after(fn) {
  afterAll(fn);
}

/**
 * @param {TestFn} fn
 * @param {number} timeout
 * @returns {Promise<void>}
 */
async function runWithTimeout(fn, timeout) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout),
    ),
  ]);
}

/**
 * @param {TestSuite} suite
 * @param {TestResults} results
 * @param {ParentHooks} parentHooks
 * @returns {Promise<void>}
 */
async function runSuite(suite, results, parentHooks) {
  const beforeEachHooks = [...parentHooks.beforeEach, ...suite.beforeEachHooks];
  const afterEachHooks = [...parentHooks.afterEach, ...suite.afterEachHooks];

  for (const hook of suite.beforeAllHooks) {
    try {
      await hook();
    } catch (err) {
      oldConsoleFns.error(`Error in beforeAll hook for suite "${suite.name}":`, err);
      throw err;
    }
  }

  for (const test of suite.tests) {
    if (test.skip) {
      results.skipped++;
      sendTestSkipped(test);
      oldConsoleFns.log(`⊘ ${test.name} (skipped)`);
      continue;
    }

    let lastError = null;
    let passed = false;
    let timeStart = undefined;
    let timer = undefined;
    const maxAttempts = test.retry + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        for (const hook of beforeEachHooks) {
          try {
            await hook();
          } catch (err) {
            oldConsoleFns.error(`Error in beforeEach hook:`, err);
            throw err;
          }
        }

        timeStart = performance.now();
        await runWithTimeout(test.fn, test.timeout);
        timer = performance.now() - timeStart;
        passed = true;
        results.passed++;
        sendTestPassed(test, timer, attempt);
        if (attempt > 0) {
          oldConsoleFns.log(`✓ ${test.name} (passed on retry ${attempt})`);
        } else {
          oldConsoleFns.log(`✓ ${test.name}`);
        }
        break;
      } catch (err) {
        timer = performance.now() - timeStart;
        lastError = err;
        if (attempt < maxAttempts - 1) {
          oldConsoleFns.log(`  ↻ ${test.name} (retry ${attempt + 1}/${test.retry})`);
        }
      } finally {
        for (const hook of afterEachHooks) {
          try {
            await hook();
          } catch (err) {
            oldConsoleFns.error(`Error in afterEach hook:`, err);
          }
        }
      }
    }

    if (!passed) {
      results.failed++;
      results.errors.push({
        testCase: test,
        error: lastError,
        timer,
      });
      let errorStr = "Unknown Error";
      try {
        errorStr = lastError.toString();
      } catch {}
      sendTestFailed(test, timer, errorStr);
      if (test.retry > 0) {
        oldConsoleFns.warn(
          `✗ ${test.name} (failed after ${test.retry} retries)`,
          lastError,
        );
      } else {
        oldConsoleFns.warn(`✗ ${test.name}`, lastError);
      }
    }
  }

  // Run nested suites
  for (const childSuite of suite.suites) {
    sendSuite(`${childSuite.name}`);
    await runSuite(childSuite, results, {
      beforeEach: beforeEachHooks,
      afterEach: afterEachHooks,
    });
  }

  for (const hook of suite.afterAllHooks) {
    try {
      await hook();
    } catch (err) {
      oldConsoleFns.error(`Error in afterAll hook for suite "${suite.name}":`, err);
      throw err;
    }
  }
}

/**
 * @returns {Promise<TestResults>}
 */
async function run() {
  /** @type {TestResults} */
  const results = { passed: 0, failed: 0, skipped: 0, errors: [] };
  await runSuite(rootSuite, results, { beforeEach: [], afterEach: [] });

  if (skippedTests.length > 0) {
    oldConsoleFns.log(`\n${skippedTests.length} test(s) skipped`);
  }

  return results;
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
 * Send internally once tests on that page have been performed enough time.
 * Allows the server to close the current browser instance and compile results.
 */
function sendDone() {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "done", sequenceNb: requestSequenceNb++ }),
  });
}

function sendError(error) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "error", sequenceNb: requestSequenceNb++, data: error }),
  });
}

/**
 * Send log so it's displayed on the Node.js process running those tests.
 * @param {string} level
 * @param {Array.<string>} ...logs
 */
export function sendLog(level, ...logs) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "log",
      sequenceNb: requestSequenceNb++,
      data: { level, msg: logs.join(" ") },
    }),
  }).catch((err) => {
    oldConsoleFns.error("Error: Cannot send log due to a request error.", err);
  });
}

/**
 * @param {string} suiteName
 */
export function sendSuite(suiteName) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "suite",
      sequenceNb: requestSequenceNb++,
      data: suiteName,
    }),
  }).catch((err) => {
    oldConsoleFns.error("Error: Cannot send log due to a request error.", err);
  });
}

/**
 * @param {TestCase} test
 * @param {number|undefined} timer
 * @param {number} attempt
 */
export function sendTestPassed(test, timer, attempt) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "passed",
      sequenceNb: requestSequenceNb++,
      data: {
        testCase: {
          testName: test.name,
          timeout: test.timeout,
          retry: test.retry,
          suiteStack: test.suiteStack.map((s) => s.name),
        },
        timer,
        attempt,
      },
    }),
  }).catch((err) => {
    oldConsoleFns.error("Error: Cannot send log due to a request error.", err);
  });
}

/**
 * @param {TestCase} test
 * @param {string} testName
 */
export function sendTestSkipped(test) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "skipped",
      sequenceNb: requestSequenceNb++,
      data: {
        testCase: {
          testName: test.name,
          timeout: test.timeout,
          retry: test.retry,
          suiteStack: test.suiteStack.map((s) => s.name),
        },
      },
    }),
  }).catch((err) => {
    oldConsoleFns.error("Error: Cannot send log due to a request error.", err);
  });
}

/**
 * @param {TestCase} test
 * @param {number|undefined} timer
 * @param {string} errorStr
 */
export function sendTestFailed(test, timer, errorStr) {
  fetch(`http://127.0.0.1:${resultServerPort}`, {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({
      type: "failed",
      sequenceNb: requestSequenceNb++,
      data: {
        testCase: {
          testName: test.name,
          timeout: test.timeout,
          retry: test.retry,
          suiteStack: test.suiteStack.map((s) => s.name),
        },
        timer,
        errorStr,
      },
    }),
  }).catch((err) => {
    oldConsoleFns.error("Error: Cannot send log due to a request error.", err);
  });
}

export { expect } from "vitest";
