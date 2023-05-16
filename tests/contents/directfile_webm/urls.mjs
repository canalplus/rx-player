/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "/directfile_webm/";

export default [
  {
    url: BASE_URL + "DirectFile.webm",
    path: path.join(currentDirectory, "DirectFile.webm"),
    contentType: "video/webm",
  },
];
