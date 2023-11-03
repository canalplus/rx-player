/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export default [
  {
    url: "/texttracks/subtitle_example.xml",
    path: path.join(currentDirectory, "./subtitle_example.xml"),
    contentType: "application/ttml+xml",
  },
];
