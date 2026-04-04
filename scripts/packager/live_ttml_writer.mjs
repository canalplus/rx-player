// @ts-check
/**
 * Standalone UDP TTML writer.
 * Reads configuration from environment variables set by the parent process:
 *
 *   TT_PORT             UDP port to send to
 *   TT_LABEL            Human-readable track label used in cue text
 *   TT_CUE_SPACING      Seconds between cue start times
 *   TT_CUE_DURATION     Maximum duration (seconds) of each cue
 *   TT_SEGMENT_DURATION Segment duration (seconds) — caps cue length
 *   TT_INITIAL_AHEAD    Seconds of cues to pre-send before the interval starts
 *
 * Each UDP datagram carries a complete, self-contained TTML document
 * containing a single <p> element. This matches the "one document per cue"
 * fragmented-TTML delivery model used by common live packagers.
 */

import dgram from "dgram";

const PORT = Number(process.env.TT_PORT);
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
 * Format seconds as a TTML time expression (HH:MM:SS.mmm).
 *
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

/**
 * Build a minimal TTML document containing a single subtitle cue.
 *
 * @param {string} begin  TTML begin attribute value
 * @param {string} end    TTML end attribute value
 * @param {string} text   Cue body text
 * @returns {string}
 */
function buildTtmlDocument(begin, end, text) {
  // Escape any XML special characters in the cue text.
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<tt xml:lang="en"\n' +
    '    xmlns="http://www.w3.org/ns/ttml"\n' +
    '    xmlns:tts="http://www.w3.org/ns/ttml#styling">\n' +
    "  <head>\n" +
    "    <styling>\n" +
    '      <style xml:id="s1"\n' +
    '             tts:textAlign="center"\n' +
    '             tts:origin="10% 80%"\n' +
    '             tts:extent="80% 15%"\n' +
    '             tts:fontSize="100%"\n' +
    '             tts:color="white"\n' +
    '             tts:backgroundColor="transparent"/>\n' +
    "    </styling>\n" +
    "  </head>\n" +
    "  <body>\n" +
    "    <div>\n" +
    `      <p begin="${begin}" end="${end}" style="s1">${escaped}</p>\n` +
    "    </div>\n" +
    "  </body>\n" +
    "</tt>"
  );
}

function sendCue() {
  const cueEnd = nextCueStart + Math.min(CUE_DURATION, SEGMENT_DURATION);
  const text = `${LABEL} live cue ${cueIndex}`;
  const doc = buildTtmlDocument(
    formatTimestamp(nextCueStart),
    formatTimestamp(cueEnd),
    text,
  );
  const buf = Buffer.from(doc, "utf8");
  socket.send(buf, 0, buf.length, PORT, HOST);
  cueIndex++;
  nextCueStart += CUE_SPACING;
}

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
  console.error("Live TTML UDP writer error:", err);
  process.exit(1);
});
