#!/usr/bin/env node

/**
 * # get_firefox_cmd.mjs
 *
 * Utility to get the string to the Firefox browser's executable
 * on your computer.
 * It can be imported or called directly.
 */

// @ts-check

import { execFile } from "child_process";
import * as fsProm from "fs/promises";
import * as path from "path";
import { pathToFileURL } from "url";

/**
 * Returns string corresponding to the Firefox binary.
 * @returns {Promise.<string|null>}
 */
export default async function getFirefoxCmd() {
  switch (process.platform) {
    case "win32": {
      const suffix = ["Mozilla Firefox", "firefox.exe"];
      const prefixes = [
        process.env.PROGRAMFILES,
        process.env["PROGRAMFILES(X86)"],
        process.env.LOCALAPPDATA,
      ];

      for (const prefix of prefixes) {
        if (!prefix) {
          continue;
        }
        try {
          const firefoxPath = path.join(prefix, ...suffix);
          await fsProm.access(firefoxPath);
          return firefoxPath;
        } catch {}
      }

      return null;
    }

    case "darwin": {
      const firefoxPath = "/Applications/Firefox.app/Contents/MacOS/firefox";
      try {
        await fsProm.access(firefoxPath);
        return firefoxPath;
      } catch {
        return null;
      }
    }

    case "linux": {
      const absoluteCandidates = ["/usr/bin/firefox", "/snap/bin/firefox"];

      for (const candidate of absoluteCandidates) {
        try {
          await fsProm.access(candidate);
          return candidate;
        } catch {}
      }

      try {
        return await which("firefox");
      } catch {
        return null;
      }
    }

    default:
      throw new Error(`Error: unsupported platform: ${process.platform}`);
  }
}

/**
 * Execute `which` on the given command and output its output.
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

  getFirefoxCmd()
    .then((firefoxCmd) => {
      if (firefoxCmd) {
        console.log(firefoxCmd);
      } else {
        console.error("No Firefox executable found on your machine");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Could not check the Firefox executable on your machine:", err);
      process.exit(1);
    });
}

/**
 * Display through `console.log` a helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `Returns path to the Firefox browser on your machine.
Empty with a \`1\` exit code if not found.

Usage: node get_firefox_cmd.mjs

Available options:
  -h, --help                 Display this help message`,
  );
}
