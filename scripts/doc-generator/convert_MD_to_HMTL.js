const hljs = require("highlight.js");
const emoji = require("markdown-it-emoji");
const md = require("markdown-it")({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return "";
  },
  html: true,
  linkify: true,
  typographer: true,
  xhtmlOut: true,
});

md.use(emoji);
md.renderer.rules.emoji = function(token, idx) {
  return `<span class="emoji emoji_${token[idx].markup}">${token[idx].content}</span>`;
};

/**
 * Convert the Markdown document given into an HTML page.
 * @param {string} mdStr
 * @returns {string}
 */
module.exports = function convertMDToHTML(mdStr) {
  return md.render(mdStr);
};
