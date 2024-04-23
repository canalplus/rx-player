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
import type { ISegment } from "../../manifest";
import type { IChunkTimeInfo } from "../types";
/**
 * Get precize start and duration of a chunk.
 * @param {UInt8Array} buffer - An ISOBMFF container (at least a `moof` + a
 * `mdat` box.
 * @param {Boolean} isChunked - If true, the whole segment was chunked into
 * multiple parts and buffer is one of them. If false, buffer is the whole
 * segment.
 * @param {Object} segment
 * @param {number|undefined} initTimescale
 * @returns {Object}
 */
export default function getISOBMFFTimingInfos(buffer: Uint8Array, isChunked: boolean, segment: ISegment, initTimescale?: number): IChunkTimeInfo | null;
