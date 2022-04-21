const { encode } = require("html-entities");
const path = require("path");
const {
  getGithubSvg,
  toUriCompatibleRelativePath,
} = require("./utils");

/**
 * Construct exhaustive list of documentation links as an HTML string.
 * @param {Array.<Object>} links
 * @param {number} currentLinkIdx
 * @param {Array.<number>} currentPageIndexes
 * @param {string} currentPath
 * @returns {string}
 */
function generatePageListHtml(
  links,
  currentLinkIdx,
  currentPageIndexes,
  currentPath
) {
  const currentDir = path.dirname(currentPath);
  const linksHtml = links.map((l, linkIdx) => {
    switch (l.type) {
      case "local-doc": {
        const isActiveCat = linkIdx === currentLinkIdx;
        const catActiveClasses = isActiveCat ? " opened active" : "";

        const catHtml = `<li class="page-list-item">` +
          `<div class="page-list-group${catActiveClasses}">` +
          encode(l.displayName) +
          `</div><ul class="page-list-cat-group">`;

        return catHtml + l.pages.map((currentPage, pageidx) => {
          const isPageActive = isActiveCat && pageidx === currentPageIndexes[0];
          const { displayName, outputFile } = currentPage;
          if (!currentPage.isPageGroup) {
            const pageActiveClasses = isPageActive ? " active" : "";
            const relativeUri = toUriCompatibleRelativePath(outputFile, currentDir);
            return `<li class="page-list-item${pageActiveClasses}">` +
              `<a href="${encode(relativeUri)}">` +
              encode(displayName) +
              `</a></li>`;
          }
          const pageActiveClasses = isPageActive ? " opened active" : "";
          const pageGroupHtml = `<li>` +
            `<div class="page-list-item page-list-group${pageActiveClasses}">` +
            encode(displayName) +
            `</div><ul class="page-list-group-group">`;
          return pageGroupHtml + currentPage.pages.map((currentSubPage, spIdx) => {
            const spActiveClasses = isPageActive && spIdx === currentPageIndexes[1] ?
              " active" : "";
            const { displayName, outputFile } = currentSubPage;
            const relativeUri = toUriCompatibleRelativePath(outputFile, currentDir);
            return `<li class="page-list-item${spActiveClasses}">` +
              `<a href="${encode(relativeUri)}">` +
              encode(displayName) +
              `</a></li>`;
          }).join("\n") + "</ul></li>";
        }).join("\n") + "</ul></li>";
      }

      case "external-link": {
        const cleanedHref = encode(l.link);
        return `<li class="page-list-item">` +
          `<a href="${cleanedHref}">` +
          encode(l.displayName) +
          "</a></li>";
      }

      case "github-link":
        const cleanedHref = encode(l.link);
        return `<li class="page-list-item">` +
          `<a aria-label="Link to repository" href="${cleanedHref}">` +
            getGithubSvg() +
            "</a></li>";

      case "search":
        return "";

      case "version":
        // TODO?
        return "";
    }
  }).join("\n");

  return `<ul class="page-list-wrapper">` +
    linksHtml +
    "</ul>";
};

module.exports = generatePageListHtml;
