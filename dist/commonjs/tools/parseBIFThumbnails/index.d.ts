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
    startTime: number;
    image: ArrayBuffer;
}
export interface IBifObject {
    version: string;
    images: IBifThumbnail[];
}
/**
 * Parse thumbnails in the "BIF" format into a more exploitable form.
 * @param {ArrayBuffer} buf - The BIF file
 * @returns {Object}
 */
export default function parseBifThumbnails(buf: ArrayBuffer): IBifObject;
