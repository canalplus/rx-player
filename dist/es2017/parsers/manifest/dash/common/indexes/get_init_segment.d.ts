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
import type { ISegment } from "../../../../../manifest";
import type { IEMSG } from "../../../../containers/isobmff";
/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @param {function} isEMSGWhitelisted
 * @returns {Object}
 */
export default function getInitSegment(index: {
    timescale: number;
    initialization?: {
        url: string | null;
        range?: [number, number] | undefined;
    } | undefined;
    indexRange?: [number, number] | undefined;
    indexTimeOffset: number;
}, isEMSGWhitelisted?: (inbandEvent: IEMSG) => boolean): ISegment;
