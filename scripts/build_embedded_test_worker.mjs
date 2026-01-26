#!/usr/bin/env node
/**
 * # build_embedded_test_worker.mjs
 *
 * This file allows to build an "embedded" "RxPlayer Worker" for some advanced
 * multithreaded integration tests.
 *
 * Some integration tests rely on the artifacts from this script to be present,
 * as such it is important to ensure that it is run before integration tests are
 * run (preferably automatically on test setup).
 *
 * The idea is to bundle a `<PROJECT_ROOT>/tests/worker_file.mjs` file which
 * contains every worker-side "plugins" that might be then depended in
 * integration test. To facilitate the setup, that bundle is then made
 * "embeddable" by transforming it into a JS `Blob` structure - a worker format
 * also supported by the RxPlayer.
 *
 * If you want to run it manually, you can either run it directly as a script or
 * by requiring it as a node module.
 */

import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import projectRootDirectory from "./utils/project_root_directory.mjs";

const INPUT_WORKER_FILE = path.join(projectRootDirectory, "tests", "worker_file.mjs");
const RESULT_WORKER_PATH = path.join(projectRootDirectory, "tests", "worker_bundle.js");
const EMBEDDED_RESULT_WORKER_PATH = path.join(
  projectRootDirectory,
  "tests",
  "embedded_worker_bundle.js",
);

export default async function buildTestWorker() {
  await bundleTestWorker();
  await writeWorkerEmbed();
}

async function bundleTestWorker() {
  await esbuild.build({
    entryPoints: [INPUT_WORKER_FILE],
    bundle: true,
    outfile: RESULT_WORKER_PATH,
    format: "iife",
    minify: false,
    // TODO? I don't like sourceMaps but some do
    // If you want it enable it and propose it
    sourcemap: false,
    target: ["es2017"],
    platform: "browser",
  });
}

async function writeWorkerEmbed() {
  const workerData = await readFile(RESULT_WORKER_PATH, "utf-8");
  const workerEmbedCode =
    "const blob = new Blob([" +
    `"(function(){" + ${JSON.stringify(workerData)} + "})()"` +
    `], { type: "application/javascript" });
export { blob as EMBEDDED_WORKER };
export default blob;`;
  await writeFile(EMBEDDED_RESULT_WORKER_PATH, workerEmbedCode);
}

/**
 * Simple promisified `fs.readFile` API.
 * @param {string} filePath
 * @param {string|null} encoding
 * @returns {*} - Read data, the type depends on the `encoding` parameters (see
 * `fs.readFile` documentation).
 */
function readFile(filePath, encoding) {
  return new Promise((res, rej) => {
    fs.readFile(filePath, { encoding }, function (err, data) {
      if (err) {
        rej(err);
      } else {
        res(data);
      }
    });
  });
}

/**
 * Simple promisified `fs.writeFile` API.
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise}
 */
function writeFile(filePath, content) {
  return new Promise((res, rej) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "--":
        argOffset = args.length;
        break;
      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }
  try {
    buildTestWorker().catch((err) => {
      console.error(`ERROR: ${err}\n`);
      process.exit(1);
    });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    process.exit(1);
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `build_demo.mjs: Build the RxPlayer's demo in the "demo/" directory.

Usage: node build_demo.mjs [OPTIONS]

Options:
  -h, --help             Display this help.`,
  );
}
