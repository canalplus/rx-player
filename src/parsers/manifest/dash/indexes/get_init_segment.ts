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
import { IInbandEvent } from "../../../containers/isobmff";

/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @param {function} isInbandEventWhitelisted
 * @returns {Object}
 */
export default function getInitSegment(
  index: { timescale: number;
           initialization?: { mediaURLs: string[] | null; range?: [number, number] };
           indexRange?: [number, number];
           indexTimeOffset : number; },
  isInbandEventWhitelisted?: (inbandEvent: IInbandEvent) => boolean
) : ISegment {
  const { initialization } = index;
  let privateInfos;
  if (isInbandEventWhitelisted !== undefined) {
    privateInfos = { isInbandEventWhitelisted };
  }
  return { id: "init",
           isInit: true,
           time: 0,
           end: 0,
           duration: 0,
           timescale: 1,
           range: initialization != null ? initialization.range :
                                           undefined,
           indexRange: index.indexRange,
           mediaURLs: initialization?.mediaURLs ?? null,
           privateInfos,
           timestampOffset: -(index.indexTimeOffset / index.timescale) };
}
