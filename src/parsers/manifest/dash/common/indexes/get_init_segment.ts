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

import type { IPrivateInfos, ISegment } from "../../../../../manifest/index.ts";
import type { IEMSG } from "../../../../containers/isobmff/index.ts";

/**
 * Construct the metadata object for the init Segment linked to that index.
 * Returns `null` if no initialization segment appears to be linked to that index.
 * @param {Object} index
 * @param {function} isEMSGWhitelisted
 * @returns {Object|null}
 */
export default function getInitSegment(
  index: {
    /** Convert time numbers into seconds (`ticks / timescale == seconds`). */
    timescale: number;
    /**
     * Information on the initialization segment present on the index.
     * `null` if there's no such information.
     */
    initialization: { url: string | null; range?: [number, number] | undefined } | null;
    /** Optional range for the index segment (e.g. ISOBMFF's sidx). */
    indexRange?: [number, number] | undefined;
    /**
     * Temporal offset, in the current timescale (see timescale), to add to the
     * presentation time (time a segment has at decoding time) to obtain the
     * corresponding media time (original time of the media segment in the index
     * and on the media file).
     * For example, to look for a segment beginning at a second `T` on a
     * HTMLMediaElement, we actually will look for a segment in the index
     * beginning at:
     * ```
     * T * timescale + indexTimeOffset
     * ```
     */
    indexTimeOffset: number;
  },
  /**
   * Callback returning `true` if the corresponding inband event is supposed to
   * be listened to.
   */
  isEMSGWhitelisted?: (inbandEvent: IEMSG) => boolean,
): ISegment | null {
  const { initialization } = index;
  if (initialization === null) {
    return null;
  }
  const privateInfos: IPrivateInfos = {};
  if (isEMSGWhitelisted !== undefined) {
    privateInfos.isEMSGWhitelisted = isEMSGWhitelisted;
  }

  return {
    id: "init",
    isInit: true,
    time: 0,
    end: 0,
    duration: 0,
    timescale: 1,
    range: initialization.range,
    indexRange: index.indexRange,
    url: initialization.url,
    complete: true,
    privateInfos,
    timestampOffset: -(index.indexTimeOffset / index.timescale),
  };
}
