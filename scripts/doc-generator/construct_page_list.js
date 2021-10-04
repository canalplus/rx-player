const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const readTitleFromMD = require("./read_title_from_md.js");

// XXX TODO

/**
 * Given the path to a Markdown document, returns its title as a string.
 * null if no title has been found.
 *
 * @param {string} MDFile
 * @returns {string|null}
 * @throws {Error} - Throws if the file cannot be read.
 */
async function readTitleFromMDFile(MDFile) {
  let data;
  try {
    data = await promisify(fs.readFile)(MDFile, "utf8");
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    throw new Error(`Error reading ${MDFile}:`, srcMessage);
  }
  return readTitleFromMD(data);
}

/**
 * Construct exhaustive list of files converted, known from the filesToConvert
 * Array, as a Markdown document.
 *
 * The filesToConvert Array should contain at least the following keys:
 *   - inputFile {string}: normalized absolute path to the markdown file to
 *     convert
 *   - outputFile {string}: normalized absolute path to where the resulting
 *     HTML file should be stored
 *
 * @param {Array.<Object>} filesToConvert
 * @returns {string}
 */
module.exports = async function constructPageList(filesToConvert, outputDir) {
  /**
   * Add title of pages to filesToConvert as a `title` key.
   * @type {Array.<Object>}
   */
  const withTitle = [];
  for (let i = 0; i < filesToConvert.length; i++) {
    const { inputFile } = filesToConvert[i];
    try {
      const title = await readTitleFromMDFile(inputFile);
      withTitle.push(Object.assign({ title }, filesToConvert[i]));
    } catch (err) {
      const srcMessage = (err ?? {}).message ?? "Unknown error";
      console.error("Error: " + srcMessage);
      process.exit(1);
    }
  }

  const hierarchy = withTitle
    .reduce((acc, elem) => {
      const splittedPath = elem.outputFile.split(path.sep);
      if (splittedPath.length === 0) {
        return acc;
      }

      let consideredObj = acc;

      let i = 0;
      for (; i < splittedPath.length - 1; i++) {
        const key = splittedPath[i];
        if (typeof consideredObj.subdirs[key] === "undefined") {
          consideredObj.subdirs[key] = { subdirs: {},
                                         files: [],
                                         index: null };
        }
        consideredObj = consideredObj.subdirs[key];
      }

      const link = path.relative(outputDir, elem.outputFile);
      const title = elem.title || link;
      if (splittedPath[i].toLowerCase() === "index.html") {
        consideredObj.index = { link, title };
      } else {
        consideredObj.files.push({ link, title });
      }
      return acc;
    }, { subdirs: {},
         files: [],
         index: null });

  const listArr = [];
  listArr.push("# Page list");
  listArr.push("");
  listArr.push("Here is an exhaustive list of all the pages you can read in " +
               "this generated documentation:");

  let indentationLevel = 0;
  function parseDir(obj) {
    if (obj.index != null) {
      listArr.push(" ".repeat(indentationLevel * 2) +
                   "- [" + obj.index.title + "]" +
                   "(" + obj.index.link + ")");
      indentationLevel += 1;
    } else if (obj.files.length || indentationLevel > 0) {
      listArr.push(" ".repeat(indentationLevel * 2) +
                   "- Undocumented section");
      indentationLevel += 1;
    }

    if (obj.files.length) {
      obj.files.forEach(file => {
        listArr.push(" ".repeat(indentationLevel * 2) +
                     "- [" + file.title + "]" +
                     "(" + file.link + ")");
      });
    }

    const subdirs = Object.keys(obj.subdirs).sort();
    if (subdirs.length) {
      for (let i = 0; i < subdirs.length; i++) {
        const subdir = subdirs[i];
        parseDir(obj.subdirs[subdir]);
        indentationLevel -= 1;
      }
    }
  }

  parseDir(hierarchy, 0);
  return listArr.join("\n");
};

/**
 * Construct exhaustive list of files converted, known from the filesToConvert
 * Array, as a Markdown document.
 *
 * The filesToConvert Array should contain at least the following keys:
 *   - inputFile {string}: normalized absolute path to the markdown file to
 *     convert
 *   - outputFile {string}: normalized absolute path to where the resulting
 *     HTML file should be stored
 *
 * @param {Array.<Object>} filesToConvert
 * @returns {string}
 */
async function constructPageList2(filesToConvert, outputDir) {
  /**
   * Add title of pages to filesToConvert as a `title` key.
   * @type {Array.<Object>}
   */
  const withTitle = [];
  for (let i = 0; i < filesToConvert.length; i++) {
    const { inputFile } = filesToConvert[i];
    const title = await readTitleFromMDFile(inputFile);
    withTitle.push(Object.assign({ title }, filesToConvert[i]));
  }

  const hierarchy = withTitle
    .reduce((acc, elem) => {
      const splittedPath = elem.outputFile.split(path.sep);
      if (splittedPath.length === 0) {
        return acc;
      }

      let consideredObj = acc;

      let i = 0;
      for (; i < splittedPath.length - 1; i++) {
        const key = splittedPath[i];
        if (typeof consideredObj.subdirs[key] === "undefined") {
          consideredObj.subdirs[key] = { subdirs: {},
                                         files: [],
                                         index: null };
        }
        consideredObj = consideredObj.subdirs[key];
      }

      const link = path.relative(outputDir, elem.outputFile);
      const title = elem.title || link;
      if (splittedPath[i].toLowerCase() === "index.html") {
        consideredObj.index = { link, title };
      } else {
        consideredObj.files.push({ link, title });
      }
      return acc;
    }, { subdirs: {},
         files: [],
         index: null });

  const listArr = [];
  listArr.push("# Page list");
  listArr.push("");
  listArr.push("Here is an exhaustive list of all the pages you can read in " +
               "this generated documentation:");

  let indentationLevel = 0;
  function parseDir(obj) {
    if (obj.index != null) {
      listArr.push(" ".repeat(indentationLevel * 2) +
                   "- [" + obj.index.title + "]" +
                   "(" + obj.index.link + ")");
      indentationLevel += 1;
    } else if (obj.files.length || indentationLevel > 0) {
      listArr.push(" ".repeat(indentationLevel * 2) +
                   "- Undocumented section");
      indentationLevel += 1;
    }

    if (obj.files.length) {
      obj.files.forEach(file => {
        listArr.push(" ".repeat(indentationLevel * 2) +
                     "- [" + file.title + "]" +
                     "(" + file.link + ")");
      });
    }

    const subdirs = Object.keys(obj.subdirs).sort();
    if (subdirs.length) {
      for (let i = 0; i < subdirs.length; i++) {
        const subdir = subdirs[i];
        parseDir(obj.subdirs[subdir]);
        indentationLevel -= 1;
      }
    }
  }

  parseDir(hierarchy, 0);
  return listArr.join("\n");
};
