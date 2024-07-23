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
import type { ISegment, IRepresentation } from "../../../manifest";
/**
 * Caching object used to cache initialization segments.
 * This allow to have a faster representation switch and faster seeking.
 * @class InitializationSegmentCache
 */
declare class InitializationSegmentCache<T> {
    private _cache;
    constructor();
    /**
     * @param {Object} obj
     * @param {*} response
     */
    add({ representation, segment }: {
        representation: IRepresentation;
        segment: ISegment;
    }, response: T): void;
    /**
     * @param {Object} obj
     * @returns {*} response
     */
    get({ representation, segment, }: {
        representation: IRepresentation;
        segment: ISegment;
    }): T | null;
}
export default InitializationSegmentCache;
//# sourceMappingURL=initialization_segment_cache.d.ts.map