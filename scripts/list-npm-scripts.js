/**
 * # list-npm-scripts
 *
 * Script displaying a readable preview of all nom scripts by relying on the
 * `scripts-list` key in a package.json.
 *
 * The basic idea what to start from/take inspiration from what the
 * `npm-scripts-info` npm package does and adapt it to a case where a lot of
 * scripts for very different matters are present.
 */

const fs = require("fs");
const readline = require("readline");
const path = require("path");

run();

async function run() {
  const pkg = getPackageJSONContent();
  if (!("scripts-list" in pkg)) {
    console.log("No \"scripts-list\" key in the `package.json` file.");
    process.exit(0);
  }

  const scriptsList = pkg["scripts-list"];
  const groupNames = Object.keys(scriptsList);
  if (groupNames.length === 0) {
    console.log("Nothing found in \"scripts-list\" in the `package.json` file.");
    process.exit(0);
  }
  console.log("\x1b[33m~~~~~~~~~~~~~~~~ RxPlayer scripts ~~~~~~~~~~~~~~~~\n");
  console.log("\x1b[34m============ What do you want to do? =============\n");
  groupNames.forEach((key, groupIdx) => {
    console.log(`\x1b[32m${groupIdx + 1}.\x1b[37m ${key}`);
  });
  console.log("");
  const answer = await readInput("Your choice (leave empty to exit): ");
  if (answer == null || answer === "") {
    process.exit(0);
  }
  const groupNum = Number(answer);
  if (isNaN(groupNum) || groupNum <= 0 || groupNum > groupNames.length) {
    console.error("Invalid number given");
    process.exit(1);
  }

  console.log("");
  const wantedGroupName = groupNames[groupNum - 1];
  console.log(`\x1b[34m>>>> ${wantedGroupName}\x1b[37m`);
  console.log("");
  const subGroup = scriptsList[wantedGroupName];
  const subGroupEntries = Object.entries(subGroup);
  if (subGroupEntries.length === 0) {
    console.log("Nothing found in in the chosen category.");
    process.exit(0);
  }

  displayGroupCommands(subGroupEntries);

  process.exit(0);
}

function displayGroupCommands(
  groupEntries,
  indentation = ""
) {
  groupEntries.forEach(([name, val]) => {
    if (typeof val === "string") {
      console.log(`${indentation}[\x1b[32mnpm run ${name}\x1b[37m]:`);
      console.log(`${indentation}  ${val}\n`);
    } else if (typeof val === "object") {
      console.log(`${indentation}\x1b[33m${name}\x1b[37m\n`);
      const deeper = Object.entries(val);
      displayGroupCommands(deeper, indentation + "  ");
      console.log("");
    }
  });
}

function readInput(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

function getPackageJSONContent() {
  const filename = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(filename)) {
    throw new Error('`package.json` was not found in the current working directory.');
  }
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

