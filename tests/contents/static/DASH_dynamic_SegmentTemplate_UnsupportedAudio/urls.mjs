/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_dynamic_SegmentTemplate_UnsupportedAudio/media/";
/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
export default [
  // manifest
  {
    url: BASE_URL + "Manifest_audio_not_supported.mpd",
    path: path.join(currentDirectory, "./media/Manifest_audio_not_supported.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_audio_only_unsupported.mpd",
    path: path.join(currentDirectory, "./media/Manifest_audio_only_unsupported.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_audio_and_video_not_supported.mpd",
    path: path.join(
      currentDirectory,
      "./media/Manifest_audio_and_video_not_supported.mpd",
    ),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "Manifest_video_not_supported.mpd",
    path: path.join(currentDirectory, "./media/Manifest_video_not_supported.mpd"),
    contentType: "application/dash+xml",
  },
];
