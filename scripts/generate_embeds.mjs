/**
 * ============= generate_embeds =============
 *
 * == What is this?
 *
 * This file allows to generate JavaScript files which will embed other code,
 * such as the DASH_WASM's WebAssembly file
 *
 * Those are generated in the `src/__GENERATED_CODE` directory.
 *
 * == Why?
 *
 * The Web APIs to instantiate a new WebAssembly module rely on accessing a
 * separate file representing the WebAssembly code to run through an URL.
 *
 * Yet having to store and serve files separately to use a library may be
 * cumbersome to web developpers, not used to handle such kind of
 * considerations.
 * Moreover, this file would need to be manually replaced at each RxPlayer
 * update which is not an habitual way of doing things in JavaScript, so I'm
 * unsure if applications are really ready for this.
 *
 * Hence, to facilitate developments, this script astuciously succeed to
 * allow WebAssembly instantiation without having to store and serve a
 * separate file.
 *
 * == How?
 *
 * The exact way we're doing this may seem pretty ugly: We're here
 * converting the whole WebAssembly binary file into a `Uint8Array`
 * construction.
 *
 * Then, we're creating a local URL through the `Object.createObjectURL` Web API
 * to make the WebAssembly point to the Uint8Array with an `"application/wasm"`
 * Content-Type.
 * This URL is then exported in the corresponding file.
 * When that URL is given back by an application to the RxPlayer, the latter has
 * no idea the URL actually points to local data, it's as if the corresponding
 * file is loaded through a regular URL.
 */

import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const originalWasmFilePath = join(currentDir, "../dist/mpd-parser.wasm");

// Hardcode the code declaring and exporting the embedded URL:
const urlCodePrefix = "const blobURL = URL.createObjectURL(new Blob([";
const wasmSuffix = `], { type: "application/wasm" }));
export { blobURL as EMBEDDED_DASH_WASM };
export default blobURL;`;
const indexCode = `export { EMBEDDED_DASH_WASM } from "./embedded_dash_wasm";`;

const codeGenDir = join(currentDir, "../src/__GENERATED_CODE");
const indexPath = join(codeGenDir, "./index.ts");
const mpdEmbedPath = join(codeGenDir, "./embedded_dash_wasm.ts");

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateInlineDashWasm().catch(() => {
    process.exit(1);
  });
}

async function generateInlineDashWasm() {
  try {
    if (!fs.existsSync(codeGenDir)) {
      fs.mkdirSync(codeGenDir);
    }
    await Promise.all([
      writeWebAssemblyEmbed(),
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

export default generateInlineDashWasm;
