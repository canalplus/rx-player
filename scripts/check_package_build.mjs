#!/usr/bin/env node

/**
 * # check_package_build.mjs
 *
 * This file checks that the RxPlayer package can be consumed through both its
 * ES module and CommonJS entry points.
 *
 * It packs the current project (or uses the package archive given through the
 * `--package` option), installs it in an isolated temporary project and then:
 *   - type-checks all public JavaScript exports from ES module and CommonJS
 *     TypeScript consumers;
 *   - loads those exports through both `import` and `require`, checking that
 *     they expose the same names.
 *
 * The RxPlayer should be built before this script is called.
 *
 * You can either run it directly as a script or import its default export and
 * call it.
 */

// @ts-check

import { spawn } from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(currentDirectory, "..");

/**
 * @typedef {Object} ICheckPackageBuildOptions
 * @property {string|undefined} [packagePath] - Path to an already-packed npm
 * package. If unset, the current project is packed and checked.
 */

/**
 * Check the package's ES module and CommonJS entry points.
 * @param {ICheckPackageBuildOptions} [options]
 * @returns {Promise.<void>}
 */
export default async function checkPackageBuild(options = {}) {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "rx-player-package-"),
  );
  try {
    const packagePath =
      options.packagePath === undefined
        ? await packCurrentProject(temporaryDirectory)
        : path.resolve(options.packagePath);
    await ensureFileExists(packagePath, `Package archive not found: "${packagePath}"`);

    const consumerDirectory = path.join(temporaryDirectory, "consumer");
    await fs.mkdir(consumerDirectory);
    await fs.writeFile(
      path.join(consumerDirectory, "package.json"),
      '{\n  "name": "rx-player-package-check",\n  "private": true,\n  "type": "module"\n}\n',
    );

    console.log(" 📦 Installing package in an isolated project...");
    await runCommand(
      "npm",
      [
        "install",
        "--silent",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--cache",
        path.join(temporaryDirectory, "npm-cache"),
        packagePath,
      ],
      consumerDirectory,
    );

    const packageJson = JSON.parse(
      await fs.readFile(packagePathForConsumer(consumerDirectory), "utf8"),
    );
    if (
      typeof packageJson.name !== "string" ||
      packageJson.exports === null ||
      typeof packageJson.exports !== "object" ||
      Array.isArray(packageJson.exports)
    ) {
      throw new Error(
        'The installed package should have a name and an object "exports" field.',
      );
    }

    const installedPackageDirectory = path.dirname(
      packagePathForConsumer(consumerDirectory),
    );
    const publicSpecifiers = await listPublicJavaScriptSpecifiers(
      installedPackageDirectory,
      packageJson.name,
      packageJson.exports,
    );
    if (publicSpecifiers.length === 0) {
      throw new Error("No public JavaScript export was found in the installed package.");
    }

    console.log(` 🧪 Type-checking ${publicSpecifiers.length} public exports...`);
    await writeTypeScriptConsumers(consumerDirectory, publicSpecifiers);
    await runCommand(
      "npm",
      ["exec", "--offline", "--", "tsc", "--project", consumerDirectory],
      ROOT_DIR,
    );

    console.log(" 🔎 Comparing ES module and CommonJS runtime exports...");
    const runtimeCheckPath = path.join(consumerDirectory, "check_runtime_exports.mjs");
    await fs.writeFile(runtimeCheckPath, createRuntimeCheckSource(publicSpecifiers));
    await runCommand(process.execPath, [runtimeCheckPath], consumerDirectory);
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }

  console.log(" 🙌 SUCCESS!");
}

/**
 * Pack the current project into the given directory.
 * @param {string} destinationDirectory
 * @returns {Promise<string>}
 */
async function packCurrentProject(destinationDirectory) {
  await ensureFileExists(
    path.join(ROOT_DIR, "dist", "es2017", "index.js"),
    'No ES module build found. Run "npm run build" before this script.',
  );
  await ensureFileExists(
    path.join(ROOT_DIR, "dist", "commonjs", "index.js"),
    'No CommonJS build found. Run "npm run build" before this script.',
  );

  console.log(" 📦 Packing the current project...");
  await runCommand(
    "npm",
    [
      "pack",
      "--silent",
      "--cache",
      path.join(destinationDirectory, "npm-cache"),
      "--pack-destination",
      destinationDirectory,
      ROOT_DIR,
    ],
    ROOT_DIR,
  );
  const archiveNames = (await fs.readdir(destinationDirectory)).filter((name) =>
    name.endsWith(".tgz"),
  );
  if (archiveNames.length !== 1) {
    throw new Error(
      `Expected npm pack to create one archive, but found ${archiveNames.length}.`,
    );
  }
  return path.join(destinationDirectory, archiveNames[0]);
}

/**
 * Return the installed package.json path for the fixture project.
 * @param {string} consumerDirectory
 * @returns {string}
 */
function packagePathForConsumer(consumerDirectory) {
  return path.join(consumerDirectory, "node_modules", "rx-player", "package.json");
}

/**
 * List all concrete public JavaScript specifiers from a package export map.
 * Wildcard exports are expanded from the files present in the installed
 * package.
 * @param {string} packageDirectory
 * @param {string} packageName
 * @param {Record<string, unknown>} exportsMap
 * @returns {Promise<string[]>}
 */
async function listPublicJavaScriptSpecifiers(packageDirectory, packageName, exportsMap) {
  const files = await listFilesRecursively(packageDirectory);
  const specifiers = new Set();

  for (const [exportName, exportDefinition] of Object.entries(exportsMap)) {
    if (exportName === "./package.json") {
      continue;
    }
    const importTarget = findExportTarget(exportDefinition, "import");
    const requireTarget = findExportTarget(exportDefinition, "require");
    if (importTarget === undefined) {
      throw new Error(`No import target found for export "${exportName}".`);
    }
    if (requireTarget === undefined) {
      throw new Error(`No require target found for export "${exportName}".`);
    }

    const wildcardOffset = exportName.indexOf("*");
    if (wildcardOffset < 0) {
      specifiers.add(toPackageSpecifier(packageName, exportName));
      continue;
    }
    if (exportName.indexOf("*", wildcardOffset + 1) >= 0) {
      throw new Error(`Multiple wildcards are unsupported in export "${exportName}".`);
    }

    const targetMatcher = createWildcardMatcher(importTarget);
    for (const file of files) {
      const match = targetMatcher.exec("./" + file.split(path.sep).join("/"));
      if (match !== null) {
        specifiers.add(
          toPackageSpecifier(packageName, exportName.replace("*", match[1])),
        );
      }
    }
  }

  return [...specifiers].sort();
}

/**
 * Find a string target for the wanted condition in an export definition.
 * @param {unknown} exportDefinition
 * @param {"import"|"require"} condition
 * @returns {string|undefined}
 */
function findExportTarget(exportDefinition, condition) {
  if (typeof exportDefinition === "string") {
    return exportDefinition;
  }
  if (
    exportDefinition !== null &&
    typeof exportDefinition === "object" &&
    !Array.isArray(exportDefinition)
  ) {
    const conditions = /** @type {Record<string, unknown>} */ (exportDefinition);
    const target = conditions[condition] ?? conditions.default;
    return typeof target === "string" ? target : undefined;
  }
  return undefined;
}

/**
 * Create a regular expression capturing the value of a target's wildcard.
 * @param {string} target
 * @returns {RegExp}
 */
function createWildcardMatcher(target) {
  const wildcardOffset = target.indexOf("*");
  if (wildcardOffset < 0 || target.indexOf("*", wildcardOffset + 1) >= 0) {
    throw new Error(`Expected exactly one wildcard in export target "${target}".`);
  }
  const beforeWildcard = escapeRegularExpression(target.slice(0, wildcardOffset));
  const afterWildcard = escapeRegularExpression(target.slice(wildcardOffset + 1));
  return new RegExp("^" + beforeWildcard + "(.+)" + afterWildcard + "$");
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} packageName
 * @param {string} exportName
 * @returns {string}
 */
function toPackageSpecifier(packageName, exportName) {
  return exportName === "." ? packageName : packageName + exportName.slice(1);
}

/**
 * @param {string} directory
 * @returns {Promise<string[]>}
 */
async function listFilesRecursively(directory) {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const childFiles = await listFilesRecursively(entryPath);
      for (const childFile of childFiles) {
        files.push(path.join(entry.name, childFile));
      }
    } else if (entry.isFile()) {
      files.push(entry.name);
    }
  }
  return files;
}

/**
 * Write ES module and CommonJS TypeScript consumers for every public export.
 * @param {string} consumerDirectory
 * @param {string[]} publicSpecifiers
 * @returns {Promise<void>}
 */
async function writeTypeScriptConsumers(consumerDirectory, publicSpecifiers) {
  const esModuleImports = publicSpecifiers
    .map(
      (specifier, index) =>
        `import * as publicExport${index} from ${JSON.stringify(specifier)};\n` +
        `void publicExport${index};`,
    )
    .join("\n");
  const commonJsImports = publicSpecifiers
    .map(
      (specifier, index) =>
        `import publicExport${index} = require(${JSON.stringify(specifier)});\n` +
        `void publicExport${index};`,
    )
    .join("\n");
  await Promise.all([
    fs.writeFile(path.join(consumerDirectory, "consumer.mts"), esModuleImports + "\n"),
    fs.writeFile(path.join(consumerDirectory, "consumer.cts"), commonJsImports + "\n"),
    fs.writeFile(
      path.join(consumerDirectory, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            exactOptionalPropertyTypes: true,
            lib: ["ES2022", "DOM"],
            module: "NodeNext",
            moduleResolution: "NodeNext",
            noEmit: true,
            skipLibCheck: false,
            strict: true,
            target: "ES2022",
          },
          files: ["consumer.mts", "consumer.cts"],
        },
        null,
        2,
      ) + "\n",
    ),
  ]);
}

/**
 * Create the JavaScript source comparing runtime exports.
 * @param {string[]} publicSpecifiers
 * @returns {string}
 */
function createRuntimeCheckSource(publicSpecifiers) {
  return `import { createRequire } from "node:module";
import { isDeepStrictEqual } from "node:util";

const require = createRequire(import.meta.url);
const publicSpecifiers = ${JSON.stringify(publicSpecifiers, null, 2)};

for (const specifier of publicSpecifiers) {
  const esmExports = await import(specifier);
  const commonJsExports = require(specifier);
  const esmNames = Object.keys(esmExports).sort();
  const commonJsNames = Object.keys(commonJsExports)
    .filter((name) => name !== "__esModule")
    .sort();
  if (!isDeepStrictEqual(esmNames, commonJsNames)) {
    throw new Error(
      specifier + ": ES module exports " + JSON.stringify(esmNames) +
        " differ from CommonJS exports " + JSON.stringify(commonJsNames) + ".",
    );
  }
}
`;
}

/**
 * Reject if the given file does not exist.
 * @param {string} filePath
 * @param {string} errorMessage
 * @returns {Promise<void>}
 */
async function ensureFileExists(filePath, errorMessage) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(errorMessage);
  }
}

/**
 * Run a command and reject if it exits with a non-zero status.
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<void>}
 */
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, { cwd, stdio: "inherit" });
    childProcess.on("error", reject);
    childProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" exited with code ${code}.`));
      }
    });
  });
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let packagePath;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "-p":
      case "--package":
        argOffset++;
        packagePath = args[argOffset];
        if (packagePath === undefined) {
          console.error("ERROR: no package archive provided\n");
          displayHelp();
          process.exit(1);
        }
        break;
      case "--":
        argOffset = args.length;
        break;
      default:
        console.error('ERROR: unknown option: "' + currentArg + '"\n');
        displayHelp();
        process.exit(1);
    }
  }

  checkPackageBuild({ packagePath }).catch((err) => {
    console.error("Fatal error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

/**
 * Display through `console.log` a help message relative to how to run this
 * script.
 */
function displayHelp() {
  console.log(
    `check_package_build.mjs: Check the packaged RxPlayer's ES module and CommonJS exports.

Usage: node check_package_build.mjs [OPTIONS]

The RxPlayer should be built before running this script. By default, the
current project is packed and installed in an isolated temporary project.

Options:
  -h, --help              Display this help.
  -p, --package <path>    Check an existing npm package archive instead of
                          packing the current project.`,
  );
}
