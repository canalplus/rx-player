// @ts-check
/**
 * Standalone UDP WebVTT writer.
 * Reads configuration from environment variables set by the parent process:
 *
 *   TT_PORT             UDP port to send to
 *   TT_LABEL            Human-readable track label used in cue text
 *   TT_CUE_SPACING      Seconds between cue start times
 *   TT_CUE_DURATION     Maximum duration (seconds) of each cue
 *   TT_SEGMENT_DURATION Segment duration (seconds) — caps cue length
 *   TT_INITIAL_AHEAD    Seconds of cues to pre-send before the interval starts
 */

import dgram from "dgram";

const PORT = Number(process.env.TT_PORT) || 1738;
const HOST = "127.0.0.1";
const LABEL = process.env.TT_LABEL ?? "Subtitle";
const CUE_SPACING = Number(process.env.TT_CUE_SPACING);
const CUE_DURATION = Number(process.env.TT_CUE_DURATION);
const SEGMENT_DURATION = Number(process.env.TT_SEGMENT_DURATION);
const INITIAL_AHEAD = Number(process.env.TT_INITIAL_AHEAD);

const socket = dgram.createSocket("udp4");

let cueIndex = 0;
let nextCueStart = 0;

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTimestamp(totalSeconds) {
  const totalMs = Math.round(totalSeconds * 1000);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000) % 60;
  const h = Math.floor(totalMs / 3600000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "." +
    String(ms).padStart(3, "0")
  );
}

function sendCue() {
  const cueEnd = nextCueStart + Math.min(CUE_DURATION, SEGMENT_DURATION);
  const cue =
    formatTimestamp(nextCueStart) +
    " --> " +
    formatTimestamp(cueEnd) +
    " align:center line:85%\n" +
    LABEL +
    " live cue " +
    cueIndex +
    "\n\n";
  const buf = Buffer.from(cue, "utf8");
  socket.send(buf, 0, buf.length, PORT, HOST);
  cueIndex++;
  nextCueStart += CUE_SPACING;
}

// Send the mandatory WebVTT header first.
const header = Buffer.from("WEBVTT\n\n", "utf8");
socket.send(header, 0, header.length, PORT, HOST);

// Pre-fill the initial look-ahead window.
while (nextCueStart < INITIAL_AHEAD) {
  sendCue();
}

const intervalId = setInterval(sendCue, CUE_SPACING * 1000);

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
