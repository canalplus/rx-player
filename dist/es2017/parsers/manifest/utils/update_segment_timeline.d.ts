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
import type { IIndexSegment } from "./index_helpers";
/**
 * Update a complete array of segments in a given timeline with a [generally]
 * smaller but [generally] newer set of segments.
 *
 * Returns a boolean:
 *   - If set to `true`, the old timeline was emptied and completely replaced by
 *     the content of the newer timeline.
 *     This could happen either if a problem happened while trying to update or
 *     when the update is actually bigger than what it is updating.
 *   - If set to `false`, the older timeline was either updated to add the newer
 *     segments, or untouched.
 *
 * @param {Array.<Object>} oldTimeline
 * @param {Array.<Object>} newTimeline
 * @returns {boolean}
 */
export default function updateSegmentTimeline(oldTimeline: IIndexSegment[], newTimeline: IIndexSegment[]): boolean;
