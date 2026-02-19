#!/usr/bin/env node

/**
 * # run_firefox.mjs
 *
 * This utils allows to run the Firefox browser on a specific URL, in a headless
 * mode or not.
 * It can be imported or called directly, use `--help` flag for more info for
 * the latter.
 */

import { spawn } from "child_process";
import { pathToFileURL } from "url";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import getFirefoxCmd from "../scripts/get_firefox_cmd.mjs";

/** Flags used when starting the Firefox browser. */
const FIREFOX_OPTIONS = ["-no-remote"];

/**
 * Flags specific to run Firefox in "headless mode" (without a UI).
 * Useful for just running test or automation for example.
 */
const HEADLESS_OPTIONS = ["-headless"];

/**
 * Run the Firefox browser on the given URL and return its process.
 * @param {string} url - The URL to run on Firefox
 * @param {Object} [params={}] - Launched Firefox's configuration
 * @param {boolean|undefined} params.headless - If `true`, the browser will
 * be launched in headless mode.
 * @param {boolean|undefined} params.enableAutoPlay - If `true`, the browser
 * will be launched with specific flags to disable auto-play blocking.
 * Useful for tests.
 * @param {boolean|undefined} params.verbose - If `true`, the browser will
 * output to stdout. If not set or set to `false`, it will stay silent.
 * Can be used to debug issues.
 * @returns {Promise.<ChildProcess>}
 */
export default async function runFirefox(
  url,
  { headless, enableAutoPlay, verbose } = {},
) {
  const firefoxCmd = await getFirefoxCmd();
  const flags = FIREFOX_OPTIONS;
  if (headless) {
    flags.push(...HEADLESS_OPTIONS);
  }
  try {
    const profileDir = await createFirefoxProfile({ enableAutoPlay });
    const spawned = spawnProc(
      firefoxCmd,
      [...FIREFOX_OPTIONS, "-profile", profileDir, url],
      { verbose, parseError: (code) => "Failed to run Firefox. Code = " + code },
    );
    spawned.child.on("exit", async () => {
      try {
        await fs.rm(profileDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to clean up Firefox profile: ${err}`);
      }
    });
    return spawned.child;
  } catch (err) {
    throw new Error("Could not launch page on Firefox: " + err.toString());
  }
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Object} [params]
 * @param {boolean|undefined} [params.verbose] - If `true`, the browser will
 * output to stdout. If not set or set to `false`, it will stay silent.
 * Can be used to debug issues.
 * @param {Function|undefined} [params.parseError]
 * @returns {Object}
 */
function spawnProc(command, args, { parseError, verbose } = {}) {
  let child;
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
  return {
    promise: prom,
    child,
  };
}

/**
 * Firefox (sadly) also requires the creation of a profile to setup autoplay
 * policies etc.
 * This util function does just that and return the temporary path created.
 * @param {Object} [params={}] - Launched Firefox's configuration
 * @param {boolean|undefined} params.headless - If `true`, the browser will
 * be launched in headless mode.
 * @param {boolean|undefined} params.enableAutoPlay - If `true`, the browser
 * will be launched with specific flags to disable auto-play blocking.
 * Useful for tests.
 * @returns {Promise.<string>}
 */
async function createFirefoxProfile({ enableAutoPlay } = {}) {
  const profileDir = path.join(tmpdir(), `firefox-test-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });
  let prefs = `
user_pref("app.update.enabled", false);
user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);`;
  if (enableAutoPlay) {
    prefs += `

// Autoplay
user_pref("media.autoplay.default", 0);
user_pref("media.autoplay.blocking_policy", 0);`;
  }
  await fs.writeFile(path.join(profileDir, "user.js"), prefs);
  return profileDir;
}

// If true, this script is called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const urls = [];
  let headless;
  let enableAutoPlay;
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
  runFirefox(urls[0], {
    headless,
    enableAutoPlay,
    verbose,
  }).catch((err) => {
    console.error("Could not run Firefox on the given URL:", err);
    process.exit(1);
  });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Run the Firefox browser to the given URL.

Usage: node run_firefox.mjs [options] <URL>

Available options:
  -h, --help           Display this help message
  --headless           Start the browser in headless mode (without a UI)
  --enable-autoplay    Allow autoplaying media even without user interaction
  --verbose            Enable browser output to stdio`,
  );
}
