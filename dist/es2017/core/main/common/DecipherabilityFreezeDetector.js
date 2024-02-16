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
import log from "../../../log";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
export default class DecipherabilityFreezeDetector {
    constructor(segmentSinksStore) {
        this._segmentSinksStore = segmentSinksStore;
        this._currentFreezeTimestamp = null;
    }
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
    needToReload(observation) {
        const { readyState, rebuffering, freezing } = observation;
        const bufferGap = observation.bufferGap !== undefined && isFinite(observation.bufferGap)
            ? observation.bufferGap
            : 0;
        if (bufferGap < 6 || (rebuffering === null && freezing === null) || readyState > 1) {
            this._currentFreezeTimestamp = null;
            return false;
        }
        const now = getMonotonicTimeStamp();
        if (this._currentFreezeTimestamp === null) {
            this._currentFreezeTimestamp = now;
        }
        const rebufferingForTooLong = rebuffering !== null && now - rebuffering.timestamp > 4000;
        const frozenForTooLong = freezing !== null && now - freezing.timestamp > 4000;
        if ((rebufferingForTooLong || frozenForTooLong) &&
            getMonotonicTimeStamp() - this._currentFreezeTimestamp > 4000) {
            const statusAudio = this._segmentSinksStore.getStatus("audio");
            const statusVideo = this._segmentSinksStore.getStatus("video");
            let hasOnlyDecipherableSegments = true;
            let isClear = true;
            for (const status of [statusAudio, statusVideo]) {
                if (status.type === "initialized") {
                    for (const segment of status.value.getLastKnownInventory()) {
                        const { representation } = segment.infos;
                        if (representation.decipherable === false) {
                            log.warn("Init: we have undecipherable segments left in the buffer, reloading");
                            this._currentFreezeTimestamp = null;
                            return true;
                        }
                        else if (representation.contentProtections !== undefined) {
                            isClear = false;
                            if (representation.decipherable !== true) {
                                hasOnlyDecipherableSegments = false;
                            }
                        }
                    }
                }
            }
            if (!isClear && hasOnlyDecipherableSegments) {
                log.warn("Init: we are frozen despite only having decipherable " +
                    "segments left in the buffer, reloading");
                this._currentFreezeTimestamp = null;
                return true;
            }
        }
        return false;
    }
}
