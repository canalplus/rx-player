/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import startsWith from "../../../utils/starts_with";

export enum M3U8LineType {
  Comment,
  Tag,
  URI,
  Nothing,
}

export default function getType(line: string): M3U8LineType {
  if (line.trim().length === 0) {
    return M3U8LineType.Nothing;
  }
  if (startsWith(line, "#")) {
    return line.substring(1, 4) === "EXT" ? M3U8LineType.Tag : M3U8LineType.Comment;
  }
  return M3U8LineType.URI;
}
