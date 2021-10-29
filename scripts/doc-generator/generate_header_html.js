const path = require("path");
const { encode } = require("html-entities");
const {
  encodeHtmlAttributeValue,
  toUriCompatibleRelativePath,
} = require("./utils");

/**
 * Construct HTML element, as a string, which corresponds to the header for
 * the chosen documentation page.
 * @param {Object} config
 * @param {number} currentLinkIdx
 * @param {string} currentPath
 * @param {object} logoInfo
 * @returns {string}
 */
function constructHeaderBar(config, currentLinkIdx, currentPath, logoInfo) {
  const { versionInfo, links, linksRightIndex } = config;
  const logoHtml = constructLogoHtmlInHeaderBar(logoInfo);

  const linksHtml = links.map((l, i) => {
    const customClass =
      i === linksRightIndex     ? " first-right" :
      i === linksRightIndex - 1 ? " last-left"   :
                                         "";
    switch (l.type) {
      case "local-doc": {
        const relativeUri = toUriCompatibleRelativePath(
          l.firstPage,
          path.dirname(currentPath)
        );
        const activeClass = i === currentLinkIdx ? " navbar-active" : "";
        const cleanedHref = encodeHtmlAttributeValue(relativeUri);
        return `<a class="navbar-item${activeClass}${customClass}"` +
          `href="${cleanedHref}">${encode(l.displayName)}</a>`;
      }
      case "external-link": {
        const cleanedHref = encodeHtmlAttributeValue(l.link);
        return `<a class="navbar-item${customClass}"` +
          `href="${cleanedHref}">${encode(l.displayName)}</a>`;
      }
      case "github-link":
        return constructGithubLinkHtmlInHeaderBar(l.link, customClass);
      case "search":
        return constructSearchHtmlInHeaderBar(customClass);
      case "version":
        return constructVersionLinkHtmlInHeaderBar(versionInfo, customClass);
    }
  }).join("\n      ");
  return `<nav class="navbar-parent">
  <div class="navbar-wrapper">
    <div class="navbar-items">
      ${logoHtml}
      ${linksHtml}
    </div>
  </div>
</nav>`;
}

/**
 * Returns the HTML string corresponding to the current version number, if
 * available, and with the corresponding link, also if available.
 * @param {Object} versionInfo
 * @param {string} customClass
 * @returns {string}
 */
function constructVersionLinkHtmlInHeaderBar(versionInfo, customClass) {
  if (
    versionInfo === undefined || versionInfo === null ||
    typeof versionInfo.version !== "string"
  ) {
    return "";
  }
  let element = "";
  let hasLink = false;
  const { version } = versionInfo;
  if (typeof versionInfo.link === "string") {
    hasLink = true;
    element += `<a class="navbar-item${customClass}"` +
      `href="${encodeHtmlAttributeValue(versionInfo.link)}">`;
  } else {
    element += `<span class="navbar-item${customClass}">`;
  }
  element += `<span class="version-item">version: ${encode(version)}</span>`;
  element += hasLink ? "</a>" : "</span>";
  return element;
}

/**
 * Returns the HTML string corresponding to the link to the github repository,
 * through a SVG representing Github's logo.
 * @param {string} githubLnk
 * @param {string} customClass
 * @returns {string}
 */
function constructGithubLinkHtmlInHeaderBar(githubLnk, customClass) {
  const cleanedHref = encodeHtmlAttributeValue(githubLnk);
  return `<a class="navbar-item${customClass}" href="${cleanedHref}">` +
    "<svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>" +
    "<path d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 "+
    "11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4." +
    "042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-" +
    ".729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 " +
    "3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 " +
    "0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 " +
    "3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 " +
    "3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 " +
    "3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 " +
    "2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 " +
    "12.297c0-6.627-5.373-12-12-12'/></svg>" +
    "</a>";
}

function constructSearchHtmlInHeaderBar(customClass) {
  return `<span class="navbar-item search-icon${customClass}">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" ` +
    `viewBox="0 0 20 20">` +
    `<title>search</title>` +
    `<path d="M19 17l-5.15-5.15a7 7 0 1 0-2 2L17 19zM3.5 8A4.5 4.5 ` +
    `0 1 1 8 12.5 4.5 4.5 0 0 1 3.5 8z"/>` +
    `<script xmlns=""/></svg>` +
    `</span>`;
}

/**
 * Returns the HTML string corresponding to the logo of the current project, if
 * available, and with the corresponding link, also if available.
 * @param {Object|undefined} logoInfo
 * @returns {string}
 */
function constructLogoHtmlInHeaderBar(logoInfo) {
  if (logoInfo === null || logoInfo === undefined) {
    return "";
  }

  let logoHtml = "";
  let hasLink = false;
  if (typeof logoInfo.link === "string") {
    hasLink = true;
    logoHtml += `<a href="${encodeHtmlAttributeValue(logoInfo.link)}">`;
  }
  if (typeof logoInfo.url === "string") {
    logoHtml += `<img class="navbar-item navbar-item-logo"` +
      ` src="${encodeHtmlAttributeValue(logoInfo.url)}" />`;
  }
  if (hasLink) {
    logoHtml += "</a>";
  }
  return logoHtml;
}

module.exports = constructHeaderBar;
