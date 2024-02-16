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
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ISegmentContext, ISegmentLoaderCallbacks, ISegmentLoaderOptions, ISegmentLoaderResultChunkedComplete } from "../types";
/**
 * Load segments through a "chunk" mode (decodable chunk by decodable chunk).
 *
 * This method is particularly adapted to low-latency streams.
 *
 * @param {string} url - URL of the segment to download.
 * @param {Object} content - Context of the segment needed.
 * @param {Object} options
 * @param {Object} callbacks
 * @param {CancellationSignal} cancelSignal
 * @returns {Promise}
 */
export default function lowLatencySegmentLoader(url: string, content: ISegmentContext, options: ISegmentLoaderOptions, callbacks: ISegmentLoaderCallbacks<Uint8Array>, cancelSignal: CancellationSignal): Promise<ISegmentLoaderResultChunkedComplete>;
