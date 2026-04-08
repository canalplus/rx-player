// @ts-check

import { execSync } from "child_process";
import { commandExists } from "./utils.mjs";

const PORT_OFFSETS = {
  p720: 0,
  p480: 1,
  p360: 2,
  audio1: 3,
  audio2: 4,
  audio3: 5,
  text1: 6,
};

/**
 * Build the port map used throughout the pipeline.
 *
 * @param {number} basePort
 * @returns {{ base: number, p720: number, p480: number, p360: number,
 *             audio1: number, audio2: number, audio3: number,
 *             text1: number }}
 */
export function buildPortMap(basePort) {
  return {
    base: basePort,
    p720: basePort + PORT_OFFSETS.p720,
    p480: basePort + PORT_OFFSETS.p480,
    p360: basePort + PORT_OFFSETS.p360,
    audio1: basePort + PORT_OFFSETS.audio1,
    audio2: basePort + PORT_OFFSETS.audio2,
    audio3: basePort + PORT_OFFSETS.audio3,
    text1: basePort + PORT_OFFSETS.text1,
  };
}

/**
 * @returns {number}
 */
export function getMaxNbPortsUsed() {
  return Math.max(...Object.values(PORT_OFFSETS)) + 1;
}

/**
 * @param {ReturnType<typeof buildPortMap>} ports
 * @param {boolean} hasTextTrack
 * @returns {number}
 */
export function getLastUsedPort(ports, hasTextTrack) {
  return hasTextTrack ? ports.text1 : ports.audio3;
}

/**
 * Validate that the port range is within 1–65535, and warn about ports that
 * already appear to be in use.
 *
 * @param {number} basePort
 * @returns {{ ok: boolean, conflictDetected: boolean }}
 */
export function checkPortRange(basePort) {
  const endPort = basePort + getMaxNbPortsUsed() - 1;

  if (endPort > 65535) {
    return { ok: false, conflictDetected: false };
  }

  const checkers = ["netstat", "ss", "lsof", "nc"];
  const hasChecker = checkers.some(commandExists);

  if (!hasChecker) {
    console.warn(
      `⚠️  Warning: Cannot check if ports ${basePort}-${endPort} are in use (no suitable tool found)\n`,
    );
    return { ok: true, conflictDetected: false };
  }

  let conflictDetected = false;

  for (let port = basePort; port <= endPort; port++) {
    if (isUdpPortInUse(port)) {
      conflictDetected = true;
      console.warn(`⚠️  Warning: UDP port ${port} appears to be in use\n`);
    }
  }

  return { ok: true, conflictDetected };
}

/**
 * Check a single UDP port for existing listeners using whatever system tool is
 * available.
 *
 * @param {number} port
 * @returns {boolean}
 */
function isUdpPortInUse(port) {
  try {
    if (commandExists("ss")) {
      const out = execSync("ss -uln 2>/dev/null", { encoding: "utf8" });
      return out.includes(`:${port} `) || out.includes(`:${port}\t`);
    }

    if (commandExists("netstat")) {
      const out = execSync("netstat -uln 2>/dev/null", { encoding: "utf8" });
      return out.includes(`:${port} `) || out.includes(`:${port}\t`);
    }

    if (commandExists("lsof")) {
      try {
        execSync(`lsof -i UDP:${port}`, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }

    if (commandExists("nc")) {
      try {
        execSync(`timeout 1 nc -zu 127.0.0.1 ${port}`, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    /* ignore errors from the checkers themselves */
  }

  return false;
}
