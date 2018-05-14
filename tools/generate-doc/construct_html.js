const convertMDToHTML = require("./convert_MD_to_HMTL.js");

/**
 * Construct Header part of the HTML page, containing various links.
 * @param {Object} options
 * @returns {string}
 */
function constructHTMLHeader({ homeLink, listLink }) {
  let header = "<div class=\"header\"><div class=\"header-content\">";
  if (homeLink != null) {
    header += `<a href="${homeLink}">` +
      "<span class=\"nav-icon\">🏠</span>" +
      "<span class=\"nav-text\">Home</span>" +
      "</a>";
  }

  if (listLink != null) {
    header += `<a href="${listLink}">` +
      "<span class=\"nav-icon\">🗎</span>" +
      "<span class=\"nav-text\">Page List</span>" +
      "</a>";
  }
  header += "<a href=\"#\">" +
    "<span class=\"nav-icon\">↑</span>" +
    "<span class=\"nav-text\">Top</span>" +
    "</a>";
  header += "</div></div>";
  return header;
}

/**
 * Construct Sidebar part of the HTML page, containing various links.
 * @param {string|null} [toc] - Markdown for the table of contents (under a list
 * form).
 * `null` or `undefined` if your page has no table of contents.
 * @param {Object} [options]
 * @returns {string}
 */
function constructHTMLSidebar(toc, {
  homeLink,
  listLink,
}) {
  const domSidebar = (toc && convertMDToHTML(toc)) || "";

  let sidebar = "<div class=\"sidebar\">" +
    "<div class=\"sidebar-nav\">";
  if (homeLink != null) {
    sidebar += `<a href="${homeLink}">` +
      "<span class=\"nav-icon\">🏠</span>" +
      "<span class=\"nav-text\">Home</span>" +
      "</a>";
  }

  if (listLink != null) {
    sidebar += `<a href="${listLink}">` +
      "<span class=\"nav-icon\">🗎</span>" +
      "<span class=\"nav-text\">Page List</span>" +
      "</a>";
  }
  sidebar += "<a href=\"#\">" +
    "<span class=\"nav-icon\">↑</span>" +
    "<span class=\"nav-text\">Top</span>" +
    "</a>";


  sidebar += "</div>" +
    "<div class=\"toc\">" +
    domSidebar +
    "</div>" +
    "</div>";

  return sidebar;
}

/**
 * @param {Array.<string>} css
 * @returns {string}
 */
function constructStylesHTML(css) {
  return css.map(cssFile =>
    `<link rel="stylesheet" href="${cssFile}"/>`
  ).join("") || "";
}

/**
 * @param {string} title - title of the page
 * @param {string} domContent - HTML content for the whole page.
 * @param {Object} options
 * @returns {string}
 */
module.exports = function constructHTMLPage(
  title,
  domContent,
  {
    homeLink,
    listLink,
    toc,
    css,
  }
) {
  const header = constructHTMLHeader({ homeLink, listLink });
  const sidebar = constructHTMLSidebar(toc, { homeLink, listLink });
  const styles = constructStylesHTML(css);

  return "<head>" +
    "<meta charset=\"utf-8\">" +
    styles +
    "<title>" + title + "</title>" +
    "</head>" +
    "<body>" +
    "<div class=\"page-wrapper\">" +
    sidebar +
    "<div class=\"content-wrapper\">" +
    header +
    "<div class=\"content\">" +
    domContent +
    "</div>" +
    "</div>" +
    "</div>" +
    "</body>";
};
