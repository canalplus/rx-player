#!/usr/bin/env node

/**
 * # generate_build.mjs
 *
 * This file allows to produce the main RxPlayer's builds.
 *
 * To run it, just call this file through your node.js binary:
 * ```sh
 * node generate_build.mjs
 * ```
 *
 * You can provide an `-h` / `--help` flags to see the different options
 * you can provide.
 */

// @ts-check

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import esbuild from "esbuild";
import generateEmbeds from "./generate_embeds.mjs";
import runBundler from "./run_bundler.mjs";
import removeDir from "./utils/remove_dir.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = path.join(currentDirectory, "..");
const BUILD_ARTEFACTS_TO_REMOVE = [
  "dist/commonjs",
  "dist/es2017",
  "src/__GENERATED_CODE",
];

const WORKER_IN_FILE = path.join(ROOT_DIR, "src/worker_entry_point.ts");
const WORKER_OUT_FILE = path.join(ROOT_DIR, "dist/worker.js");

/**
 * @param {Object} [options]
 * @param {boolean|undefined} [options.devMode]
 * @param {boolean|undefined} [options.noCheck]
 * @param {boolean|undefined} [options.noWasm]
 * @returns {Promise.<void>}
 */
export default async function generateBuild(options = {}) {
  try {
    const devMode = options.devMode === true;
    const noCheck = options.noCheck === true;
    const noWasm = options.noWasm === true;
    console.log(" 🧹 Removing previous build artefacts...");
    await removePreviousBuildArtefacts();

    const distDir = path.join(ROOT_DIR, "dist");
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir);
    }

    if (!noWasm) {
      const dashWasmDir = path.join(distDir, "mpd-parser.wasm");
      if (!fs.existsSync(dashWasmDir)) {
        console.log(" 🏭 Generating WebAssembly file...");
        await spawnShellProm(
          "npm run --silent " + (devMode ? "build:wasm:debug" : "build:wasm:release"),
          /** @param {number|null} code */
          (code) => new Error(`WebAssembly compilation process exited with code ${code}`),
        );
      } else {
        console.log(
          " 🏭 Reusing already-generated WebAssembly file (please re-compile it if source changed).",
        );
      }
    }

    console.log(" 👷 Bundling worker files...");
    await Promise.all([
      runBundler(WORKER_IN_FILE, {
        watch: false,
        minify: !devMode,
        outfile: WORKER_OUT_FILE,
        production: !devMode,
        silent: true,
      }),
    ]);

    console.log(" 🤖 Generating embedded code...");
    await generateEmbeds({ noWasm });

    console.log(" ⚙️ Building project...");
    await compile({ devMode, noCheck });
  } catch (err) {
    console.error("Fatal error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(" 🙌 SUCCESS!");
}

/**
 * Remove directories and files from a previously built RxPlayer.
 * @returns {Promise.<void>}
 */
async function removePreviousBuildArtefacts() {
  await Promise.all(
    BUILD_ARTEFACTS_TO_REMOVE.map((name) => {
      const relativePath = path.join(ROOT_DIR, name);
      return removeDir(relativePath);
    }),
  );
}

/**
 * Compile the project using esbuild for transpilation.
 * @param {Object} opts
 * @param {boolean} opts.devMode
 * @param {boolean} opts.noCheck
 * @returns {Promise.<void>}
 */
async function compile(opts) {
  const srcDir = path.join(ROOT_DIR, "src");
  const entryPoints = await getTypeScriptFiles(srcDir);
  const isDevMode = opts.devMode;

  console.log(" 📝 Generating declaration files...");
  const declarationBuild = spawnShellProm(
    "npx tsc --emitDeclarationOnly -p " +
      path.join(ROOT_DIR, opts.devMode ? "tsconfig.dev.json" : "tsconfig.json") +
      (opts.noCheck ? " --noCheck" : ""),
    /** @param {number|null} code */
    (code) => new Error(`Declaration generation failed with code ${code}`),
  );

  const es2017Build = esbuild.build({
    entryPoints,
    outdir: path.join(ROOT_DIR, "dist/es2017"),
    format: "esm",
    target: "es2017",
    platform: "browser",
    minify: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __ENVIRONMENT__: JSON.stringify({
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      }),
      __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: isDevMode ? "INFO" : "NONE" }),
      __GLOBAL_SCOPE__: "false",
    },
  });

  const commonJsBuild = esbuild.build({
    entryPoints,
    outdir: path.join(ROOT_DIR, "dist/commonjs"),
    format: "cjs",
    target: "es2015",
    platform: "browser",
    minify: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify(isDevMode ? "development" : "production"),
      __ENVIRONMENT__: JSON.stringify({
        PRODUCTION: 0,
        DEV: 1,
        CURRENT_ENV: isDevMode ? 1 : 0,
      }),
      __LOGGER_LEVEL__: JSON.stringify({ CURRENT_LEVEL: isDevMode ? "INFO" : "NONE" }),
      __GLOBAL_SCOPE__: "false",
    },
  });

  await Promise.all([declarationBuild, es2017Build, commonJsBuild]);

  console.log(" 🔄 Transpiling CommonJS files from es2015 to ES5...");
  await spawnShellProm(
    "npx swc dist/commonjs -d dist/commonjs --config-file " +
      path.join(ROOT_DIR, ".swcrc") +
      " --quiet",
    /** @param {number|null} code */
    (code) => new Error(`swc transpilation failed with code ${code}`),
  );
}

/**
 * Recursively get all TypeScript files from a directory.
 * @param {string} dir
 * @returns {Promise.<string[]>}
 */
async function getTypeScriptFiles(dir) {
  const items = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  await Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && item.name !== "__tests__") {
        files.push(...(await getTypeScriptFiles(fullPath)));
      } else if (
        item.isFile() &&
        item.name.endsWith(".ts") &&
        !item.name.endsWith(".test.ts")
      ) {
        files.push(fullPath);
      }
    }),
  );
  return files;
}

/**
 * Spawn a shell with the command given in argument, alongside that command's
 * arguments.
 * Return a Promise that resolves if the command exited with the exit code `0`
 * or rejects if the exit code is not zero.
 * @param {string} command
 * @param {Function} errorOnCode - Callback which will be called if the command
 * has an exit code different than `0`, with the exit code in argument. The
 * value returned by that callback will be the value rejected by the Promise.
 * @returns {Promise.<void>}
 */
function spawnShellProm(command, errorOnCode) {
  return new Promise((res, rej) => {
    const childProcess = spawn(command, { shell: true, stdio: "inherit" });
    childProcess.on("close", (code) => {
      if (code !== 0) {
        rej(errorOnCode(code));
      } else {
        res();
      }
    });
  });
}

// If true, this script is called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let devMode = false;
  let noCheck = false;
  let noWasm = false;
  for (let argOffset = 0; argOffset < args.length; argOffset++) {
    const currentArg = args[argOffset];
    switch (currentArg) {
      case "-h":
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      case "-d":
      case "--dev-mode":
        devMode = true;
        break;
      case "-n":
      case "--no-typecheck":
        noCheck = true;
        break;
      case "--no-wasm":
        noWasm = true;
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
    generateBuild({
      devMode,
      noCheck,
      noWasm,
    }).catch((err) => {
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
    `generate_build.mjs: Produce the main RxPlayer's builds (do not produce RxPlayer bundles).

Usage: node generate_build.mjs [OPTIONS]

Options:
  -h, --help             Display this help
  -d, --dev-mode         Build all files in development mode (more runtime checks, worker not minified)
  -n, --no-typecheck     Skip type checking for inputed files.
  --no-wasm              Skip WebAssembly file generation (avoid Rust toolchain installation).
                         WARNING: With this option, related JS exports will not be available.`,
  );
}
