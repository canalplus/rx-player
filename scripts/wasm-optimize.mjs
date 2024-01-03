/**
 * ============= wasm-optimize util =============
 *
 * == What is this?
 *
 * This file allows to optimize a WebAssembly binary file (`.wasm`) by running
 * binaryen's wasm-opt tool on it, through its JavaScript API.
 *
 * To run it, provide the source WebAssembly file as first argument and the
 * output as second:
 * ```
 * node wasm-optimize.mjs source.wasm dest.wasm
 * ```
 *
 * == Why?
 *
 * As the WebAssembly file produced by the RxPlayer is mostly for performance
 * enhancement, it is important that we squeeze the most performance out of it
 * at compile-time.
 *
 * The wasm-opt tool specically optimizes WebAssembly files, it is different
 * from performance improvements made by the initial source compiler (e.g. the
 * Rust compiler) which may not have the same constraints. Whether this script
 * brings or not an improvement in comparison to the source WebAssembly file
 * still should probably be regularly checked in real-life scenarios.
 */

import binaryen from "binaryen";
import * as fs from "fs";

run();
function run() {
  let inputFileName;
  let outputFileName;

  if (process.argv.length < 3) {
    console.error("Error: missing input file as first argument");
    process.exit(1);
  }
  if (process.argv.length < 4) {
    console.error("Error: missing output file as second argument");
    process.exit(1);
  }
  inputFileName = process.argv[2];
  outputFileName = process.argv[3];

  console.log("Starting logic to optimize wasm file:", inputFileName);

  let dataU8;
  try {
    const data = fs.readFileSync(inputFileName);
    dataU8 = new Uint8Array(data.buffer);
    binaryen.setOptimizeLevel(4);
    const module = binaryen.readBinary(dataU8);
    module.optimize();
    const output = module.emitBinary();
    fs.writeFileSync(outputFileName, output);
  } catch (err) {
    console.error("Error:", err?.message ?? "Unknown");
    process.exit(1);
  }
  console.log("WASM successfuly optimized!");
}
