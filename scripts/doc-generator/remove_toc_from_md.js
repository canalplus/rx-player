/**
 * Remove "## table of contents" line from markdown if it exists.
 * @param {string} md
 * @returns {string}
 */
module.exports = function removeTableOfContentFromMD(md) {
  const lines = md.split(/\r\n|\n|\r/);
  for (let i = 0, len = lines.length; i < len; i++) {
    if (/^ *## +table of contents/i.test(lines[i])) {
      const start = i;
      for (i = i + 1; i < len; i++) {
        if (/^ *## +/.test(lines[i])) {
          lines.splice(start, i - 1 - start);
          return lines.join("\n");
        }
      }
    }
  }
  return lines.join("\n");
};
