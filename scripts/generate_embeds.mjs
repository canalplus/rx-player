#!/usr/bin/env node
/**
 * ============= generate_embeds =============
 *
 * == What is this?
 *
 * This file allows to generate JavaScript files which will embed other code,
 * such as:
 *
 *   - the DASH_WASM's WebAssembly file
 *
 *   - The worker file
 *
 * Those are generated in the `src/__GENERATED_CODE` directory.
 *
 * == Why?
 *
 * The Web APIs to instantiate a new WebAssembly module and to create a
 * WebWorker both rely on accessing a separate file (respectfuly a WebAssembly
 * file representing the WebAssembly code to run and the JavaScript code which
 * should run in the WebWorker) which are normally referred by an URL.
 *
 * Yet having to store and serve files separately to use a library may be
 * cumbersome to web developpers, not used to handle such kind of
 * considerations.
 * Moreover, those files would need to be manually replaced at each RxPlayer
 * update which is not an habitual way of doing things in JavaScript, so I'm
 * unsure if applications are really ready for this.
 *
 * Hence, to facilitate developments, this script astuciously succeed to
 * allow WebAssembly AND WebWorker instantiation without having to store and
 * serve files separately.
 *
 * == How?
 *
 * For the WebAssembly file, the exact way may seem pretty ugly: We're here
 * converting the whole WebAssembly binary file into a `Uint8Array`
 * construction and then exporting it as an ArrayBuffer
 *
 * As for the Worker file, we're here embedding its code into an IFEE.
 * The Worker code is in JavaScript's string form directly to prevent being
 * updated by a bundler, which generally do not consider that the code might
 * run in a WebWorker environment. We're then exporting it as a Blob object
 * with the right `"application/javascript"` Content-Type.
 */

import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const originalWasmFilePath = join(currentDir, "..", "dist/mpd-parser.wasm");
const originalWorkerFilePath = join(currentDir, "..", "dist/worker.js");

const codeGenDir = join(currentDir, "..", "src/__GENERATED_CODE");
const indexPath = join(codeGenDir, "index.ts");
const mpdEmbedPath = join(codeGenDir, "embedded_dash_wasm.ts");
const workerEmbedPath = join(codeGenDir, "embedded_worker.ts");

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let noWasm = false;
  let noWorker = false;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "--no-wasm":
        noWasm = true;
        break;
      case "--no-worker":
        noWorker = true;
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
  generateEmbeds({ noWasm, noWorker }).catch(() => {
    process.exit(1);
  });
}

/**
 * Generate "embeds" part of the RxPlayer.
 * @param {Object} [param0={}] - Options.
 * @param {boolean} [param0.noWasm] - If set to `true`, skip the WebAssembly
 * embed.
 * @param {boolean} [param0.noWorker] - If set to `true`, skip the Worker
 * embed.
 * @returns {Promise} - Promise resolving when the embed generation is done and
 * rejecting with an `Error` if anything failed while doing it.
 */
export default async function generateEmbeds({ noWasm, noWorker } = {}) {
  if (noWasm && noWorker) {
    return;
  }
  try {
    if (!fs.existsSync(codeGenDir)) {
      fs.mkdirSync(codeGenDir);
    }
    await Promise.all([
      noWasm ? Promise.resolve() : writeWebAssemblyEmbed(),
      noWorker ? Promise.resolve() : writeWorkerEmbed(),
      writeIndexCode({ noWasm, noWorker }),
    ]);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
}

async function writeWebAssemblyEmbed() {
  const wasmData = await readFile(originalWasmFilePath, null);
  const u8Arr = new Uint8Array(wasmData);
  const wasmDataStr =
    "const wasmArrayBuffer = new Uint8Array([" +
    u8Arr.toString() +
    `]).buffer;
export { wasmArrayBuffer as EMBEDDED_DASH_WASM };
export default wasmArrayBuffer;`;
  await writeFile(mpdEmbedPath, wasmDataStr);
}

async function writeWorkerEmbed() {
  const workerData = await readFile(originalWorkerFilePath, "utf-8");
  const workerEmbedCode =
    "const blob = new Blob([" +
    `"(function(){" + ${JSON.stringify(workerData)} + "})()"` +
    `], { type: "application/javascript" });
export { blob as EMBEDDED_WORKER };
export default blob;`;
  await writeFile(workerEmbedPath, workerEmbedCode);
}

async function writeIndexCode({ noWasm, noWorker } = {}) {
  // Hardcode the code declaring and exporting the embedded URL:
  const indexCode =
    (noWasm ? "" : 'export { EMBEDDED_DASH_WASM } from "./embedded_dash_wasm";\n') +
    (noWorker ? "" : 'export { EMBEDDED_WORKER } from "./embedded_worker";');
  await writeFile(indexPath, indexCode);
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
      }
      res(data);
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
      }
      res();
    });
  });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `generate_embeds.mjs: Produce the RxPlayer's "embedded" files.

Usage: node generate_embeds.mjs [OPTIONS]

Options:
  -h, --help   Display this help
  --no-wasm     Skip embed generation for the WebAssembly file(s)
  --no-worker   Skip embed generation for the Worker file`,
  );
}
