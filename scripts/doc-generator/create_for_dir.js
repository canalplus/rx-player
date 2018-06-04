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

/**
 * Create documentation for the directory given into the ouput directory given.
 * @param {string} baseInDir
 * @param {string} baseOutDir
 * @param {Object} [options={}]
 * @param {Function} [options.getPageTitle]
 * @param {Array.<string>} [options.css]
 * @returns {Promise}
 */
module.exports = async function createDocumentationForDir(
  baseInDir,
  baseOutDir,
  options = {}
) {
  const {
    getPageTitle = t => t,
    css = [],
  } = options;
  const filesToConvert = await getFilesToConvert(baseInDir, baseOutDir);
  const [homeLink, listLink] = filesToConvert.length > 1 ?
    [
      path.join(path.resolve(baseOutDir), "pages", "index.html"), // TODO
      path.join(path.resolve(baseOutDir), "list.html"),
    ] :
    [ null, null ];

  const cssOutputs = [];
  if (css.length) {
    const cssOutputDir = path.join(path.resolve(baseOutDir), "styles");
    const doesCSSOutDirExists = await promisify(fs.exists)(cssOutputDir);
    if (!doesCSSOutDirExists) {
      await mkdirParent(cssOutputDir);
    }
    const copyingCSSPromises = css
      .map(async (cssInput) => {
        const cssOutput = path.join(cssOutputDir, path.basename(cssInput));
        await promisify(fs.copyFile)(cssInput, cssOutput);
        return cssOutput;
      });

    cssOutputs.push(...await Promise.all(copyingCSSPromises));
  }

  // keys: inputFile; values: outputFile
  const fileDict = filesToConvert.reduce((acc, entry) => {
    acc[entry.inputFile] = entry.outputFile;
    return acc;
  }, {});

  for (let i = 0; i < filesToConvert.length; i++) {
    const { outputFile, inputFile } = filesToConvert[i];
    // Create output directory if it does not exist
    const outDir = path.dirname(outputFile);
    const doesOutDirExists = await promisify(fs.exists)(outDir);
    if (!doesOutDirExists) {
      await mkdirParent(outDir);
    }

    // add link translation to options
    const linkTranslator = linkTranslatorFactory(inputFile, outDir, fileDict);
    await createDocumentationPage(inputFile, outputFile, {
      linkTranslator,
      getPageTitle,
      homeLink: path.relative(outDir, homeLink),
      listLink: path.relative(outDir, listLink),
      css: cssOutputs.map(cssOutput => path.relative(outDir, cssOutput)),
    });
  }

  {
    const pageListMD = await constructPageList(filesToConvert, baseOutDir);
    const { content, toc } = constructTableOfContents(pageListMD);
    const cssRelativePaths = cssOutputs
      .map(cssOutput => path.relative(baseOutDir, cssOutput));
    const listHTML = constructHTML(
      getPageTitle("Page List"),
      convertMDToHTML(content),
      {
        css: cssRelativePaths,
        toc,
        homeLink: path.relative(baseOutDir, homeLink),
        listLink: path.relative(baseOutDir, listLink),
      }
    );
    await promisify(fs.writeFile)(path.join(baseOutDir, "list.html"), listHTML);
  }
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
      extname.substring(indexOfAnchor) : "";

    const linkWithoutAnchor =
      link.substring(0, link.length - anchor.length);

    const completeLink =
      path.join(path.dirname(inputFile), linkWithoutAnchor);
    const normalizedLink = path.normalize(path.resolve(completeLink));

    const translation = fileDict[normalizedLink];
    return translation ? path.relative(outputDir, translation + anchor) : link;
  };
}
