const { encode } = require("html-entities");

/**
 * Generate HTML page for the given documentation.
 * @param {Object} args
 * @param {string} args.contentHtml - HTML content for the content of the
 * @param {Array.<string>} args.cssUrls - URLs to the CSS files that should
 * be imported.
 * @param {string|null|undefined} [args.faviconUrl] - Eventual URL to the
 * favicon.
 * `null` or `undefined` if unset.
 * @param {string} options.navBarHtml - HTML strinng for the Navbar (the
 * header).
 * @param {string} options.pageListHtml - HTML string for the complete list of
 * documentation pages with links.
 * @param {string} options.rootUrl - Relative URL for the root of the site.
 * This value is included in a custom script so it can be accessed from other
 * JavaScript files.
 * @param {Array.<string>} args.scriptUrls - URLs to the JS files that should
 * be imported.
 * @param {string} options.sidebarHtml - HTML string for the Sidebar.
 * @param {string} args.title - title of the page.
 * @param {string} options.tocHtml - HTML string for the Table of content.
 * `undefined` if your page has no table of contents.
 * @returns {string} - Whole HTML string for the documentation page.
 */
function generatePageHtml(
  {
    contentHtml,
    cssUrls,
    faviconUrl,
    navBarHtml,
    pageListHtml,
    rootUrl,
    scriptUrls,
    sidebarHtml,
    title,
    tocHtml,
  }
) {
  const styles = constructStylesHtml(cssUrls);
  const scripts = constructScriptsHtml(scriptUrls);
  const faviconHtml = typeof faviconUrl === "string" ?
    `<link rel="icon" type="image/png" href="${encode(faviconUrl)}">` :
    "";
  const hamburgerHtml = constructHamburgerBarHtml(pageListHtml);

  return "<!DOCTYPE html><html lang=\"en\"><head>" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
           "<meta charset=\"utf-8\">" +
           styles +
           "<title>" + encode(title) + "</title>" +
           faviconHtml +
         "</head>" +
         "<body class=\"no-js\">" +
         `<script type="text/javascript">` +
         `document.body.className = "";` +
         `window.rootUrl = "${rootUrl}";` +
         "</script>" +
           "<div class=\"page-wrapper\">" +
             navBarHtml +
             sidebarHtml +
             "<div class=\"content-wrapper\">" +
               "<div class=\"content\">" +
                 `<div id="search-wrapper">` +
                   `<input type="search" name="search" id="searchbar" ` +
                   `placeholder="Search in this documentation" class="active" />` +
                   `<div id="search-results"></div>` +
                 `</div>` +
                 contentHtml +
               `</div>` +
               tocHtml +
             "</div>" +
           "</div>" +
           hamburgerHtml +
           scripts +
           "</body></html>";
};

function constructHamburgerBarHtml(pageListHtml) {
  return `<div class="hamburger-bar">` +
    `<div class="hamburger-header">` +
    `<span class="hamburger-title">Page List</span>` +
    `<button aria-label="Close website index" type="button" class="hamburger-bar-closer">` +
    `<svg viewBox="0 0 15 15" width="21" height="21">` +
    `<g stroke="black" stroke-width="1.2"><path d="M.75.75l13.5 13.5M14.25.75L.75 14.25"></path></g>` +
    `</svg></button>` +
    `</div>` +
    pageListHtml +
    "</div>";
}

/**
 * Returns links to CSS file as an HTML string to be included in the page.
 * @param {Array.<string>} cssUrls - URL to CSS files
 * @returns {string}
 */
function constructStylesHtml(cssUrls) {
  return cssUrls.map(cssUrl =>
    `<link rel="stylesheet" href="${encode(cssUrl)}"/>`)
    .join("");
}

/**
 * @param {Array.<string>} scriptUrls - URL to scripts files
 * @returns {string}
 */
function constructScriptsHtml(scriptUrls) {
  return scriptUrls.map(scriptUrl =>
    `<script type="text/javascript" src="${encode(scriptUrl)}" ` +
    `charset="utf-8"></script>`
  ).join("");
}

module.exports = generatePageHtml;
