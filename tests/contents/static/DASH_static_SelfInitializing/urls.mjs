/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_static_SelfInitializing/media/";

export default [
  {
    url: BASE_URL + "manifest.mpd",
    path: path.join(currentDirectory, "media", "manifest.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "text-template-1.vtt",
    path: path.join(currentDirectory, "media", "text-template-1.vtt"),
    contentType: "text/vtt",
  },
  {
    url: BASE_URL + "text-timeline-0.vtt",
    path: path.join(currentDirectory, "media", "text-timeline-0.vtt"),
    contentType: "text/vtt",
  },
  {
    url: BASE_URL + "text-list.vtt",
    path: path.join(currentDirectory, "media", "text-list.vtt"),
    contentType: "text/vtt",
  },
];
