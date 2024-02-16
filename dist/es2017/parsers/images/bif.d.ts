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
export interface IBifThumbnail {
    index: number;
    duration: number;
    ts: number;
    data: Uint8Array;
}
export interface IBifObject {
    fileFormat: string;
    version: string;
    imageCount: number;
    timescale: number;
    format: string;
    width: number;
    height: number;
    aspectRatio: string;
    isVod: boolean;
    thumbs: IBifThumbnail[];
}
/**
 * @param {UInt8Array} buf
 * @returns {Object}
 */
declare function parseBif(buf: Uint8Array): IBifObject;
export default parseBif;
