const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const getFilesToConvert = require("./get_files_to_convert.js");
const mkdirParent = require("./mkdir_parent.js");
const createDocumentationPage = require("./create_page.js");
const constructPageList = require("./construct_page_list.js");
const constructTableOfContents = require("./construct_table_of_contents.js");
const convertMDToHTML = require("./convert_MD_to_HMTL.js");
const constructHTML = require("./construct_html.js");

async function createDirIfDoesntExist(dir) {
  const doesCSSOutDirExists = await promisify(fs.exists)(dir);
  if (!doesCSSOutDirExists) {
    await mkdirParent(dir);
  }
}

/**
 * Create documentation for the directory given into the ouput directory given.
 * @param {string} baseInDir
 * @param {string} baseOutDir
 * @param {Object} [options={}]
 * @param {Function} [options.getPageTitle] - Callback returning the name of the
 * page, based on the name of a single markdown document.
 * If not set, the page title will just be the corresponding markdown's title.
 * @param {Array.<string>} [options.css] - Optional CSS files which will be
 * linked to each generated page.
 * Should be the path to each of those.
 * @param {Function|undefined} [options.fileFilter] - Callback allowing to
 * filter out markdown pages from being converted to HTML.
 * Takes 2 arguments: the fileName and its path, both strings.
 * Return true if the file should be converted to HTML. False otherwise.
 * No markdown document is filtered out if this callback is not set.
 * @param {Function|undefined} [options.beforeParse] - Callback which will be
 * called on each markdown document just before transforming it into HTML.
 * Takes in argument the markdown content (as a string) and should return the
 * markdown document you want to convert into HTML (also as a string).
 * If not set, each markdown document will be converted as is.
 * @returns {Promise} - Resolve when done
 */
module.exports = async function createDocumentationForDir(
  baseInDir,
  baseOutDir,
  options = {},
) {
  const { getPageTitle = t => t,
          fileFilter,
          beforeParse,
          css = [] } = options;

  // 1 - copy CSS files
  const cssOutputDir = path.join(path.resolve(baseOutDir), "styles");
  const cssOutputPaths = css.map(cssFilepath => {
    return path.join(cssOutputDir, path.basename(cssFilepath));
  });

  if (css.length > 0) {
    await createDirIfDoesntExist(cssOutputDir);
    await Promise.all(css.map(async (cssInput, i) => {
      await promisify(fs.copyFile)(cssInput, cssOutputPaths[i]);
    }));
  }

  // 2 - Construct list of html files
  const filesToConvert = await getFilesToConvert(baseInDir,
                                                 baseOutDir,
                                                 { fileFilter });

  const [homeLink, listLink] = filesToConvert.length > 1 ?
    [ path.join(path.resolve(baseOutDir), "pages", "index.html"),
      path.join(path.resolve(baseOutDir), "list.html") ] :
    [ null, null ];

  // keys: inputFile; values: outputFile
  const fileDict = filesToConvert.reduce((acc, entry) => {
    acc[entry.inputFile] = entry.outputFile;
    return acc;
  }, {});

  // 3 - Create documentation pages
  for (let i = 0; i < filesToConvert.length; i++) {
    const { inputFile, outputFile } = filesToConvert[i];
    // Create output directory if it does not exist
    const outDir = path.dirname(outputFile);
    await createDirIfDoesntExist(outDir);
    const cssRelativePaths =
      cssOutputPaths.map(cssOutput => path.relative(outDir, cssOutput));

    // add link translation to options
    const linkTranslator = linkTranslatorFactory(inputFile, outDir, fileDict);
    await createDocumentationPage(inputFile,
                                  outputFile,
                                  { linkTranslator,
                                    getPageTitle,
                                    beforeParse,
                                    homeLink: path.relative(outDir, homeLink),
                                    listLink: path.relative(outDir, listLink),
                                    css: cssRelativePaths });
  }

  // 4 - Construct specific "Page List" page.
  const pageListMD = await constructPageList(filesToConvert, baseOutDir);
  const { content, toc } = constructTableOfContents(pageListMD);
  const listPageCss =
    cssOutputPaths.map(cssOutput => path.relative(baseOutDir, cssOutput));
  const listHTML = constructHTML(getPageTitle("Page List"),
                                 convertMDToHTML(content),
                                 { css: listPageCss,
                                   toc,
                                   homeLink: path.relative(baseOutDir,
                                                           homeLink),
                                   listLink: path.relative(baseOutDir,
                                                           listLink) });

  const fileName = path.join(baseOutDir, "list.html");
  await promisify(fs.writeFile)(fileName, listHTML);
};

/**
 * Generate linkTranslator functions
 * @param {string} inputFile
 * @param {Object} fileDict
 * @returns {Function}
 */
function linkTranslatorFactory(inputFile, outputDir, fileDict) {
  /**
   * Convert links to files that will be converted to the links of the
   * corresponding converted output files.
   * @param {string} link
   * @returns {string}
   */
  return (link) => {
    const extname = path.extname(link);
    const indexOfAnchor = extname.indexOf("#");

    const anchor = indexOfAnchor > 0 ?
      extname.substring(indexOfAnchor) :
      "";

    const linkWithoutAnchor = link.substring(0, link.length - anchor.length);

    const completeLink = path.join(path.dirname(inputFile), linkWithoutAnchor);
    const normalizedLink = path.normalize(path.resolve(completeLink));

    const translation = fileDict[normalizedLink];
    return translation ?
      path.relative(outputDir, translation + anchor) :
      link;
  };
}
