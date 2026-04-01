import { cleanupMediaFiles } from "./utils.mjs";

/** @type {import("child_process").ChildProcess | null} */
export let ffmpegProc = null;

/** @type {import("child_process").ChildProcess | null} */
export let shakaProc = null;

/** @type {import("child_process").ChildProcess[]} */
export const textWriterProcs = [];

let cleanupDone = false;

/** @param {import("child_process").ChildProcess} proc */
export function setFfmpegProc(proc) {
  ffmpegProc = proc;
}

/** @param {import("child_process").ChildProcess} proc */
export function setShakaProc(proc) {
  shakaProc = proc;
}

/** @param {import("child_process").ChildProcess[]} procs */
export function addTextWriterProcs(procs) {
  textWriterProcs.push(...procs);
}

/**
 * Terminate all child processes and remove generated media files.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @param {string} [outputDir]
 */
export function cleanup(outputDir) {
  if (cleanupDone) {
    return;
  }
  cleanupDone = true;

  console.log("Cleaning up processes and files...");

  const namedProcs = [
    ["ffmpeg", ffmpegProc],
    ["shaka-packager", shakaProc],
    ...textWriterProcs.map((p) => ["text-writer", p]),
  ];

  for (const [name, proc] of namedProcs) {
    if (!proc) {
      continue;
    }
    try {
      console.log(`Terminating ${name} (PID: ${proc.pid})...`);
      proc.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }

  if (outputDir) {
    cleanupMediaFiles(outputDir);
  }
}

/**
 * Returns a Promise that resolves when `proc` exits cleanly (after cleanup has
 * already been triggered) and rejects if it exits unexpectedly.
 *
 * @param {string} name         - Human-readable process name for log messages.
 * @param {import("child_process").ChildProcess} proc
 * @param {string} outputDir    - Passed to cleanup() on unexpected exit.
 * @returns {Promise<void>}
 */
export function createChildExitPromise(name, proc, outputDir) {
  return new Promise((resolve, reject) => {
    proc.once("error", (err) => {
      if (!cleanupDone) {
        cleanup(outputDir);
        reject(new Error(`${name} failed to start: ${err.message}`));
      } else {
        resolve();
      }
    });

    proc.once("exit", (code, signal) => {
      if (!cleanupDone) {
        console.log(`${name} exited (code=${code}, signal=${signal})`);
        cleanup(outputDir);
        reject(new Error(`${name} exited unexpectedly (code=${code}, signal=${signal})`));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Register SIGINT / SIGTERM handlers for a given output directory.
 * Must be called once from the entry point after `outputDir` is known.
 *
 * @param {() => string} getOutputDir - Returns the current output directory.
 */
export function registerSignalHandlers(getOutputDir) {
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      cleanup(getOutputDir());
      process.exit(sig === "SIGINT" ? 130 : 143);
    });
  }

  process.on("exit", () => {
    for (const proc of [ffmpegProc, shakaProc, ...textWriterProcs]) {
      if (proc) {
        try {
          proc.kill("SIGKILL");
        } catch {
          /* gone */
        }
      }
    }
  });
}
