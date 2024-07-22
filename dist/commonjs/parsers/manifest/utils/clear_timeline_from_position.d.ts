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
 * Remove segments which starts before the given `firstAvailablePosition` from
 * the timeline. `firstAvailablePosition` has to be time scaled.
 * @param {Array.<Object>} timeline
 * @param {number} firstAvailablePosition
 * @returns {number} - Returns the number of removed segments. This includes
 * potential implicit segment from decremented `repeatCount` attributes.
 */
export default function clearTimelineFromPosition(timeline: IIndexSegment[], firstAvailablePosition: number): number;
//# sourceMappingURL=clear_timeline_from_position.d.ts.map