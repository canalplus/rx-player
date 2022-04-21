const hljs = require("highlight.js");
const md = require("markdown-it")({
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {
        /* don't care for now */
      }
    }
    return "";
  },
  html: true,
  linkify: true,
  typographer: true,
  xhtmlOut: true,
});

/**
 * Convert the Markdown document given into an HTML page.
 * @param {string} mdStr
 * @returns {string}
 */
module.exports = function convertMDToHTML(mdStr) {
  return md.render(mdStr);
};
