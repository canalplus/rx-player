/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_static_SegmentBase/media/";

const mp4AudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  return {
    url: BASE_URL + "a-" + lang + "-0128k-aac.mp4",
    path: path.join(currentDirectory, `./media/a-${lang}-0128k-aac.mp4`),
    contentType: "audio/mp4",
  };
});

const webmAudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  return {
    url: BASE_URL + "a-" + lang + "-0128k-libopus.webm",
    path: path.join(currentDirectory, `./media/a-${lang}-0128k-libopus.webm`),
    contentType: "audio/webm",
  };
});

const mp4VideoSegments = [
  "0144p-0100k",
  "0240p-0400k",
  "0360p-0750k",
  "0480p-1000k",
  "0576p-1400k",
].map((quality) => {
  return {
    url: BASE_URL + "v-" + quality + "-libx264.mp4",
    path: path.join(currentDirectory, `./media/v-${quality}-libx264.mp4`),
    contentType: "video/mp4",
  };
});

const webmVideoSegments = [
  "0144p-0100k",
  "0240p-0300k",
  "0360p-0550k",
  "0480p-0750k",
  "0576p-1000k",
].map((quality) => {
  return {
    url: BASE_URL + "v-" + quality + "-vp9.webm",
    path: path.join(currentDirectory, `./media/v-${quality}-vp9.webm`),
    contentType: "video/mp4",
  };
});

const textSegments = ["el", "en", "fr"].map((lang) => {
  return {
    url: BASE_URL + "s-" + lang + ".webvtt",
    path: path.join(currentDirectory, `./media/s-${lang}.webvtt`),
    contentType: "text/plain",
  };
});

export default [
  // Manifests
  {
    url: BASE_URL + "multi_codecs.mpd",
    path: path.join(currentDirectory, "./media/multi_codecs.mpd"),
    contentType: "application/dash+xml",
  },

  {
    url: BASE_URL + "broken_sidx.mpd",
    path: path.join(currentDirectory, "./media/broken_sidx.mpd"),
    contentType: "application/dash+xml",
  },

  ...mp4AudioSegments,
  ...webmAudioSegments,
  ...mp4VideoSegments,
  ...webmVideoSegments,
  ...textSegments,

  // segments with broken sidx
  {
    url: BASE_URL + "v-0144p-0100k-libx264_broken_sidx.mp4",
    path: path.join(currentDirectory, "./media/v-0144p-0100k-libx264_broken_sidx.mp4"),
    contentType: "video/mp4",
  },
];
