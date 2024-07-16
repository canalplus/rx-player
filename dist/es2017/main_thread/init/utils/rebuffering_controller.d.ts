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
import type { IBufferType } from "../../../core/types";
import type { IManifestMetadata, IPeriodMetadata } from "../../../manifest";
import type { IMediaElementPlaybackObserver } from "../../../playback_observer";
import type { IPlayerError } from "../../../public_types";
import EventEmitter from "../../../utils/event_emitter";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import type { IStallingSituation } from "../types";
/**
 * Monitor playback, trying to avoid stalling situation.
 * If stopping the player to build buffer is needed, temporarily set the
 * playback rate (i.e. speed) at `0` until enough buffer is available again.
 *
 * Emit "stalled" then "unstalled" respectively when an unavoidable stall is
 * encountered and exited.
 */
export default class RebufferingController extends EventEmitter<IRebufferingControllerEvent> {
    /** Emit the current playback conditions */
    private _playbackObserver;
    private _manifest;
    private _speed;
    private _isStarted;
    /**
     * Every known audio and video buffer discontinuities in chronological
     * order (first ordered by Period's start, then by bufferType in any order.
     */
    private _discontinuitiesStore;
    private _canceller;
    /**
     * @param {object} playbackObserver - emit the current playback conditions.
     * @param {Object} manifest - The Manifest of the currently-played content.
     * @param {Object} speed - The last speed set by the user
     */
    constructor(playbackObserver: IMediaElementPlaybackObserver, manifest: IManifestMetadata | null, speed: IReadOnlySharedReference<number>);
    start(): void;
    /**
     * Update information on an upcoming discontinuity for a given buffer type and
     * Period.
     * Each new update for the same Period and type overwrites the previous one.
     * @param {Object} evt
     */
    updateDiscontinuityInfo(evt: IDiscontinuityEvent): void;
    /**
     * Function to call when a Stream is currently locked, i.e. we cannot load
     * segments for the corresponding Period and buffer type until it is seeked
     * to.
     * @param {string} bufferType - Buffer type for which no segment will
     * currently load.
     * @param {Object} period - Period for which no segment will currently load.
     */
    onLockedStream(bufferType: IBufferType, period: IPeriodMetadata): void;
    /**
     * Stops the `RebufferingController` from montoring stalling situations,
     * forever.
     */
    destroy(): void;
}
export interface IRebufferingControllerEvent {
    stalled: IStallingSituation;
    unstalled: null;
    needsReload: null;
    warning: IPlayerError;
}
/**
 * Event indicating that a discontinuity has been found.
 * Each event for a `bufferType` and `period` combination replaces the previous
 * one.
 */
export interface IDiscontinuityEvent {
    /** Buffer type concerned by the discontinuity. */
    bufferType: IBufferType;
    /** Period concerned by the discontinuity. */
    period: IPeriodMetadata;
    /**
     * Close discontinuity time information.
     * `null` if no discontinuity has been detected currently for that buffer
     * type and Period.
     */
    discontinuity: IDiscontinuityTimeInfo | null;
    /**
     * Position at which the discontinuity was found.
     * Can be important for when a current discontinuity's start is unknown.
     */
    position: number;
}
/** Information on a found discontinuity. */
export interface IDiscontinuityTimeInfo {
    /**
     * Start time of the discontinuity.
     * `undefined` for when the start is unknown but the discontinuity was
     * currently encountered at the position we were in when this event was
     * created.
     */
    start: number | undefined;
    /**
     * End time of the discontinuity, in seconds.
     * If `null`, no further segment can be loaded for the corresponding Period.
     */
    end: number | null;
}
//# sourceMappingURL=rebuffering_controller.d.ts.map