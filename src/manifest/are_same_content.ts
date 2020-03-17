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

import Adaptation from "./adaptation";
import { LoadedPeriod } from "./period";
import Representation from "./representation";
import { ISegment } from "./representation_index";

/**
 * All information needed for a given chunk to know if it has the same content
 * than another chunk.
 */
interface IBufferedChunkInfos { adaptation : Adaptation;
                                period : LoadedPeriod;
                                representation : Representation;
                                segment : ISegment; }

/**
 * Check if two contents are the same
 * @param {Object} content1
 * @param {Object} content2
 * @returns {boolean}
 */
export default function areSameContent(
  content1: IBufferedChunkInfos,
  content2: IBufferedChunkInfos
): boolean {
  return (content1.segment.id === content2.segment.id &&
          content1.representation.id === content2.representation.id &&
          content1.adaptation.id === content2.adaptation.id &&
          content1.period.id === content2.period.id);
}
