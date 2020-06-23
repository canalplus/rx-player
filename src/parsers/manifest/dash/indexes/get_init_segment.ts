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

import { ISegment } from "../../../../manifest";

/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @returns {Object|null}
 */
export default function getInitSegment(
  index: { timescale: number;
           initialization: { mediaURLs: string[] | null;
                             range?: [number, number]; } | null;
           indexRange?: [number, number];
           indexTimeOffset : number; }
) : ISegment | null {
  const { initialization } = index;
  if (initialization === null) {
    return null;
  }
  return { id: "init",
           isInit: true,
           time: 0,
           duration: 0,
           range: initialization.range,
           indexRange: index.indexRange,
           mediaURLs: initialization.mediaURLs ?? null,
           timescale: index.timescale,
           timestampOffset: -(index.indexTimeOffset / index.timescale) };
}
