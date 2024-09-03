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

import { existsSync, readFileSync } from "fs";
import readline from "readline";
import { join } from "path";
import { execSync } from "child_process";
readline.emitKeypressEvents(process.stdin);

run();

async function run() {
  const pkg = getPackageJSONContent();
  if (!("scripts-list" in pkg)) {
    console.log('No "scripts-list" key in the `package.json` file.');
    process.exit(0);
  }

  // Display groups
  const scriptsList = pkg["scripts-list"];
  const groupNames = Object.keys(scriptsList);
  if (groupNames.length === 0) {
    console.log('Nothing found in "scripts-list" in the `package.json` file.');
    process.exit(0);
  }
  console.log("\x1b[33m~~~~~~~~~~~~~~~~ RxPlayer scripts ~~~~~~~~~~~~~~~~\n");
  console.log("\x1b[34m============ What do you want to do? =============\n");
  groupNames.forEach((key, groupIdx) => {
    console.log(`\x1b[32m${groupIdx + 1}.\x1b[37m ${key}`);
  });
  console.log("");
  const groupChoiceNum = await getChoice(groupNames.length);
  console.log("");
  const wantedGroupName = groupNames[groupChoiceNum - 1];
  console.log(`\x1b[34m>>>> ${wantedGroupName}\x1b[37m`);
  console.log("");
  const subGroup = scriptsList[wantedGroupName];
  const subGroupEntries = Object.entries(subGroup);
  if (subGroupEntries.length === 0) {
    console.log("Nothing found in in the chosen category.");
    process.exit(0);
  }

  // Display commands
  {
    let currCommandNb = 1;
    const commandArray = [];
    recusivelyDiplayGroupCommands(subGroupEntries);
    const cmdChoiceNum = await getChoice(commandArray.length);
    const wantedScript = commandArray[cmdChoiceNum - 1];
    console.log("\n");
    executeNpmScript(wantedScript);

    // TODO: that shouldn't be needed no? We may have missed to free a resource.
    process.exit(0);

    function recusivelyDiplayGroupCommands(groupEntries, indentation = "") {
      groupEntries.forEach(([name, val]) => {
        if (typeof val === "string") {
          commandArray.push(name);
          console.log(
            `${indentation}${emphasize(currCommandNb + ".")} [${emphasize(
              `npm run ${name}`,
            )}]:`,
          );
          const nbLength = String(currCommandNb).length;
          let numberSpace = "";
          for (let i = 0; i < nbLength; i++) {
            numberSpace += " ";
          }
          console.log(`${indentation}${numberSpace}  ${val}\n`);
          currCommandNb++;
        } else if (typeof val === "object") {
          console.log(`${indentation}\x1b[33m${name}\x1b[37m\n`);
          const deeper = Object.entries(val);
          recusivelyDiplayGroupCommands(deeper, indentation + "  ");
          console.log("");
        }
      });
    }
  }
}

/**
 * Ask for a numbered input between `1` and the `maxNb` given.
 *
 * Directly exits script in case of invalid input or in cases where the user
 * asked to exit.
 *
 * The returned number is guaranteed to be between `1` and `maxNb` included.
 * @param {number} maxNb
 * @returns {Promise.<number>}
 */
async function getChoice(maxNb) {
  const answer = maxNb <= 9 ? await getSingleCharChoice() : await readAnyLengthChoice();
  if (
    answer == null ||
    answer == "" ||
    (answer.length === 1 &&
      [
        3, // ^C
        4, // ^D
        13, // enter
        32, // space
      ].includes(answer.charCodeAt(0)))
  ) {
    process.exit(0);
  }
  const val = Number(answer);
  if (isNaN(val) || val <= 0 || val > maxNb) {
    console.error("Invalid number given");
    process.exit(1);
  }
  return val;
}

/**
 * Execute the given npm script.
 *
 * Redirect its stdin and stdout to ours, communicate signals, and exit when
 * the script exits.
 *
 * @param {string} cmd
 */
function executeNpmScript(script) {
  const emphasizedCmdStr = emphasize(`npm run ${script}`);
  console.log(`Executing: ${emphasizedCmdStr}`);
  execSync(`npm run ${script}`, {
    shell: true,
    stdio: ["inherit", "inherit", "inherit"],
  });
}

/**
 * Emphasize the given string with ANSI escape codes for the console.
 * @param {string} str
 * @returns {string}
 */
function emphasize(str) {
  return `\x1b[32m${str}\x1b[37m`;
}

/**
 * Read input string of any length.
 * @returns {Promise.<string>}
 */
function readAnyLengthChoice() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question("Your choice (leave empty to exit): ", (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
}

/**
 * Read single-character input.
 *
 * The advantage of this function when compared to `readAnyLengthChoice` is that
 * you won't need to enter a newline to validate your choice.
 * @returns {Promise.<string>}
 */
function getSingleCharChoice() {
  return new Promise((res) => {
    process.stdin.setRawMode(true);
    process.stdout.write("Your choice (leave empty to exit): ");
    process.stdin.on("keypress", onKeyPress);
    function onKeyPress(char) {
      process.stdin.setRawMode(false);
      process.stdin.off("keypress", onKeyPress);
      res(char);
    }
  });
}

/**
 * Read the content of the `package.json` file in the current directory and
 * parses its input into a JS Object.
 *
 * Throws if no `package.json` exists in the current directory.
 *
 * @returns {Object}
 */
function getPackageJSONContent() {
  const filename = join(process.cwd(), "package.json");
  if (!existsSync(filename)) {
    throw new Error("`package.json` was not found in the current working directory.");
  }
  return JSON.parse(readFileSync(filename, "utf8"));
}
