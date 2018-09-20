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

import log from "../../../log";

export interface IExtXStart {
  timeOffset: number;
  precise: boolean;
}

/**
 * @param {string} line
 * @returns {Object|null}
 */
export default function parseEXTXStart(line: string): IExtXStart | null {
  let timeOffset: number | undefined;
  let precise: boolean | undefined;

  const keyValues: string[] = line.substring(13).split(",");
  for (let i = 0; i < keyValues.length; i++) {
    const keyValue = keyValues[i];
    const index = keyValue.indexOf("=");
    if (index > 0) {
      const key = keyValue.substring(0, index);
      const value = keyValue.substring(index + 1);

      if (key === "TIME-OFFSET") {
        const parsedTimeOffset = parseFloat(value);
        if (isNaN(parsedTimeOffset)) {
          log.warn("HLS Parser: invalid timeOffset value:", value);
        } else {
          timeOffset = parsedTimeOffset;
        }
      } else if (key === "PRECISE") {
        precise = value === "YES";
      }
    }
  }

  if (timeOffset === undefined) {
    log.warn("HLS Parser: invalid #EXT-X-START: no TIME-OFFSET");
    return null;
  }

  return { timeOffset, precise: precise ?? false };
}
