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
import type { ISegmentLoader as ICustomSegmentLoader } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { ILoadedAudioVideoSegmentFormat, ISegmentContext, ISegmentLoader, ISegmentLoaderCallbacks, ISegmentLoaderOptions, ISegmentLoaderResultChunkedComplete, ISegmentLoaderResultSegmentCreated, ISegmentLoaderResultSegmentLoaded } from "../types";
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} initialUrl
 * @param {Object} context
 * @param {boolean} lowLatencyMode
 * @param {Object} options
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export declare function regularSegmentLoader(initialUrl: string, context: ISegmentContext, lowLatencyMode: boolean, options: ISegmentLoaderOptions, callbacks: ISegmentLoaderCallbacks<ILoadedAudioVideoSegmentFormat>, cancelSignal: CancellationSignal): Promise<ISegmentLoaderResultSegmentLoaded<ILoadedAudioVideoSegmentFormat> | ISegmentLoaderResultSegmentCreated<ILoadedAudioVideoSegmentFormat> | ISegmentLoaderResultChunkedComplete>;
/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateSegmentLoader({ lowLatencyMode, segmentLoader: customSegmentLoader, checkMediaSegmentIntegrity, }: {
    lowLatencyMode: boolean;
    segmentLoader?: ICustomSegmentLoader | undefined;
    checkMediaSegmentIntegrity?: boolean | undefined;
}): ISegmentLoader<Uint8Array | ArrayBuffer | null>;
//# sourceMappingURL=segment_loader.d.ts.map