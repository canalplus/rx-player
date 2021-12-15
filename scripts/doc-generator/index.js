const process = require("process");
const path = require("path");
const createDocumentation = require("./create_documentation.js");

if (process.argv.length < 4) {
  /* eslint-disable no-console */
  console.error(
    "Error: The documentation generator needs at least two arguments: " +
    "the input directory and the output directory"
  );
  /* eslint-enable no-console */
  process.exit(1);
}

// TODO better args
const inDir = process.argv[2];
const outDir = process.argv[3];
const version = process.argv[4];

async function main() {
  createDocumentation(inDir, outDir, {
    css: [
      path.join(__dirname, "styles/style.css"),
      path.join(__dirname, "styles/code.css")
    ],

    // Add suffix to each page title
    getPageTitle: originalTitle => originalTitle + " - RxPlayer Documentation",

    version,
  });
}

main();
