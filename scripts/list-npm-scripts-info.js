/**
 * # list-npm-scripts-info
 *
 * Script displaying a readable preview of the `scripts-info` key in a
 * package.json, here to display information about available npm scripts.
 *
 * This file reimplement a much simpler `npm-scripts-info` module, which was
 * poorly maintained.
 */

const fs = require('fs');
const path = require('path');

run();

function run() {
  const pkg = getPackageJSONContent();
  console.log("\x1b[33m>>>>>>>>>>>>>> RxPlayer npm scripts <<<<<<<<<<<<<<\n");
  console.log("\x1b[34mThe following scripts can all be run through the following "+
              "command:\n\x1b[37mnpm run \x1b[32m<SCRIPT>\n\x1b[37m");
  if (!("scripts-info" in pkg)) {
    console.log("No \"scripts-info\" key in the `package.json` file.");
    process.exit(0);
  }

  const obj = pkg["scripts-info"];
  Object.keys(obj).forEach((key) => {
    console.log(`\x1b[32m${key}\x1b[37m:\n  ${obj[key]}\n`);
  })
    process.exit(0);
}

function getPackageJSONContent() {
  const filename = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(filename)) {
    throw new Error('`package.json` was not found in the current working directory.');
  }
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
