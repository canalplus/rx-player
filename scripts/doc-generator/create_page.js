const { promisify } = require("util");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const mkdirParent = require("./mkdir_parent.js");
const readTitleFromMD = require("./read_title_from_md.js");
const convertMDToHTML = require("./convert_MD_to_HMTL.js");
const constructTableOfContents = require("./construct_table_of_contents.js");
const constructHTML = require("./construct_html.js");

/**
 * Create and write HTML page output file from the markdown input file.
 * @param {string} inputFile - Path to the file input (a Markdown file).
 * @param {string} outputFile - Path to the resulting file output (HTML file).
 * @param {Object} [options={}]
 * @returns {Promise}
 */
module.exports = async function createDocumentationPage(
  inputFile,
  outputFile,
  options = {},
)  {
  const { css = [],
          linkTranslator = (link) => link,
          getPageTitle = a => a,
          beforeParse,
          homeLink,
          listLink } = options;

  const outputDir = path.dirname(outputFile);
  let data;
  try {
    data = await promisify(fs.readFile)(inputFile, "utf8");
  } catch (err) {
    /* eslint-disable no-console */
    console.error("error reading file:", err);
    /* eslint-enable no-console */
    return;
  }
  const inputDir = path.dirname(inputFile);
  const pageTitle = readTitleFromMD(data) || "Untitled Page";

  // remove original table of contents if one and generate new one
  const toParse = beforeParse != null ?
    beforeParse(data) :
    data;
  const { content, toc } = constructTableOfContents(toParse);

  const domContent = await parseMD(content,
                                   inputDir,
                                   outputDir,
                                   linkTranslator);

  const html = constructHTML(getPageTitle(pageTitle),
                             domContent,
                             { css,
                               toc,
                               homeLink,
                               listLink });
  try {
    await promisify(fs.writeFile)(outputFile, html);
  } catch (err) {
    /* eslint-disable no-console */
    console.error("error writing file:", err);
    /* eslint-enable no-console */
    return;
  }
};


async function updateMediaTag(mediaTag, inputDir, outputDir) {
  if (!mediaTag.attr("src")) {
    return;
  }
  const inputFile = path.join(inputDir, mediaTag.attr("src"));
  const outputFile = path.join(outputDir, mediaTag.attr("src"));
  if (await promisify(fs.exists)(outputFile)) {
    return;
  }
  const outDir = path.dirname(outputFile);
  const doesOutDirExists = await promisify(fs.exists)(outDir);
  if (!doesOutDirExists) {
    await mkdirParent(outDir);
  }
  await promisify(fs.copyFile)(inputFile, outputFile);
}

/**
 * Convert Markdown to HTML.
 * @param {string} data - Markdown to convert
 * @param {string} inputDir - Directory the Markdown file is in.
 * Can be used to copy image/video/audio files.
 * @param {string} outputDir - Directory the HTML file will be in.
 * Can be used to copy image/video/audio files.
 * @param {Function|null|undefined} linkTranslator - Allow to translate links
 * from markdown to HTML. Is given the orginal link in the markdown and should
 * return the converted link.
 * If null or undefined, the links won't be converted.
 * @returns {string}
 */
async function parseMD(data, inputDir, outputDir, linkTranslator) {
  // TODO I don't understand Cheerio/Jquery here, that's plain ugly
  // TODO use markdown-it plugin instead
  const $ = cheerio.load(convertMDToHTML(data));

  if (linkTranslator) {
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (href) {
        $(elem).attr("href", linkTranslator(href));
      }
    });
  }

  const imgTags = $("img").toArray();
  for (let i = 0; i < imgTags.length; i++) {
    await updateMediaTag($(imgTags[i]), inputDir, outputDir);
  }
  const audioTags = $("audio").toArray();
  for (let i = 0; i < audioTags.length; i++) {
    await updateMediaTag($(audioTags[i]), inputDir, outputDir);
  }
  const videoTags = $("video").toArray();
  for (let i = 0; i < videoTags.length; i++) {
    await updateMediaTag($(videoTags[i]), inputDir, outputDir);
  }
  return $.html();
}
