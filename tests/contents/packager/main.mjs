#!/usr/bin/env node

/**
 * main.mjs
 * ------
 * Command-line entry point for the live DASH packager.
 *
 * Parses argv, builds a config object, registers signal handlers, then
 * delegates to packageLiveContent().
 *
 * Usage: node main.mjs [OPTIONS]
 * Run with --help to see all available options.
 */

import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

import { DEFAULT_CONFIG, DEFAULT_KID, DEFAULT_KEY } from "./constants.mjs";
import { isPositiveInteger, isValidPort, sanitizeDirPath } from "./utils.mjs";
import { packageLiveContent } from "./live_packager.mjs";
import { cleanup, registerSignalHandlers } from "./cleanup.mjs";
import { displayHelp } from "./ui.mjs";

const SCRIPT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "scripts",
);
const TMP_DIR = resolve(SCRIPT_DIR, "..", "tmp");

const configObj = {
  ...DEFAULT_CONFIG,
  outputDir: resolve(TMP_DIR, "testcontents", "live"),
  tmpDir: TMP_DIR,
  scriptDir: SCRIPT_DIR,
};

const args = process.argv.slice(2);

/**
 * Require that the next positional argument exists, or exit with an error.
 * @param {string} name - Flag name, used in the error message.
 * @param {number} i    - Current index into `args`.
 * @returns {{ value: string, nextIndex: number }}
 */
function requireNextArg(name, i) {
  if (i + 1 >= args.length) {
    panic(`${name} requires a value.`);
  }
  return { value: args[i + 1], nextIndex: i + 1 };
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  switch (arg) {
    case "--segment-duration": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!isPositiveInteger(value)) {
        panic("--segment-duration must be a positive integer.");
      }
      configObj.segmentDuration = Number(value);
      configObj.fragmentDuration = Number(value);
      i = nextIndex;
      break;
    }

    case "--fragment-duration": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!isPositiveInteger(value)) {
        panic("--fragment-duration must be a positive integer.");
      }
      configObj.fragmentDuration = Number(value);
      i = nextIndex;
      break;
    }

    case "--timeshift-buffer-depth": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!isPositiveInteger(value)) {
        panic("--timeshift-buffer-depth must be a positive integer.");
      }
      configObj.timeshiftBufferDepth = Number(value);
      i = nextIndex;
      break;
    }

    case "--frame-rate": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!isPositiveInteger(value)) {
        panic("--frame-rate must be a positive integer.");
      }
      configObj.frameRate = Number(value);
      i = nextIndex;
      break;
    }

    case "--output-dir": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!value) {
        panic("--output-dir cannot be empty.");
      }
      configObj.outputDir = sanitizeDirPath(value);
      i = nextIndex;
      break;
    }

    case "--base-port": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!isValidPort(value)) {
        panic("--base-port must be a valid port number (1-65535).");
      }
      configObj.basePort = Number(value);
      i = nextIndex;
      break;
    }

    case "--shaka-path": {
      const { value, nextIndex } = requireNextArg(arg, i);
      if (!value) {
        panic("--shaka-path cannot be empty.");
      }
      if (!existsSync(value)) {
        panic(`Shaka-packager binary not found at: ${value}`);
      }
      configObj.shakaPath = value;
      i = nextIndex;
      break;
    }

    case "--no-confirmation":
      configObj.noConfirm = true;
      break;

    case "--encrypted":
      configObj.keyId = DEFAULT_KID;
      configObj.key = DEFAULT_KEY;
      break;

    case "--enable-text-track":
      configObj.hasTextTrack = true;
      break;

    case "--help":
      displayHelp();
      process.exit(0);
      break;

    default:
      console.error(`ERROR: unknown option: "${arg}"\n`);
      displayHelp();
      process.exit(1);
  }
}

// outputDir may be reassigned inside packageLiveContent; read it lazily.
registerSignalHandlers(() => configObj.outputDir);

packageLiveContent(configObj).catch((err) => {
  process.stderr.write(`ERROR: ${err.message}\n`);
  cleanup(configObj.outputDir);
  process.exit(1);
});

/** Print `message` to stderr and exit with code 1. */
function panic(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  cleanup(configObj.outputDir);
  process.exit(1);
}
