import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  TEXT_TRACK_LANGUAGE,
  TEXT_TRACK_LABEL,
  TEXT_TRACK_SEGMENT_PREFIX,
  TEXT_TRACK_CUE_SPACING,
  TEXT_TRACK_CUE_DURATION,
  TEXT_TRACK_INITIAL_AHEAD_DURATION,
  SHAKA_STARTUP_TIMEOUT_MS,
  SHAKA_STARTUP_POLL_INTERVAL_MS,
} from "./constants.mjs";

/**
 * Build the list of text-track asset descriptors.
 *
 * Currently produces a single English WebVTT track delivered over UDP.
 *
 * @param {{ text: number }} ports
 * @returns {Array<{ sourcePath: string, segmentPrefix: string,
 *                   inputFormat: string, liveWriterMode: string, port: number }>}
 */
export function createTextTrackAssets(ports) {
  return [
    {
      sourcePath: `udp://127.0.0.1:${ports.text}`,
      segmentPrefix: TEXT_TRACK_SEGMENT_PREFIX,
      inputFormat: "webvtt",
      liveWriterMode: "webvtt",
      port: ports.text,
    },
  ];
}

/**
 * Spawn a UDP writer process for each text-track asset that uses the "webvtt"
 * live-writer mode.
 *
 * @param {ReturnType<typeof createTextTrackAssets>} textTrackAssets
 * @param {number} segmentDuration
 * @returns {import("child_process").ChildProcess[]}
 */
export function startLiveTextTrackWriters(textTrackAssets, segmentDuration) {
  return textTrackAssets
    .filter((a) => a.liveWriterMode === "webvtt")
    .map((asset) =>
      spawn(
        process.execPath,
        [
          "-e",
          buildLiveWebVttWriterScript(
            asset.port,
            segmentDuration,
            TEXT_TRACK_CUE_SPACING,
            TEXT_TRACK_CUE_DURATION,
          ),
        ],
        { stdio: "inherit" },
      ),
    );
}

/**
 * Wait until each text-track's init segment has been written to disk, or
 * reject after the standard shaka startup timeout.
 *
 * @param {string} outputDir
 * @param {ReturnType<typeof createTextTrackAssets>} textTrackAssets
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
 * @param {ReturnType<typeof createTextTrackAssets>} textTrackAssets
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

/**
 * Generate the Node.js source code for a self-contained UDP WebVTT writer.
 *
 * @param {number} port
 * @param {number} segmentDuration
 * @param {number} cueSpacing
 * @param {number} cueDuration
 * @returns {string}
 */
function buildLiveWebVttWriterScript(port, segmentDuration, cueSpacing, cueDuration) {
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

const header = Buffer.from("WEBVTT\\n\\n", "utf8");
socket.send(header, 0, header.length, PORT, HOST);

while (nextCueStart < ${TEXT_TRACK_INITIAL_AHEAD_DURATION}) {
  sendCue();
}

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
`.trim();
}
