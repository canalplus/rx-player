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
 * Return full audio initialization segment as Uint8Array.
 * @param {Number} timescale
 * @param {Number} channelsCount
 * @param {Number} sampleSize
 * @param {Number} packetSize
 * @param {Number} sampleRate
 * @param {string} codecPrivateData
 * @param {Uint8Array} keyId - hex string representing the key Id, 32 chars.
 * eg. a800dbed49c12c4cb8e0b25643844b9b
 * @returns {Uint8Array}
 */
export default function createAudioInitSegment(timescale: number, channelsCount: number, sampleSize: number, packetSize: number, sampleRate: number, codecPrivateData: string, keyId?: Uint8Array): Uint8Array;
