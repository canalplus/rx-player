#!/usr/bin/env node

/**
 * # run_chrome.mjs
 *
 * This utils allows to run the Chrome browser on a specific URL, in a headless
 * mode or not.
 * It can be imported or called directly, use `--help` flag for more info for
 * the latter.
 */

// @ts-check

import { spawn } from "child_process";
import { pathToFileURL } from "url";
import getChromeCmd from "../scripts/get_chrome_cmd.mjs";

/** Flags used when starting the Chrome browser. */
const CHROME_OPTIONS = [
  "--no-default-browser-check",
  "--no-first-run",
  "--disable-default-apps",
  "--disable-extensions",
  "--disable-popup-blocking",
  "--disable-translate",
  "--disable-device-discovery-notifications",
  "--disk-cache-dir=/dev/null",

  // "--disable-renderer-backgrounding",
  // "--disable-background-timer-throttling",
  // "--disable-gpu",
  // "--disable-dev-shm-usage",
];

/**
 * Flags specific to run Chrome in "headless mode" (without a UI).
 * Useful for just running test or automation for example.
 */
const HEADLESS_OPTIONS = ["--headless"];

/**
 * Flags specific to disable the default Chrome's behavior of forbidding
 * autoplay if the user did not interact with the page first.
 */
const AUTO_PLAY_OPTIONS = ["--autoplay-policy=no-user-gesture-required"];

/**
 * Flags allowing to expose more memory control and information.
 * Useful for tests whose job is to detect memory leaks.
 */
const MEMORY_OPTIONS = ["--enable-precise-memory-info", "--js-flags=--expose-gc"];

/**
 * Run the Chrome browser on the given URL and return its process.
 * @param {string} url - The URL to run on Chrome
 * @param {Object} [params={}] - Launched Chrome's configuration
 * @param {boolean|undefined} [params.headless] - If `true`, the browser will
 * be launched in headless mode.
 * @param {boolean|undefined} [params.enableAutoPlay] - If `true`, the browser
 * will be launched with specific flags to disable auto-play blocking.
 * Useful for tests.
 * @param {boolean|undefined} [params.memoryTools] - If `true`, the browser
 * will be launched with specific flags to enable precise memory info and the
 * possibility to trigger JS heap GC by calling `window.gc`
 * @param {boolean|undefined} [params.verbose] - If `true`, the browser will
 * output to stdout. If not set or set to `false`, it will stay silent.
 * Can be used to debug issues.
 * @returns {Promise.<import("child_process").ChildProcess>}
 */
export default async function runChrome(
  url,
  { headless, enableAutoPlay, memoryTools, verbose } = {},
) {
  const chromeCmd = await getChromeCmd();
  if (chromeCmd === null) {
    throw new Error("Could not find Chrome executable on the current environment.");
  }
  const flags = [...CHROME_OPTIONS];
  if (headless) {
    flags.push(...HEADLESS_OPTIONS);
  }
  if (enableAutoPlay) {
    flags.push(...AUTO_PLAY_OPTIONS);
  }
  if (memoryTools) {
    flags.push(...MEMORY_OPTIONS);
  }
  try {
    const spawned = spawnProc(chromeCmd, [...flags, url], {
      verbose,
      /** @param {number|undefined} code */
      parseError: (code) => "Failed to run Chrome. Code = " + code,
    });
    return spawned.child;
  } catch (err) {
    throw new Error("Could not launch page on Chrome: " + String(err));
  }
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Object} [params]
 * @param {Function|undefined} [params.parseError]
 * @param {boolean|undefined} [params.verbose]
 * @returns {{promise: Promise.<void>; child: import("child_process").ChildProcess}}
 */
function spawnProc(command, args, { parseError, verbose } = {}) {
  /** @type {import("child_process").ChildProcess | undefined} */
  let child;
  /** @type {Promise.<void>} */
  const prom = new Promise((res, rej) => {
    child = spawn(command, args, { stdio: verbose ? "inherit" : undefined });
    child.on("close", (code) => {
      if (code) {
        if (typeof parseError === "function") {
          rej(parseError(code));
        } else {
          rej(code);
        }
        return;
      }
      res();
    });
  });
  if (child === undefined) {
    throw new Error("Could not start Chrome process");
  }
  return {
    promise: prom,
    child,
  };
}

// If true, this script is called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const urls = [];
  let headless;
  let enableAutoPlay;
  let memoryTools;
  let verbose;
  const args = process.argv.slice(2);
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        /* eslint-disable no-fallthrough */
        displayHelp();
        process.exit(0);

      case "--headless":
        /* eslint-enable no-fallthrough */
        headless = true;
        break;

      case "--enable-autoplay":
        enableAutoPlay = true;
        break;

      case "--memory-tools":
        memoryTools = true;
        break;

      case "--verbose":
        verbose = true;
        break;

      case "--":
        argOffset = args.length;
        break;

      default:
        if (args[argOffset]) {
          urls.push(args[argOffset]);
        }
        break;
    }
  }

  if (urls.length === 0) {
    console.error("Error: No URL provided");
    displayHelp();
    process.exit(1);
  } else if (urls.length > 1) {
    console.error("Error: Too many URLs provided:\n" + urls.join("\n"));
    displayHelp();
    process.exit(1);
  }
  runChrome(urls[0], {
    headless,
    enableAutoPlay,
    memoryTools,
    verbose,
  }).catch((err) => {
    console.error("Could not run Chrome on the given URL:", err);
    process.exit(1);
  });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Run the Chrome browser to the given URL.

Usage: node run_chrome.mjs [options] <URL>

Available options:
  -h, --help           Display this help message
  --headless           Start the browser in headless mode (without a UI)
  --enable-autoplay    Allow autoplaying media even without user interaction
  --memory-tools       Enable precize memory control in that browser
  --verbose            Enable browser output to stdio`,
  );
}
