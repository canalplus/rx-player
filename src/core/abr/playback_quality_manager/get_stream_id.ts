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

import {
  Adaptation,
  Period,
  Representation
} from "../../../manifest";

/**
 * Get a unique stream ID by concatenating
 * period, adaptation and representation ids.
 *
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} representation
 * @return {string} - gen_stream_${periodId}_${adaptationId}_${representationId}
 */
export default function getStreamId(
  period: Period,
  adaptation: Adaptation,
  representation: Representation
): string {
  return "gen_stream_" + period.id.toString() + "_" +
    adaptation.id.toString() + "_" +
    representation.id.toString();
}
