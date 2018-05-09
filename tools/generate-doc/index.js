const process = require("process");
const path = require("path");
const createDocumentationForDir = require("./create_for_dir.js");

if (process.argv.length < 4) {
  /* eslint-disable no-console */
  console.error("needs two arguments: input directory and output directory");
  /* eslint-enable no-console */
}

const inDir = process.argv[2];
const outDir = process.argv[3];

async function main() {
  createDocumentationForDir(inDir, outDir, {
    css: [
      path.join(__dirname, "styles/style.css"),
      path.join(__dirname, "styles/code.css"),
    ],
    getPageTitle: originalTitle => originalTitle + " - RxPlayer Documentation",
  });
}

main();
