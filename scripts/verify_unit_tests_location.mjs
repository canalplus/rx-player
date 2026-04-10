#!/usr/bin/env node
/**
 * # verify_unit_tests_location.mjs
 *
 * The RxPlayer's unit tests are stored in `tests/unit/src` and are then
 * supposed to mirror the `src` directory, only adding the `.test.ts` extension
 * to filenames instead of the original `.ts`.
 *
 * This script ensure that this stays the same: it outputs to stderr and return a
 * `1` exit code if any test file in `tests/unit/src/` does not have its
 * equivalent file in `src/`
 *
 * It can either be imported (it has a default export) or called from the CLI
 * directly.
 */

// @ts-check

import { readdir, stat } from "fs/promises";
import { join, relative, normalize, extname, basename, dirname } from "path";
import projectRootDir from "./utils/project_root_directory.mjs";
import { pathToFileURL } from "url";

const DEFAULT_UNIT_TESTS_DIR = join(projectRootDir, "tests", "unit", "src");
const DEFAULT_SRC_DIR = join(projectRootDir, "src");

/**
 * The infix added before the final extension in test file names.
 * e.g. `foo.ts` -> `foo.test.ts`, `foo.js` -> `foo.test.js`
 */
const TEST_INFIX = ".test";

/**
 * Returns true if the given filename looks like a test file
 * (i.e. its stem ends with `.test` regardless of extension).
 * @param {string} name
 * @returns {boolean}
 */
function isTestFile(name) {
  const ext = extname(name); // e.g. ".ts", ".js", ".tsx"
  const stem = basename(name, ext); // e.g. "foo.test"
  return stem.endsWith(TEST_INFIX);
}

/**
 * Given a test filename, return the stem without the test infix.
 * e.g. "foo.test.ts" -> "foo", "bar.test.js" -> "bar"
 * @param {string} name
 * @returns {{ stem: string, ext: string }}
 */
function parseTestFileName(name) {
  const ext = extname(name);
  const stem = basename(name, ext);
  const srcStem = stem.slice(0, -TEST_INFIX.length);
  return { stem: srcStem, ext };
}

/**
 * @param {string} dir - The directory to walk.
 * @param {(name: string)=>boolean} predicate - If it returns true, this file
 * path will be added to the result.
 * @returns {Promise.<Array.<string>>} - Files that matched the predicate.
 */
async function collectFiles(dir, predicate) {
  /** @type Array.<string> */
  const results = [];

  /**
   * Recursive implementation of walking each dir.
   * @param {string} current - Current directory
   */
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && predicate(entry.name)) {
        results.push(full);
      }
    }
  }

  await walk(dir);
  return results;
}

/**
 * Given a test file path, return the list of candidate source file paths to
 * check. Candidates are produced by:
 *  1. Same extension as the test file  (foo.test.ts  -> src/foo/bar.ts)
 *  2. A curated list of common source extensions, so that e.g. a `.test.ts`
 *     file may still match a `.js` or `.tsx` source when the project mixes
 *     extensions.
 *
 * Duplicates (when the test extension is already in the fallback list) are
 * removed automatically.
 *
 * @param {string} unitTestsDir - Root directory where unit tests are.
 * @param {string} srcDir - Root directory where source files are.
 * @param {string} testFile - Absolute path to the test file.
 * @returns {string[]} - Candidate absolute paths for the source file.
 */
function candidateSourcePaths(unitTestsDir, srcDir, testFile) {
  const rel = relative(unitTestsDir, testFile); // e.g. foo/bar.test.ts
  const dir = dirname(rel); // e.g. foo
  const { stem, ext } = parseTestFileName(basename(rel));

  const COMMON_EXTENSIONS = [ext, ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  // Deduplicate while preserving order (same-extension candidate comes first).
  const seen = new Set();
  const exts = COMMON_EXTENSIONS.filter((e) => {
    if (seen.has(e)) {
      return false;
    }
    seen.add(e);
    return true;
  });

  return exts.map((e) => join(srcDir, dir, stem + e));
}

/**
 * @param {string} path
 * @returns {Promise.<boolean>}
 */
async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * @typedef {{
 *   testFile: string;
 *   checkedSrcPaths: string[];
 * }} PathVerificationFailingItem
 *
 * Item which failed our path verification check.
 * @property {string} testFile - The path of the unit test file which did not
 * match any source file.
 * @property {string[]} checkedSrcPaths - All candidate source paths that were
 * checked and did not exist.
 */

/**
 * Ensure that files stored in `unitTestsDir` all mirror files stored in
 * `srcDir`, stripping the `.test` infix from the stem (regardless of
 * extension).
 *
 * @param {string} [unitTestsDir] - The directory where unit tests are
 * (`<root>/tests/unit/src` by default)
 * @param {string} [srcDir]  - The directory where source files are
 * (`<root>/src` by default)
 * @returns {Promise.<Array.<PathVerificationFailingItem>|null>} - Resolves with
 * `null` if no unit test was found, or with an array of failed results.
 * That array is empty if all unit test files mapped to a corresponding source
 * file.
 * Rejects if an error prevented the check.
 */
export default async function verifyUnitTestsLocation(unitTestsDir, srcDir) {
  const uDir = unitTestsDir ?? DEFAULT_UNIT_TESTS_DIR;
  const sDir = srcDir ?? DEFAULT_SRC_DIR;
  const testFiles = await collectFiles(uDir, isTestFile);

  if (testFiles.length === 0) {
    return null;
  }

  /** @type {Array.<PathVerificationFailingItem>} */
  const errors = [];

  for (const testFile of testFiles) {
    const candidates = candidateSourcePaths(uDir, sDir, testFile);

    let found = false;
    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        found = true;
        break;
      }
    }

    if (!found) {
      errors.push({
        testFile: relative(projectRootDir, testFile),
        checkedSrcPaths: candidates.map((p) => relative(projectRootDir, p)),
      });
    }
  }

  return errors;
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  /** @type {string|undefined} */
  let unitTestsPath;
  /** @type {string|undefined} */
  let srcPath;

  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;

      case "-u":
      case "--unit":
        {
          argOffset++;
          const wantedOutput = args[argOffset];
          if (wantedOutput === undefined) {
            console.error(
              "ERROR: no unit tests path provided to " + currentArg + " option\n",
            );
            displayHelp();
            process.exit(1);
          }
          unitTestsPath = normalize(wantedOutput);
        }
        break;

      case "-s":
      case "--src":
        {
          argOffset++;
          const wantedOutput = args[argOffset];
          if (wantedOutput === undefined) {
            console.error("ERROR: no src path provided to " + currentArg + " option\n");
            displayHelp();
            process.exit(1);
          }
          srcPath = normalize(wantedOutput);
        }
        break;

      case "--":
        argOffset = args.length;
        break;

      default: {
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
      }
    }
  }

  try {
    verifyUnitTestsLocation(unitTestsPath, srcPath)
      .then((errors) => {
        if (errors === null) {
          console.log("No unit test files found in tests/unit/src/.");
          process.exit(0);
        }
        if (errors.length > 0) {
          console.error(
            `\n✗ ${errors.length} unit test file(s) have no corresponding source file:\n`,
          );
          for (const { testFile, checkedSrcPaths } of errors) {
            console.error(`  ${testFile}`);
            console.error(`  -> checked source paths (none found):`);
            for (const p of checkedSrcPaths) {
              console.error(`       ${p}`);
            }
            console.error("");
          }
          console.error("Move/rename the test to match its source file.");
          process.exit(1);
        }

        console.log(`✓ All unit test file(s) mirror src correctly.`);
        process.exit(0);
      })
      .catch((err) => {
        console.error(`ERROR: ${err}\n`);
        process.exit(1);
      });
  } catch (err) {
    console.error(`ERROR: ${err}\n`);
    process.exit(1);
  }
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `verify_unit_tests_location.mjs: Verify that unit tests paths mirror the source
directory's paths.

Usage: node verify_unit_tests_location.mjs [OPTIONS]

Options:
-h, --help                 Display this help
-u <PATH>, --unit <PATH>   The unit tests path.
                           Default: ${DEFAULT_UNIT_TESTS_DIR}
-s <PATH>, --src <PATH>    The source files path.
                           Default: ${DEFAULT_SRC_DIR}`,
  );
}
