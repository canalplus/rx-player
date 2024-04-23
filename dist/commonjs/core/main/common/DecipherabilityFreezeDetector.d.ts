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
import type { IFreezingStatus, IRebufferingStatus } from "../../../playback_observer";
import type SegmentSinksStore from "../../segment_sinks";
export default class DecipherabilityFreezeDetector {
    /** Emit the current playback conditions */
    private _segmentSinksStore;
    /**
     * If set to something else than `null`, this is the monotonically-raising
     * timestamp used by the RxPlayer when playback begin to seem to not start
     * despite having decipherable data in the buffer(s).
     *
     * If enough time in that condition is spent, special considerations are
     * taken at which point `_currentFreezeTimestamp` is reset to `null`.
     *
     * It is also reset to `null` when and if there is no such issue anymore.
     */
    private _currentFreezeTimestamp;
    constructor(segmentSinksStore: SegmentSinksStore);
    /**
     * Support of contents with DRM on all the platforms out there is a pain in
     * the *ss considering all the DRM-related bugs there are.
     *
     * We found out a frequent issue which is to be unable to play despite having
     * all the decryption keys to play what is currently buffered.
     * When this happens, re-creating the buffers from scratch, with a reload, is
     * usually sufficient to unlock the situation.
     *
     * Although we prefer providing more targeted fixes or telling to platform
     * developpers to fix their implementation, it's not always possible.
     * We thus resorted to developping an heuristic which detects such situation
     * and reload in that case.
     *
     * @param {Object} observation - The last playback observation produced, it
     * has to be recent (just triggered for example).
     * @returns {boolean} - Returns `true` if it seems to be such kind of
     * decipherability freeze, in which case you should probably reload the
     * content.
     */
    needToReload(observation: IDecipherabilityFreezeDetectorObservation): boolean;
}
/** Playback observation needed by the `DecipherabilityFreezeDetector`. */
export interface IDecipherabilityFreezeDetectorObservation {
    /** Current `readyState` value on the media element. */
    readyState: number;
    /**
     * Set if the player is short on audio and/or video media data and is a such,
     * rebuffering.
     * `null` if not.
     */
    rebuffering: IRebufferingStatus | null;
    /**
     * Set if the player is frozen, that is, stuck in place for unknown reason.
     * Note that this reason can be a valid one, such as a necessary license not
     * being obtained yet.
     *
     * `null` if the player is not frozen.
     */
    freezing: IFreezingStatus | null;
    /**
     * Gap between `currentTime` and the next position with un-buffered data.
     * `Infinity` if we don't have buffered data right now.
     * `undefined` if we cannot determine the buffer gap.
     */
    bufferGap: number | undefined;
}
