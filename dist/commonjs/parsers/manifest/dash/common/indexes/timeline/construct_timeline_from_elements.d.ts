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
import type { ITNode } from "../../../../../../utils/xml-parser";
import type { IIndexSegment } from "../../../../utils/index_helpers";
/**
 * Allows to generate the "timeline" for the "Timeline" RepresentationIndex.
 * Call this function when the timeline is unknown.
 * This function was added to only perform that task lazily, i.e. only when
 * first needed.
 * @param {Array.<Object>|HTMLCollection} elements - All S nodes constituting
 * the corresponding SegmentTimeline node.
 * @returns {Array.<Object>}
 */
export default function constructTimelineFromElements(elements: ITNode[] | HTMLCollection): IIndexSegment[];
