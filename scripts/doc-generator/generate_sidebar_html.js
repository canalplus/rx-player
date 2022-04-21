const path = require("path");
const { encode } = require("html-entities");
const { toUriCompatibleRelativePath } = require("./utils");

/**
 * Construct HTML element, as a string, which corresponds to the sidebar for
 * the chosen documentation page.
 * @param {Array.<Object>} pages
 * @param {Array.<number>} currentPageIndexes
 * @param {string} currentPath
 * @param {Object} logoInfo
 * @returns {string}
 */
function generateSidebarHtml(
  pages,
  currentPageIndexes,
  currentPath,
  logoInfo
) {
  const sidebarHeaderHtml = constructSidebarHeaderHtml(logoInfo);
  const links = pages.map((p, i) => {
    const isActive = i === currentPageIndexes[0];
    if (!p.isPageGroup) {
      return generateLiForPage(p, isActive);
    } else {
      const lis = p.pages.map((sp, j) => {
        const isActiveSubPage = isActive && j === currentPageIndexes[1];
        return generateLiForPage(sp, isActiveSubPage);
      }).join("");
      return `<li class="sidebar-item">` +
        `<div class="sidebar-item sidebar-item-group${isActive ? " active opened" : ""}">` +
        encode(p.displayName) +
        "</div>" +
        `<ul>${lis}</ul>` +
        "</li>";

    }
  }).join("");
  return `<aside class="sidebar-parent">` +
    sidebarHeaderHtml +
    `<div class="sidebar-wrapper">` +
    `<div class="sidebar-items">${links}</div>` +
    "</div>" +
    "</aside>";

  function generateLiForPage(p, isActive) {
    const relativeUri = toUriCompatibleRelativePath(
      p.outputFile,
      path.dirname(currentPath)
    );
    const activeClass = isActive ? " active" : "";
    const cleanedHref = encode(relativeUri);
    return "<li class=\"sidebar-item\">" +
      `<a class="sidebar-link${activeClass}" href="` +
      cleanedHref +
      `">${encode(p.displayName)}</a>` +
      "</li>";
  }
}

/**
 * @param {Object} logoInfo
 * @returns {string}
 */
function constructSidebarHeaderHtml(logoInfo) {
  let sidebarHeaderHtml = `<div class="sidebar-header">`;
  if (logoInfo !== undefined) {
    let hasLink = false;
    if (typeof logoInfo.link === "string") {
      hasLink = true;
      sidebarHeaderHtml += `<a href="${encode(logoInfo.link)}">`;
    }
    if (typeof logoInfo.url === "string") {
      sidebarHeaderHtml += `<img alt="logo" class="sidebar-header-logo"` +
        ` src="${encode(logoInfo.url)}" />`;
    }
    if (hasLink) {
      sidebarHeaderHtml += "</a>";
    }
  }
  sidebarHeaderHtml += `</div>`;
  return sidebarHeaderHtml;
}

module.exports = generateSidebarHtml;
