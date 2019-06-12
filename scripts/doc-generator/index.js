const process = require("process");
const path = require("path");
const createDocumentationForDir = require("./create_for_dir.js");
const removeTOCFromMD = require("./remove_toc_from_md");

if (process.argv.length < 4) {
  /* eslint-disable no-console */
  console.error("needs two arguments: input directory and output directory");
  /* eslint-enable no-console */
}

const inDir = process.argv[2];
const outDir = process.argv[3];

async function main() {
  createDocumentationForDir(inDir, outDir, {
    css: [ path.join(__dirname, "styles/style.css"),
           path.join(__dirname, "styles/code.css") ],

    // Add suffix to each page title
    getPageTitle: originalTitle => originalTitle + " - RxPlayer Documentation",

    // Files named 'README.md' (non-case sensitive) will not be considered.
    // This is because they are usually symbolic links created specifically for
    // Github, for aesthetic reasons.
    fileFilter: fileName => fileName.toLowerCase() !== "readme.md",

    // We sometimes added a Table of contents manually in the markdown files
    // Here, one will be generated automatically. It thus might be better to
    // remove the one already there.
    beforeParse: content => removeTOCFromMD(content),
  });
}

main();
