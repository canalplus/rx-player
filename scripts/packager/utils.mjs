// @ts-check

import { spawnSync } from "child_process";
import { resolve } from "path";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { ARTIFACT_PATTERNS } from "./constants.mjs";

/**
 * Returns true if `value` is a 32-character hexadecimal string.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHexKey(value) {
  return /^[0-9a-fA-F]{32}$/.test(value);
}

/**
 * Returns true if `value` is a positive integer.
 * @param {string} value
 * @returns {boolean}
 */
export function isPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/**
 * Returns true if `value` is a valid TCP/UDP port number (1–65535).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidPort(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

/**
 * Strip trailing slashes (unless root) and resolve to an absolute path.
 * @param {string} p
 * @returns {string}
 */
export function sanitizeDirPath(p) {
  const cleaned = p.replace(/\/+$/, "") || "/";
  return resolve(cleaned);
}

/**
 * Returns true if `cmd` is available on PATH.
 * @param {string} cmd
 * @returns {boolean}
 */
export function commandExists(cmd) {
  try {
    const lookupCmd = process.platform === "win32" ? "where" : "which";
    const res = spawnSync(lookupCmd, [cmd], { stdio: "ignore" });
    return res.status === 0;
  } catch {
    return false;
  }
}

/**
 * Returns true if `filename` matches any known artifact pattern.
 * @param {string} filename
 * @returns {boolean}
 */
export function isArtifact(filename) {
  return ARTIFACT_PATTERNS.some((re) => re.test(filename));
}

/**
 * Returns true if `outputDir` exists and contains at least one artifact file.
 * @param {string} outputDir
 * @returns {boolean}
 */
export function outputDirHasMediaFiles(outputDir) {
  if (!existsSync(outputDir)) {
    return false;
  }
  try {
    return readdirSync(outputDir).some(isArtifact);
  } catch {
    return false;
  }
}

/**
 * Delete all artifact files inside `outputDir`. Errors are non-fatal.
 * @param {string} outputDir
 */
export function cleanupMediaFiles(outputDir) {
  console.log(`Cleaning up media files from: ${outputDir}`);
  try {
    for (const file of readdirSync(outputDir)) {
      if (isArtifact(file)) {
        unlinkSync(resolve(outputDir, file));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Error";
    console.warn(`Warning: error during media cleanup: ${message}\n`);
  }
  console.log("Media files cleanup completed.");
}
