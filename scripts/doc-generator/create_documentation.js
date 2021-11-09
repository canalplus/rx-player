const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const parseDocConfigs = require("./parse_doc_configs.js");
const createDocumentationPage = require("./create_documentation_page.js");
const generateHeaderHtml = require("./generate_header_html.js");
const generatePageListHtml = require("./generate_page_list_html.js");
const generateSidebarHtml = require("./generate_sidebar_html.js");
const {
  mkdirParent,
  toUriCompatibleRelativePath,
} = require("./utils.js");

async function createDirIfDoesntExist(dir) {
  const doesCSSOutDirExists = await promisify(fs.exists)(dir);
  if (!doesCSSOutDirExists) {
    try {
      await mkdirParent(dir);
    } catch (err) {
      const srcMessage = (err ?? {}).message ?? "Unknown error";
      console.error(`Error: Could not create "${dir}" directory: ${srcMessage}`);
      process.exit(1);
    }
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
 * @param {string|undefined} [options.version] - String indicating the current
 * version of the documented application.
 * @returns {Promise} - Resolve when done
 */
async function createDocumentation(
  baseInDir,
  baseOutDir,
  options = {},
) {
  const { css } = options;

  // Copy CSS files
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

  // Copy JavaScript file
  const scriptOutputDir = path.join(path.resolve(baseOutDir), "scripts");
  const scripts = [
    path.join(__dirname, "scripts/lunr.js"),
    path.join(__dirname, "scripts/script.js"),
  ];
  const scriptOutputPaths = scripts.map(s =>
    path.join(scriptOutputDir, path.basename(s)));

  await createDirIfDoesntExist(scriptOutputDir);
  await Promise.all(scripts.map(async (s, i) => {
    await promisify(fs.copyFile)(s, scriptOutputPaths[i]);
  }));

  // Construct tree listing categories, pages, and relations between them.
  const config = await parseDocConfigs(baseInDir, baseOutDir, options.version);

  if (config.favicon !== undefined && typeof config.favicon.srcPath === "string") {
    await copyFileToOutputDir(config.favicon.srcPath, baseInDir, baseOutDir);
  }
  if (config.logo !== undefined && typeof config.logo.srcPath === "string") {
    await copyFileToOutputDir(config.logo.srcPath, baseInDir, baseOutDir);
  }


  // Construct a dictionary of markdown files to the corresponding output file.
  // This can be useful to redirect links to other converted markdowns.
  const fileDict = config.links.reduce((acc, linkInfo) => {
    if (linkInfo.type !== "local-doc") {
      return acc;
    }
    return linkInfo.pages.reduce((acc2, pageInfo) => {
      if (pageInfo.isPageGroup) {
        return pageInfo.pages.reduce((acc3, subPageInfo) => {
          acc3[subPageInfo.inputFile] = subPageInfo.outputFile;
          return acc3;
        }, acc2);
      } else {
        acc2[pageInfo.inputFile] = pageInfo.outputFile;
      }
      return acc2;
    }, acc);
  }, {});

  const searchIndex = [];

  // Create documentation pages
  for (let linkIdx = 0; linkIdx < config.links.length; linkIdx++) {
    const currentLink = config.links[linkIdx];
    if (currentLink.type !== "local-doc") {
      continue;
    }
    for (let pageIdx = 0; pageIdx < currentLink.pages.length; pageIdx++) {
      const currentPage = currentLink.pages[pageIdx];
      if (!currentPage.isPageGroup) {
        const { inputFile, outputFile } = currentPage;
        await prepareAndCreateDocumentationPage({
          baseOutDir,
          config,
          cssOutputPaths,
          fileDict,
          inputFile,
          linkIdx,
          outputFile,
          pageIdxs: [pageIdx],
          pageTitle: options.getPageTitle === undefined ?
            currentPage.displayName :
            options.getPageTitle(currentPage.displayName),
          scriptOutputPaths,
          searchIndex,
        });
      } else {
        for (
          let subPageIdx = 0;
          subPageIdx < currentPage.pages.length;
          subPageIdx++
        ) {
          const currentSubPage = currentPage.pages[subPageIdx];
          const { inputFile, outputFile } = currentSubPage;
          await prepareAndCreateDocumentationPage({
            baseOutDir,
            config,
            cssOutputPaths,
            fileDict,
            inputFile,
            linkIdx,
            outputFile,
            pageIdxs: [pageIdx, subPageIdx],
            pageTitle: options.getPageTitle === undefined ?
              currentSubPage.displayName :
              options.getPageTitle(currentSubPage.displayName),
            scriptOutputPaths,
            searchIndex,
          });
        }
      }
    }
  }

  try {
    const searchIndexLoc = path.join(path.resolve(baseOutDir), "searchIndex.json");
    await promisify(fs.writeFile)(searchIndexLoc, JSON.stringify(searchIndex));
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    console.error(`Error: Could not create search index file: ${srcMessage}`);
  }
};

async function prepareAndCreateDocumentationPage({
  baseOutDir,
  config,
  cssOutputPaths,
  fileDict,
  inputFile,
  linkIdx,
  outputFile,
  pageIdxs,
  pageTitle,
  scriptOutputPaths,
  searchIndex,
}) {
  // Create output directory if it does not exist
  const outDir = path.dirname(outputFile);
  await createDirIfDoesntExist(outDir);

  let logoInfo = null;
  if (config.logo !== undefined) {
    logoInfo = {};
    if (config.logo !== undefined && typeof config.logo.link === "string") {
      logoInfo.link = config.logo.link;
    }
    if (config.logo !== undefined && typeof config.logo.srcPath === "string") {
      const fullPath =  path.join(baseOutDir, config.logo.srcPath);
      logoInfo.url = toUriCompatibleRelativePath(fullPath, outDir);
    }
  }
  let faviconUrl = null;
  if (config.favicon !== undefined && typeof config.favicon.srcPath === "string") {
    const fullPath =  path.join(baseOutDir, config.favicon.srcPath);
    faviconUrl = toUriCompatibleRelativePath(fullPath, outDir);
  }
  const pageListHtml = generatePageListHtml(config.links, linkIdx, pageIdxs, outputFile);
  const navBarHtml = generateHeaderHtml(config, linkIdx, outputFile, logoInfo);
  const pages = config.links[linkIdx].pages;
  const sidebarHtml = generateSidebarHtml(pages, pageIdxs, outputFile, logoInfo);

  let prevPageConfig = null;
  let nextPageConfig = null;
  if (pageIdxs.length > 1 && pageIdxs[1] > 0) {
    prevPageConfig = pages[pageIdxs[0]].pages[pageIdxs[1] - 1];
  } else if (pageIdxs[0] > 0) {
    prevPageConfig = pages[pageIdxs[0] - 1];
  }
  if (pageIdxs.length > 1 && pageIdxs[1] < pages[pageIdxs[0]].pages.length - 1) {
    nextPageConfig = pages[pageIdxs[0]].pages[pageIdxs[1] + 1];
  } else if (pageIdxs[0] < pages.length - 1) {
    nextPageConfig = pages[pageIdxs[0] + 1];
  }
  const prevPageInfo = prevPageConfig === null ?
    null :
    getRelativePageInfo(prevPageConfig, outputFile);
  const nextPageInfo = nextPageConfig === null ?
    null :
    getRelativePageInfo(nextPageConfig, outputFile);

  const cssUrls = cssOutputPaths
    .map(cssOutput => toUriCompatibleRelativePath(cssOutput, outDir));
  const scriptUrls = scriptOutputPaths
    .map(s => toUriCompatibleRelativePath(s, outDir));

  // add link translation to options
  const linkTranslator = linkTranslatorFactory(inputFile, outDir, fileDict);
  await createDocumentationPage({
    baseOutDir,
    cssUrls,
    faviconUrl,
    inputFile,
    linkTranslator,
    navBarHtml,
    nextPageInfo,
    outputFile,
    pageListHtml,
    pageTitle,
    prevPageInfo,
    scriptUrls,
    searchIndex,
    sidebarHtml,
  });
}

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
   * @returns {string|undefined}
   */
  return (link) => {
    if (/^(?:[a-z]+:)/.test(link) || link[0] === "#") {
      return
    }
    const extname = path.extname(link);
    const indexOfAnchor = extname.indexOf("#");

    const anchor = indexOfAnchor > 0 ?
      extname.substring(indexOfAnchor) :
      "";

    const linkWithoutAnchor = link.substring(0, link.length - anchor.length);
    const completeLink = path.join(path.dirname(inputFile), linkWithoutAnchor);
    const normalizedLink = path.normalize(path.resolve(completeLink));

    const translation = fileDict[normalizedLink];
    if (translation === undefined) {
      console.warn("WARNING: Local link not found.\n",
                   "File:", inputFile, "\n",
                   "Link:", link, "\n");
    }
    return translation !== undefined ?
      toUriCompatibleRelativePath(translation, outputDir) + anchor :
      // TODO do something better?
      undefined;
  };
}

function getRelativePageInfo(
  pageConfig,
  currentPath
) {
  const {
    displayName: pDisplayName,
    outputFile: pOutputFile
  } = pageConfig.isPageGroup ?
    pageConfig.pages[0] :
    pageConfig;

  const relativeHref = toUriCompatibleRelativePath(pOutputFile, path.dirname(currentPath));
  return { name: pDisplayName, link: relativeHref };
}

async function copyFileToOutputDir(
  filePathFromInputDir,
  inputDir,
  outputDir
) {
  const inputPath = path.join(inputDir, filePathFromInputDir);
  const outputPath = path.join(outputDir, filePathFromInputDir);
  const doesOutDirExists = await promisify(fs.exists)(path.dirname(outputPath));
  if (!doesOutDirExists) {
    try {
      await mkdirParent(path.dirname(outputPath));
    } catch (err) {
      const srcMessage = (err ?? {}).message ?? "Unknown error";
      console.error(`Error: Could not create "${outputPath}" directory: ${srcMessage}`);
      process.exit(1);
    }
  }
  const doesOutFileExist = await promisify(fs.exists)(outputPath);
  if (!doesOutFileExist) {
    await promisify(fs.copyFile)(inputPath, outputPath);
  }
}

module.exports = createDocumentation;
