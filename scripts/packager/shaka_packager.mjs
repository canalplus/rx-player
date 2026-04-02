// @ts-check

import { execSync } from "child_process";
import { existsSync } from "fs";
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
  const inTmp = resolve(tmpDir, "shaka-packager");
  if (existsSync(inTmp)) {
    return inTmp;
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
  return inTmp;
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
      output = execSync("ss -uln 2>/dev/null", { encoding: "utf8" });
    } else {
      output = execSync("netstat -uln 2>/dev/null", { encoding: "utf8" });
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
    const out = execSync(`${cmd} --help 2>/dev/null | head -1`, { encoding: "utf8" });
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
    execSync([installScript, ...args].join(" "), { stdio: "inherit" });
  } catch {
    return false;
  }

  const binary = resolve(tmpDir, "shaka-packager");
  if (!existsSync(binary)) {
    console.error("ERROR: shaka-packager binary was not successfully installed\n");
    return false;
  }

  return true;
}
