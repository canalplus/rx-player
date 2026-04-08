// @ts-check

import { execFileSync, spawnSync } from "child_process";
import { existsSync, renameSync } from "fs";
import { resolve } from "path";
import {
  SHAKA_STARTUP_TIMEOUT_MS,
  SHAKA_STARTUP_POLL_INTERVAL_MS,
} from "./constants.mjs";
import { commandExists } from "./utils.mjs";

/**
 * Resolve the path (or command name) for the shaka-packager binary.
 *
 * Search order:
 *   1. `<tmpDir>/shaka-packager`   (previously downloaded)
 *   2. `shaka-packager` on PATH
 *   3. `packager` on PATH (only if it identifies itself as shaka-packager)
 *   4. Download via `install_shaka_packager.sh` as a last resort
 *
 * @param {string} tmpDir        - Directory where a downloaded binary is cached.
 * @param {string} scriptDir     - Directory that contains install_shaka_packager.sh.
 * @param {boolean} noConfirm    - Skip interactive prompts when downloading.
 * @returns {Promise<string>}    - Resolves with the command / path to use.
 */
export async function resolveShakaBinary(tmpDir, scriptDir, noConfirm) {
  const cachedBinary = normalizeDownloadedShakaBinaryPath(tmpDir);
  if (cachedBinary !== null) {
    return cachedBinary;
  }

  if (commandExists("shaka-packager")) {
    return "shaka-packager";
  }

  if (commandExists("packager") && isShakaPackager("packager")) {
    return "packager";
  }

  // Last resort: download
  if (!(await downloadShaka(tmpDir, scriptDir, noConfirm))) {
    throw new Error("Failed to install shaka-packager");
  }
  const downloadedBinary = normalizeDownloadedShakaBinaryPath(tmpDir);
  if (downloadedBinary === null) {
    throw new Error("Failed to resolve installed shaka-packager binary");
  }
  return downloadedBinary;
}

/**
 * Poll until shaka-packager is listening on every expected UDP port, or reject
 * after SHAKA_STARTUP_TIMEOUT_MS.
 *
 * Falls back to a 3-second sleep when neither `ss` nor `netstat` is available.
 *
 * @param {number[]} portList - Ports to wait for.
 * @returns {Promise<void>}
 */
export async function waitForShakaReady(portList) {
  const uniquePorts = [...new Set(portList)];
  const canPoll = commandExists("ss") || commandExists("netstat");

  if (!canPoll) {
    console.warn(
      "⚠️  Warning: Cannot poll UDP ports (no ss/netstat). Falling back to 3s sleep.",
    );
    await sleep(3000);
    return;
  }

  console.log(
    `Waiting for shaka-packager to bind UDP ports: ${uniquePorts.join(", ")}...`,
  );

  const deadline = Date.now() + SHAKA_STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(SHAKA_STARTUP_POLL_INTERVAL_MS);

    if (allPortsListening(uniquePorts)) {
      console.log("shaka-packager is ready.");
      return;
    }
  }

  throw new Error(
    `Timed out waiting for shaka-packager to bind ports after ${SHAKA_STARTUP_TIMEOUT_MS}ms.`,
  );
}

/** @param {number} ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns true if all `ports` appear in the current UDP listener list.
 * @param {number[]} ports
 * @returns {boolean}
 */
function allPortsListening(ports) {
  let output = "";
  try {
    if (commandExists("ss")) {
      output = execFileSync("ss", ["-uln"], { encoding: "utf8" });
    } else {
      const netstatArgs =
        process.platform === "win32" ? ["-a", "-n", "-p", "UDP"] : ["-uln"];
      output = execFileSync("netstat", netstatArgs, { encoding: "utf8" });
    }
  } catch {
    return false;
  }
  return ports.every(
    (port) => output.includes(`:${port} `) || output.includes(`:${port}\t`),
  );
}

/**
 * Returns true if the `cmd` binary identifies itself as shaka-packager.
 * @param {string} cmd
 * @returns {boolean}
 */
function isShakaPackager(cmd) {
  try {
    const res = spawnSync(cmd, ["--help"], { encoding: "utf8" });
    const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
    return out.includes("shaka-packager");
  } catch {
    return false;
  }
}

/**
 * Try to download shaka-packager via the install script.
 *
 * @param {string}  tmpDir
 * @param {string}  scriptDir
 * @param {boolean} noConfirm
 * @returns {Promise<boolean>} - true if the binary is present afterwards.
 */
async function downloadShaka(tmpDir, scriptDir, noConfirm) {
  console.log("No shaka-packager binary found locally...");

  const installScript = resolve(scriptDir, "install_shaka_packager.sh");
  if (!existsSync(installScript)) {
    throw new Error(
      `install_shaka_packager.sh not found at ${installScript}. Cannot install shaka-packager automatically.`,
    );
  }
  console.log(
    `We will load the shaka-packager binary locally in the "${tmpDir}" directory`,
  );

  const args = noConfirm ? ["--no-confirmation"] : [];
  try {
    execFileSync("bash", [installScript, ...args], { stdio: "inherit" });
  } catch {
    return false;
  }

  if (normalizeDownloadedShakaBinaryPath(tmpDir) === null) {
    console.error("ERROR: shaka-packager binary was not successfully installed\n");
    return false;
  }

  return true;
}

/**
 * @param {string} tmpDir
 * @returns {string | null}
 */
function normalizeDownloadedShakaBinaryPath(tmpDir) {
  const binary = resolve(tmpDir, "shaka-packager");
  const binaryExe = resolve(tmpDir, "shaka-packager.exe");
  if (existsSync(binaryExe)) {
    return binaryExe;
  }
  if (!existsSync(binary)) {
    return null;
  }
  if (process.platform !== "win32") {
    return binary;
  }
  renameSync(binary, binaryExe);
  return binaryExe;
}
