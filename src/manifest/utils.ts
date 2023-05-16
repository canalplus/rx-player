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

import isNullOrUndefined from "../utils/is_null_or_undefined";
import Adaptation from "./adaptation";
import Period from "./period";
import Representation from "./representation";
import { ISegment } from "./representation_index";

/** All information needed to identify a given segment. */
export interface IBufferedChunkInfos { adaptation : Adaptation;
                                       period : Period;
                                       representation : Representation;
                                       segment : ISegment; }

/**
 * Check if two contents are the same
 * @param {Object} content1
 * @param {Object} content2
 * @returns {boolean}
 */
export function areSameContent(
  content1: IBufferedChunkInfos,
  content2: IBufferedChunkInfos
): boolean {
  return (content1.segment.id === content2.segment.id &&
          content1.representation.uniqueId === content2.representation.uniqueId);
}

/**
 * Get string describing a given ISegment, useful for log functions.
 * @param {Object} content
 * @returns {string|null|undefined}
 */
export function getLoggableSegmentId(
  content : IBufferedChunkInfos | null | undefined
) : string {
  if (isNullOrUndefined(content)) {
    return "";
  }
  const { period, adaptation, representation, segment } = content;
  return `${adaptation.type} P: ${period.id} A: ${adaptation.id} ` +
         `R: ${representation.id} S: ` +
         (segment.isInit   ? "init" :
          segment.complete ? `${segment.time}-${segment.duration}` :
                             `${segment.time}`);
}
