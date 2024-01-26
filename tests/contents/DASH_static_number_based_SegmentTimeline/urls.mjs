/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const baseURL = "/DASH_static_number_based_SegmentTimeline/media/";

export default [
  // Manifest
  {
    url: baseURL + "manifest.mpd",
    path: path.join(currentDirectory, "./media/manifest.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: baseURL + "end_number.mpd",
    path: path.join(currentDirectory, "./media/end_number.mpd"),
    contentType: "application/dash+xml",
  },
];
