#!/usr/bin/env node
/* eslint-env node */

/**
 * =================
 * generate_build.js
 * =================
 *
 * This file allows to produce the main RxPlayer's [modular] build.
 *
 * To run it, just call this file through your node.js binary:
 * ```sh
 * node generate_build.js
 * ```
 *
 * For now it heavily relies on unix-like utilities such as `find` and `sed` and
 * spawns new process to run them inside that script.
 * More cross-platform and safer solutions should be found in the future.
 */

const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const rimraf = require("rimraf");

const BUILD_DIR_FROM_ROOT = "dist/_esm5.processed";

const ROOT_DIR = path.join(__dirname, "../../");
const TEMPLATE_DIR = path.join(__dirname, "../../scripts/build/templates");
const TMP_BUILD_DIR = path.join(ROOT_DIR, "dist/_esm5.raw");
const BUILD_DIR = path.join(ROOT_DIR, BUILD_DIR_FROM_ROOT);
const BUILD_ARTEFACTS_TO_REMOVE = [
  "dist/_esm5.processed",
  "dist/_esm5.raw",
  "features",
  "minimal",
  "experimental",
  "tools",
  "types",
  "logger"
];

generateBuild();

/**
 * @returns {Promise}
 */
async function generateBuild() {
  try {
    console.log(" 🧹 Removing previous build artefacts...");
    await removePreviousBuildArtefacts();

    console.log(" ⚙️  Compiling project with TypeScript...");
    await compile();

    console.log(" 🚚 Moving built code to its final directory...");
    await fs.rename(TMP_BUILD_DIR, BUILD_DIR);

    console.log(" 📦 Generating imported files from templates...");
    await generateImportFilesFromTemplates();
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
    await spawnProm(
      "npx tsc -p",
      [path.join(ROOT_DIR, "tsconfig.modules.json")],
      (code) => new Error(`Compilation process exited with code ${code}`),
    );
}

/**
 * @returns {Promise}
 */
async function generateImportFilesFromTemplates() {
  const dir = await fs.readdir(TEMPLATE_DIR);
  const proms = [];
  for (let f of dir) {
    proms.push(processTemplateFileOrDir(f));
  }
  await Promise.all(proms);

  /**
   * @returns {Promise}
   */
  async function processTemplateFileOrDir(fileName) {
    const filePath = path.join(TEMPLATE_DIR, fileName);
    const fileDest = path.join(ROOT_DIR, fileName);
    await copyDir(filePath, fileDest);
    await replaceTokensInTemplates(fileDest);
  }
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
function removeFile(fileName) {
  return new Promise((res, rej) => {
    rimraf(fileName, (err) => {
      if (err !== null && err !== undefined) {
        rej(err);
      }
      res();
    });
  });
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

/**
 * @returns {Promise}
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  let entries = await fs.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory() ?
      await copyDir(srcPath, destPath) :
      await fs.copyFile(srcPath, destPath);
  }
}

/**
 * @returns {Promise}
 */
async function replaceTokensInTemplates(fileDest) {
  const sedDir = BUILD_DIR_FROM_ROOT.replace(/\//g, "\\/");
  switch (os.type()) {
    case "Darwin":
      await spawnProm(
        `find "${fileDest}" -type f -iname '*.js' ` +
          `-exec sed -i.DELETE -E "s/__BUILD_DIR__/${sedDir}/g" {} \\;`,
        [],
        (code) => new Error(`Template process exited with code ${code}`),
      );
      await spawnProm(
        `find  "${fileDest}" -type f -name "*.DELETE" -delete`,
        [],
        (code) => new Error(`Template cleaning process exited with code ${code}`),
      );

    case "Linux":
      await spawnProm(
        `find "${fileDest}" -type f -exec sed -i -E "s/__BUILD_DIR__/${sedDir}/g" '{}' \\;`,
        [],
        (code) => new Error(`Template process exited with code ${code}`),
      );
  }
}
