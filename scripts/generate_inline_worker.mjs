/**
 * ============= generate_inline_worker =============
 *
 * == What is this?
 *
 * This file allows to generate a JavaScript file which embeds the
 * RxPlayer's Worker file.
 *
 *
 * == Why?
 *
 * The Web API to create a WebWorker relies on having a separate JavaScript
 * file containing the Worker's code, which is loaded through an URL.
 *
 * This is still the recommended way of loading RxPlayer's Worker
 * file, yet for quick tests and development having to store and serve a whole
 * separate file may be cumbersome to web developpers not used to handle such
 * kind of considerations.
 *
 * Hence, to facilitate developments, this script astuciously succeed to
 * allow Worker loading without having to store the file separately.
 *
 * == How?
 *
 * We're here embedding the whole Worker's code into an IFEE, with the Worker's
 * own code embedded in it. The Worker code is in JavaScript's string form
 * directly to prevent being updated by bundler.
 *
 * Then, that stringified IFEE is transformed into a local URL through the
 * `Object.createObjectURL` Web API to make it point to it with the right
 * `"application/javascript"` Content-Type, and then export the URL.
 *
 * Then, without knowing it, an application can just import that file and give
 * its default export to the `RxPlayer` as if it was the Worker file's
 * URL (it basically still is).
 */

import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const originalWorkerFilePath = join(currentDir, "../dist/worker.js");
const es5DestinationJsPath = join(currentDir, "../experimental/inline-worker.js");
const es5DestinationDeclPath = join(currentDir, "../experimental/inline-worker.d.ts");
const commonJsDestinationJsPath = join(currentDir, "../experimental/inline-worker.commonjs.js");
const commonJsDestinationDeclPath = join(currentDir, "../experimental/inline-worker.commonjs.d.ts");
const declarationFile = `declare const inlineWorker: string;
export default inlineWorker;`;

const codePrefix =
  `const inlineWorkerUrl = URL.createObjectURL(new Blob(["(function(){" + `;
const es5CodeSuffix = ` + "})()"], { type: "application/javascript" }));
export default inlineWorkerUrl;`;
const commonJsCodeSuffix = ` + "})()"], { type: "application/javascript" }));
module.exports = inlineWorkerUrl;`;

fs.readFile(
  originalWorkerFilePath,
  { encoding: "utf-8" },
  function (err, data) {
    if (err) {
      console.error(`Error while reading "${originalWorkerFilePath}":`, err);
    } else {
      const es5Content = codePrefix + JSON.stringify(data) + es5CodeSuffix;
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

      const commonJsContent = codePrefix + JSON.stringify(data) + commonJsCodeSuffix;
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
  }
);
