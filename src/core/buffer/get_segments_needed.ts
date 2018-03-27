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
  ISegment,
  Representation,
} from "../../manifest";

/**
 * Returns every segments currently wanted.
 * @param {Object} representation - The representation of the chosen
 * adaptation
 * @param {Object} range
 * @param {Object} options
 * @param {Boolean} options.addInitSegment
 * @param {Boolean} options.ignoreRegularSegments
 * @returns {Array.<Object>}
 */
export default function getSegmentsNeeded(
  representation : Representation,
  range : { start : number; end : number },
  options : {
    addInitSegment : boolean;
    ignoreRegularSegments : boolean;
  }
) : ISegment[] {
  const {
    addInitSegment,
    ignoreRegularSegments,
  } = options;
  let initSegment : ISegment|null = null;

  if (addInitSegment) {
    initSegment = representation.index.getInitSegment();
  }

  if (ignoreRegularSegments) {
    return initSegment ? [initSegment] : [];
  }

  const { start, end } = range;
  const duration = end - start;

  // given the current timestamp and the previously calculated time gap and
  // wanted buffer size, we can retrieve the list of segments to inject in
  // our pipelines.
  const mediaSegments = representation.index.getSegments(start, duration);

  if (initSegment) {
    mediaSegments.unshift(initSegment);
  }

  return mediaSegments;
}
