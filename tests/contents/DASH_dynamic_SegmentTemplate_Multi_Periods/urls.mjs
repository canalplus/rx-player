/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_dynamic_SegmentTemplate_Multi_Periods/media/";

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
export default [
  // manifest
  {
    url: BASE_URL + "Manifest.mpd",
    path: path.join(currentDirectory, "./media/Manifest.mpd"),
    contentType: "application/dash+xml",
  },
];
