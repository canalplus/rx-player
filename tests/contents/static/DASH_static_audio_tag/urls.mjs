import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/DASH_static_audio_tag/media/";

export default [
  {
    url: BASE_URL + "audio_only.mpd",
    path: path.join(currentDirectory, "media/audio_only.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "audio_video.mpd",
    path: path.join(currentDirectory, "media/audio_video.mpd"),
    contentType: "application/dash+xml",
  },
];
