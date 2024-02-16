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
import type { IRepresentationIndex, ISegment } from "./types";
export interface IStaticRepresentationIndexInfos {
    media: string;
}
/**
 * Simple RepresentationIndex implementation for static files.
 * @class StaticRepresentationIndex
 */
export default class StaticRepresentationIndex implements IRepresentationIndex {
    /** URL at which the content is available. */
    private readonly _url;
    /**
     * @param {Object} infos
     */
    constructor(infos: IStaticRepresentationIndexInfos);
    /**
     * Static contents do not have any initialization segments.
     * Just return null.
     * @returns {null}
     */
    getInitSegment(): null;
    /**
     * Returns the only Segment available here.
     * @returns {Array.<Object>}
     */
    getSegments(): ISegment[];
    /**
     * Returns first position in index.
     * @returns {undefined}
     */
    getFirstAvailablePosition(): undefined;
    /**
     * Returns last position in index.
     * @returns {undefined}
     */
    getLastAvailablePosition(): undefined;
    /**
     * Returns the absolute end in seconds this RepresentationIndex can reach once
     * all segments are available.
     * @returns {number|null|undefined}
     */
    getEnd(): undefined;
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     *
     * Always `false` in a `StaticRepresentationIndex` because all segments should
     * be directly available.
     * @returns {boolean}
     */
    awaitSegmentBetween(): false;
    /**
     * Returns false as a static file never need to be refreshed.
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * @returns {null}
     */
    checkDiscontinuity(): null;
    /**
     * Returns true as a static file should never need lose availability.
     * @returns {Boolean}
     */
    isSegmentStillAvailable(): true;
    /**
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {Boolean}
     */
    isStillAwaitingFutureSegments(): false;
    /**
     * @returns {Boolean}
     */
    isInitialized(): true;
    initialize(): void;
    addPredictedSegments(): void;
    _replace(): void;
    _update(): void;
}
