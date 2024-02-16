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
/**
 * Return "Buffer Levels" which are steps of available buffers from which we
 * are normally able switch safely to the next available bitrate.
 * (Following an algorithm close to BOLA)
 * @param {Array.<number>} bitrates - All available bitrates, __sorted__ in
 * ascending order.
 * @returns {Array.<number>}
 */
export default function getBufferLevels(bitrates: number[]): number[];
