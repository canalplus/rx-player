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

  // Objects used to avoid duplicates
  const generatedTitleURIs = {};
  const generatedChapterURIs = {};
  const generatedSubchapterURIs = {};

  // The inputed markdown is read line by line.
  // When a h1, h2 or h3 is encountered in it, add a new list entry
  // in the `tocLines` markdown respectively at top, second and third level.
  // To be able to link the table of content to the corresponding content,
  // add `<a>` links just before the corresponding h1, h2 or h3 elements in the
  // inputed markdown.
  // All Markdown parsing done here corresponds to the CommonMark spec (v0.29)
  // TODO this should be much more efficient and less error-prone if integrated
  // as a markdown-it plugin.
  for (let i = 0, len = lines.length; i < len; i++) {
    if (/^ *# +/.test(lines[i])) {
      const regExec = /^ *# +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = "title-" + encodeURI(tocLine);
        while (generatedTitleURIs[uri] === true) {
          uri += "-bis";
        }
        generatedTitleURIs[uri] = true;
        tocLines.push(`[${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *## +/.test(lines[i])) {
      const regExec = /^ *## +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = "chapter-" + encodeURI(tocLine);
        while (generatedChapterURIs[uri] === true) {
          uri += "-bis";
        }
        generatedChapterURIs[uri] = true;
        tocLines.push(`  - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *### +/.test(lines[i])) {
      const regExec = /^ *### +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = "subchapter-" + encodeURI(tocLine);
        while (generatedSubchapterURIs[uri] === true) {
          uri += "-bis";
        }
        generatedSubchapterURIs[uri] = true;
        tocLines.push(`    - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    }
    newContent.push(lines[i]);
  }
  return { toc: tocLines.join("\n"),
           content: newContent.join("\n") };
};
