#!/usr/bin/env node

import { spawn, execSync } from "child_process";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import removeDir from "./remove_dir.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(currentDirectory, "..");

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build();
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.cleanAfterBuild]
 * @param {boolean} [options.verbose]
 * @returns {Promise}
 */
export async function build(options = {}) {
  console.log(` 🚚 Installing JS development dependencies...`);
  try {
    await npmInstall({ verbose: options.verbose === true });
    console.log(" 🚧 Dependencies installed. Now switching to building the RxPlayer...");

    // Note we dynamically export only know because we required some dependencies
    // that are only now imported. This is hacky... but it works!
    const { default: generateBuilds } = await import(
      path.join(currentDirectory, "generate_build.mjs")
    );
    await generateBuilds({ devMode: false });
    if (options.cleanAfterBuild) {
      cleanAfterBuild();
    }
  } catch (err) {
    if (options.cleanAfterBuild) {
      try {
        cleanAfterBuild();
      } catch (_e) {}
    }
    console.error(err instanceof Error ? err.toString() : "Unknown Error");
    process.exit(1);
  }
}

async function cleanAfterBuild() {
  console.log(" 🧼 Cleaning build dependencies...");
  await Promise.all([
    removeDir(path.join(ROOT_DIR, "node_modules")),
    removeDir(path.join(ROOT_DIR, "tmp")),
  ]);
  console.log(" ✅ Cleaned");
}

/**
 * @param {Object} options
 * @param {boolean} options.verbose
 * @returns {Promise}
 */
function npmInstall({ verbose }) {
  return new Promise((res, rej) => {
    const npmExecutable = getRightNpmExecutablePath();
    process.chdir(ROOT_DIR);
    if (verbose) {
      console.info(
        `Calling "${npmExecutable} install"`,
        `from the "${ROOT_DIR}" directory`,
      );
    }
    spawn(npmExecutable, ["ci", "--silent"], {
      shell: true,
      stdio: "inherit",
    }).on("close", (code) => {
      if (code !== 0) {
        rej(new Error(`Dependency installation process exited with code ${code}`));
      }
      res();
    });
  });
}

/**
 * Returns name of the executable to run `npm` on a shell.
 *
 * When running from an npm script context (e.g. a `postinstall` script),
 * node might rely on the corresponding package's node_modules/npm directory
 * first before the PATH when calling the `npm` executable.
 *
 * Due to how the JS ecosystem is, those are often subdependencies and are
 * very often much less up-to-date that a local `npm`, which - if the user
 * has node.js installed on his / her / its (e.g. CI) computer, is probably
 * already there too.
 *
 * Yet we've seen issues with old (2017?) npm versions where installing our
 * dependencies would randomly break (maybe due to one of our dependencies'
 * `postinstall` script? I didn't dive into it yet), so if we are left
 * with an old npm executable here, we check if we're in the `node_modules`
 * situation by checking things with `whereis` + `command -v` (which we guess
 * the user also generally have - unless they rely on more exotic OSs and
 * they should generally know what to do to debug things here, or they
 * rely on Windows without WSL and, well, those people are already
 * masochistic to begin with, so added pain for them is fine).
 *
 * If something doesn't work here, we just throw and abort the operation.
 * @returns {string}
 */
function getRightNpmExecutablePath() {
  let npmExecutable = "npm";
  const npmVersion = String(execSync(npmExecutable + " -v"));
  const majorVersion = parseInt(npmVersion.split(".")[0], 10);
  if (!isNaN(majorVersion) && majorVersion < 6) {
    // Older versions of `npm` seem to break (seen on npm 5, but we'll also
    // consider 6 here as a security
    const whichNpm = String(execSync("command -v npm")).trim();
    let npmLocations = String(execSync("whereis npm"))
      .split(" ")
      // Maybe not needed, but better safe than sorry
      .filter((s) => s.trim().length > 0);

    if (npmLocations[0] === "npm:") {
      npmLocations = npmLocations.slice(1);
    }
    if (
      whichNpm.indexOf("node_modules") >= 0 &&
      ((npmLocations.includes(whichNpm) && npmLocations.length > 1) ||
        npmLocations.length >= 1)
    ) {
      if (npmLocations[0] === whichNpm) {
        npmExecutable = npmLocations[1].trim();
      } else {
        npmExecutable = npmLocations[0].trim();
      }
      console.warn(
        `The "npm" command seems to call a local package ("${whichNpm}").` +
          ` Relying on "${npmExecutable}" instead`,
      );
    }
  }
  return npmExecutable;
}
