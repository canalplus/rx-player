const process = require("process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

module.exports = async function parseDocConfigs(
  baseInDir,
  baseOutDir,
  version
) {
  const rootConfigFileName = path.join(baseInDir, ".docConfig.json");
  const rootConfig = await parseAndCheckRootConfigFile(rootConfigFileName);
  const ret = {
    versionInfo: undefined,
    logo: undefined,
    favicon: undefined,
    links: [],
    linksRightIndex: -1,
  };

  if (typeof version === "string") {
    ret.versionInfo = { version };
    if (typeof rootConfig.otherVersionsLink === "string") {
      ret.versionInfo.link = rootConfig.otherVersionsLink;
    }
  }

  if (typeof rootConfig.logo === "object") {
    ret.logo = rootConfig.logo;
  }

  if (typeof rootConfig.favicon === "object") {
    ret.favicon = rootConfig.favicon;
  }

  const linksLeft = rootConfig.linksLeft ?? [];
  const linksRight = rootConfig.linksRight ?? [];
  const categoryLinks = linksLeft.concat(linksRight);
  if (linksRight.length > 0) {
    ret.linksRightIndex = linksLeft.length;
  }

  for (let i = 0; i < categoryLinks.length; i++) {
    const category = categoryLinks[i];

    let parsedCategory;
    switch (category.type) {
      case "local-doc":
        parsedCategory = await parseLocalDocCategory(category, baseInDir, baseOutDir);
        break;
      case "version":
        parsedCategory = { type: "version" };
        break;
      case "link":
        parsedCategory = {
          type: "external-link",
          link: category.link,
          displayName: category.displayName
        };
        break;
      case "github-link":
        parsedCategory = {
          type: "github-link",
          link: category.link,
        };
        break;
      case "search":
        parsedCategory = { type: "search" };
        break;
    }
    ret.links.push(parsedCategory);
  }
  return ret;
};

async function parseLocalDocCategory(
  category,
  baseInDir,
  baseOutDir
) {
  const categoryPath = path.join(baseInDir, category.path);
  const categoryOutPath = path.join(baseOutDir, category.path);
  const parsedCategory = {
    type: "local-doc",
    displayName: category.displayName,
    description: category.description,
    firstPage: "",
    pages: [],
  };
  const catCfgFileName = path.join(categoryPath, ".docConfig.json");
  const categoryConfig = await parseAndCheckSubConfigFile(catCfgFileName);
  for (const page of categoryConfig.pages) {
    const pagePath = path.join(categoryPath, page.path);
    let pageStat;
    try {
      pageStat = await promisify(fs.stat)(pagePath);
    } catch (err) {
      const srcMessage = (err ?? {}).message ?? "Unknown error";
      console.error(`Error: Cannot run stat on "${pagePath}": ${srcMessage}`);
      process.exit(1);
    }

    if (pageStat.isDirectory()) {
      const parsedPage = {
        isPageGroup: true,
        displayName: page.displayName,
        description: path.description,
        pages: [],
      };
      parsedCategory.pages.push(parsedPage);
      const pageCfgFileName = path.join(pagePath, ".docConfig.json");
      const pageGroupConfig = await parseAndCheckSubConfigFile(pageCfgFileName);
      for (const subPage of pageGroupConfig.pages) {
        const subPagePath = path.join(pagePath, subPage.path);
        const subPageOutPath = path.join(categoryOutPath, page.path, subPage.path);
        let subPageState;
        try {
          subPageState = await promisify(fs.stat)(subPagePath);
        } catch (err) {
          const srcMessage = (err ?? {}).message ?? "Unknown error";
          console.error(`Error: Cannot run stat on "${subPagePath}": ${srcMessage}`);
          process.exit(1);
        }

        if (subPageState.isDirectory()) {
          console.error(
            "Error: Category page depth cannot exceed 2 yet \"" +
              subPagePath + "\" is a directory."
          );
          process.exit(1);
        }
        const outputFile = path.join(path.dirname(subPageOutPath),
                                     path.basename(subPagePath, ".md") + ".html");
        parsedPage.pages.push({
          isPageGroup: false,
          displayName: subPage.displayName,
          description: subPage.description,
          inputFile: path.normalize(path.resolve(subPagePath)),
          outputFile: path.normalize(path.resolve(outputFile)),
        });
      }
    } else if(pageStat.isFile()) {
      const outputFile =
        path.join(categoryOutPath, path.basename(pagePath, ".md") + ".html");
      parsedCategory.pages.push({
        isPageGroup: false,
        displayName: page.displayName,
        description: page.description,
        inputFile: path.normalize(path.resolve(pagePath)),
        outputFile: path.normalize(path.resolve(outputFile)),
      });
    }
  }

  // Retrieve landing page for category == first page available
  if (parsedCategory.pages.length > 0) {
    if (!parsedCategory.pages[0].isPageGroup) {
      parsedCategory.firstPage = parsedCategory.pages[0].outputFile;
    } else if (parsedCategory.pages[0].pages.length > 0) {
      parsedCategory.firstPage = parsedCategory.pages[0].pages[0].outputFile;
    }
  }
  return parsedCategory;
}

/**
 * Parse root config file into a JS object and check that all properties are in
 * the right format.
 * Exit with a meaningful error if that's not the case.
 * @param {string} rootConfigFileName
 * @returns {Promise.<Object>}
 */
async function parseAndCheckRootConfigFile(rootConfigFileName) {
  let configStr;
  try {
    configStr = await promisify(fs.readFile)(rootConfigFileName, "utf8");
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    console.error(
      "Error: Impossible to read Root .docConfig.json file (\"" +
        rootConfigFileName +
        "\"): " +
      srcMessage
    );
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(configStr);
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    exitWithInvalidRootConfig(srcMessage);
  }

  if (typeof config !== "object" || config === null) {
    exitWithInvalidRootConfig("Should be under an object form.");
  }

  if (config.logo !== undefined) {
    if (typeof config.logo !== "object" || config.logo === null) {
      exitWithInvalidRootConfig(
        `The "logo" property, if defined, should contain an object.`
      );
    }

    if (typeof config.logo.srcPath !== "string") {
      exitWithInvalidRootConfig(
        `The "logo" property, if defined, should contain a "srcPath" ` +
          "property set as a string."
      );
    }

    if (config.logo.link !== undefined && typeof config.logo.link !== "string") {
      exitWithInvalidRootConfig(
        `The "logo.link" property, if defined, should be set as a string.`
      );
    }
  }

  if (config.favicon !== undefined) {
    if (typeof config.favicon.srcPath !== "string") {
      exitWithInvalidRootConfig(
        `The "favicon" property, if defined, should contain a "srcPath" `+
         "property set as a string."
      );
    }
  }

  if (
    config.otherVersionsLink !== undefined &&
    typeof config.otherVersionsLink !== "string"
  ) {
    exitWithInvalidRootConfig(
      `The "otherVersionsLink" property, if defined, should be set as a string.`
    );
  }

  if (
    typeof config.linksLeft !== undefined &&
    !Array.isArray(config.linksLeft)
  ) {
    exitWithInvalidRootConfig(
      `The "linksLeft" property, if defined, should be set as an Array.`
    );
  }

  if (
    typeof config.linksRight !== undefined &&
    !Array.isArray(config.linksRight)
  ) {
    exitWithInvalidRootConfig(
      `The "linksRight" property, if defined, should be set as an Array.`
    );
  }

  return config;

  function exitWithInvalidRootConfig(reason) {
    console.error(
      `Error: Root .docConfig.json file ("${rootConfigFileName}") is invalid: ${reason}`
    );
    process.exit(1);
  }
}

/**
 * @param {string} filename
 * @returns {Promise.<Object>}
 */
async function parseAndCheckSubConfigFile(filename) {
  let configStr;
  try {
    configStr = await promisify(fs.readFile)(filename, "utf8");
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    console.error(`Error: Impossible to read "${filename}" config file: ${srcMessage}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(configStr);
  } catch (err) {
    const srcMessage = (err ?? {}).message ?? "Unknown error";
    console.error(`Error: "${filename}" config file is invalid: ${srcMessage}`);
    process.exit(1);
  }

  if (typeof config !== "object" || config === null) {
    console.error(
      `Error: "${filename}" config file is invalid: ` +
        `Should be under an object form.`
    );
    process.exit(1);
  }

  if (
    !Array.isArray(config.pages) ||
    config.pages.length === 0
  ) {
    console.error(
      `Error: "${filename}" config file is invalid: ` +
        `Should have a "pages" property with at least one entry.`
    );
    process.exit(1);
  }

  for (const page of config.pages) {
    if (typeof page.path !== "string") {
      console.error(
        `Error: "${filename}" config file is invalid: ` +
          `One of the element in "pages" has an invalid "path" property ` +
          "(should be a string)."
      );
      process.exit(1);
    } else if (typeof page.displayName !== "string") {
      console.error(
        `Error: "${filename}" config file is invalid: ` +
          `One of the element in "pages" has an invalid "displayName" property ` +
          "(should be a string)."
      );
      process.exit(1);
    }
  }
  return config;
}
