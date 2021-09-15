/**
 * # check_nodejs_import_compatibility
 *
 * This is a node.js script which tries to import the RxPlayer various exports
 * and check if every one of them seems to be importable without issue.
 *
 * The goal is to check if the RxPlayer, at the origin made to run in a browser
 * environment, can still be imported through node.js in specific cases like
 * when the application uses [poorly optimized] server-side rendering.
 *
 * ---
 *
 * To be able to run this script:
 *
 *   1. You need first to produce the modular "minimal" build of the RxPlayer
 *
 *   2. You need to make sure that `import` statements can be used in the
 *      node.js runtime you've ran. This possibility might depends on the
 *      usage of supplementary supplementary packages like `esm`.
 *
 * After running this script, you know if it ran succesfully by seeing the
 * string "SUCCESS!" being outputed to STDOUT.
 *
 * If it doesn't work, you should see a corresponding error output to STDERR.
 */

import fs from "fs";
import RxPlayer from "../minimal/index.js";
import * as Features from "../features/index.js";
import * as ExperimentalFeatures from "../experimental/features/index.js";
import * as ExperimentalTools from "../experimental/tools/index.js";
import * as Tools from "../tools/index.js";

let version = fs.readFileSync("./VERSION").toString();
const indexOfFirstLineBreak = version.indexOf("\n");
if (indexOfFirstLineBreak >= 0) {
  version = version.substring(0, indexOfFirstLineBreak);
}

if (RxPlayer.version !== version) {
  throw new Error(
    "Wrong RxPlayer version: " + "\n" +
    `Got "${RxPlayer.version}" but expected "${version}"`);
}
if (typeof ExperimentalFeatures !== "object" || ExperimentalFeatures === null) {
  throw new Error("Invalid \"ExperimentalFeatures\" object exported.");
}
if (typeof Features !== "object" || Features === null) {
  throw new Error("Invalid \"Features\" object exported.");
}
if (typeof ExperimentalTools !== "object" || ExperimentalTools === null) {
  throw new Error("Invalid \"ExperimentalTools\" object exported.");
}
if (typeof Tools !== "object" || Tools === null) {
  throw new Error("Invalid \"Tools\" object exported.");
}

/* eslint-disable no-console */
console.log("SUCCESS!");
/* eslint-enable no-console */
