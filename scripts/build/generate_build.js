#!/usr/bin/env node
/* eslint-env node */

/**
 * =================
 * generate_build.js
 * =================
 *
 * This file allows to produce the main RxPlayer's [modular] build.
 *
 * To run it, just call this file through your node.js binary:
 * ```sh
 * node generate_build.js
 * ```
 *
 * For now it heavily relies on unix-like utilities such as `find` and `sed` and
 * spawns new process to run them inside that script.
 * More cross-platform and safer solutions should be found in the future.
 */

const { spawn } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const rimraf = require("rimraf");

const BUILD_DIR_FROM_ROOT = "dist/_esm5.processed";

const ROOT_DIR = path.join(__dirname, "../../");
const TEMPLATE_DIR = path.join(__dirname, "../../scripts/build/templates");
const TMP_BUILD_DIR = path.join(ROOT_DIR, "dist/_esm5.raw");
const BUILD_DIR = path.join(ROOT_DIR, BUILD_DIR_FROM_ROOT);
const BUILD_ARTEFACTS_TO_REMOVE = [
  "dist/_esm5.processed",
  "dist/_esm5.raw",
  "features",
  "minimal",
  "experimental",
  "tools",
  "types",
  "logger"
];

/**
 * In the following tuples:
 *
 *   1. the first element designates a token/constant used in the code that
 *      should be replaced.
 *
 *      Because for now, the search and replace operation is performed by sed,
 *      it needs to be a valid sed-compliant RegExp.
 *
 *      _Note: As GNU sed and BSD sed are not in accordance on the word boundary
 *      token (\b for GNU sed vs [[:<:]] and [[:>:]] for BSD sed) we just use \<
 *      and \> here (for respectively starting and ending word boundary) and
 *      replace with the right character on the corresponding sed call site._
 *
 *   2. The second element designates what it will be replaced by, as a string.
 *
 * TODO This is the ugliest part of the build process and should be better
 * integrated to TypeScript compilation (in essence, those are compile-time
 * constants).
 */
const REPLACED_TOKENS_SED_REGXP = [
  ["\<__DEV__\>", "false"],
  ["\<__LOGGER_LEVEL__\>", "\"NONE\""],
  ["\<__FEATURES__\.EME\>", "false"],
  ["\<__FEATURES__\.SMOOTH\>", "false"],
  ["\<__FEATURES__\.DASH\>", "false"],
  ["\<__FEATURES__\.LOCAL_MANIFEST\>", "false"],
  ["\<__FEATURES__\.METAPLAYLIST\>", "false"],
  ["\<__FEATURES__\.DIRECTFILE\>", "false"],
  ["\<__FEATURES__\.HTML_SAMI\>", "false"],
  ["\<__FEATURES__\.HTML_SRT\>", "false"],
  ["\<__FEATURES__\.HTML_TTML\>", "false"],
  ["\<__FEATURES__\.HTML_VTT\>", "false"],
  ["\<__FEATURES__\.NATIVE_SAMI\>", "false"],
  ["\<__FEATURES__\.NATIVE_SRT\>", "false"],
  ["\<__FEATURES__\.NATIVE_TTML\>", "false"],
  ["\<__FEATURES__\.NATIVE_VTT\>", "false"],
  ["\<__RELATIVE_PATH__\.EME_MANAGER\>", "\"../core/eme/index.js\""],
  ["\<__RELATIVE_PATH__\.SMOOTH\>", "\"../transports/smooth/index.js\""],
  ["\<__RELATIVE_PATH__\.DASH\>", "\"../transports/dash/index.js\""],
  ["\<__RELATIVE_PATH__\.DASH_JS_PARSER\>", "\"../parsers/manifest/dash/js-parser/index.js\""],
  ["\<__RELATIVE_PATH__\.LOCAL_MANIFEST\>", "\"../transports/local/index.js\""],
  ["\<__RELATIVE_PATH__\.METAPLAYLIST\>", "\"../transports/dash/index.js\""],
  ["\<__RELATIVE_PATH__\.NATIVE_TEXT_BUFFER\>", "\"../core/segment_buffers/implementations/text/native/index.js\""],
  ["\<__RELATIVE_PATH__\.NATIVE_VTT\>", "\"../parsers/texttracks/webvtt/native.js\""],
  ["\<__RELATIVE_PATH__\.NATIVE_SRT\>", "\"../parsers/texttracks/srt/native.js\""],
  ["\<__RELATIVE_PATH__\.NATIVE_TTML\>", "\"../parsers/texttracks/ttml/native/index.js\""],
  ["\<__RELATIVE_PATH__\.NATIVE_SAMI\>", "\"../parsers/texttracks/sami/native.js\""],
  ["\<__RELATIVE_PATH__\.HTML_TEXT_BUFFER\>", "\"../core/segment_buffers/implementations/text/html/index.js\""],
  ["\<__RELATIVE_PATH__\.HTML_VTT\>", "\"../parsers/texttracks/webvtt/html/index.js\""],
  ["\<__RELATIVE_PATH__\.HTML_SRT\>", "\"../parsers/texttracks/srt/html.js\""],
  ["\<__RELATIVE_PATH__\.HTML_TTML\>", "\"../parsers/texttracks/ttml/html/index.js\""],
  ["\<__RELATIVE_PATH__\.HTML_SAMI\>", "\"../parsers/texttracks/sami/html.js\""],
  ["\<__RELATIVE_PATH__\.DIRECTFILE\>", "\"../core/init/directfile.js\""],
  ["\<__RELATIVE_PATH__\.MEDIA_ELEMENT_TRACK_CHOICE_MANAGER\>", "\"../core/api/media_element_track_choice_manager.ts\""],
];

generateBuild();

/**
 * @returns {Promise}
 */
async function generateBuild() {
  try {
    console.log(" 🧹 Removing previous build artefacts...");
    await removePreviousBuildArtefacts();

    console.log(" ⚙️  Compiling project with TypeScript...");
    await compile();

    console.log(" ✍️  Replacing compile-time tokens...");
    await setCompileTimeConstants();

    console.log(" 🚚 Moving built code to its final directory...");
    await fs.rename(TMP_BUILD_DIR, BUILD_DIR);

    console.log(" 📦 Generating imported files from templates...");
    await generateImportFilesFromTemplates();
  } catch (err) {
    console.error(
      "Fatal error:",
      err instanceof Error ? err.message : err
    );
    process.exit(1);
  }

  console.log(" 🙌 SUCCESS!");
}

/**
 * Remove directories and files from a previously built RxPlayer.
 * @returns {Promise}
 */
async function removePreviousBuildArtefacts() {
  await Promise.all(BUILD_ARTEFACTS_TO_REMOVE.map((name) => {
    const relativePath = path.join(ROOT_DIR, name);
    return removeFile(relativePath);
  }));
}

/**
 * Compile the project by spawning a separate procress running TypeScript.
 * @returns {Promise}
 */
async function compile() {
    // Sadly TypeScript compiler API seems to be sub-par.
    // I did not find for example how to exclude some files (our unit tests)
    // easily by running typescript directly from NodeJS.
    // So we just spawn a separate process running tsc:
    await spawnProm(
      "npx tsc -p",
      [path.join(ROOT_DIR, "tsconfig.modules.json")],
      (code) => new Error(`Compilation process exited with code ${code}`),
    );
}

/**
 * Now the ugliest part.
 * Our TypeScript files contains multiple compile-time constants which is not
 * something that TypeScript seems to handle.
 *
 * Consequently we decided for now to rely on calling find+sed instead to
 * replace those tokens post-compilation.
 *
 * This is ugly for the following reasons:
 *
 *   1. The token replacement logic is a dumb find-and-replace with no notion of
 *      the language. Here relying on tsc's AST is preferable because we would
 *      be sur that only constants are replaced and not possibly random strings.
 *
 *      To prevent most issue, we decided to give specific names to those global
 *      constants that are highly unlikely to be retrieved in other contexts.
 *
 *   2. The user has to have both `find` and `sed` installed on his/her/its
 *      computer.
 *      Not only that, he/she/it has to run either linux or MacOS.
 *      Not only that (again), an expected implementation of sed has to be found
 *      according to the OS.
 *
 * So yeah, that's risky.
 *
 * We could develop a platform-independent solution either by:
 *   - Write a plugin to TypeScript's compiler.
 *     This is the preferred solution though its API seems to be pretty instable
 *     according to its documentation, so I'm kind of afraid here that this task
 *     (which pretty much "just works" today) is going to add much more
 *     maintenance burden.
 *
 *   - Rely on NodeJS tools. Here the quality seems to not be there from what
 *     I've seen (I found mostly very slow tools).
 *
 * For now, my current strategy is to wait until the current logic explodes
 * (e.g. causes issues on a dev's computer)!
 *
 * @returns {Promise}
 */
async function setCompileTimeConstants() {
  switch (os.type()) {
    case "Darwin":
      // MacOS:
      // MacOS comes with the BSD version of some command line tools, which are
      // slightly different from the Linux version. The -i argument on sed
      // doesn't work with a zero-length extension. Thus, we declare an extension,
      // and then delete back-up unwanted files.
      await replaceTokensWithBsdSed();
      break;
    case "Linux":
      // Linux -> let's consider that we have GNU sed here
      await replaceTokensWithGnuSed();
      break;
    default:
      throw new Error(`Cannot replace tokens: unrecognized platform "${os.type()}"`);
  }
}

/**
 * @returns {Promise}
 */
async function generateImportFilesFromTemplates() {
  const dir = await fs.readdir(TEMPLATE_DIR);
  const proms = [];
  for (let f of dir) {
    proms.push(processTemplateFileOrDir(f));
  }
  await Promise.all(proms);

  /**
   * @returns {Promise}
   */
  async function processTemplateFileOrDir(fileName) {
    const filePath = path.join(TEMPLATE_DIR, fileName);
    const fileDest = path.join(ROOT_DIR, fileName);
    await copyDir(filePath, fileDest);
    await replaceTokensInTemplates(fileDest);
  }
}

/**
 * @param {string} fileName
 * @returns {Promise}
 */
function removeFile(fileName) {
  return new Promise((res, rej) => {
    rimraf(fileName, (err) => {
      if (err !== null && err !== undefined) {
        rej(err);
      }
      res();
    });
  });
}

/**
 * @returns {Promise}
 */
async function replaceTokensWithBsdSed() {
  const sedExecCommand =
    "sed -i.DELETE -E \"" +
    REPLACED_TOKENS_SED_REGXP.reduce((acc, val, idx) => {
      const escapedToken = val[0]
        .replace(/\</g, "[[:<:]]") // starting word boundary
        .replace(/\>/g, "[[:>:]]") // ending word boundary
        .replace(/\\/g, "\\\\") // \ by \\ (double escape because in string)
        .replace(/\//g, "\\\\/") // / by \\/ (/ is the sed separator)
        .replace(/"/g, "\\\""); // " by \"
      const escapedReplacement = val[1]
        .replace(/\\/g, "\\\\")
        .replace(/\//g, "\\\\/")
        .replace(/"/g, "\\\"");
      if (idx < REPLACED_TOKENS_SED_REGXP.length - 1) {
        return acc + `s/${escapedToken}/${escapedReplacement}/g; `
      } else {
        return acc + `s/${escapedToken}/${escapedReplacement}/g" '{}' \\;`;
      }
    }, "");
  await spawnProm(
    `find "${TMP_BUILD_DIR}" -type f -iname '*.js' -exec ${sedExecCommand}`,
    [],
    (code) => new Error(`Token-replacement process exited with code ${code}`),
  );
  await spawnProm(
    `find  "${TMP_BUILD_DIR}" -type f -name "*.DELETE" -delete`,
    [],
    (code) => new Error(`Token-replacement cleaning process exited with code ${code}`),
  );
}

/**
 * @returns {Promise}
 */
async function replaceTokensWithGnuSed() {
  const sedExecCommand =
    "sed -i -E \"" +
    REPLACED_TOKENS_SED_REGXP.reduce((acc, val, idx) => {
      const escapedToken = val[0]
        .replace(/\</g, "\\b") // starting word boundary
        .replace(/\>/g, "\\b") // ending word boundary
        .replace(/\\/g, "\\\\") // \ by \\ (double escape because in string)
        .replace(/\//g, "\\\\/") // / by \\/ (/ is the sed separator)
        .replace(/"/g, "\\\""); // " by \"
      const escapedReplacement = val[1]
        .replace(/\\/g, "\\\\")
        .replace(/\//g, "\\\\/")
        .replace(/"/g, "\\\"");
      if (idx < REPLACED_TOKENS_SED_REGXP.length - 1) {
        return acc + `s/${escapedToken}/${escapedReplacement}/g; `
      } else {
        return acc + `s/${escapedToken}/${escapedReplacement}/g" '{}' \\;`;
      }
    }, "");

  await spawnProm(
    `find "${TMP_BUILD_DIR}" -type f -iname '*.js' -exec ${sedExecCommand}`,
    [],
    (code) => new Error(`Token-replacement process exited with code ${code}`),
  );
}

/**
 * @param {string} command
 * @param {Array.<string>} args
 * @param {Function} errorOnCode
 */
function spawnProm(command, args, errorOnCode) {
  return new Promise((res, rej) => {
    spawn(command, args, { shell: true, stdio: "inherit" })
      .on("close", (code) => {
        if (code !== 0) {
          rej(errorOnCode(code));
        }
        res();
      });
  });
}

/**
 * @returns {Promise}
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  let entries = await fs.readdir(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory() ?
      await copyDir(srcPath, destPath) :
      await fs.copyFile(srcPath, destPath);
  }
}

/**
 * @returns {Promise}
 */
async function replaceTokensInTemplates(fileDest) {
  const sedDir = BUILD_DIR_FROM_ROOT.replace(/\//g, "\\/");
  switch (os.type()) {
    case "Darwin":
      await spawnProm(
        `find "${fileDest}" -type f -iname '*.js' ` +
          `-exec sed -i.DELETE -E "s/__BUILD_DIR__/${sedDir}/g" {} \\;`,
        [],
        (code) => new Error(`Template process exited with code ${code}`),
      );
      await spawnProm(
        `find  "${fileDest}" -type f -name "*.DELETE" -delete`,
        [],
        (code) => new Error(`Template cleaning process exited with code ${cleaningCode}`),
      );

    case "Linux":
      await spawnProm(
        `find "${fileDest}" -type f -exec sed -i -E "s/__BUILD_DIR__/${sedDir}/g" '{}' \\;`,
        [],
        (code) => new Error(`Template process exited with code ${code}`),
      );
  }
}
