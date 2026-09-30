/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_static_AnnexI/media/";
const SEGMENT_TIMELINE_MEDIA = path.join(
  currentDirectory,
  "..",
  "DASH_static_SegmentTimeline",
  "media",
  "dash",
);

export default [
  {
    url: BASE_URL + "manifest.mpd",
    path: path.join(currentDirectory, "media", "manifest.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "init.mp4?from=network&kind=video",
    path: path.join(SEGMENT_TIMELINE_MEDIA, "ateam-video=400000.dash"),
    contentType: "video/mp4",
  },
  {
    url: BASE_URL + "segment-1.m4s?from=network&kind=video",
    path: path.join(SEGMENT_TIMELINE_MEDIA, "ateam-video=400000-0.dash"),
    contentType: "video/mp4",
  },
  {
    url: BASE_URL + "text-init.mp4?from=network&kind=text",
    path: path.join(currentDirectory, "media", "text-init.mp4"),
    contentType: "application/mp4",
  },
  {
    url: BASE_URL + "text-1.m4s?from=network&kind=text",
    path: path.join(currentDirectory, "media", "text-1.m4s"),
    contentType: "application/mp4",
  },
  {
    url: BASE_URL + "thumbnail-1.jpg?from=network&kind=thumbnail",
    path: path.join(SEGMENT_TIMELINE_MEDIA, "thumbnails_320x180-tile_1.jpg"),
    contentType: "image/jpeg",
  },
];
