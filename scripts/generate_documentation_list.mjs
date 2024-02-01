#!/usr/bin/env node
/* eslint-env node */

/**
 * Generate documentation list
 * ===========================
 *
 * ## How it works
 *
 * This script will generate a page listing the documentation from various
 * versions of the rx-player.
 *
 * The documentation should entirely be present in a directory called:
 * `/versions/VERSION_NUMBER/doc`
 *
 * Where VERSION_NUMBER is the version number in a semantic versioning scheme.
 *
 * The documentation homepage should be present in:
 * `/versions/VERSION_NUMBER/doc/pages/index.html`
 *
 * This script was not written with portability in mind (it would have taken too
 * much time). It might thus break if file organization changes in this project.
 *
 *
 * ## How to run it
 *
 * To run this:
 *
 *   1. Be sure you are in the gh-pages branch
 *
 *   2. Call this script directly
 *
 *   3. a new file, `documentation_pages_by_version.html` should have been
 *      generated with all the right links.
 */

import { lstatSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { encode } from "html-entities";
import * as semver from "semver";

const INITIAL_PATH = "./versions";

function sortVersions(versions) {
  return versions
    .filter((v) => semver.valid(v) != null)
    .sort((a, b) => (semver.gt(a, b) ? -1 : 1));
}

function isDirectory(source) {
  return lstatSync(source).isDirectory();
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
  <title>RxPlayer - Documentation pages by version</title>
  ${style}
</head>`;

let body = "<body>";

const files = readdirSync(INITIAL_PATH);
const versions = [];
for (let i = 0; i < files.length; i++) {
  const fileName = files[i];
  const filePath = join(INITIAL_PATH, fileName);
  if (isDirectory(filePath) && existsSync(join(filePath, "doc"))) {
    versions.push(fileName);
  }
}

if (versions.length <= 0) {
  body += "<h1>No Documentation Available</h1>";
} else {
  body += "<h1>Documentation pages by version</h1>";
  body += "<ul>";

  const sortedVersions = sortVersions(versions);
  for (let i = 0; i < sortedVersions.length; i++) {
    const version = sortedVersions[i];

    // documentation homepage changed for the v3.26.1
    const dirPath = semver.gte(version, "3.26.1")
      ? join(INITIAL_PATH, version, "doc/api/Overview.html")
      : join(INITIAL_PATH, version, "doc/pages/index.html");

    body += `<li><a href=${encode(dirPath)}>` + encode(version) + "</a></li>";
  }
  body += "</ul>";
}

body += "<body/>";

const html = "<html>" + head + body + "<html>";

writeFileSync("./documentation_pages_by_version.html", html);
