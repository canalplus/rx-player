// @ts-check

import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  isValidHexKey,
  commandExists,
  outputDirHasMediaFiles,
  cleanupMediaFiles,
} from "./utils.mjs";
import { checkPortRange, buildPortMap } from "./ports.mjs";
import { resolveShakaBinary, waitForShakaReady } from "./shaka_packager.mjs";
import { createTextTrackAssets, startLiveTextTrackWriters } from "./text_track.mjs";
import { buildFfmpegArgs, spawnFfmpeg } from "./ffmpeg.mjs";
import { showConfigAndConfirm, askConfirmation } from "./ui.mjs";
import {
  setShakaProc,
  setFfmpegProc,
  addTextWriterProcs,
  cleanup,
  createChildExitPromise,
} from "./cleanup.mjs";
import {
  SHAKA_STARTUP_POLL_INTERVAL_MS,
  SHAKA_STARTUP_TIMEOUT_MS,
  TEXT_TRACK_LANGUAGE,
} from "./constants.mjs";

/**
 * @typedef {object} PackageConfig
 * @property {string}  [keyId]               - 32-char hex key ID (encrypted streams only).
 * @property {string}  [key]                 - 32-char hex key (encrypted streams only).
 * @property {number}  basePort              - First UDP port used by the pipeline.
 * @property {string}  outputDir             - Directory where packaged content is written.
 * @property {boolean} noConfirm             - Skip interactive confirmation prompts.
 * @property {number}  segmentDuration       - Segment duration in seconds.
 * @property {number}  fragmentDuration      - Fragment duration in seconds.
 * @property {number}  frameRate             - Video frame rate in fps.
 * @property {number}  timeshiftBufferDepth  - DVR window depth in seconds.
 * @property {string}  [shakaPath]           - Explicit path to the shaka-packager binary.
 * @property {boolean} hasTextTrack          - Whether to include a text AdaptationSet.
 * @property {string}  tmpDir                - Directory used to cache the shaka binary.
 * @property {string}  scriptDir             - Directory containing install_shaka_packager.sh.
 */

/**
 * Create and package a live DASH stream.
 *
 * Orchestrates ffmpeg (media encoding) and shaka-packager (DASH segmentation),
 * optionally with a synthetic WebVTT text track.  Runs until interrupted or
 * until one of the child processes exits unexpectedly.
 *
 * @param {PackageConfig} config
 * @returns {Promise<void>}
 */
export async function packageLiveContent(config) {
  validateEncryptionKeys(config);

  const { ok: portRangeOk, conflictDetected: portConflictDetected } = checkPortRange(
    config.basePort,
  );

  if (!portRangeOk) {
    throw new Error(
      `Port range starting from ${config.basePort} would exceed valid port range (1-65535).`,
    );
  }

  ensureOutputDir(config);
  await checkIfOutputContainsMediaFiles(config.outputDir, config.noConfirm);

  if (!commandExists("ffmpeg")) {
    throw new Error(
      '"ffmpeg" needs to be installed and available in your PATH to run this script',
    );
  }

  const shakaCmd =
    config.shakaPath ||
    (await resolveShakaBinary(config.tmpDir, config.scriptDir, config.noConfirm));

  const ports = buildPortMap(config.basePort);

  await showConfigAndConfirm(config, shakaCmd, ports, portConflictDetected);

  console.log("Starting...");
  console.log("Cleaning up any existing media files before starting...");
  cleanupMediaFiles(config.outputDir);
  ensureOutputDir(config);

  const textTrackAssets = config.hasTextTrack ? createTextTrackAssets(ports) : [];

  const shakaArgs = buildShakaArgs(config, ports, textTrackAssets);

  if (textTrackAssets.length > 0) {
    const writers = startLiveTextTrackWriters(textTrackAssets, config.segmentDuration);
    addTextWriterProcs(writers);
  }

  console.log(`Starting shaka-packager with command: ${shakaCmd}`);
  const shaka = spawn(shakaCmd, shakaArgs, { stdio: "inherit" });
  setShakaProc(shaka);
  console.log(`shaka-packager started with PID: ${shaka.pid}`);
  const shakaExited = createChildExitPromise("shaka-packager", shaka, config.outputDir);

  try {
    const portsToWait = [
      ports.p720,
      ports.p480,
      ports.p360,
      ports.audio1,
      ports.audio2,
      ports.audio3,
      ...(config.hasTextTrack ? [ports.text1, ports.text2] : []),
    ];
    await waitForShakaReady(portsToWait);

    if (textTrackAssets.length > 0) {
      await waitForTextTracksReady(config.outputDir, textTrackAssets);
    }
  } catch (err) {
    cleanup(config.outputDir);
    throw err;
  }

  const ffmpegArgs = buildFfmpegArgs({
    frameRate: config.frameRate,
    segmentDuration: config.segmentDuration,
    ports,
  });
  const ffmpeg = spawnFfmpeg(ffmpegArgs);
  setFfmpegProc(ffmpeg);
  const ffmpegExited = createChildExitPromise("ffmpeg", ffmpeg, config.outputDir);

  // Run until interrupted or one child crashes.
  await Promise.race([ffmpegExited, shakaExited]);
}

/**
 * @param {PackageConfig} config
 */
function validateEncryptionKeys(config) {
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
}

/**
 * @param {PackageConfig} config
 */
function ensureOutputDir(config) {
  try {
    mkdirSync(config.outputDir, { recursive: true });
    config.outputDir = resolve(config.outputDir);
  } catch {
    throw new Error(`Failed to create output directory: ${config.outputDir}`);
  }
}

/**
 * @param {string} outputDir
 * @param {boolean} noConfirm
 * @returns {Promise.<void>}
 */
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

/**
 * Assemble the full shaka-packager argument list.
 *
 * @param {PackageConfig} config
 * @param {ReturnType<import("./ports.mjs").buildPortMap>} ports
 * @param {ReturnType<import("./text_track.mjs").createTextTrackAssets>} textTrackAssets
 * @returns {string[]}
 */
function buildShakaArgs(config, ports, textTrackAssets) {
  const out = config.outputDir;

  const streamArgs = [
    `in=udp://127.0.0.1:${ports.p720},stream=video,init_segment=${out}/h264_720p_init.mp4,segment_template=${out}/h264_720p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.p480},stream=video,init_segment=${out}/h264_480p_init.mp4,segment_template=${out}/h264_480p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.p360},stream=video,init_segment=${out}/h264_360p_init.mp4,segment_template=${out}/h264_360p_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio1},stream=audio,init_segment=${out}/audio_eng_init.mp4,segment_template=${out}/audio_eng_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio2},stream=audio,init_segment=${out}/audio_fra_init.mp4,segment_template=${out}/audio_fra_$Number$.m4s`,
    `in=udp://127.0.0.1:${ports.audio3},stream=audio,init_segment=${out}/audio_arm_init.mp4,segment_template=${out}/audio_arm_$Number$.m4s`,
  ];

  const textArgs = buildTextTrackShakaArgs(textTrackAssets, out).reverse();

  const baseArgs = [
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

  const encryptionArgs = config.keyId
    ? [
        "--keys",
        `label=:key_id=${config.keyId}:key=${config.key}`,
        "--clear_lead",
        "0",
        "--protection_scheme",
        "cenc",
      ]
    : [];

  return [...textArgs, ...streamArgs, ...baseArgs, ...encryptionArgs];
}

/**
 * Wait until each text-track's init segment has been written to disk, or
 * reject after the standard shaka startup timeout.
 *
 * @param {string} outputDir
 * @param {ReturnType<import("./text_track.mjs").createTextTrackAssets>} textTrackAssets
 * @returns {Promise<void>}
 */
export async function waitForTextTracksReady(outputDir, textTrackAssets) {
  const expectedFiles = textTrackAssets.map((asset) =>
    resolve(outputDir, `${asset.segmentPrefix}_init.mp4`),
  );

  const deadline = Date.now() + SHAKA_STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (expectedFiles.every(existsSync)) {
      return;
    }
    await new Promise((r) => setTimeout(r, SHAKA_STARTUP_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for text track initialization segments: ${expectedFiles.join(", ")}`,
  );
}

/**
 * Build the shaka-packager input descriptors for a set of text-track assets.
 *
 * @param {ReturnType<import("./text_track.mjs").createTextTrackAssets>} textTrackAssets
 * @param {string} outputDir
 * @returns {string[]}  One descriptor string per asset.
 */
export function buildTextTrackShakaArgs(textTrackAssets, outputDir) {
  return textTrackAssets.map(
    (asset) =>
      `in=${asset.sourcePath},stream=text,input_format=${asset.inputFormat},` +
      `language=${TEXT_TRACK_LANGUAGE},` +
      `init_segment=${outputDir}/${asset.segmentPrefix}_init.mp4,` +
      `segment_template=${outputDir}/${asset.segmentPrefix}_$Number$.m4s`,
  );
}
