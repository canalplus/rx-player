import fs from "fs";
import RxPlayer from "../minimal/index.js";
import * as Features from "../features/index.js";
import * as Tools from "../experimental/tools/index.js";

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
if (typeof Features !== "object" || Features === null) {
  throw new Error("Invalid \"Features\" object exported.");
}
if (typeof Tools !== "object" || Tools === null) {
  throw new Error("Invalid \"Tools\" object exported.");
}

/* eslint-disable no-console */
console.log("SUCCESS!");
/* eslint-enable no-console */
