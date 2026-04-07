// @ts-check

// Encryption defaults

export const DEFAULT_KID = "0123456789abcdef0123456789abcdef";
export const DEFAULT_KEY = "fedcba9876543210fedcba9876543210";

// Segment / stream defaults

export const DEFAULT_SEGMENT_DURATION = 3;
export const DEFAULT_FRAME_RATE = 30;
export const DEFAULT_TIMESHIFT_BUFFER_DEPTH = 180;
export const DEFAULT_BASE_PORT = 8881;

// Text track constants

export const TEXT_TRACK_LANGUAGE = "en";
export const TEXT_TRACK_LABEL = "generated-live-subtitles";
export const TEXT_TRACK_SEGMENT_PREFIX = "text_en";
export const TEXT_TRACK_CUE_SPACING = 4;
export const TEXT_TRACK_CUE_DURATION = 2;
export const TEXT_TRACK_INITIAL_AHEAD_DURATION = 4;

// Shaka startup polling

export const SHAKA_STARTUP_TIMEOUT_MS = 15000;
export const SHAKA_STARTUP_POLL_INTERVAL_MS = 300;

// ANSI colour codes

export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";
export const RED = "\x1b[31m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const BLUE = "\x1b[34m";
export const MAGENTA = "\x1b[35m";
export const CYAN = "\x1b[36m";
export const WHITE = "\x1b[37m";

// Artifact file patterns

/** Regex patterns that match every file this script can produce. */
export const ARTIFACT_PATTERNS = [
  /^manifest\.mpd$/,
  /^.+_init\.mp4$/,
  /^.+_\d+\.m4s$/,
  /^.+_\d+\.mp4$/,
  /^source_subtitles\.(vtt|ttml)$/,
  /^live_subtitles\.vtt$/,
];

// Default config object

export const DEFAULT_CONFIG = {
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
