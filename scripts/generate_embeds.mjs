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
 * construction.
 *
 * As for the Worker file, we're here embedding its code into an IFEE.
 * The Worker code is in JavaScript's string form directly to prevent being
 * updated by a bundler, which generally do not consider that the code might
 * run in a WebWorker environment.
 *
 * Then, we're creating local URLs through the `Object.createObjectURL` Web API
 * to make the WebAssembly point to the Uint8Array (with an `"application/wasm"`
 * Content-Type), and the embedded Worker to the worker IFEE (with an
 * `"application/javascript"` Content-Type).
 *
 * This URL is then exported in the corresponding file.
 * When that URL is given back by an application to the RxPlayer, the latter has
 * no idea the URL actually points to local data, it's as if the corresponding
 * files are loaded through a regular URL.
 */

import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const originalWasmFilePath = join(currentDir, "../dist/mpd-parser.wasm");
const originalWorkerFilePath = join(currentDir, "../dist/worker.js");

// Hardcode the code declaring and exporting the embedded URL:
const urlCodePrefix = "const blobURL = URL.createObjectURL(new Blob([";
const wasmSuffix = `], { type: "application/wasm" }));
export { blobURL as EMBEDDED_DASH_WASM };
export default blobURL;`;
const workerSuffix = `], { type: "application/javascript" }));
export { blobURL as EMBEDDED_WORKER };
export default blobURL;`;
const indexCode = `export { EMBEDDED_DASH_WASM } from "./embedded_dash_wasm";
export { EMBEDDED_WORKER } from "./embedded_worker";`;

const codeGenDir = join(currentDir, "../src/__GENERATED_CODE");
const indexPath = join(codeGenDir, "./index.ts");
const mpdEmbedPath = join(codeGenDir, "./embedded_dash_wasm.ts");
const workerEmbedPath = join(codeGenDir, "./embedded_worker.ts");

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateEmbeds().catch(() => {
    process.exit(1);
  });
}

async function generateEmbeds() {
  try {
    if (!fs.existsSync(codeGenDir)) {
      fs.mkdirSync(codeGenDir);
    }
    await Promise.all([
      writeWebAssemblyEmbed(),
      writeWorkerEmbed(),
      writeIndexCode(),
    ]);
  } catch (err) {
    console.log(err);
    return Promise.reject(err);
  }
}

async function writeWebAssemblyEmbed() {
  const wasmData = await readFile(originalWasmFilePath, null);
  const u8Arr = new Uint8Array(wasmData);
  const wasmDataStr = `new Uint8Array([${u8Arr.toString()}])`;

  const dashWasmUrlCode = urlCodePrefix + wasmDataStr + wasmSuffix;
  await writeFile(mpdEmbedPath, dashWasmUrlCode);
}

async function writeWorkerEmbed() {
  const workerData = await readFile(originalWorkerFilePath, "utf-8");
  const workerEmbedCode =
    urlCodePrefix +
    `"(function(){" + ` +
    JSON.stringify(workerData) +
    ` + "})()"` +
    workerSuffix;
  await writeFile(workerEmbedPath, workerEmbedCode);
}

async function writeIndexCode() {
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

export default generateEmbeds;
