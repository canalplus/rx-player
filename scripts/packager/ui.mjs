// @ts-check

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
  TEXT_TRACK_LANGUAGE,
  TEXT_TRACK_LABEL,
} from "./constants.mjs";

const COL_WIDTH = 40;

/**
 * Output a specific row in the table, with the given properties displayed
 * inside it.
 * @param {string} label
 * @param {string} value
 * @param {string} [color=""]
 */
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
 * @param {import("./live_packager.mjs").PackageConfig} config
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
  if (config.hasTextTrack) {
    tableRow("Text Track Language", TEXT_TRACK_LANGUAGE, GREEN);
    tableRow("Text Cue Label", TEXT_TRACK_LABEL, GREEN);
  }

  tableSep();
  tableRow("Shaka-packager command", shakaCmd, BLUE);

  // TODO: Only text if enabled?
  const portLabel = portConflictDetected
    ? `${ports.base}-${ports.text1} (UDP) - Conflict detected`
    : `${ports.base}-${ports.text1} (UDP)`;
  tableRow("Encoding Ports", portLabel, portConflictDetected ? RED : MAGENTA);
  tableSep();

  tableRow("Output Directory", config.outputDir, GREEN);
  tableRow("Output Manifest", `${config.outputDir}/manifest.mpd`, GREEN);

  tableSep();

  if (!config.keyId || !config.key) {
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

    process.stdin.once(
      "data",
      /**
       * @param {string} data
       */ (data) => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        res(data.toLowerCase() === "y");
      },
    );
  });
}
