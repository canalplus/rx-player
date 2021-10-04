const cheerio = require("cheerio");

/**
 * Generate search data linked to the given content.
 * @param {string} contentHtml
 * @returns {Array.<Object>}
 */
function getSearchDataForContent(contentHtml) {
  const indexForFile = [];
  const $ = cheerio.load(contentHtml);
  const children = $("body").children().toArray();

  let currentH1;
  let currentH2;
  let currentH3;
  let currentH1Anchor;
  let currentH2Anchor;
  let currentH3Anchor;
  let currentBody = [];
  let currentLevel;
  for (var i = 0; i < children.length; i++) {
    const child = children[i];
    switch (child.name.toLowerCase()) {
      case "h1":
        anounceLastElement();
        currentH1 = $(child).text();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        currentH1Anchor = getAnchorName(children[i - 1]);
        currentH2 = undefined;
        currentH2Anchor = undefined;
        currentH3 = undefined;
        currentH3Anchor = undefined;
        currentLevel = "h1";
        break;
      case "h2":
        anounceLastElement();
        currentH2 = $(child).text();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        currentH2Anchor = getAnchorName(children[i - 1]);
        currentH3 = undefined;
        currentH3Anchor = undefined;
        currentLevel = "h2";
        break;
      case "h3":
        anounceLastElement();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        getAnchorName(children[i - 1]);
        currentH3 = $(child).text();
        currentH3Anchor = getAnchorName(children[i - 1]);
        currentLevel = "h3";
        break;

      // case "pre":
      //   // code - do nothing?
      //   break;

      default:
        const text = $(child).text().replace(/\n/g, " ");
        if (text !== undefined && text.length > 0) {
          currentBody.push(text);
        }
        break;
    }
  }
  anounceLastElement();
  return indexForFile;

  function anounceLastElement() {
    if (currentLevel === "h3") {
      const body = currentBody.length > 0 ?
        currentBody.join(" ") :
        "";
      indexForFile.push({
        h1: currentH1,
        h2: currentH2,
        h3: currentH3,
        body,
        anchorH1: currentH1Anchor,
        anchorH2: currentH2Anchor,
        anchorH3: currentH3Anchor,
      });
    } else if (currentLevel === "h2") {
      const body = currentBody.length > 0 ?
        currentBody.join(" ") :
        "";
      indexForFile.push({
        h1: currentH1,
        h2: currentH2,
        body,
        anchorH1: currentH1Anchor,
        anchorH2: currentH2Anchor,
      });
    } else if (currentLevel === "h1") {
      const body = currentBody.length > 0 ?
        currentBody.join(" ") :
        "";
      indexForFile.push({
        h1: currentH1,
        body,
        anchorH1: currentH1Anchor,
      });
    }
    currentBody.length = 0;
  }

  function getAnchorName(elt) {
    if (elt === undefined) {
      return;
    }

    const children = $(elt).children();
    if (children.length !== 1) {
      return;
    }

    const child = children.toArray()[0];
    if (child.name !== "a") {
      return;
    }

    const name = $(child).attr("name");
    if (name !== undefined && name.length > 0) {
      return name;
    }
  }
}

module.exports = getSearchDataForContent;
