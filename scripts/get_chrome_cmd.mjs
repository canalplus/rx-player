#!/usr/bin/env node

/**
 * # get_chrome_cmd.mjs
 *
 * This utils allows to get the string to the Chrome browser's executable on
 * your computer.
 * It can be imported or called directly.
 */

// @ts-check

import { execFile } from "child_process";
import * as fsProm from "fs/promises";
import * as path from "path";
import { pathToFileURL } from "url";

/**
 * Returns string corresponding to the Chrome binary.
 * @returns {Promise.<string|null>}
 */
export default async function getChromeCmd() {
  switch (process.platform) {
    case "win32": {
      const suffix = ["Google", "Chrome", "Application", "chrome.exe"];
      const prefixes = [
        process.env.LOCALAPPDATA,
        process.env.PROGRAMFILES,
        process.env["PROGRAMFILES(X86)"],
      ];
      for (const prefix of prefixes) {
        if (!prefix) {
          continue;
        }
        try {
          const windowsChromeDirectory = path.join(prefix, ...suffix);
          await fsProm.access(windowsChromeDirectory);
          return windowsChromeDirectory;
        } catch (e) {}
      }

      return null;
    }

    case "darwin": {
      const defaultPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      try {
        await fsProm.access(defaultPath);
        return defaultPath;
      } catch (e) {
        return null;
      }
    }

    case "linux": {
      const chromeBins = [
        "google-chrome",
        "google-chrome-stable",
        "chromium",
        "chromium-browser",
      ];
      for (const chromeBin of chromeBins) {
        try {
          return await which(chromeBin);
        } catch {}
      }
      return null;
    }
    default:
      throw new Error(`Error: unsupported platform: ${process.platform}`);
  }
}

/**
 * Execute `which` on the given command and output the path given by its output.
 * @param {string} cmd
 * @returns {Promise.<string>}
 */
function which(cmd) {
  return new Promise((resolve, reject) => {
    execFile("which", [cmd], (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.split("\n")[0].trim());
      }
    });
  });
}

// If true, this script is called directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    displayHelp();
    process.exit(0);
  }
  getChromeCmd()
    .then((chromeCmd) => {
      if (chromeCmd) {
        console.log(chromeCmd);
      } else {
        console.error("No chrome executable found on your machine");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Could not check the chrome executable on your machine:", err);
      process.exit(1);
    });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Returns path to the Chrome browser on your machine.
Empty with a \`1\` exit code if not found.

Usage: node get_chrome_cmd.mjs

Available options:
  -h, --help                 Display this help message`,
  );
}
