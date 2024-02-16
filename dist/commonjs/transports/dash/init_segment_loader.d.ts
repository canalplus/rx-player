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
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ISegmentLoaderCallbacks, ISegmentLoaderOptions, ISegmentLoaderResultChunkedComplete, ISegmentLoaderResultSegmentCreated, ISegmentLoaderResultSegmentLoaded } from "../types";
/**
 * Perform a request for an initialization segment, agnostic to the container.
 * @param {string} url
 * @param {Object} segment
 * @param {Object} options
 * @param {CancellationSignal} cancelSignal
 * @param {Object} callbacks
 * @returns {Promise}
 */
export default function initSegmentLoader(url: string, segment: ISegment, options: ISegmentLoaderOptions, cancelSignal: CancellationSignal, callbacks: ISegmentLoaderCallbacks<ArrayBuffer | Uint8Array>): Promise<ISegmentLoaderResultSegmentLoaded<ArrayBuffer | Uint8Array> | ISegmentLoaderResultSegmentCreated<ArrayBuffer | Uint8Array> | ISegmentLoaderResultChunkedComplete>;
