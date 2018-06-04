const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

/**
 * Recursive mkdir (create parent directories if they do not exist).
 * @param {string} dirPath
 * @param {string} mode
 * @returns {Promise}
 */
module.exports = async function mkdirParent(dirPath, mode) {
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
