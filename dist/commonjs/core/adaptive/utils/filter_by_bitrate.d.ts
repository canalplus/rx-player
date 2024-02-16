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
import type { IRepresentation } from "../../../manifest";
/**
 * Get only representations lower or equal to a given bitrate.
 * If no representation is lower than the given bitrate, returns an array containing
 * all Representation(s) with the lowest available bitrate.
 * @param {Array.<Object>} representations - All Representations available
 * @param {Number} bitrate
 * @returns {Array.<Object>}
 */
export default function filterByBitrate(representations: IRepresentation[], bitrate: number): IRepresentation[];
