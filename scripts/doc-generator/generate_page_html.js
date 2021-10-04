const { encode } = require("html-entities");
const { encodeHtmlAttributeValue } = require("./utils");

/**
 * Generate HTML page for the given documentation.
 * @param {Object} args
 * @param {string} args.contentHtml - HTML content for the content of the
 * @param {Array.<string>} args.cssUris - URIs to the CSS files that should
 * be imported.
 * @param {string} options.navBarHtml - HTML strinng for the Navbar (the
 * header).
 * @param {string} options.rootUrl - Relative URL for the root of the site.
 * This value is included in a custom script so it can be accessed from other
 * JavaScript files.
 * @param {Array.<string>} args.scriptUris - URIs to the JS files that should
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
    cssUris,
    navBarHtml,
    rootUrl,
    scriptUris,
    sidebarHtml,
    title,
    tocHtml,
  }
) {
  const styles = constructStylesHtml(cssUris);
  const scripts = constructScriptsHtml(scriptUris);

  return "<head>" +
           "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
           "<meta charset=\"utf-8\">" +
           styles +
           "<title>" + encode(title) + "</title>" +
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
           scripts +
         "</body>";
};

/**
 * Returns links to CSS file as an HTML string to be included in the page.
 * @param {Array.<string>} cssUris - URL to CSS files
 * @returns {string}
 */
function constructStylesHtml(cssUris) {
  return cssUris.map(cssUri =>
    `<link rel="stylesheet" href="${encodeHtmlAttributeValue(cssUri)}"/>`)
    .join("");
}

/**
 * @param {Array.<string>} scriptUris - URL to scripts files
 * @returns {string}
 */
function constructScriptsHtml(scriptUris) {
  return scriptUris.map(scriptUri =>
    `<script type="text/javascript" src="${encodeHtmlAttributeValue(scriptUri)}" ` +
    `charset="utf-8"></script>`
  ).join("");
}

module.exports = generatePageHtml;
