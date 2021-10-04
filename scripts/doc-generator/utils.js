const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

/**
 * Recursive mkdir (create parent directories if they do not exist).
 * @param {string} dirPath
 * @param {string} mode
 * @returns {Promise}
 */
async function mkdirParent(dirPath, mode) {
  try {
    await promisify(fs.mkdir)(dirPath, mode);
  } catch(error) {
    if (error && error.errno === -2) {
      return mkdirParent(path.dirname(dirPath), mode)
        .then(() => mkdirParent(dirPath, mode));
    }
    throw error;
  }
};

/**
 * @param {string} val
 * @returns {string}
 */
function encodeHtmlAttributeValue(val) {
  return val
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} target
 * @param {string} currentDir
 * @returns {string}
 */
function toUriCompatibleRelativePath(target, currentDir) {
  // TODO this is quite ugly but should work for most cases.
  // See if there's a better and more compatible way of doing this.
  let relativePath = path.relative(currentDir, target);
  return pathToUrl(relativePath);
}

/**
 * @param {string} _pathStr
 * @returns {string}
 */
function pathToUrl(_pathStr) {
  let pathStr = _pathStr;

  // TODO this is quite ugly but should work for most cases.
  // See if there's a better and more compatible way of doing this.
  if (path.sep !== "/") {
    pathStr = pathStr.split(path.sep).join("/");
  }
  pathStr = encodeURIComponent(pathStr).replace(/%2F/g, "/");
  if (pathStr[0] !== ".") {
    pathStr = "./" + pathStr;
  }
  return pathStr;
}

module.exports = {
  mkdirParent,
  encodeHtmlAttributeValue,
  toUriCompatibleRelativePath,
  pathToUrl,
};
