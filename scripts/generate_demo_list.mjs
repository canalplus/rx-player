#!/usr/bin/env node

/**
 * # Generate demo list
 *
 * ## How it works
 *
 * This script will generate a page listing the demos from various
 * versions of the rx-player.
 *
 * The demo should entirely be present in a directory called:
 * `/versions/VERSION_NUMBER/demo`
 *
 * Where VERSION_NUMBER is the version number in a semantic versioning scheme.
 *
 * The documentation homepage should be present in:
 * `/versions/VERSION_NUMBER/demo/index.html`
 *
 * This script was not written with portability in mind (it would have taken too
 * much time). It might thus break if file organization changes in this project.
 *
 *
 * ## How to run it
 *
 * To run this:
 *
 *   1. Be sure you are in the `gh-pages` git branch
 *
 *   2. Call this script directly or import its default export and call it.
 *
 *   3. A new file, `demo_page_by_version.html` should have been generated with
 *      all the right links.
 */

// @ts-check

import { exec } from "child_process";
import { lstat, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { encode } from "html-entities";
import { pathToFileURL } from "url";
import * as semver from "semver";

import sortVersions from "./utils/sort_versions.mjs";

const INITIAL_PATH = "./versions";
const TARGET_BRANCH = "gh-pages";

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

export default async function generateDemoList() {
  const currentBranch = (
    await executeCommand("git branch | sed -n -e 's/^\\* \\(.*\\)/\\1/p'")
  ).trim();

  if (currentBranch !== TARGET_BRANCH) {
    console.error(
      "Error: You're not on the right git branch to execute this script.\n" +
        'Current Branch: "' +
        currentBranch +
        '"\n' +
        'Expected Branch: "' +
        TARGET_BRANCH +
        '"',
    );
    process.exit(1);
  }

  if (!(await exists(INITIAL_PATH))) {
    console.error(`Error: Missing "${INITIAL_PATH}" directory.`);
    process.exit(1);
  }

  const style = `<style type="text/css">
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #333; }
ul { list-style-type: square; }
li { margin-top: 8px; }
a { color: #006; }
a:hover { color: #076; }
</style>`;
  const head = `<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta charset="utf-8">
  <title>RxPlayer - Demo page by version</title>
  ${style}
</head>`;

  let body = "<body>";

  const files = await readdir(INITIAL_PATH);
  const versions = [];
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = join(INITIAL_PATH, fileName);
    if ((await isDirectory(filePath)) && (await exists(join(filePath, "demo")))) {
      versions.push(fileName);
    }
  }

  if (versions.length <= 0) {
    body += "<h1>No Demo Available</h1>";
  } else {
    body += "<h1>Demo page by version</h1>";
    body += "<ul>";

    const sortedVersions = sortVersions(versions);
    for (let i = 0; i < sortedVersions.length; i++) {
      const version = sortedVersions[i];
      const { docUrl, demoUrl, releaseNoteUrl } = getUrlsForVersion(
        INITIAL_PATH,
        version,
      );
      const demoUrlAttr = demoUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const docUrlAttr = docUrl.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const releaseNoteUrlAttr = releaseNoteUrl
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');
      body +=
        "<li>" +
        `<a href="${demoUrlAttr}">` +
        encode(version) +
        "</a>" +
        '<span style="font-size: 0.9em">' +
        ` (see also: <i><a href="${releaseNoteUrlAttr}">Release Note</a></i>, ` +
        `<i><a href="${docUrlAttr}">Documentation</a></i>)` +
        "</span>" +
        "</li>";
    }
    body += "</ul>";
  }

  body += "</body>";

  const html = "<html>" + head + body + "</html>";
  return writeFile("./demo_page_by_version.html", html);
}

/**
 * Execute the given shell command and return the output.
 * @param {string} cmd
 * @returns {Promise<string>}
 */
function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        encoding: "utf8",
      },
      /**
       * @param {import("child_process").ExecException|null} error
       * @param {string} stdout
       */
      (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

/**
 * @param {string} source
 * @returns {Promise.<boolean>}
 */
async function isDirectory(source) {
  return (await lstat(source)).isDirectory();
}

/**
 * @param {string} initialPath
 * @param {string} version
 * @returns {{demoUrl: string; docUrl: string; releaseNoteUrl: string;}}
 */
export function getUrlsForVersion(initialPath, version) {
  const demoUrl = `${initialPath}/${version}/demo/index.html`;

  // documentation homepage changed for the v3.26.1
  const docUrl = semver.gte(version, "3.26.1")
    ? `${initialPath}/${version}/doc/api/Overview.html`
    : `${initialPath}/${version}/doc/pages/index.html`;

  const releaseNoteUrl = `https://github.com/canalplus/rx-player/releases/tag/v${version}`;
  return {
    demoUrl,
    docUrl,
    releaseNoteUrl,
  };
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
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
  generateDemoList().catch((err) => {
    console.error(`ERROR: ${err}`);
    process.exit(1);
  });
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `generate_demo_list.mjs: Generate a page listing the demos from various
versions of the rx-player.

Usage: node generate_demo_list.mjs [OPTIONS]

Options:
  -h, --help             Display this help.`,
  );
}
