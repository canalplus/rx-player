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
import type { ICdnMetadata } from "../../parsers/manifest";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ISegmentContext, ISegmentLoaderCallbacks, ISegmentLoaderOptions, ISegmentLoaderResultSegmentLoaded } from "../types";
/**
 * Generic segment loader for the local Manifest.
 * @param {string | null} _wantedCdn
 * @param {Object} content
 * @param {Object} cancelSignal
 * @param {Object} _callbacks
 * @returns {Promise}
 */
export default function segmentLoader(_wantedCdn: ICdnMetadata | null, content: ISegmentContext, _loaderOptions: ISegmentLoaderOptions, // TODO use timeout?
cancelSignal: CancellationSignal, _callbacks: ISegmentLoaderCallbacks<ArrayBuffer | null>): Promise<ISegmentLoaderResultSegmentLoaded<ArrayBuffer | null>>;
//# sourceMappingURL=segment_loader.d.ts.map