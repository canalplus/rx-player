/* eslint-env node */

import * as path from "path";
import { fileURLToPath } from "url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
export default [
  {
    url: "/imagetracks/image.bif",
    path: path.join(currentDirectory, "./example.bif"),
    contentType: "application/bif",
  },
];
