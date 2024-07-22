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
import type { ISegment } from "../../../../../manifest";
import type { IEMSG } from "../../../../containers/isobmff";
import type { IIndexSegment } from "../../../utils/index_helpers";
import type ManifestBoundsCalculator from "../manifest_bounds_calculator";
/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} durationWanted - duration wanted, in seconds
 * @param {Object} manifestBoundsCalculator
 * @param {number|undefined} scaledPeriodEnd
 * @param {function} isEMSGWhitelisted
 * @returns {Array.<Object>}
 */
export default function getSegmentsFromTimeline(index: {
    availabilityTimeComplete?: boolean | undefined;
    availabilityTimeOffset?: number | undefined;
    segmentUrlTemplate: string | null;
    startNumber?: number | undefined;
    endNumber?: number | undefined;
    timeline: IIndexSegment[];
    timescale: number;
    indexTimeOffset: number;
}, from: number, durationWanted: number, manifestBoundsCalculator: ManifestBoundsCalculator, scaledPeriodEnd: number | undefined, isEMSGWhitelisted: (inbandEvent: IEMSG) => boolean): ISegment[];
//# sourceMappingURL=get_segments_from_timeline.d.ts.map