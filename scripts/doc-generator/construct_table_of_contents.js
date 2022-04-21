/**
 * Create table of contents in markdown referencing the h1 (#), h2 (##) and
 * h3 (###) titles.
 * Also add links to them to the original markdown.
 * @param {string} md - The markdown content
 * @returns {string}
 */
function constructTableOfContents(md) {
  const tocLines = [];
  const newContent = [];
  const lines = md.split(/\r\n|\n|\r/);

  // Object used to avoid duplicates
  const generatedAnchors = {};

  // The inputed markdown is read line by line.
  // When a h1, h2 or h3 is encountered in it, add a new list entry
  // in the `tocLines` markdown respectively at top, second and third level.
  // To be able to link the table of content to the corresponding content,
  // add `<a>` links just before the corresponding h1, h2 or h3 elements in the
  // inputed markdown.
  // All Markdown parsing done here corresponds to the CommonMark spec (v0.29)
  // TODO this might be more efficient and less error-prone if integrated as a
  // markdown-it plugin.
  for (let i = 0, len = lines.length; i < len; i++) {
    if (/^ *# +/.test(lines[i])) {
      const regExec = /^ *# +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = generateAnchorName(tocLine);
        tocLines.push(`[${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *## +/.test(lines[i])) {
      const regExec = /^ *## +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = generateAnchorName(tocLine);
        tocLines.push(`  - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    } else if (/^ *### +/.test(lines[i])) {
      const regExec = /^ *### +(.*)$/.exec(lines[i]);
      if (regExec && regExec[1]) {
        const tocLine = regExec[1].replace(/ #* *$/, "").trim();
        let uri = generateAnchorName(tocLine);
        tocLines.push(`    - [${tocLine}](#${uri})`);
        newContent.push(`<a name="${uri}"></a>`);
      }
    }
    newContent.push(lines[i]);
  }
  return {
    tocMd: tocLines.join("\n"),
    nbTocElements: tocLines.length,
    content: newContent.join("\n"),
  };

  function generateAnchorName(title) {
    const baseUri = encodeURI(title.toLowerCase().replace(/ /g, "_"))
    if (generatedAnchors[baseUri] !== true) {
      generatedAnchors[baseUri] = true;
      return baseUri;
    }
    let i = 1;
    let resultUri;
    do {
      resultUri = `${baseUri}_(${i})`;
      i++;
    } while (generatedAnchors[resultUri] === true);
    generatedAnchors[resultUri] = true;
    return resultUri;
  }
};

module.exports = constructTableOfContents;
