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
import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import type { IMediaElementPlaybackObserver } from "../../../playback_observer";
import type { IPlayerError } from "../../../public_types";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
/** Event emitted when trying to perform the initial `play`. */
export type IInitialPlayEvent = 
/** Autoplay is not enabled, but all required steps to do so are there. */
{
    type: "skipped";
}
/**
 * Tried to play, but autoplay is blocked by the browser.
 * A corresponding warning should have already been sent.
 */
 | {
    type: "autoplay-blocked";
}
/** Autoplay was done with success. */
 | {
    type: "autoplay";
};
/** Object returned by `initialSeekAndPlay`. */
export interface IInitialSeekAndPlayObject {
    /** Emit the result of the auto-play operation, once performed. */
    autoPlayResult: Promise<IInitialPlayEvent>;
    /**
     * Shared reference whose value becomes `true` once the initial play has
     * been considered / has been done by `performInitialSeekAndPlay`.
     */
    initialPlayPerformed: IReadOnlySharedReference<boolean>;
}
/**
 * Seek as soon as possible at the initially wanted position and play if
 * autoPlay is wanted.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function performInitialSeekAndPlay({ mediaElement, playbackObserver, startTime, mustAutoPlay, isDirectfile, onWarning, }: {
    mediaElement: IMediaElement;
    playbackObserver: IMediaElementPlaybackObserver;
    startTime: number | (() => number);
    mustAutoPlay: boolean;
    isDirectfile: boolean;
    onWarning: (err: IPlayerError) => void;
}, cancelSignal: CancellationSignal): IInitialSeekAndPlayObject;
//# sourceMappingURL=initial_seek_and_play.d.ts.map