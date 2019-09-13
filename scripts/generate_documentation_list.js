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
 * INITIAL_PAGE/versions/VERSION_NUMBER/doc
 *
 * Where INITIAL_PATH is a variable defined below and VERSION_NUMBER is the
 * version number in a semantic versioning scheme.
 *
 * The documentation homepage should be present in:
 * INITIAL_PAGE/versions/VERSION_NUMBER/doc/pages/index.html
 *
 * This script was not written with portability in mind (it would have taken too
 * much time). It might thus break if file organization changes in this project.
 */

const fs = require("fs");
const path = require("path");
const sanitizeHTML = require("sanitize-html");
const semver = require("semver");

const INITIAL_PATH = "./versions";

function sortVersions(versions) {
  return versions
    .filter(v => semver.valid(v) != null)
    .sort((a, b) => semver.gt(a, b) ? -1 : 1);
}

function isDirectory(source) {
  return fs.lstatSync(source).isDirectory();
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

const files = fs.readdirSync(INITIAL_PATH);
const versions = [];
for (let i = 0; i < files.length; i++) {
  const fileName = files[i];
  const filePath = path.join(INITIAL_PATH, fileName);
  if (isDirectory(filePath) && fs.existsSync(path.join(filePath, "doc"))) {
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
    // const versionAsNumber = +version.split(".").join();
    const dirPath = path.join(INITIAL_PATH, version, "doc/pages/index.html");
    body += `<li><a href=${sanitizeHTML(dirPath)}>` +
      sanitizeHTML(version) +
      "</a></li>";
  }
  body += "</ul>";
}

body += "<body/>";

const html = "<html>" +
  head +
  body +
  "<html>";

fs.writeFileSync("./documentation_pages_by_version.html", html);
