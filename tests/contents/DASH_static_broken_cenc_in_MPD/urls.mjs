/* eslint-env node */
/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

import * as path from "path";
import { fileURLToPath } from "url";
const BASE_URL = "/DASH_static_broken_cenc_in_MPD/media/";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default [
  // Manifest
  {
    url: BASE_URL + "broken_cenc.mpd",
    path: path.join(currentDirectory, "media/broken_cenc.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "video.mp4",
    path: path.join(currentDirectory, "media/video.mp4"),
    contentType: "video/mp4",
  },

  // Audio initialization segment
  {
    url: BASE_URL + "audio.mp4",
    path: path.join(currentDirectory, "media/audio.mp4"),
    contentType: "audio/mp4",
  },
];
