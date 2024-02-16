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
import type { IAdaptation, IPeriod } from "../../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import type { SegmentSink } from "../../../segment_sinks";
import type { ITrackSwitchingMode } from "../../adaptation";
import type { IPeriodStreamPlaybackObservation } from "../types";
export type IAdaptationSwitchStrategy = 
/** Do nothing special. */
{
    type: "continue";
    value: undefined;
}
/**
 * Clean the given ranges of time from the buffer, preferably avoiding time
 * around the current position to continue playback smoothly.
 */
 | {
    type: "clean-buffer";
    value: Array<{
        start: number;
        end: number;
    }>;
}
/**
 * Clean the given ranges of time from the buffer and try to flush the buffer
 * so that it is taken in account directly.
 */
 | {
    type: "flush-buffer";
    value: Array<{
        start: number;
        end: number;
    }>;
}
/** Reload completely the media buffers. */
 | {
    type: "needs-reload";
    value: undefined;
};
export interface IAdaptationSwitchOptions {
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch: "continue" | "reload";
}
/**
 * Find out what to do when switching Adaptation, based on the current
 * situation.
 * @param {Object} segmentSink
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} playbackObserver
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(segmentSink: SegmentSink, period: IPeriod, adaptation: IAdaptation, switchingMode: ITrackSwitchingMode, playbackObserver: IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>, options: IAdaptationSwitchOptions): IAdaptationSwitchStrategy;
