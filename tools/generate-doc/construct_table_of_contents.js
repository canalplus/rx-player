/**
 * Create table of contents in markdown referencing the h1 (#), h2 (##) and
 * h3 (###) titles.
 * Also add links to them to the original markdown.
 * @param {string} md - The markdown content
 * @returns {string}
 */
module.exports = function constructTableOfContents(md) {
  const tocLines = [];
  const newContent = [];
  const lines = md.split(/\r\n|\n|\r/);
  for (let i = 0, len = lines.length; i < len; i++) {
    if (/^ *# +/.test(lines[i])) {
      const regExec = /^ *# +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/#*$/, "").trim();
        const uri = "title-" + encodeURI(tocLine);
        tocLines.push(`[${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *## +/.test(lines[i])) {
      const regExec = /^ *## +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/#*$/, "").trim();
        const uri = "chapter-" + encodeURI(tocLine);
        tocLines.push(`  - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *### +/.test(lines[i])) {
      const regExec = /^ *### +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/#*$/, "").trim();
        const uri = "subchapter-" + encodeURI(tocLine);
        tocLines.push(`    - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    }
    newContent.push(lines[i]);
  }
  return { toc: tocLines.join("\n"), content: newContent.join("\n") };
};
