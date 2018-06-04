/**
 * Returns the title read from a Markdown document.
 * That is, the first "#"-prepended chapter.
 * TODO know the right term.
 *
 * null if not found.
 * @param {string} data
 * @returns {string|null}
 */
module.exports = function readTitleFromMD(data) {
  const lines = data.split(/\r\n|\n|\r/);
  for (let i = 0, len = lines.length; i < len; i++) {
    if (/^ *# +/.test(lines[i])) {
      const regExec = /^ *# +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        return regExec[1].replace(/#*$/, "").trim();
      }
    }
  }
  return null;
};
