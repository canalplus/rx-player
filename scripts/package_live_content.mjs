#!/usr/bin/env node

/**
 * package_live_content.mjs
 * ------------------------
 *
 * Creates and packages live DASH content from scratch by relying on
 * `ffmpeg` (which must be installed locally) and the shaka-packager
 * (which will be downloaded if not found locally in a directory called `tmp`).
 *
 * Usage: node package_live_content.mjs [OPTIONS]
 *
 * Run with --help to see all available options.
 */

import { spawn, execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const MAX_NB_PORTS_USED = 7;
const DEFAULT_KID = "0123456789abcdef0123456789abcdef";
const DEFAULT_KEY = "fedcba9876543210fedcba9876543210";
const DEFAULT_SEGMENT_DURATION = 3;
const DEFAULT_FRAME_RATE = 30;
const DEFAULT_TIMESHIFT_BUFFER_DEPTH = 180;
const DEFAULT_BASE_PORT = 8881;
const TEXT_TRACK_LANGUAGE = "en";
const TEXT_TRACK_LABEL = "generated-live-subtitles";
const TEXT_TRACK_SEGMENT_PREFIX = "text_en";
const TEXT_TRACK_CUE_SPACING = 4;
const TEXT_TRACK_CUE_DURATION = 2;
const TEXT_TRACK_INITIAL_AHEAD_DURATION = 4;

// Timeout (ms) waiting for shaka-packager to start listening on UDP ports.
const SHAKA_STARTUP_TIMEOUT_MS = 15000;
const SHAKA_STARTUP_POLL_INTERVAL_MS = 300;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

// File patterns (as regex) for artefacts produced by this script
const ARTIFACT_PATTERNS = [
  /^manifest\.mpd$/,
  /^.+_init\.mp4$/,
  /^.+_\d+\.m4s$/,
  /^.+_\d+\.mp4$/,
  /^source_subtitles\.(vtt|ttml)$/,
  /^live_subtitles\.vtt$/,
];

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TMP_DIR = resolve(SCRIPT_DIR, "..", "tmp");

const DEFAULT_CONFIG = {
  segmentDuration: DEFAULT_SEGMENT_DURATION,
  fragmentDuration: DEFAULT_SEGMENT_DURATION,
  frameRate: DEFAULT_FRAME_RATE,
  timeshiftBufferDepth: DEFAULT_TIMESHIFT_BUFFER_DEPTH,
  basePort: DEFAULT_BASE_PORT,
  noConfirm: false,
  shakaPath: "",
  outputDir: "",
  keyId: "",
  key: "",
  hasTextTrack: false,
};

// Module-level process handles and state — kept here so signal handlers and
// cleanup() can always reach them regardless of call site.
let ffmpegProc = null;
let shakaProc = null;
const textWriterProcs = [];
let cleanupDone = false;

/**
 * @param {Object} config
 * @param {string} [config.keyId] - Only needed for encrypted content. Need to
 * be the 32 chars hexadecimal string representing the wanted keyid.
 * @param {string} [config.key] - Only needed for encrypted content. Need to
 * be the 32 chars hexadecimal string representing the wanted key.
 * @param {number} config.basePort - The starting port that will be used to
 * generate the content (multiple ports are used internally).
 * @param {string} config.outputDir - The directory where the packaged live
 * content will be created.
 * @param {boolean} config.noConfirm - If set to `true`, this script won't ask
 * for user confirmation (which necessitate access to stdin).
 * @param {number} config.segmentDuration - Mirrors the shaka-packager's
 * "segment duration" concept.
 * @param {number} config.fragmentDuration - Mirrors the shaka-packager's
 * "fragment duration" concept.
 * @param {number} config.frameRate - Frame-rate, in frames per second, that the
 * video media encoded here will rely on.
 * @param {number} config.timeshiftBufferDepth - Depth of the media data stored
 * server-side, in seconds. See DASH concept with the same name.
 * @param {string} config.shakaPath - Path to your shaka-packager executable.
 * Will auto-detect if not set.
 * @returns {Promise} - Resolve once the packaging task is finished. Rejects if
 * it failed.
 */
async function packageLiveContent(config) {
  if (config.keyId) {
    config.keyId = config.keyId.toLowerCase();
    if (!isValidHexKey(config.keyId)) {
      throw new Error("KEY_ID must be a 32-character hexadecimal string.");
    }
  }
  if (config.key) {
    config.key = config.key.toLowerCase();
    if (!isValidHexKey(config.key)) {
      throw new Error("KEY must be a 32-character hexadecimal string.");
    }
  }
  const { ok: portRangeOk, conflictDetected: portConflictDetected } = checkPortRange(
    config.basePort,
  );
  if (!portRangeOk) {
    throw new Error(
      `Port range starting from ${config.basePort} would exceed valid port range (1-65535).`,
    );
  }

  // Ensure output directory exists
  try {
    mkdirSync(config.outputDir, { recursive: true });
  } catch {
    throw new Error(`Failed to create output directory: ${config.outputDir}`);
  }
  config.outputDir = resolve(config.outputDir);

  await checkIfOutputContainsMediaFiles(config.outputDir, config.noConfirm);

  if (!commandExists("ffmpeg")) {
    throw new Error(
      '"ffmpeg" needs to be installed and available in your PATH to run this script',
    );
  }

  const shakaCmd = config.shakaPath || (await resolveShakaBinary(config.noConfirm));

  const ports = {
    base: config.basePort,
    // video streams
    p720: config.basePort,
    p480: config.basePort + 1,
    p360: config.basePort + 2,
    // audio streams: eng=+3, fra=+4, arm=+5 (arm is `last`, i.e. basePort + MAX_NB_PORTS_USED - 1)
    audio1: config.basePort + 3,
    audio2: config.basePort + 4,
    audio3: config.basePort + 5,
    text: config.basePort + 6,
  };

  await showConfigAndConfirm(config, shakaCmd, ports, portConflictDetected);

  console.log("Starting...");
  console.log("Cleaning up any existing media files before starting...");
  cleanupMediaFiles(config.outputDir);

  try {
    mkdirSync(config.outputDir, { recursive: true });
  } catch {
    throw new Error(`Failed to create output directory: ${config.outputDir}`);
  }

  const gop = config.frameRate * config.segmentDuration;
  const out = config.outputDir;
  const textTrackAssets = config.hasTextTrack ? createTextTrackAssets(ports) : [];

  const shakaArgs = [
    `in=udp://127.0.0.1:${ports.p720},stream=video,init_segment=${out}/h264_720p_init.mp4,segment_template=${out}/h264_720p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.p480},stream=video,init_segment=${out}/h264_480p_init.mp4,segment_template=${out}/h264_480p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.p360},stream=video,init_segment=${out}/h264_360p_init.mp4,segment_template=${out}/h264_360p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio1},stream=audio,init_segment=${out}/audio_eng_init.mp4,segment_template=${out}/audio_eng_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio2},stream=audio,init_segment=${out}/audio_fra_init.mp4,segment_template=${out}/audio_fra_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio3},stream=audio,init_segment=${out}/audio_arm_init.mp4,segment_template=${out}/audio_arm_$Number$.m4s`,
    "--time_shift_buffer_depth",
    String(config.timeshiftBufferDepth),
    "--minimum_update_period",
    String(config.segmentDuration),
    "--segment_duration",
    String(config.segmentDuration),
    "--fragment_duration",
    String(config.fragmentDuration),
    "--mpd_output",
    `${out}/manifest.mpd`,
  ];

  if (textTrackAssets.length > 0) {
    for (const textTrackAsset of textTrackAssets.reverse()) {
      shakaArgs.unshift(
        `in=${textTrackAsset.sourcePath},stream=text,input_format=${textTrackAsset.inputFormat},language=${TEXT_TRACK_LANGUAGE},init_segment=${out}/${textTrackAsset.segmentPrefix}_init.mp4,segment_template=${out}/${textTrackAsset.segmentPrefix}_$Number$.m4s`,
      );
    }
  }

  if (config.keyId) {
    shakaArgs.push(
      "--keys",
      `label=:key_id=${config.keyId}:key=${config.key}`,
      "--clear_lead",
      "0",
      "--protection_scheme",
      "cenc",
    );
  }

  if (textTrackAssets.length > 0) {
    startLiveTextTrackWriters(textTrackAssets, config.segmentDuration);
  }
  console.log(`Starting shaka-packager with command: ${shakaCmd}`);
  shakaProc = spawn(shakaCmd, shakaArgs, { stdio: "inherit" });
  console.log(`shaka-packager started with PID: ${shakaProc.pid}`);
  const shakaExited = createChildExitPromise("shaka-packager", shakaProc, out);

  try {
    await waitForShakaReady([
      ports.p720,
      ports.p480,
      ports.p360,
      ports.audio1,
      ports.audio2,
      ports.audio3,
      ...(config.hasTextTrack ? [ports.text] : []),
    ]);
    if (textTrackAssets.length > 0) {
      await waitForTextTracksReady(out, textTrackAssets);
    }
  } catch (err) {
    cleanup(out);
    throw err;
  }

  const v720 = ["-f", "lavfi", "-i", `testsrc2=size=1280x720:rate=${config.frameRate}`];
  const v480 = ["-f", "lavfi", "-i", `testsrc2=size=854x480:rate=${config.frameRate}`];
  const v360 = ["-f", "lavfi", "-i", `testsrc2=size=640x360:rate=${config.frameRate}`];
  const a1 = ["-f", "lavfi", "-i", "sine=frequency=261.63:sample_rate=48000"];
  const a2 = ["-f", "lavfi", "-i", "sine=frequency=293.66:sample_rate=48000"];
  const a3 = ["-f", "lavfi", "-i", "sine=frequency=329.63:sample_rate=48000"];
  const ffmpegArgs = [
    "-re",
    ...v720,
    ...v480,
    ...v360,
    ...a1,
    ...a2,
    ...a3,

    // 720p video
    "-map",
    "0:v",
    "-c:v",
    "libx264",
    "-preset",
    "superfast",
    "-b:v",
    "2500k",
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-r",
    String(config.frameRate),
    "-s",
    "1280x720",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.p720}`,

    // 480p video
    "-map",
    "1:v",
    "-c:v",
    "libx264",
    "-preset",
    "superfast",
    "-b:v",
    "1200k",
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-r",
    String(config.frameRate),
    "-s",
    "854x480",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.p480}`,

    // 360p video
    "-map",
    "2:v",
    "-c:v",
    "libx264",
    "-preset",
    "superfast",
    "-b:v",
    "600k",
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-r",
    String(config.frameRate),
    "-s",
    "640x360",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.p360}`,

    // English audio
    "-map",
    "3:a",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-metadata:s:a",
    "language=eng",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.audio1}`,

    // French audio
    "-map",
    "4:a",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-metadata:s:a",
    "language=fre",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.audio2}`,

    // Armenian audio
    "-map",
    "5:a",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-metadata:s:a",
    "language=arm",
    "-f",
    "mpegts",
    `udp://127.0.0.1:${ports.audio3}`,
  ];

  ffmpegProc = spawn("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  console.log(`ffmpeg started with PID: ${ffmpegProc.pid}`);
  const ffmpegExited = createChildExitPromise("ffmpeg", ffmpegProc, out);

  // Wait for both child processes to finish (runs until interrupted or one crashes).
  await Promise.race([ffmpegExited, shakaExited]);
}

/**
 * Poll until shaka-packager is listening on all expected UDP ports,
 * or reject after SHAKA_STARTUP_TIMEOUT_MS.
 *
 * We check via `ss -uln` (preferred) or `netstat -uln` for UDP listeners.
 * Falls back to the original 3-second sleep if neither tool is available.
 *
 * @param {number[]} portList - Unique port numbers to wait for.
 * @returns {Promise}
 */
async function waitForShakaReady(portList) {
  const uniquePorts = [...new Set(portList)];

  const canPoll = commandExists("ss") || commandExists("netstat");
  if (!canPoll) {
    console.warn(
      "⚠️  Warning: Cannot poll UDP ports (no ss/netstat). Falling back to 3s sleep.",
    );
    await new Promise((r) => setTimeout(r, 3000));
    return;
  }

  console.log(
    `Waiting for shaka-packager to bind UDP ports: ${uniquePorts.join(", ")}...`,
  );

  const deadline = Date.now() + SHAKA_STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, SHAKA_STARTUP_POLL_INTERVAL_MS));

    let output = "";
    try {
      if (commandExists("ss")) {
        output = execSync("ss -uln 2>/dev/null", { encoding: "utf8" });
      } else {
        output = execSync("netstat -uln 2>/dev/null", { encoding: "utf8" });
      }
    } catch {
      continue;
    }

    const allListening = uniquePorts.every(
      (port) => output.includes(`:${port} `) || output.includes(`:${port}\t`),
    );
    if (allListening) {
      console.log("shaka-packager is ready.");
      return;
    }
  }

  throw new Error(
    `Timed out waiting for shaka-packager to bind ports after ${SHAKA_STARTUP_TIMEOUT_MS}ms.`,
  );
}

async function waitForTextTracksReady(outputDir, textTrackAssets) {
  const deadline = Date.now() + SHAKA_STARTUP_TIMEOUT_MS;
  const expectedFiles = textTrackAssets.map((asset) =>
    resolve(outputDir, `${asset.segmentPrefix}_init.mp4`),
  );

  while (Date.now() < deadline) {
    if (expectedFiles.every((filePath) => existsSync(filePath))) {
      return;
    }
    await new Promise((r) => setTimeout(r, SHAKA_STARTUP_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for text track initialization segments: ${expectedFiles.join(", ")}`,
  );
}

function createTextTrackAssets(ports) {
  const sourcePath = `udp://127.0.0.1:${ports.text}`;
  return [
    {
      sourcePath,
      segmentPrefix: TEXT_TRACK_SEGMENT_PREFIX,
      inputFormat: "webvtt",
      liveWriterMode: "webvtt",
      port: ports.text,
    },
  ];
}

function startLiveTextTrackWriters(textTrackAssets, segmentDuration) {
  for (const textTrackAsset of textTrackAssets) {
    if (textTrackAsset.liveWriterMode === "webvtt") {
      textWriterProcs.push(
        spawn(
          process.execPath,
          [
            "-e",
            getLiveWebVttWriterScript(
              textTrackAsset.port,
              segmentDuration,
              TEXT_TRACK_CUE_SPACING,
              TEXT_TRACK_CUE_DURATION,
            ),
          ],
          { stdio: "inherit" },
        ),
      );
    }
  }
}

function getLiveWebVttWriterScript(port, segmentDuration, cueSpacing, cueDuration) {
  return `
const dgram = require("dgram");
const socket = dgram.createSocket("udp4");
const PORT = ${port};
const HOST = "127.0.0.1";

let cueIndex = 0;
let nextCueStart = 0;

function formatTimestamp(totalSeconds) {
  const totalMs = Math.round(totalSeconds * 1000);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000) % 60;
  const h = Math.floor(totalMs / 3600000);
  return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")+"."+String(ms).padStart(3,"0");
}

function sendCue() {
  const cueEnd = nextCueStart + Math.min(${cueDuration}, ${segmentDuration});
  const cue = formatTimestamp(nextCueStart) + " --> " + formatTimestamp(cueEnd) + "\\n" +
    ${JSON.stringify(TEXT_TRACK_LABEL)} + " live cue " + cueIndex + "\\n\\n";
  const buf = Buffer.from(cue, "utf8");
  socket.send(buf, 0, buf.length, PORT, HOST);
  cueIndex++;
  nextCueStart += ${cueSpacing};
}

// Send header first
const header = Buffer.from("WEBVTT\\n\\n", "utf8");
socket.send(header, 0, header.length, PORT, HOST);

// Send initial ahead buffer
while (nextCueStart < ${TEXT_TRACK_INITIAL_AHEAD_DURATION}) {
  sendCue();
}

// Keep sending one cue every cueSpacing seconds
const intervalId = setInterval(sendCue, ${cueSpacing * 1000});

function stop() {
  clearInterval(intervalId);
  socket.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
socket.on("error", (err) => {
  console.error("Live WebVTT UDP writer error:", err);
  process.exit(1);
});
`;
}

/**
 * Strip trailing slashes (unless root) and resolve to absolute.
 * @param {string} p - The initial path
 * @returns {string} - The "sanitized" path.
 */
function sanitizeDirPath(p) {
  const cleaned = p.replace(/\/+$/, "") || "/";
  return resolve(cleaned);
}

/**
 * Check that the given command is accessible in PATH.
 * @returns {Boolean} - `true` if accessible in path.
 */
function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {number} basePort
 * @returns {{ ok: boolean, conflictDetected: boolean }}
 */
function checkPortRange(basePort) {
  const endPort = basePort + MAX_NB_PORTS_USED - 1;

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
    let inUse = false;
    try {
      if (commandExists("ss")) {
        const out = execSync("ss -uln 2>/dev/null", { encoding: "utf8" });
        inUse = out.includes(`:${port} `) || out.includes(`:${port}\t`);
      } else if (commandExists("netstat")) {
        const out = execSync("netstat -uln 2>/dev/null", { encoding: "utf8" });
        inUse = out.includes(`:${port} `) || out.includes(`:${port}\t`);
      } else if (commandExists("lsof")) {
        try {
          // -i UDP restricts to UDP sockets
          execSync(`lsof -i UDP:${port}`, { stdio: "ignore" });
          inUse = true;
        } catch {
          /* not in use */
        }
      } else if (commandExists("nc")) {
        try {
          // -u = UDP
          execSync(`timeout 1 nc -zu 127.0.0.1 ${port}`, { stdio: "ignore" });
          inUse = true;
        } catch {
          /* not in use */
        }
      }
    } catch {
      /* ignore errors from the checkers themselves */
    }

    if (inUse) {
      conflictDetected = true;
      console.warn(`⚠️  Warning: UDP port ${port} appears to be in use\n`);
    }
  }

  return { ok: true, conflictDetected };
}

function isArtifact(filename) {
  return ARTIFACT_PATTERNS.some((re) => re.test(filename));
}

function outputDirHasMediaFiles(outputDir) {
  if (!existsSync(outputDir)) {
    return false;
  }
  try {
    return readdirSync(outputDir).some(isArtifact);
  } catch {
    return false;
  }
}

function cleanupMediaFiles(outputDir) {
  console.log(`Cleaning up media files from: ${outputDir}`);
  try {
    for (const file of readdirSync(outputDir)) {
      if (isArtifact(file)) {
        unlinkSync(resolve(outputDir, file));
      }
    }
  } catch (err) {
    // Best-effort; don't crash on cleanup errors
    console.warn(`Warning: error during media cleanup: ${err.message}\n`);
  }
  console.log("Media files cleanup completed.");
}

async function checkIfOutputContainsMediaFiles(outputDir, noConfirm) {
  if (!outputDirHasMediaFiles(outputDir)) {
    return;
  }

  console.log("⚠️  WARNING: Output directory contains existing media files!");
  console.log(`   Directory: ${outputDir}`);
  console.log("   These files will be removed before starting.");
  console.log();

  if (!noConfirm) {
    if (!(await askConfirmation("Continue and remove existing files?"))) {
      throw new Error("Cancelled by user.");
    }
    console.log();
  }
}

async function onNoPackagerFound(noConfirm) {
  console.log("No shaka-packager binary found locally...");

  const installScript = resolve(SCRIPT_DIR, "install_shaka_packager.sh");
  if (!existsSync(installScript)) {
    throw new Error(
      `install_shaka_packager.sh not found at ${installScript}. Cannot install shaka-packager automatically.`,
    );
  }

  console.log(
    `We will load the shaka-packager binary locally in the "${TMP_DIR}" directory`,
  );

  const args = noConfirm ? ["--no-confirmation"] : [];
  try {
    execSync([installScript, ...args].join(" "), { stdio: "inherit" });
  } catch {
    return false;
  }

  const binary = resolve(TMP_DIR, "shaka-packager");
  if (!existsSync(binary)) {
    console.error("ERROR: shaka-packager binary was not successfully installed\n");
    return false;
  }

  return true;
}

async function resolveShakaBinary(noConfirm) {
  const inTmp = resolve(TMP_DIR, "shaka-packager");
  if (existsSync(inTmp)) {
    return inTmp;
  }

  if (commandExists("shaka-packager")) {
    return "shaka-packager";
  }

  if (commandExists("packager")) {
    // Verify it is actually shaka-packager
    try {
      const out = execSync("packager --help 2>/dev/null | head -1", { encoding: "utf8" });
      if (out.includes("shaka-packager")) {
        return "packager";
      }
    } catch {
      /* fall through */
    }
  }

  // Last resort: download
  if (!(await onNoPackagerFound(noConfirm))) {
    throw new Error("Failed to install shaka-packager");
  }
  return inTmp;
}

function askConfirmation(text) {
  return new Promise((res) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      throw new Error(
        "Confirmation requires an interactive terminal. Use --no-confirmation.",
      );
    }
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdout.write(text + " (y/N): ");

    process.stdin.once("data", (data) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      res(data.toLowerCase() === "y");
    });
  });
}

function tableRow(label, value, color = "") {
  const MAX = 40;
  const lines = [];
  let remaining = value;
  while (remaining.length > 0) {
    lines.push(remaining.slice(0, MAX));
    remaining = remaining.slice(MAX);
  }
  if (lines.length === 0) {
    lines.push("");
  }

  lines.forEach((chunk, i) => {
    const l = i === 0 ? label : "";
    console.log(
      `│ ${CYAN}${l.padEnd(27)}${RESET} │ ${color}${chunk.padEnd(MAX)}${RESET} │`,
    );
  });
}

function tableSep() {
  console.log(
    "├─────────────────────────────┼──────────────────────────────────────────┤",
  );
}

async function showConfigAndConfirm(config, shakaCmd, ports, portConflictDetected) {
  console.log();
  console.log(`${BOLD}${WHITE}🎬 Live DASH Content Generation Configuration${RESET}`);
  console.log();
  console.log(
    "┌─────────────────────────────┬──────────────────────────────────────────┐",
  );
  tableRow("Parameter", "Value", BOLD + WHITE);
  tableSep();
  tableRow("Segment Duration", `${config.segmentDuration} seconds`, GREEN);
  tableRow("Fragment Duration", `${config.fragmentDuration} seconds`, GREEN);
  tableRow("Frame Rate", `${config.frameRate} fps`, BLUE);
  tableRow("Timeshift Buffer Depth", `${config.timeshiftBufferDepth} seconds`, YELLOW);
  tableSep();
  tableRow("Shaka-packager command", shakaCmd, BLUE);

  const portLabel = portConflictDetected
    ? `${ports.base}-${ports.audio3} (UDP) - Conflict detected`
    : `${ports.base}-${ports.audio3} (UDP)`;
  tableRow("Encoding Ports", portLabel, portConflictDetected ? RED : MAGENTA);
  tableSep();
  tableRow("Output Directory", config.outputDir, GREEN);
  tableRow("Output Manifest", `${config.outputDir}/manifest.mpd`, GREEN);
  if (config.hasTextTrack) {
    tableRow("Text Track Language", TEXT_TRACK_LANGUAGE, GREEN);
    tableRow("Text Cue Label", TEXT_TRACK_LABEL, GREEN);
  }
  tableSep();

  if (!config.keyId) {
    tableRow("Encryption Status", "Unencrypted", RED);
  } else {
    tableRow("Encryption Status", "Encrypted", GREEN);
    tableSep();
    tableRow("  Content", "All audio and video content", WHITE);
    tableRow("  Key ID", config.keyId, YELLOW);
    tableRow("  Key", config.key, YELLOW);
  }

  console.log(
    "└─────────────────────────────┴──────────────────────────────────────────┘",
  );
  console.log();
  console.log(
    `${BOLD}${BLUE}💡 Tip:${RESET} Run with ${BOLD}--help${RESET} flag to see all configuration options`,
  );
  console.log();

  if (!config.noConfirm) {
    if (!(await askConfirmation("Do you want to continue?"))) {
      throw new Error("Cancelled by user.");
    }
  }
}

/**
 * @param {string} [outputDir]
 */
function cleanup(outputDir) {
  if (cleanupDone) {
    return;
  }
  cleanupDone = true;
  console.log("Cleaning up processes and files...");

  for (const [name, proc] of [
    ["ffmpeg", ffmpegProc],
    ["shaka-packager", shakaProc],
    ...textWriterProcs.map((p) => ["text-writer", p]),
  ]) {
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

// Graceful exit on signals.
let resolvedOutputDir = "";

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    cleanup(resolvedOutputDir);
    process.exit(sig === "SIGINT" ? 130 : 143);
  });
}

process.on("exit", () => {
  // Force-kill any lingering children on exit
  for (const proc of [ffmpegProc, shakaProc]) {
    if (proc) {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* gone */
      }
    }
  }
  for (const proc of textWriterProcs) {
    if (proc) {
      try {
        proc.kill("SIGKILL");
      } catch {
        /* gone */
      }
    }
  }
});

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const configObj = { ...DEFAULT_CONFIG };
  const args = process.argv.slice(2);

  configObj.outputDir = resolve(TMP_DIR, "testcontents", "live");

  for (let i = 0; i < args.length; i++) {
    const currentArg = args[i];

    const requireNext = (name) => {
      if (i + 1 >= args.length) {
        panic(`${name} requires a value.`);
      }
      return args[++i];
    };

    switch (currentArg) {
      case "--segment-duration": {
        const v = requireNext("--segment-duration");
        if (!isPositiveInteger(v)) {
          panic("--segment-duration must be a positive integer.");
        }
        configObj.segmentDuration = Number(v);
        configObj.fragmentDuration = Number(v);
        break;
      }
      case "--fragment-duration": {
        const v = requireNext("--fragment-duration");
        if (!isPositiveInteger(v)) {
          panic("--fragment-duration must be a positive integer.");
        }
        configObj.fragmentDuration = Number(v);
        break;
      }
      case "--timeshift-buffer-depth": {
        const v = requireNext("--timeshift-buffer-depth");
        if (!isPositiveInteger(v)) {
          panic("--timeshift-buffer-depth must be a positive integer.");
        }
        configObj.timeshiftBufferDepth = Number(v);
        break;
      }
      case "--frame-rate": {
        const v = requireNext("--frame-rate");
        if (!isPositiveInteger(v)) {
          panic("--frame-rate must be a positive integer.");
        }
        configObj.frameRate = Number(v);
        break;
      }
      case "--output-dir": {
        const v = requireNext("--output-dir");
        if (!v) {
          panic("--output-dir cannot be empty.");
        }
        configObj.outputDir = sanitizeDirPath(v);
        break;
      }
      case "--base-port": {
        const v = requireNext("--base-port");
        if (!isValidPort(v)) {
          panic("--base-port must be a valid port number (1-65535).");
        }
        configObj.basePort = Number(v);
        break;
      }
      case "--shaka-path": {
        const v = requireNext("--shaka-path");
        if (!v) {
          panic("--shaka-path cannot be empty.");
        }
        if (!existsSync(v)) {
          panic(`Shaka-packager binary not found at: ${v}`);
        }
        configObj.shakaPath = v;
        break;
      }
      case "--no-confirmation":
        configObj.noConfirm = true;
        break;
      case "--encrypted":
        configObj.keyId = DEFAULT_KID;
        configObj.key = DEFAULT_KEY;
        break;
      case "--enable-text-track": {
        configObj.hasTextTrack = true;
        break;
      }
      case "--help":
        displayHelp();
        process.exit(0);
        break;
      default: {
        console.error(`ERROR: unknown option: "${currentArg}"\n`);
        displayHelp();
        process.exit(1);
      }
    }
  }

  resolvedOutputDir = configObj.outputDir;

  packageLiveContent(configObj).catch((err) => {
    process.stderr.write(`ERROR: ${err.message}\n`);
    cleanup(configObj.outputDir);
    process.exit(1);
  });
}

/** Print to stderr and exit 1. */
function panic(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  cleanup(resolvedOutputDir);
  process.exit(1);
}

function isPositiveInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isValidPort(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function isValidHexKey(value) {
  return /^[0-9a-fA-F]{32}$/.test(value);
}

function createChildExitPromise(name, proc, outputDir) {
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

function displayHelp() {
  console.log(`
package_live_content.mjs
------------------------

This script creates and packages a live DASH content from scratch by relying on
\`ffmpeg\` (which has to be installed locally) and the shaka-packager (which
will be downloaded if not found locally in a directory called \`tmp\`).

Usage: node package_live_content.mjs <OPTIONS>

Options:

  --segment-duration <duration>       Duration a single segment will have, in seconds.
                                      Defaults to ${DEFAULT_SEGMENT_DURATION} (seconds).

  --fragment-duration <duration>      Duration of a single fragment, in seconds.
                                      Defaults to match --segment-duration if not set.

  --frame-rate <fps>                  Frame-rate of video representations, in fps.
                                      Defaults to ${DEFAULT_FRAME_RATE}.

  --timeshift-buffer-depth <depth>    Depth of retained segments behind the last generated
                                      segment, in seconds.
                                      Defaults to ${DEFAULT_TIMESHIFT_BUFFER_DEPTH} (${Math.floor(DEFAULT_TIMESHIFT_BUFFER_DEPTH / 60)} minutes).

  --output-dir <directory>            Output directory for the generated content. Can be an
                                      absolute or a relative path.
                                      Defaults to '<repo-root>/tmp/testcontents/live'.

  --no-confirmation                   Never ask for confirmation; validate all prompts.
                                      Intended for automated scripts.

  --encrypted                         Encrypt all video and audio with the same key.
                                        key_id = ${DEFAULT_KID}
                                        key    = ${DEFAULT_KEY}

  --enable-text-track                 Add text track AdaptationSet to the content with placeholder cues.
                                      Disabled by default.

  --base-port <port>                  Base UDP port number where media encoded by ffmpeg will
                                      be communicated to the shaka-packager.
                                      ${MAX_NB_PORTS_USED} consecutive ports starting from this number will be used.
                                      Defaults to ${DEFAULT_BASE_PORT} (ports ${DEFAULT_BASE_PORT}-${DEFAULT_BASE_PORT + MAX_NB_PORTS_USED - 1}).

  --shaka-path <path>                 Path to the shaka-packager binary. If not specified,
                                      the script will search common locations and, as a last
                                      resort, try to download it (you will be asked to confirm).
`);
}
