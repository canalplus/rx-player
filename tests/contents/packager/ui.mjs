import {
  RESET,
  BOLD,
  RED,
  GREEN,
  YELLOW,
  BLUE,
  MAGENTA,
  CYAN,
  WHITE,
  DEFAULT_SEGMENT_DURATION,
  DEFAULT_FRAME_RATE,
  DEFAULT_TIMESHIFT_BUFFER_DEPTH,
  DEFAULT_BASE_PORT,
  MAX_NB_PORTS_USED,
  DEFAULT_KID,
  DEFAULT_KEY,
  TEXT_TRACK_LANGUAGE,
  TEXT_TRACK_LABEL,
} from "./constants.mjs";

const COL_WIDTH = 40;

function tableRow(label, value, color = "") {
  const lines = [];
  let remaining = value;
  while (remaining.length > 0) {
    lines.push(remaining.slice(0, COL_WIDTH));
    remaining = remaining.slice(COL_WIDTH);
  }
  if (lines.length === 0) {
    lines.push("");
  }

  lines.forEach((chunk, i) => {
    const l = i === 0 ? label : "";
    console.log(
      `│ ${CYAN}${l.padEnd(27)}${RESET} │ ${color}${chunk.padEnd(COL_WIDTH)}${RESET} │`,
    );
  });
}

function tableSep() {
  console.log(
    "├─────────────────────────────┼──────────────────────────────────────────┤",
  );
}

/**
 * Print a formatted configuration table and optionally prompt for confirmation.
 *
 * @param {object} config
 * @param {string} shakaCmd
 * @param {ReturnType<import("./ports.mjs").buildPortMap>} ports
 * @param {boolean} portConflictDetected
 */
export async function showConfigAndConfirm(
  config,
  shakaCmd,
  ports,
  portConflictDetected,
) {
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
 * Prompt the user for a y/N answer on an interactive TTY.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export function askConfirmation(text) {
  return new Promise((res) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      throw new Error(
        "Confirmation requires an interactive terminal. Use --no-confirmation.",
      );
    }
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    process.stdout.write(`${text} (y/N): `);

    process.stdin.once("data", (data) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      res(data.toLowerCase() === "y");
    });
  });
}

export function displayHelp() {
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
