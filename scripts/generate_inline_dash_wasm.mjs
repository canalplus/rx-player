/**
 * ============= generate_inline_dash_wasm =============
 *
 * == What is this?
 *
 * This file allows to generate a [huge] JavaScript file which embeds the
 * DASH_WASM's WebAssembly file.
 *
 *
 * == Why?
 *
 * The Web API to instantiate a new WebAssembly module relies on having a
 * separate WebAssembly file which is loaded through an URL.
 *
 * This is still the recommended way of loading the RxPlayer's DASH_WASM
 * WebAssembly file, yet for quick tests and development having to store and
 * serve a whole separate file may be cumbersome to web developpers not used
 * to handle such kind of considerations.
 *
 * Hence, to facilitate developments, this script astuciously succeed to
 * allow WebAssembly loading without having to store the file separately.
 *
 * == How?
 *
 * The exact way may seem pretty ugly: We're here converting the whole
 * WebAssembly binary file into a `Uint8Array` construction, then creating a
 * local URL through the `Object.createObjectURL` Web API to make it point to
 * that Uint8Array with the right `"application/wasm"` Content-Type, and then
 * export the URL.
 *
 * This leads to a gigantic multi-megas file size, though it should compress
 * pretty well.
 *
 * Then, without knowing it, an application can just import that file and give
 * its default export to the `RxPlayer` as if it was the WebAssembly file's
 * URL (it basically still is).
 */

import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const originalWasmFilePath = join(currentDir, "../dist/mpd-parser.wasm");
const es5DestinationJsPath = join(currentDir, "../experimental/inline-mpd-parser.js");
const es5DestinationDeclPath = join(currentDir, "../experimental/inline-mpd-parser.d.ts");
const commonJsDestinationJsPath = join(currentDir, "../experimental/inline-mpd-parser.commonjs.js");
const commonJsDestinationDeclPath = join(currentDir, "../experimental/inline-mpd-parser.commonjs.d.ts");
const declarationFile = `declare const EmbeddedWasm: string;
export default EmbeddedWasm;`;

const codePrefix = "const blobURL = URL.createObjectURL(new Blob([";
const es5CodeSuffix = `], { type: "application/wasm" }));
export default blobURL;`;
const commonJsCodeSuffix = `], { type: "application/wasm" }));
module.exports = blobURL;`;

fs.readFile(originalWasmFilePath, { encoding: null }, function (err, data) {
  if (err) {
    console.error(`Error while reading "${originalWasmFilePath}":`, err);
  } else {
    const u8Arr = new Uint8Array(data);
    const jsDataStr = `new Uint8Array([${u8Arr.toString()}])`;

    const es5Content = codePrefix + jsDataStr + es5CodeSuffix;
    fs.writeFile(es5DestinationJsPath, es5Content, (err) => {
      if (err) {
        console.error(`Error while writing "${es5DestinationJsPath}":`, err);
      }
      // file written successfully
    });
    fs.writeFile(es5DestinationDeclPath, declarationFile, (err) => {
      if (err) {
        console.error(`Error while writing "${es5DestinationDeclPath}":`, err);
      }
      // file written successfully
    });

    const commonJsContent = codePrefix + jsDataStr + commonJsCodeSuffix;
    fs.writeFile(commonJsDestinationJsPath, commonJsContent, (err) => {
      if (err) {
        console.error(`Error while writing "${commonJsDestinationJsPath}":`, err);
      }
      // file written successfully
    });
    fs.writeFile(commonJsDestinationDeclPath, declarationFile, (err) => {
      if (err) {
        console.error(`Error while writing "${commonJsDestinationDeclPath}":`, err);
      }
      // file written successfully
    });
  }
});
