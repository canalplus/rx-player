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

import { ISegment } from "../../../manifest";
import { IContentInfos } from "./types";

/**
 * Build a segment id that may be unique in a given content.
 * @param {Object} contentInfo
 * @param {Object} segment
 * @returns {string}
 */
export default function getCompleteSegmentId(contentInfo: IContentInfos,
                                             segment: ISegment): string {
  const { manifest, period, adaptation, representation } = contentInfo;
  return manifest.id +
         period.id +
         adaptation.id +
         representation.id.toString() +
         segment.id;
}
