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
import type { IRepresentationIndex, ISegment } from "../../../manifest";
import type { ILocalIndex } from "./types";
export default class LocalRepresentationIndex implements IRepresentationIndex {
    private _index;
    private _representationId;
    constructor(index: ILocalIndex, representationId: string);
    /**
     * @returns {Object}
     */
    getInitSegment(): ISegment | null;
    /**
     * @param {Number} up
     * @param {Number} duration
     * @returns {Array.<Object>}
     */
    getSegments(up: number, duration: number): ISegment[];
    /**
     * @returns {Number|undefined}
     */
    getFirstAvailablePosition(): number | undefined;
    /**
     * @returns {Number|undefined}
     */
    getLastAvailablePosition(): number | undefined;
    /**
     * Returns the expected ending position of this RepresentationIndex.
     * `undefined` if unknown.
     * @returns {number|undefined}
     */
    getEnd(): number | undefined;
    /**
     * Returns:
     *   - `true` if in the given time interval, at least one new segment is
     *     expected to be available in the future.
     *   - `false` either if all segments in that time interval are already
     *     available for download or if none will ever be available for it.
     *   - `undefined` when it is not possible to tell.
     * @param {number} start
     * @param {number} end
     * @returns {boolean|undefined}
     */
    awaitSegmentBetween(start: number, end: number): boolean | undefined;
    /**
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * @returns {Boolean}
     */
    isSegmentStillAvailable(): true;
    isStillAwaitingFutureSegments(): boolean;
    /**
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {null}
     */
    checkDiscontinuity(): null;
    /**
     * @returns {Boolean}
     */
    isInitialized(): true;
    initialize(): void;
    addPredictedSegments(): void;
    _replace(newIndex: LocalRepresentationIndex): void;
    _update(newIndex: LocalRepresentationIndex): void;
}
