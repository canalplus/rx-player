#!/usr/bin/env node
/* eslint-env node */

/**
 * =================
 * generate_build.mjs
 * =================
 *
 * This file allows to produce the main RxPlayer's builds.
 *
 * To run it, just call this file through your node.js binary:
 * ```sh
 * node generate_build.mjs
 * ```
 *
 * For now it heavily relies on unix-like utilities such as `find` and `sed` and
 * spawns new process to run them inside that script.
 * More cross-platform and safer solutions should be found in the future.
 */

import { spawn } from "child_process";
import * as path from "path";
import { fileURLToPath } from "url";
import { rimraf } from "rimraf";
import generateEmbeds from "./generate_embeds.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = path.join(currentDirectory, "../");
const BUILD_ARTEFACTS_TO_REMOVE = [
  "dist/commonjs",
  "dist/es2017",
  "src/__GENERATED_CODE",
];

generateBuild();

/**
 * @returns {Promise}
 */
async function generateBuild() {
  try {
    console.log(" 🧹 Removing previous build artefacts...");
    await removePreviousBuildArtefacts();

    console.log(" 🤖 Generate embedded code...");
    await generateEmbeds();

    console.log(" ⚙️ Compiling project with TypeScript...");
    await compile();
  } catch (err) {
    console.error(
      "Fatal error:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  console.log(" 🙌 SUCCESS!");
}

/**
 * Remove directories and files from a previously built RxPlayer.
 * @returns {Promise}
 */
async function removePreviousBuildArtefacts() {
  await Promise.all(BUILD_ARTEFACTS_TO_REMOVE.map((name) => {
    const relativePath = path.join(ROOT_DIR, name);
    return removeFile(relativePath);
  }));
}

/**
 * Compile the project by spawning a separate procress running TypeScript.
 * @returns {Promise}
 */
async function compile() {
  // Sadly TypeScript compiler API seems to be sub-par.
  // I did not find for example how to exclude some files (our unit tests)
  // easily by running typescript directly from NodeJS.
  // So we just spawn a separate process running tsc:
  await Promise.all([
    spawnProm(
      "npx tsc -p",
      [path.join(ROOT_DIR, "tsconfig.json")],
      (code) => new Error(`CommonJS compilation process exited with code ${code}`),
    ),
    spawnProm(
      "npx tsc -p",
      [path.join(ROOT_DIR, "tsconfig.commonjs.json")],
      (code) => new Error(`es2018 compilation process exited with code ${code}`),
    )
  ]);
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
function removeFile(fileName) {
  return rimraf(fileName);
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Function} errorOnCode
 */
function spawnProm(command, args, errorOnCode) {
  return new Promise((res, rej) => {
    spawn(command, args, { shell: true, stdio: "inherit" })
      .on("close", (code) => {
        if (code !== 0) {
          rej(errorOnCode(code));
        }
        res();
      });
  });
}
