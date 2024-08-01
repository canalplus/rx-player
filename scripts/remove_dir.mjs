#!/usr/bin/env node
import { pathToFileURL } from "url";
import * as fs from "fs";

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const dir of process.argv.slice(2)) {
    removeDir(dir).catch((err) => {
      console.error(`ERROR: Failed to remove "${dir}"`, err);
    });
  }
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
export default function removeDir(fileName) {
  return new Promise((res, rej) => {
    fs.rm(fileName, { recursive: true, force: true }, (err) => {
      if (err) {
        rej(err);
      }
      res();
    });
  });
}
